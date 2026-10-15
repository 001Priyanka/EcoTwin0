/**
 * EcoTwin Kolhapur — Ask EcoTwin API Service
 *
 * Implements client transport and validation for POST /ask.
 * Features:
 * - Request validation ensuring non-empty question and optional zoneId.
 * - Response validation verifying answer, zoneId, dataStatus, and evidence.
 * - Demo mode: returns illustrative demonstration answers grounded in the mock zones.
 * - Live mode: calls POST /ask via apiClient without silent fallback to mocks.
 * - Honest data provenance labeling (real, derived, simulated).
 */

import { apiClient, isDemoMode, ApiClientError } from './apiClient';
import { AskEcoTwinRequest, AskEcoTwinResponse, DataStatus } from '../types/environmental';
import { MOCK_PRIORITY_ZONES } from '../data/mockZones';

/**
 * Validates outgoing AskEcoTwinRequest payload.
 */
export function validateAskRequest(request: AskEcoTwinRequest): void {
  if (!request || typeof request !== 'object') {
    throw new ApiClientError({
      message: 'Invalid request: Ask payload must be an object.',
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }

  if (typeof request.question !== 'string' || request.question.trim() === '') {
    throw new ApiClientError({
      message: 'Validation error: Question must be a non-empty string.',
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }

  if (request.question.trim().length < 3) {
    throw new ApiClientError({
      message: 'Validation error: Question is too short (minimum 3 characters required).',
      code: 'INVALID_REQUEST',
      status: 400,
    });
  }

  if (request.zoneId !== undefined && request.zoneId !== null) {
    if (typeof request.zoneId !== 'string') {
      throw new ApiClientError({
        message: 'Validation error: zoneId must be a string if provided.',
        code: 'INVALID_REQUEST',
        status: 400,
      });
    }
  }
}

/**
 * Validates incoming AskEcoTwinResponse payload matching:
 * {
 *   "answer": "...",
 *   "zoneId": "...",
 *   "dataStatus": "simulated",
 *   "evidence": []
 * }
 */
export function validateAskResponse(raw: unknown): AskEcoTwinResponse {
  if (!raw || typeof raw !== 'object') {
    throw new ApiClientError({
      message: 'Invalid response: Expected an object from POST /ask.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  const obj = raw as Record<string, unknown>;

  // Validate answer
  if (typeof obj.answer !== 'string' || obj.answer.trim() === '') {
    throw new ApiClientError({
      message: 'Validation error: answer must be a non-empty string.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  // Validate zoneId (string or null or undefined)
  let zoneId: string | null = null;
  if (obj.zoneId !== undefined && obj.zoneId !== null) {
    if (typeof obj.zoneId !== 'string') {
      throw new ApiClientError({
        message: `Validation error: zoneId must be a string or null, got ${typeof obj.zoneId}.`,
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    }
    zoneId = obj.zoneId.trim();
  }

  // Validate dataStatus
  const validStatuses: DataStatus[] = ['real', 'derived', 'simulated'];
  if (typeof obj.dataStatus !== 'string' || !validStatuses.includes(obj.dataStatus as DataStatus)) {
    throw new ApiClientError({
      message: `Validation error: dataStatus must be 'real', 'derived', or 'simulated', got "${String(obj.dataStatus)}".`,
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  // Validate evidence
  if (obj.evidence !== undefined && obj.evidence !== null && !Array.isArray(obj.evidence)) {
    throw new ApiClientError({
      message: 'Validation error: evidence must be an array.',
      code: 'VALIDATION_ERROR',
      status: 422,
    });
  }

  const evidence = Array.isArray(obj.evidence) ? obj.evidence : [];

  return {
    answer: obj.answer.trim(),
    zoneId,
    dataStatus: obj.dataStatus as DataStatus,
    evidence,
  };
}

/**
 * Dispatches an environmental question to the EcoTwin intelligence service.
 * Endpoint: POST /ask
 *
 * Rules:
 * 1. Validates request before sending.
 * 2. In demo mode: returns an illustrative response citing simulated mock observations.
 * 3. In live mode: sends POST /ask via apiClient and validates response.
 * 4. Never silently falls back to demo data on live failure.
 */
export async function askEcoTwin(request: AskEcoTwinRequest): Promise<AskEcoTwinResponse> {
  validateAskRequest(request);

  if (isDemoMode()) {
    console.debug('[askApi] Demo mode active. Generating illustrative Q&A response.');
    const qLower = request.question.toLowerCase();
    const zoneId = request.zoneId || null;
    const targetZone = zoneId ? MOCK_PRIORITY_ZONES.find((z) => z.id === zoneId) : null;

    let answer = '';
    const evidence: string[] = [];

    if (targetZone) {
      const zoneName = targetZone.name;
      const score = targetZone.ecoScore ?? 'unavailable';
      const air = targetZone.airRisk ?? 'unavailable';
      const heat = targetZone.heatRisk ?? 'unavailable';
      const waste = targetZone.wasteRisk ?? 'unavailable';

      const rawScore = targetZone.ecoScore;
      const scoreLabel = rawScore === null ? 'unavailable' : `${rawScore}`;
      const severity = rawScore === null ? 'Unavailable' : rawScore >= 75 ? 'High Risk' : rawScore >= 50 ? 'Elevated Risk' : 'Low Risk';

      if (qLower.includes('air') || qLower.includes('pm2.5') || qLower.includes('pollution')) {
        answer = `In ${zoneName} (${targetZone.wardIdentifier}), estimated Air Quality Risk is ${air}/100. Observed stressors include corridor diesel transit and localized particulate accumulation. Estimated AQI is currently ${targetZone.air.aqi ?? 'unavailable'} with PM2.5 at ${targetZone.air.pm25 ?? 'unavailable'} µg/m³.`;
        evidence.push(`Air quality sensor source: "${targetZone.air.source || 'Standard air telemetry node'}"`);
        evidence.push(`Observed key factors: ${targetZone.factors.join(', ')}`);
      } else if (qLower.includes('heat') || qLower.includes('temperature') || qLower.includes('thermal')) {
        answer = `In ${zoneName}, Urban Heat Risk is recorded at ${heat}/100. The estimated surface thermal index reaches ${targetZone.heat.temperatureC ?? 'unavailable'} °C due to dense paved surfaces and built courtyard thermal retention.`;
        evidence.push(`Thermal radiance sensor: "${targetZone.heat.source || 'Microclimate thermal model'}"`);
        evidence.push(`Primary risk category: ${targetZone.category} corridor`);
      } else if (qLower.includes('waste') || qLower.includes('garbage') || qLower.includes('panchganga')) {
        answer = `Waste Management Risk for ${zoneName} is estimated at ${waste !== 'unavailable' ? `${waste}/100` : 'unavailable (no continuous telemetry stream)'}. Key observation notes point to municipal transit backlog and riparian interface runoff.`;
        if (targetZone.waste.source) {
          evidence.push(`Waste telemetry: "${targetZone.waste.source}" with ${targetZone.waste.reportedOverflowCount ?? 0} backlog reports.`);
        }
      } else {
        answer = `For ${zoneName} (${targetZone.wardIdentifier}), composite EcoScore (environmental risk) is ranked at ${scoreLabel}/100 (${severity}). Primary stressor is identified as ${targetZone.primaryRiskLayer.toUpperCase()} risk with observed drivers: ${targetZone.factors.join(', ')}.`;
        evidence.push(`Composite risk rank: EcoScore ${scoreLabel}/100 (Higher score denotes higher environmental vulnerability)`);
        evidence.push(`Primary risk layer: ${targetZone.primaryRiskLayer.toUpperCase()}`);
        evidence.push(`Telemetry status: ${targetZone.dataStatus} data stream`);
      }
    } else {
      answer = `Across Kolhapur's monitored municipal zones, composite environmental risk averages 71/100 (Elevated Risk). The top priority vulnerability sectors are Panchganga Ghat & Shiroli Gateway (#1, waste & runoff risk 88/100), Shahupuri Commercial Hub (#2, transit air risk 76/100), and Mahadwar Road Precinct (#3, thermal microclimate heat risk 82/100).`;
      evidence.push(`City-wide summary: 18 monitored sectors across Kolhapur Corporation bounds`);
      evidence.push(`3 priority demonstration hotspots currently mapped`);
    }

    return {
      answer,
      zoneId,
      dataStatus: 'simulated',
      evidence,
    };
  }

  // Live mode: POST /ask via apiClient
  const payload: Record<string, string> = {
    question: request.question.trim(),
  };
  if (request.zoneId) {
    payload.zoneId = request.zoneId.trim();
  }

  const response = await apiClient.post<unknown>('/ask', payload);
  return validateAskResponse(response);
}

export const askApi = {
  askEcoTwin,
  validateAskRequest,
  validateAskResponse,
};
