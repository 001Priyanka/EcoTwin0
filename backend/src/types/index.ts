/**
 * Shared API and Domain types for EcoTwin Kolhapur Backend.
 */

export type DataStatus = 'real' | 'derived' | 'simulated';

export type LayerId = 'air' | 'heat' | 'waste';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp?: string;
  version?: string;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  data?: T;
}

/**
 * Core EnvironmentalZone model strictly adhering to the EcoTwin API Contract.
 * Note:
 * - id: stable string identifier
 * - name: string
 * - airRisk, heatRisk, wasteRisk, ecoScore: null | number [0, 100]
 *   Missing values must be null, never 0.
 *   ecoScore denotes environmental risk (higher = greater risk).
 * - dataStatus: "real" | "derived" | "simulated"
 * - updatedAt: ISO 8601 UTC timestamp or null
 */
export interface EnvironmentalZone {
  id: string;
  name: string;
  marathiName?: string;
  category?: 'Commercial' | 'Residential' | 'Heritage' | 'Industrial' | 'Mixed-use';
  wardIdentifier?: string;
  description?: string;
  primaryRiskLayer?: LayerId;
  factors?: string[];
  dataStatus: DataStatus;
  updatedAt: string | null;
  airRisk: number | null;
  heatRisk: number | null;
  wasteRisk: number | null;
  ecoScore: number | null;
}

/**
 * DynamoDB item schema for storage in ZonesTable.
 * Uses `zoneId` as Partition Key (HASH).
 */
export interface ZoneRecordItem {
  zoneId: string;
  name: string;
  marathiName?: string;
  category?: string;
  wardIdentifier?: string;
  description?: string;
  primaryRiskLayer?: LayerId;
  factors?: string[];
  dataStatus: DataStatus;
  updatedAt: string | null;
  airRisk: number | null;
  heatRisk: number | null;
  wasteRisk: number | null;
  ecoScore: number | null;
  air?: Partial<AirTelemetry> | null;
  heat?: Partial<HeatTelemetry> | null;
  waste?: Partial<WasteTelemetry> | null;
  createdAt?: string;
}

/**
 * Response payload envelope for GET /zones conforming to shared contract.
 */
export interface GetZonesResponse {
  zones: EnvironmentalZone[];
}

/**
 * Granular telemetry sub-objects for air, urban heat, and waste management.
 * Conforms to ZoneDetails contract.
 */
export interface AirTelemetry {
  aqi: number | null;
  pm25: number | null;
  source: string | null;
  status: DataStatus;
  timestamp?: string | null;
}

export interface HeatTelemetry {
  temperatureC: number | null;
  heatRisk: number | null;
  source: string | null;
  status: DataStatus;
  timestamp?: string | null;
}

export interface WasteTelemetry {
  wasteRisk: number | null;
  reportedOverflowCount: number | null;
  collectionEfficiencyPct: number | null;
  source: string | null;
  status: DataStatus;
  timestamp?: string | null;
}

/**
 * Full detailed zone model returned by GET /zones/{zoneId}.
 */
export interface ZoneDetails extends EnvironmentalZone {
  air: AirTelemetry;
  heat: HeatTelemetry;
  waste: WasteTelemetry;
}

/**
 * Response payload envelope for GET /priority-zones conforming to shared contract.
 */
export interface PriorityZonesResponse {
  zones: EnvironmentalZone[];
}

/**
 * Intervention payload for scenario simulations.
 */
export interface SimulationIntervention {
  type: string;
  intensity: number; // 1 to 100
}

/**
 * Incoming request payload for POST /simulate.
 */
export interface SimulationRequest {
  zoneId: string;
  intervention: SimulationIntervention;
}

/**
 * Heuristic scenario simulation response payload returned by POST /simulate.
 */
export interface SimulationResult {
  baselineEcoScore: number;
  estimatedEcoScore: number;
  estimatedChange: number;
  modelType: string;
  assumptions: string[];
}

/**
 * Granular evidence item cited in AskEcoTwin responses.
 */
export interface AskEvidenceItem {
  source?: string;
  metric?: string;
  value?: string | number | null;
  timestamp?: string | null;
  detail?: string;
}

/**
 * Incoming request payload for POST /ask.
 */
export interface AskEcoTwinRequest {
  question: string;
  zoneId?: string;
}

/**
 * Environmental Q&A response payload returned by POST /ask.
 */
export interface AskEcoTwinResponse {
  answer: string;
  zoneId: string | null;
  dataStatus: DataStatus;
  evidence: (string | AskEvidenceItem)[];
}
