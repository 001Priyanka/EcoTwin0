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
  } else {
    throw new ApiClientError({
      message: 'Invalid API response: Missing "zones" array in response payload.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  return rawList.map((item, idx) => validateEnvironmentalZone(item, idx));
}

/**
 * Requests the list of environmental zones from the backend service.
 * Endpoint: GET /zones
 *
 * Rules:
 * 1. In demo mode (VITE_DEMO_MODE=true), returns verified mock zones.
 * 2. In live mode (VITE_DEMO_MODE=false or unset):
 *    - Calls GET /zones via apiClient
 *    - Validates the response at runtime
 *    - Does NOT calculate EcoScore
 *    - NEVER silently falls back to simulated data on failure; propagates typed errors
 */
export async function getZones(): Promise<EnvironmentalZone[]> {
  if (isDemoMode()) {
    console.debug('[zonesApi] VITE_DEMO_MODE is active. Returning mock demonstration zones.');
    return MOCK_PRIORITY_ZONES;
  }

  // Live mode: Must perform real request to GET /zones
  // Note: GET /zones per contract specification
  const response = await apiClient.get<unknown>('/zones');
  return validateZonesApiResponse(response);
}

/**
 * Zones API service object for structured access
 */
export const zonesApi = {
  getZones,
  validateZonesApiResponse,
  validateEnvironmentalZone,
};
