import type { EnvironmentalZone } from "../types/environmental.ts";

export const RISK_WEIGHTS = {
  air: 0.4,
  heat: 0.3,
  waste: 0.3,
} as const;

export function calculateEcoScore(zone: Pick<EnvironmentalZone, "airRisk" | "heatRisk" | "wasteRisk">): number | null {
  const components = [
    [zone.airRisk, RISK_WEIGHTS.air],
    [zone.heatRisk, RISK_WEIGHTS.heat],
    [zone.wasteRisk, RISK_WEIGHTS.waste],
  ] as const;
  const available = components.filter(([value]) => value !== null);
  if (available.length === 0) return null;

  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  const weightedScore = available.reduce((sum, [value, weight]) => sum + (value as number) * weight, 0);
  return Math.round(weightedScore / totalWeight);
}

export function withCanonicalEcoScore<T extends Pick<EnvironmentalZone, "airRisk" | "heatRisk" | "wasteRisk" | "ecoScore">>(
  zone: T,
): T {
  return { ...zone, ecoScore: calculateEcoScore(zone) };
}
