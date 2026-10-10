import type { SimulationRequest, SimulationResponse } from "../types/environmental.ts";
import { HttpError } from "../utils/errors.ts";
import { calculateEcoScore } from "./riskEngine.ts";
import { getZone } from "./zoneService.ts";

const EFFECTS: Record<string, { field: "airRisk" | "heatRisk" | "wasteRisk"; factor: number }> = {
  "increase-waste-collection": { field: "wasteRisk", factor: 0.35 },
  "reduce-air-emissions": { field: "airRisk", factor: 0.3 },
  "add-urban-cooling": { field: "heatRisk", factor: 0.3 },
};

export async function simulate(request: SimulationRequest): Promise<SimulationResponse> {
  if (!request || typeof request !== "object" || typeof request.zoneId !== "string" || !request.intervention) {
    throw new HttpError(400, "INVALID_REQUEST", "Simulation request must include a zoneId and intervention.");
  }
  const zone = await getZone(request.zoneId);
  const effect = EFFECTS[request.intervention.type];
  if (!effect) {
    throw new HttpError(422, "INVALID_INTERVENTION", "The intervention type is not supported.");
  }
  if (!Number.isFinite(request.intervention.intensity) || request.intervention.intensity < 0 || request.intervention.intensity > 100) {
    throw new HttpError(422, "INVALID_INTENSITY", "Intervention intensity must be a number between 0 and 100.");
  }

  const values = {
    airRisk: zone.airRisk,
    heatRisk: zone.heatRisk,
    wasteRisk: zone.wasteRisk,
  };
  const current = values[effect.field];
  if (current !== null) {
    values[effect.field] = Math.max(0, Math.round(current - request.intervention.intensity * effect.factor));
  }
  const estimatedEcoScore = calculateEcoScore(values);
  const baselineEcoScore = zone.ecoScore;
  return {
    zoneId: zone.id,
    baselineEcoScore,
    estimatedEcoScore,
    estimatedChange: baselineEcoScore === null || estimatedEcoScore === null ? null : estimatedEcoScore - baselineEcoScore,
    modelType: "heuristic",
    assumptions: [
      "Illustrative model; not a validated environmental forecast.",
      "Intervention intensity is applied as a deterministic proportional risk reduction.",
      "Unavailable component measurements remain unavailable.",
    ],
  };
}
