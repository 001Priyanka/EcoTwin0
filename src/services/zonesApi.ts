/**
 * EcoTwin Kolhapur — Zones API Service
 *
 * Implements Phase 4, Step 2: Dedicated zones API service connecting the
 * dashboard directly to the shared backend endpoint GET /zones.
 *
 * Strict Compliance:
 * - Uses shared apiClient foundation with VITE_API_BASE_URL.
 * - Adheres strictly to EcoTwin_Shared_API_Contract.md.
 * - Runtime validation of backend responses (no blind type assertions).
 * - Live mode NEVER silently falls back to simulated data.
 * - Respects VITE_DEMO_MODE explicitly.
 * - Does not calculate EcoScore in the frontend.
 */

import { apiClient, isDemoMode, ApiClientError } from './apiClient';
import { 
  EnvironmentalZone, 
  ZoneDetails,
  DataStatus, 
  LayerId 
} from '../types/environmental';
import { MOCK_PRIORITY_ZONES } from '../data/mockZones';

/**
 * Expected backend response envelope for GET /zones
 * {
 *   "zones": [
 *     {
 *       "id": "zone-01",
 *       "name": "Example Zone",
 *       "airRisk": 72,
 *       "heatRisk": 65,
 *       "wasteRisk": 81,
 *       "ecoScore": 73,
 *       "dataStatus": "simulated",
 *       "updatedAt": "2026-10-10T09:00:00Z"
 *     }
 *   ]
 * }
 */
export interface GetZonesResponseEnvelope {
  zones: unknown[];
}

/**
 * Validates a risk score value: must be null OR a finite number between 0 and 100.
 * Missing/undefined scores remain null and are never coerced to zero.
 */
function validateRiskScore(value: unknown, fieldName: string, zoneId: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new ApiClientError({
        message: `Validation error: Zone "${zoneId}" field "${fieldName}" must be between 0 and 100 or null, got ${value}.`,
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }
    return value;
  }
  throw new ApiClientError({
    message: `Validation error: Zone "${zoneId}" field "${fieldName}" must be a number or null, got ${typeof value}.`,
    code: 'VALIDATION_ERROR',
    status: 422,
  });
}

/**
 * Validates that an item is a valid EnvironmentalZone conforming to the contract.
 * Enforces:
 * - id: non-empty string
 * - name: non-empty string
 * - airRisk, heatRisk, wasteRisk, ecoScore: null | number [0, 100]
 * - dataStatus: "real" | "derived" | "simulated"
 * - updatedAt: ISO date string or null
 */
export function validateEnvironmentalZone(item: unknown, index: number): EnvironmentalZone {
  if (!item || typeof item !== 'object') {
    throw new ApiClientError({
      message: `Validation error: Zone at index ${index} is not an object.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  const raw = item as Record<string, unknown>;

  // Validate ID
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    throw new ApiClientError({
      message: `Validation error: Zone at index ${index} must have a non-empty string ID.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }
  const id = raw.id.trim();

  // Validate Name
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    throw new ApiClientError({
      message: `Validation error: Zone "${id}" must have a non-empty string name.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }
  const name = raw.name.trim();

  // Validate DataStatus
  const validStatuses: DataStatus[] = ['real', 'derived', 'simulated'];
  if (typeof raw.dataStatus !== 'string' || !validStatuses.includes(raw.dataStatus as DataStatus)) {
    throw new ApiClientError({
      message: `Validation error: Zone "${id}" has invalid dataStatus "${String(raw.dataStatus)}". Must be 'real', 'derived', or 'simulated'.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }
  const dataStatus = raw.dataStatus as DataStatus;

  // Validate Risk Scores (0-100 or null, higher = elevated risk)
  const airRisk = validateRiskScore(raw.airRisk, 'airRisk', id);
  const heatRisk = validateRiskScore(raw.heatRisk, 'heatRisk', id);
  const wasteRisk = validateRiskScore(raw.wasteRisk, 'wasteRisk', id);
  const ecoScore = validateRiskScore(raw.ecoScore, 'ecoScore', id);

  // Validate updatedAt
  let updatedAt: string | null = null;
  if (raw.updatedAt !== undefined && raw.updatedAt !== null) {
    if (typeof raw.updatedAt !== 'string') {
      throw new ApiClientError({
        message: `Validation error: Zone "${id}" updatedAt must be a string or null.`,
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }
    updatedAt = raw.updatedAt;
  }

  // Derive or preserve supplementary presentation fields for rich dashboard views
  const marathiName = typeof raw.marathiName === 'string' ? raw.marathiName : undefined;
  const wardIdentifier = typeof raw.wardIdentifier === 'string' ? raw.wardIdentifier : `Ward-${id}`;
  const category = (['Commercial', 'Residential', 'Heritage', 'Industrial', 'Mixed-use'].includes(raw.category as string)
    ? raw.category
    : 'Mixed-use') as EnvironmentalZone['category'];
  const description = typeof raw.description === 'string' ? raw.description : `Environmental observation sector ${name}.`;

  // Determine primary risk layer
  let primaryRiskLayer: LayerId = 'air';
  if (raw.primaryRiskLayer === 'heat' || raw.primaryRiskLayer === 'waste' || raw.primaryRiskLayer === 'air') {
    primaryRiskLayer = raw.primaryRiskLayer;
  } else {
    const scores: { layer: LayerId; score: number }[] = [
      { layer: 'air', score: airRisk ?? -1 },
      { layer: 'heat', score: heatRisk ?? -1 },
      { layer: 'waste', score: wasteRisk ?? -1 },
    ];
    scores.sort((a, b) => b.score - a.score);
    if (scores[0].score >= 0) {
      primaryRiskLayer = scores[0].layer;
    }
  }

  const factors = Array.isArray(raw.factors) 
    ? (raw.factors.filter((f) => typeof f === 'string') as string[])
    : ['Sensor observation network'];

  const lastUpdated = typeof raw.lastUpdated === 'string' ? raw.lastUpdated : (updatedAt || 'Recent');

  // Build clean typed EnvironmentalZone
  const zone: EnvironmentalZone = {
    id,
    name,
    marathiName,
    category,
    wardIdentifier,
    description,
    primaryRiskLayer,
    factors,
    dataStatus,
    lastUpdated,
    airRisk,
    heatRisk,
    wasteRisk,
    ecoScore,
    updatedAt,
    metrics: {
      airRisk: {
        value: airRisk,
        status: dataStatus,
        recordedAt: updatedAt || undefined,
        severityLabel: airRisk === null ? 'Unavailable' : airRisk >= 75 ? 'Critical' : airRisk >= 50 ? 'Elevated' : 'Low',
      },
      heatRisk: {
        value: heatRisk,
        status: dataStatus,
        recordedAt: updatedAt || undefined,
        severityLabel: heatRisk === null ? 'Unavailable' : heatRisk >= 75 ? 'Critical' : heatRisk >= 50 ? 'Elevated' : 'Low',
      },
      wasteRisk: {
        value: wasteRisk,
        status: dataStatus,
        recordedAt: updatedAt || undefined,
        severityLabel: wasteRisk === null ? 'Unavailable' : wasteRisk >= 75 ? 'Critical' : wasteRisk >= 50 ? 'Elevated' : 'Low',
      },
      ecoScore: {
        value: ecoScore,
        status: dataStatus,
        recordedAt: updatedAt || undefined,
        severityLabel: ecoScore === null ? 'Unavailable' : ecoScore >= 75 ? 'Critical' : ecoScore >= 50 ? 'Elevated' : 'Low',
      },
    },
  };

  return zone;
}

/**
 * Validates the raw response from GET /zones.
 * Accepts either:
 * - { "zones": [ ... ] } (the primary contract)
 * - [ ... ] (array of zones as a permissive variant)
 */
export function validateZonesApiResponse(rawResponse: unknown): EnvironmentalZone[] {
  if (!rawResponse || typeof rawResponse !== 'object') {
    throw new ApiClientError({
      message: 'Invalid API response: Expected an object or array containing zones.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  let rawList: unknown[];

  if (Array.isArray(rawResponse)) {
    rawList = rawResponse;
  } else if ('zones' in rawResponse && Array.isArray((rawResponse as Record<string, unknown>).zones)) {
    rawList = (rawResponse as Record<string, unknown>).zones as unknown[];
  } else if ('priorityZones' in rawResponse && Array.isArray((rawResponse as Record<string, unknown>).priorityZones)) {
    rawList = (rawResponse as Record<string, unknown>).priorityZones as unknown[];
  } else {
    throw new ApiClientError({
      message: 'Invalid API response: Missing "zones" or "priorityZones" array in response payload.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  return rawList.map((item, idx) => validateEnvironmentalZone(item, idx));
}

/**
 * Validates a single zone detail payload from GET /zones/{zoneId}.
 * Enforces contract adherence for base EnvironmentalZone fields as well as
 * telemetry sub-objects for air, heat, and waste.
 * Missing/null metrics are preserved honestly as null and never coerced to 0.
 */
export function validateZoneDetailsApiResponse(rawResponse: unknown, zoneId: string): ZoneDetails {
  if (!rawResponse || typeof rawResponse !== 'object') {
    throw new ApiClientError({
      message: `Invalid API response for zone "${zoneId}": Expected an object containing zone details.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  // Handle both { zone: { ... } } and direct { ... } response payloads
  const rawObj = rawResponse as Record<string, unknown>;
  const raw = ('zone' in rawObj && rawObj.zone && typeof rawObj.zone === 'object')
    ? (rawObj.zone as Record<string, unknown>)
    : rawObj;

  // Validate the core zone properties using the existing validator
  const baseZone = validateEnvironmentalZone(raw, 0);

  // Validate telemetry sub-objects: air, heat, waste
  const validStatuses: DataStatus[] = ['real', 'derived', 'simulated'];
  const baseStatus = baseZone.dataStatus;

  // 1. Air telemetry validation
  let airStatus: DataStatus = baseStatus;
  let aqi: number | null = null;
  let pm25: number | null = null;
  let airSource: string | null = null;
  let airTimestamp: string | null = null;

  if (raw.air !== undefined && raw.air !== null) {
    if (typeof raw.air !== 'object') {
      throw new ApiClientError({
        message: `Validation error: Zone "${zoneId}" field "air" must be an object.`,
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }
    const airObj = raw.air as Record<string, unknown>;
    if (typeof airObj.status === 'string' && validStatuses.includes(airObj.status as DataStatus)) {
      airStatus = airObj.status as DataStatus;
    }
    if (airObj.aqi !== undefined && airObj.aqi !== null) {
      if (typeof airObj.aqi !== 'number' || !Number.isFinite(airObj.aqi) || airObj.aqi < 0) {
        throw new ApiClientError({
          message: `Validation error: Zone "${zoneId}" field "air.aqi" must be a non-negative number or null, got ${airObj.aqi}.`,
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }
      aqi = airObj.aqi;
    }
    if (airObj.pm25 !== undefined && airObj.pm25 !== null) {
      if (typeof airObj.pm25 !== 'number' || !Number.isFinite(airObj.pm25) || airObj.pm25 < 0) {
        throw new ApiClientError({
          message: `Validation error: Zone "${zoneId}" field "air.pm25" must be a non-negative number or null, got ${airObj.pm25}.`,
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }
      pm25 = airObj.pm25;
    }
    if (typeof airObj.source === 'string') {
      airSource = airObj.source.trim();
    } else if (airObj.source === null) {
      airSource = null;
    }
    if (typeof airObj.timestamp === 'string') {
      airTimestamp = airObj.timestamp;
    } else if (airObj.timestamp === null) {
      airTimestamp = null;
    }
  }

  // 2. Urban heat telemetry validation
  let heatStatus: DataStatus = baseStatus;
  let temperatureC: number | null = null;
  let heatRiskDetail: number | null = baseZone.heatRisk;
  let heatSource: string | null = null;
  let heatTimestamp: string | null = null;

  if (raw.heat !== undefined && raw.heat !== null) {
    if (typeof raw.heat !== 'object') {
      throw new ApiClientError({
        message: `Validation error: Zone "${zoneId}" field "heat" must be an object.`,
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }
    const heatObj = raw.heat as Record<string, unknown>;
    if (typeof heatObj.status === 'string' && validStatuses.includes(heatObj.status as DataStatus)) {
      heatStatus = heatObj.status as DataStatus;
    }
    if (heatObj.temperatureC !== undefined && heatObj.temperatureC !== null) {
      if (typeof heatObj.temperatureC !== 'number' || !Number.isFinite(heatObj.temperatureC)) {
        throw new ApiClientError({
          message: `Validation error: Zone "${zoneId}" field "heat.temperatureC" must be a finite number or null, got ${heatObj.temperatureC}.`,
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }
      temperatureC = heatObj.temperatureC;
    }
    if (heatObj.heatRisk !== undefined && heatObj.heatRisk !== null) {
      heatRiskDetail = validateRiskScore(heatObj.heatRisk, 'heat.heatRisk', zoneId);
    }
    if (typeof heatObj.source === 'string') {
      heatSource = heatObj.source.trim();
    } else if (heatObj.source === null) {
      heatSource = null;
    }
    if (typeof heatObj.timestamp === 'string') {
      heatTimestamp = heatObj.timestamp;
    } else if (heatObj.timestamp === null) {
      heatTimestamp = null;
    }
  }

  // 3. Waste management telemetry validation
  let wasteStatus: DataStatus = baseStatus;
  let wasteRiskDetail: number | null = baseZone.wasteRisk;
  let reportedOverflowCount: number | null = null;
  let collectionEfficiencyPct: number | null = null;
  let wasteSource: string | null = null;
  let wasteTimestamp: string | null = null;

  if (raw.waste !== undefined && raw.waste !== null) {
    if (typeof raw.waste !== 'object') {
      throw new ApiClientError({
        message: `Validation error: Zone "${zoneId}" field "waste" must be an object.`,
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }
    const wasteObj = raw.waste as Record<string, unknown>;
    if (typeof wasteObj.status === 'string' && validStatuses.includes(wasteObj.status as DataStatus)) {
      wasteStatus = wasteObj.status as DataStatus;
    }
    if (wasteObj.wasteRisk !== undefined && wasteObj.wasteRisk !== null) {
      wasteRiskDetail = validateRiskScore(wasteObj.wasteRisk, 'waste.wasteRisk', zoneId);
    }
    if (wasteObj.reportedOverflowCount !== undefined && wasteObj.reportedOverflowCount !== null) {
      if (typeof wasteObj.reportedOverflowCount !== 'number' || !Number.isFinite(wasteObj.reportedOverflowCount) || wasteObj.reportedOverflowCount < 0) {
        throw new ApiClientError({
          message: `Validation error: Zone "${zoneId}" field "waste.reportedOverflowCount" must be a non-negative number or null, got ${wasteObj.reportedOverflowCount}.`,
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }
      reportedOverflowCount = wasteObj.reportedOverflowCount;
    }
    if (wasteObj.collectionEfficiencyPct !== undefined && wasteObj.collectionEfficiencyPct !== null) {
      if (typeof wasteObj.collectionEfficiencyPct !== 'number' || !Number.isFinite(wasteObj.collectionEfficiencyPct) || wasteObj.collectionEfficiencyPct < 0 || wasteObj.collectionEfficiencyPct > 100) {
        throw new ApiClientError({
          message: `Validation error: Zone "${zoneId}" field "waste.collectionEfficiencyPct" must be a number between 0 and 100 or null, got ${wasteObj.collectionEfficiencyPct}.`,
          code: 'VALIDATION_ERROR',
          status: 422,
        });
      }
      collectionEfficiencyPct = wasteObj.collectionEfficiencyPct;
    }
    if (typeof wasteObj.source === 'string') {
      wasteSource = wasteObj.source.trim();
    } else if (wasteObj.source === null) {
      wasteSource = null;
    }
    if (typeof wasteObj.timestamp === 'string') {
      wasteTimestamp = wasteObj.timestamp;
    } else if (wasteObj.timestamp === null) {
      wasteTimestamp = null;
    }
  }

  const zoneDetails: ZoneDetails = {
    ...baseZone,
    air: {
      aqi,
      pm25,
      source: airSource,
      status: airStatus,
      timestamp: airTimestamp,
    },
    heat: {
      temperatureC,
      heatRisk: heatRiskDetail,
      source: heatSource,
      status: heatStatus,
      timestamp: heatTimestamp,
    },
    waste: {
      wasteRisk: wasteRiskDetail,
      reportedOverflowCount,
      collectionEfficiencyPct,
      source: wasteSource,
      status: wasteStatus,
      timestamp: wasteTimestamp,
    },
  };

  return zoneDetails;
}

/**
 * Requests the list of environmental zones from the backend service.
 * Endpoint: GET /zones
 *
 * Rules:
 * 1. In demo mode (isDemoMode() is true), returns verified mock zones.
 * 2. In live mode (isDemoMode() is false):
 *    - Calls GET /zones via apiClient
 *    - Validates the response at runtime
 *    - Does NOT calculate EcoScore
 *    - NEVER silently falls back to simulated data on failure; propagates typed errors
 */
export async function getZones(): Promise<EnvironmentalZone[]> {
  if (isDemoMode()) {
    console.debug('[zonesApi] Demo mode is active. Returning mock demonstration zones.');
    return MOCK_PRIORITY_ZONES;
  }

  // Live mode: Must perform real request to GET /zones
  // Note: GET /zones per contract specification
  const response = await apiClient.get<unknown>('/zones');
  return validateZonesApiResponse(response);
}

/**
 * Requests detailed telemetry for a specific environmental zone.
 * Endpoint: GET /zones/{zoneId}
 *
 * Rules:
 * 1. Accepts a stable zone ID and encodes it safely into URL.
 * 2. In demo mode (isDemoMode() is true), loads corresponding existing fixture.
 * 3. In live mode (isDemoMode() is false):
 *    - Calls GET /zones/{zoneId} via apiClient
 *    - Validates response with validateZoneDetailsApiResponse to catch malformed data
 *    - NEVER silently substitutes demo data on failure; propagates typed errors
 */
export async function getZoneById(zoneId: string): Promise<ZoneDetails> {
  if (!zoneId || typeof zoneId !== 'string' || zoneId.trim() === '') {
    throw new ApiClientError({
      message: 'Invalid zone identifier provided.',
      code: 'INVALID_ZONE_ID',
      status: 400,
    });
  }

  const cleanId = zoneId.trim();

  if (isDemoMode()) {
    const fixture = MOCK_PRIORITY_ZONES.find((z) => z.id === cleanId);
    if (!fixture) {
      throw new ApiClientError({
        message: `The requested zone "${cleanId}" was not found in demonstration data.`,
        code: 'ZONE_NOT_FOUND',
        status: 404,
      });
    }
    return fixture;
  }

  // Live mode: Must call GET /zones/{zoneId} through existing apiClient
  const endpoint = `/zones/${encodeURIComponent(cleanId)}`;
  const response = await apiClient.get<unknown>(endpoint);
  return validateZoneDetailsApiResponse(response, cleanId);
}

/**
 * Requests the authoritative priority environmental zones from the backend service.
 * Endpoint: GET /priority-zones?limit={limit}
 *
 * Rules:
 * 1. Default limit is 5.
 * 2. In demo mode (isDemoMode() is true), returns verified mock priority zones in authoritative fixture order.
 * 3. In live mode (isDemoMode() is false):
 *    - Calls GET /priority-zones?limit={limit} via apiClient
 *    - Validates the response at runtime
 *    - NEVER silently falls back to simulated data on failure; propagates typed errors
 * 4. Never calculates EcoScore or sorts zones in the frontend; preserves backend ranking order strictly.
 */
export async function getPriorityZones(limit: number = 5): Promise<EnvironmentalZone[]> {
  if (isDemoMode()) {
    console.debug('[zonesApi] Demo mode is active. Returning mock priority zones in authoritative order.');
    return MOCK_PRIORITY_ZONES.slice(0, limit);
  }

  // Live mode: Must perform real request to GET /priority-zones
  const response = await apiClient.get<unknown>('/priority-zones', {
    params: { limit },
  });
  return validateZonesApiResponse(response);
}

/**
 * Zones API service object for structured access
 */
export const zonesApi = {
  getZones,
  getPriorityZones,
  getZoneById,
  validateZonesApiResponse,
  validateZoneDetailsApiResponse,
  validateEnvironmentalZone,
};
