/**
 * EcoTwin Kolhapur — What-If Scenario Simulation Service
 *
 * Provides typed transport and validation for POST /simulate.
 * Features:
 * - Request validation ensuring valid zoneId, intervention type, and intensity (1-100).
 * - Response validation ensuring valid baselineEcoScore, estimatedEcoScore,
 *   estimatedChange, modelType, and assumptions.
 * - Demo mode: returns clearly identified illustrative heuristic simulations.
 * - Live mode: calls POST /simulate through apiClient without silent mock fallback.
 * - EcoScore semantics: EcoScore is an environmental RISK score (higher = greater risk).
 *   A negative estimatedChange denotes a risk reduction.
 */

import { apiClient, isDemoMode, ApiClientError } from './apiClient';
import { SimulationRequest, SimulationResult } from '../types/environmental';
import { MOCK_PRIORITY_ZONES } from '../data/mockZones';

export interface InterventionOption {
  type: string;
  label: string;
  description: string;
  pillar: 'air' | 'heat' | 'waste' | 'multi';
  defaultIntensity: number;
}

export const INTERVENTION_OPTIONS: InterventionOption[] = [
  {
    type: 'urban-greening',
    label: 'Urban Tree Canopy & Vegetated Buffers',
    description: 'Plant high-density native tree corridors and riparian vegetation to absorb particulates and cool microclimates.',
    pillar: 'heat',
    defaultIntensity: 50,
  },
  {
    type: 'cool-roofs',
    label: 'Cool Roof & High-Albedo Surfaces',
    description: 'Apply solar-reflective thermal coatings to rooftops and dense paved commercial courtyards.',
    pillar: 'heat',
    defaultIntensity: 60,
  },
  {
    type: 'waste-segregation',
    label: 'Decentralized Waste Collection & Segregation',
    description: 'Deploy segregated collection routes and micro-composting units to prevent overflow backlogs and river dumping.',
    pillar: 'waste',
    defaultIntensity: 50,
  },
  {
    type: 'clean-transit',
    label: 'Low-Emission Transit & Freight Diversion',
    description: 'Enforce diesel freight bypass corridors and expand EV shuttle loops along congested trade arteries.',
    pillar: 'air',
    defaultIntensity: 45,
  },
  {
    type: 'riverbank-cleanup',
    label: 'Riparian Buffer & Drainage Traps',
    description: 'Install runoff silt traps and clean illegal riverbank dumping spots along the northern Panchganga corridor.',
    pillar: 'waste',
    defaultIntensity: 65,
  },
];

/**
 * Validates outgoing SimulationRequest payload.
 */
export function validateSimulationRequest(request: SimulationRequest): void {
  if (!request || typeof request !== 'object') {
    throw new ApiClientError({
      message: 'Invalid simulation request: payload must be an object.',
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }

  if (typeof request.zoneId !== 'string' || request.zoneId.trim() === '') {
    throw new ApiClientError({
      message: 'Validation error: A valid zoneId must be selected.',
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }

  if (!request.intervention || typeof request.intervention !== 'object') {
    throw new ApiClientError({
      message: 'Validation error: Missing intervention configuration in simulation request.',
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }

  if (typeof request.intervention.type !== 'string' || request.intervention.type.trim() === '') {
    throw new ApiClientError({
      message: 'Validation error: Intervention type must be specified.',
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }

  const intensity = request.intervention.intensity;
  if (typeof intensity !== 'number' || !Number.isFinite(intensity) || intensity < 1 || intensity > 100) {
    throw new ApiClientError({
      message: `Validation error: Intervention intensity must be a number between 1 and 100, got ${intensity}.`,
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }
}

/**
 * Validates incoming SimulationResult response against the contract:
 * {
 *   "baselineEcoScore": 65,
 *   "estimatedEcoScore": 52,
 *   "estimatedChange": -13,
 *   "modelType": "heuristic",
 *   "assumptions": ["Illustrative assumption"]
 * }
 */
export function validateSimulationResponse(raw: unknown): SimulationResult {
  if (!raw || typeof raw !== 'object') {
    throw new ApiClientError({
      message: 'Invalid simulation response: Expected an object from POST /simulate.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  const obj = raw as Record<string, unknown>;

  // Validate baselineEcoScore (0-100)
  if (
    typeof obj.baselineEcoScore !== 'number' ||
    !Number.isFinite(obj.baselineEcoScore) ||
    obj.baselineEcoScore < 0 ||
    obj.baselineEcoScore > 100
  ) {
    throw new ApiClientError({
      message: `Validation error: baselineEcoScore must be a number between 0 and 100, got ${obj.baselineEcoScore}.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  // Validate estimatedEcoScore (0-100)
  if (
    typeof obj.estimatedEcoScore !== 'number' ||
    !Number.isFinite(obj.estimatedEcoScore) ||
    obj.estimatedEcoScore < 0 ||
    obj.estimatedEcoScore > 100
  ) {
    throw new ApiClientError({
      message: `Validation error: estimatedEcoScore must be a number between 0 and 100, got ${obj.estimatedEcoScore}.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  // Validate estimatedChange (-100 to 100)
  if (
    typeof obj.estimatedChange !== 'number' ||
    !Number.isFinite(obj.estimatedChange) ||
    obj.estimatedChange < -100 ||
    obj.estimatedChange > 100
  ) {
    throw new ApiClientError({
      message: `Validation error: estimatedChange must be a number between -100 and 100, got ${obj.estimatedChange}.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  // Validate modelType
  if (typeof obj.modelType !== 'string' || obj.modelType.trim() === '') {
    throw new ApiClientError({
      message: `Validation error: modelType must be a non-empty string, got ${typeof obj.modelType}.`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  // Validate assumptions
  if (!Array.isArray(obj.assumptions) || obj.assumptions.length === 0) {
    throw new ApiClientError({
      message: 'Validation error: assumptions must be a non-empty array of strings.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  const assumptions = obj.assumptions.map((item, idx) => {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new ApiClientError({
        message: `Validation error: assumption at index ${idx} must be a non-empty string.`,
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }
    return item.trim();
  });

  return {
    baselineEcoScore: obj.baselineEcoScore,
    estimatedEcoScore: obj.estimatedEcoScore,
    estimatedChange: obj.estimatedChange,
    modelType: obj.modelType.trim(),
    assumptions,
  };
}

/**
 * Executes scenario modeling for a specific zone and intervention.
 * Endpoint: POST /simulate
 *
 * Rules:
 * 1. Validates request parameters before dispatch.
 * 2. In demo mode: returns an illustrative heuristic simulation result.
 * 3. In live mode: dispatches POST /simulate through apiClient and validates response.
 * 4. NEVER silently substitutes mock data on failure in live mode.
 */
export async function simulateScenario(request: SimulationRequest): Promise<SimulationResult> {
  validateSimulationRequest(request);

  if (isDemoMode()) {
    console.debug('[simulationApi] Demo mode active. Generating illustrative scenario result.');
    const matchedZone = MOCK_PRIORITY_ZONES.find((z) => z.id === request.zoneId);
    const baselineEcoScore = matchedZone?.ecoScore ?? 70;

    // Heuristic estimated change based on intervention intensity (1-100)
    // Higher intensity denotes greater mitigation of environmental risk
    const intensityFraction = request.intervention.intensity / 100;
    const estimatedReduction = Math.max(1, Math.round(baselineEcoScore * 0.22 * intensityFraction));
    const estimatedChange = -estimatedReduction; // Negative indicates risk reduction
    const estimatedEcoScore = Math.max(0, baselineEcoScore + estimatedChange);

    const interventionInfo = INTERVENTION_OPTIONS.find((opt) => opt.type === request.intervention.type);
    const interventionLabel = interventionInfo?.label || request.intervention.type;
    const zoneName = matchedZone?.name || request.zoneId;

    return {
      baselineEcoScore,
      estimatedEcoScore,
      estimatedChange,
      modelType: 'heuristic',
      assumptions: [
        'Illustrative heuristic model: Estimates denote potential scenario changes, not empirical field measurements.',
        `Assumes ${request.intervention.intensity}% target deployment density for "${interventionLabel}" across ${zoneName}.`,
        'EcoScore denotes environmental risk (0–100 scale); negative change signifies estimated vulnerability reduction.',
        'Assumes standard seasonal weather patterns without extreme climatic anomalies or localized flooding.',
        'Simplified linear response assumption; boundary spillover effects and saturation non-linearities are not resolved.'
      ],
    };
  }

  // Live mode: POST /simulate via apiClient
  const response = await apiClient.post<unknown>('/simulate', request);
  return validateSimulationResponse(response);
}

export const simulationApi = {
  simulateScenario,
  validateSimulationRequest,
  validateSimulationResponse,
  INTERVENTION_OPTIONS,
};
