import type { AskResponse } from "../types/environmental.ts";
import { HttpError } from "../utils/errors.ts";
import { getPriorityZones, getZone } from "./zoneService.ts";

export async function answerQuestion(question: string, zoneId?: string): Promise<AskResponse> {
  if (typeof question !== "string") {
    throw new HttpError(400, "INVALID_REQUEST", "Ask request must include a question.");
  }
  if (question.trim().length === 0 || question.length > 500) {
    throw new HttpError(422, "INVALID_QUESTION", "Question must contain 1 to 500 characters.");
  }

  if (zoneId) {
    const zone = await getZone(zoneId);
    const evidence = [
      { field: "airRisk", value: zone.airRisk },
      { field: "heatRisk", value: zone.heatRisk },
      { field: "wasteRisk", value: zone.wasteRisk },
      { field: "ecoScore", value: zone.ecoScore },
    ];
    const available = evidence.filter((item) => item.value !== null);
    const highest = available.sort((left, right) => Number(right.value) - Number(left.value))[0];
    const answer = highest
      ? `${zone.name} has an EcoScore of ${zone.ecoScore ?? "unavailable"}. Its highest available risk component is ${highest.field} at ${highest.value}. The data is simulated and should not be treated as an official environmental reading.`
      : `${zone.name} does not have enough available measurements to explain its risk. The data is simulated.`;
    return { answer, zoneId: zone.id, dataStatus: zone.dataStatus, evidence };
  }

  const zones = await getPriorityZones(3);
  return {
    answer: `The current priority ranking is ${zones.map((zone) => zone.name).join(", ")}. Rankings use the backend EcoScore calculation and simulated demonstration data.`,
    zoneId: null,
    dataStatus: "simulated",
    evidence: zones.map((zone) => ({ field: `${zone.id}.ecoScore`, value: zone.ecoScore })),
  };
}
