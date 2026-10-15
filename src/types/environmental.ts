/**
 * EcoTwin Environmental Intelligence - Shared Types & API Contract
 * Source of truth for field names, types, nullability, and data-status values.
 */

export type DataStatus = "real" | "derived" | "simulated";

export type LayerId = "air" | "heat" | "waste";

export type NavigationItemId =
  | "overview"
  | "city-map"
  | "air-quality"
  | "urban-heat"
  | "waste-management"
  | "ask-ecotwin"
  | "what-if-simulator"
  | "settings";

export interface RiskScore {
  /**
   * Environmental risk score on a normalized 0-100 scale.
   * Higher values indicate greater environmental risk.
   * MUST allow null: a missing value denotes unavailable data and must never be converted to 0.
   */
  value: number | null;
  /** Status indicating origin of this reading (e.g. simulated demo data) */
  status: DataStatus;
  /** Optional confidence index between 0.0 and 1.0 */
  confidence?: number | null;
  /** Timestamp or reference period */
  recordedAt?: string;
  /** Qualitative risk severity classification based on the value */
  severityLabel?: "Low" | "Moderate" | "Elevated" | "High" | "Critical" | "Unavailable";
}

export interface ZoneMetrics {
  airRisk: RiskScore;
  heatRisk: RiskScore;
  wasteRisk: RiskScore;
  ecoScore: RiskScore; // Overall composite environmental risk score (higher = greater risk)
}

export interface EnvironmentalZone {
  /** Stable string identifier, e.g. "zone-shahupuri" */
  id: string;
  name: string;
  marathiName?: string;
  category: "Commercial" | "Residential" | "Heritage" | "Industrial" | "Mixed-use";
  wardIdentifier: string;
  description: string;
  /** Primary stressor/risk layer for this zone */
  primaryRiskLayer: LayerId;
  /** Top vulnerability factors observed */
  factors: string[];
  dataStatus: DataStatus;
  lastUpdated: string;

  /** Flat risk scores adhering strictly to the shared API contract */
  airRisk: number | null;
  heatRisk: number | null;
  wasteRisk: number | null;
  ecoScore: number | null;
  updatedAt: string | null;

  /** Rich multi-criteria metric details */
  metrics: ZoneMetrics;
}

export interface ZoneDetails extends EnvironmentalZone {
  air: {
    aqi: number | null;
    pm25: number | null;
    source: string | null;
    status: DataStatus;
    timestamp?: string | null;
  };
  heat: {
    temperatureC: number | null;
    heatRisk: number | null;
    source: string | null;
    status: DataStatus;
    timestamp?: string | null;
  };
  waste: {
    wasteRisk: number | null;
    reportedOverflowCount: number | null;
    collectionEfficiencyPct: number | null;
    source: string | null;
    status: DataStatus;
    timestamp?: string | null;
  };
}

export interface ZoneGeoJsonProperties {
  zoneId: string;
  name: string;
  marathiName?: string;
  wardIdentifier: string;
  category: string;
  dataStatus: DataStatus;
  airRisk: number | null;
  heatRisk: number | null;
  wasteRisk: number | null;
  ecoScore: number | null;
  primaryRiskLayer: LayerId;
  areaType: string;
}

export interface CitySummaryData {
  cityName: string;
  region: string;
  country: string;
  geographicCoordinates: {
    latitude: number;
    longitude: number;
  };
  metrics: {
    airQualityRisk: RiskScore;
    urbanHeatRisk: RiskScore;
    wasteManagementRisk: RiskScore;
    ecoScore: RiskScore;
  };
  dataStatus: DataStatus;
  lastUpdated: string;
  totalMonitoredZones: number;
  priorityZonesCount: number;
  governanceNote: string;
}

export interface SimulationIntervention {
  type: string;
  intensity: number; // 1 to 100
}

export interface SimulationRequest {
  zoneId: string;
  intervention: SimulationIntervention;
}

export interface SimulationResult {
  baselineEcoScore: number;
  estimatedEcoScore: number;
  estimatedChange: number;
  modelType: string;
  assumptions: string[];
}

export interface AskEvidenceItem {
  source?: string;
  metric?: string;
  value?: string | number | null;
  timestamp?: string | null;
  detail?: string;
}

export interface AskEcoTwinRequest {
  question: string;
  zoneId?: string;
}

export interface AskEcoTwinResponse {
  answer: string;
  zoneId: string | null;
  dataStatus: DataStatus;
  evidence: (string | AskEvidenceItem)[];
}
