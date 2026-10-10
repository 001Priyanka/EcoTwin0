export type DataStatus = "real" | "derived" | "simulated";

export interface EnvironmentalZone {
  id: string;
  name: string;
  airRisk: number | null;
  heatRisk: number | null;
  wasteRisk: number | null;
  ecoScore: number | null;
  dataStatus: DataStatus;
  updatedAt: string | null;
}

export interface ZoneDetails extends EnvironmentalZone {
  air: {
    aqi: number | null;
    pm25: number | null;
    source: string | null;
    status: DataStatus;
  };
  heat: {
    temperatureC: number | null;
    heatRisk: number | null;
    source: string | null;
    status: DataStatus;
  };
  waste: {
    wasteRisk: number | null;
    reportedOverflowCount: number | null;
    collectionEfficiencyPct: number | null;
    source: string | null;
    status: DataStatus;
  };
}

export interface SimulationRequest {
  zoneId: string;
  intervention: {
    type: string;
    intensity: number;
  };
}

export interface SimulationResponse {
  zoneId: string;
  baselineEcoScore: number | null;
  estimatedEcoScore: number | null;
  estimatedChange: number | null;
  modelType: "heuristic" | "validated";
  assumptions: string[];
}

export interface AskEvidence {
  field: string;
  value: string | number | boolean | null;
}

export interface AskResponse {
  answer: string;
  zoneId: string | null;
  dataStatus: DataStatus;
  evidence: AskEvidence[];
}
