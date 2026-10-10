import type { ZoneDetails } from "../types/environmental.ts";
import type { EnvironmentalDataProvider } from "../providers/environmentalDataProvider.ts";

const UPDATED_AT = "2026-10-10T10:20:00Z";

const FIXTURES: ZoneDetails[] = [
  {
    id: "zone-panchganga",
    name: "Panchganga Ghat & Shiroli Gateway",
    airRisk: 71,
    heatRisk: 49,
    wasteRisk: 88,
    ecoScore: null,
    dataStatus: "simulated",
    updatedAt: UPDATED_AT,
    air: { aqi: 154, pm25: 64.8, source: "Simulated Shiroli Border Monitor #04", status: "simulated" },
    heat: { temperatureC: 33.2, heatRisk: 49, source: "Derived Riparian Microclimate Model", status: "derived" },
    waste: { wasteRisk: 88, reportedOverflowCount: 14, collectionEfficiencyPct: 44, source: "Simulated Riverbank Waste Audit", status: "simulated" },
  },
  {
    id: "zone-shahupuri",
    name: "Shahupuri Commercial Hub",
    airRisk: 76,
    heatRisk: 68,
    wasteRisk: 64,
    ecoScore: null,
    dataStatus: "simulated",
    updatedAt: UPDATED_AT,
    air: { aqi: 168, pm25: 72.4, source: "Simulated Shahupuri Station Sensor #02", status: "simulated" },
    heat: { temperatureC: 36.8, heatRisk: 68, source: "Derived Thermal Infrared Radiance", status: "derived" },
    waste: { wasteRisk: 64, reportedOverflowCount: 6, collectionEfficiencyPct: 76, source: "Simulated KMC Route Telemetry", status: "simulated" },
  },
  {
    id: "zone-mahadwar",
    name: "Mahadwar Road & Mahalaxmi Temple Precinct",
    airRisk: 54,
    heatRisk: 82,
    wasteRisk: null,
    ecoScore: null,
    dataStatus: "simulated",
    updatedAt: UPDATED_AT,
    air: { aqi: 118, pm25: 42.1, source: "Simulated Mahadwar Heritage Node", status: "simulated" },
    heat: { temperatureC: 39.5, heatRisk: 82, source: "Derived Stone Courtyard Thermal Model", status: "derived" },
    waste: { wasteRisk: null, reportedOverflowCount: null, collectionEfficiencyPct: null, source: null, status: "simulated" },
  },
];

export const simulatedDataProvider: EnvironmentalDataProvider = {
  name: "simulated-kolhapur-fixtures",
  async listZones() {
    return FIXTURES.map((zone) => ({ ...zone }));
  },
  async findZone(zoneId) {
    const zone = FIXTURES.find((candidate) => candidate.id === zoneId);
    return zone ? { ...zone } : undefined;
  },
};

export const activeDataProvider: EnvironmentalDataProvider = simulatedDataProvider;
