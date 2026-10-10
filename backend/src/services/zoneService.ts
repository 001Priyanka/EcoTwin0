import { activeDataProvider } from "../repositories/zoneRepository.ts";
import { withCanonicalEcoScore } from "./riskEngine.ts";
import type { EnvironmentalZone, ZoneDetails } from "../types/environmental.ts";
import { HttpError } from "../utils/errors.ts";

const UPDATED_AT = "2026-10-10T10:20:00Z";

function canonicalZone(zone: ZoneDetails): ZoneDetails {
  return withCanonicalEcoScore(zone);
}

export async function getZones(): Promise<EnvironmentalZone[]> {
  const zones = await activeDataProvider.listZones();
  return zones.map(canonicalZone).map(({ air, heat, waste, ...summary }) => summary);
}

export async function getZone(zoneId: string): Promise<ZoneDetails> {
  const zone = await activeDataProvider.findZone(zoneId);
  if (!zone) throw new HttpError(404, "ZONE_NOT_FOUND", "The requested zone was not found.");
  return canonicalZone(zone);
}

export async function getPriorityZones(limit: number): Promise<EnvironmentalZone[]> {
  return (await getZones())
    .filter((zone) => zone.ecoScore !== null)
    .sort((left, right) => (right.ecoScore as number) - (left.ecoScore as number) || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export async function getCitySummary() {
  const zones = await getZones();
  const average = (values: Array<number | null>) => {
    const available = values.filter((value): value is number => value !== null);
    return available.length === 0 ? null : Math.round(available.reduce((sum, value) => sum + value, 0) / available.length);
  };
  const makeMetric = (value: number | null) => ({
    value,
    status: "simulated" as const,
    confidence: null,
    recordedAt: UPDATED_AT,
    severityLabel: value === null ? "Unavailable" as const : value >= 75 ? "Critical" as const : value >= 50 ? "Elevated" as const : "Low" as const,
  });

  return {
    cityName: "Kolhapur",
    region: "Maharashtra",
    country: "India",
    geographicCoordinates: { latitude: 16.705, longitude: 74.2433 },
    metrics: {
      airQualityRisk: makeMetric(average(zones.map((zone) => zone.airRisk))),
      urbanHeatRisk: makeMetric(average(zones.map((zone) => zone.heatRisk))),
      wasteManagementRisk: makeMetric(average(zones.map((zone) => zone.wasteRisk))),
      ecoScore: makeMetric(average(zones.map((zone) => zone.ecoScore))),
    },
    dataStatus: "simulated" as const,
    lastUpdated: UPDATED_AT,
    totalMonitoredZones: zones.length,
    priorityZonesCount: (await getPriorityZones(20)).length,
    governanceNote: "Higher risk scores and EcoScore strictly denote greater environmental vulnerability (0-100 scale).",
  };
}
