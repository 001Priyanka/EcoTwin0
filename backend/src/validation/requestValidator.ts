import { SimulationRequest, AskEcoTwinRequest } from '../types/index.js';

/**
 * Validation utilities for incoming requests.
 */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidZoneId(zoneId: unknown): zoneId is string {
  if (!isNonEmptyString(zoneId)) return false;
  // Alphanumeric with hyphens and underscores allowed, 1 to 128 chars
  return /^[a-zA-Z0-9_-]{1,128}$/.test(zoneId.trim());
}

export function validatePaginationLimit(limitParam: unknown, defaultLimit = 5, maxLimit = 20): number {
  if (limitParam === undefined || limitParam === null) {
    return defaultLimit;
  }
  const parsed = Number(limitParam);
  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultLimit;
  }
  return Math.min(Math.floor(parsed), maxLimit);
}

export interface ValidationSuccess<T> {
  valid: true;
  data: T;
}

export interface ValidationFailure {
  valid: false;
  code: string;
  message: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export const SUPPORTED_INTERVENTION_TYPES = [
  'urban-greening',
  'cool-roofs',
  'waste-segregation',
  'clean-transit',
  'riverbank-cleanup',
] as const;

/**
 * Validates incoming JSON payload for POST /simulate.
 */
export function validateSimulationPayload(body: unknown): ValidationResult<SimulationRequest> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      code: 'INVALID_REQUEST_BODY',
      message: 'Request body must be a valid JSON object.',
    };
  }

  const raw = body as Record<string, unknown>;

  if (!raw.zoneId || typeof raw.zoneId !== 'string' || raw.zoneId.trim() === '') {
    return {
      valid: false,
      code: 'INVALID_ZONE_ID',
      message: 'Field "zoneId" is required and must be a non-empty string.',
    };
  }

  const zoneId = raw.zoneId.trim();
  if (!isValidZoneId(zoneId)) {
    return {
      valid: false,
      code: 'INVALID_ZONE_ID_FORMAT',
      message: `Field "zoneId" "${zoneId}" contains invalid characters. Must be alphanumeric with hyphens or underscores.`,
    };
  }

  if (!raw.intervention || typeof raw.intervention !== 'object' || Array.isArray(raw.intervention)) {
    return {
      valid: false,
      code: 'INVALID_INTERVENTION',
      message: 'Field "intervention" is required and must be an object.',
    };
  }

  const interventionRaw = raw.intervention as Record<string, unknown>;

  if (
    typeof interventionRaw.type !== 'string' ||
    interventionRaw.type.trim() === ''
  ) {
    return {
      valid: false,
      code: 'INVALID_INTERVENTION_TYPE',
      message: 'Field "intervention.type" is required and must be a non-empty string.',
    };
  }

  const interventionType = interventionRaw.type.trim();
  if (!(SUPPORTED_INTERVENTION_TYPES as readonly string[]).includes(interventionType)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_INTERVENTION_TYPE',
      message: `Intervention type "${interventionType}" is unsupported. Supported types: ${SUPPORTED_INTERVENTION_TYPES.join(', ')}.`,
    };
  }

  const intensity = interventionRaw.intensity;
  if (
    typeof intensity !== 'number' ||
    !Number.isFinite(intensity) ||
    intensity < 1 ||
    intensity > 100
  ) {
    return {
      valid: false,
      code: 'INVALID_INTENSITY',
      message: `Field "intervention.intensity" must be a number between 1 and 100. Received: ${intensity}.`,
    };
  }

  return {
    valid: true,
    data: {
      zoneId,
      intervention: {
        type: interventionType,
        intensity: Math.round(intensity),
      },
    },
  };
}

/**
 * Validates incoming JSON payload for POST /ask.
 */
export function validateAskPayload(body: unknown): ValidationResult<AskEcoTwinRequest> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      code: 'INVALID_REQUEST_BODY',
      message: 'Request body must be a valid JSON object.',
    };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.question !== 'string' || raw.question.trim().length === 0) {
    return {
      valid: false,
      code: 'INVALID_QUESTION',
      message: 'Field "question" is required and must be a non-empty string.',
    };
  }

  const question = raw.question.trim();
  if (question.length < 3) {
    return {
      valid: false,
      code: 'QUESTION_TOO_SHORT',
      message: 'Field "question" must contain at least 3 characters.',
    };
  }

  if (question.length > 1000) {
    return {
      valid: false,
      code: 'QUESTION_TOO_LONG',
      message: 'Field "question" exceeds the maximum permitted length of 1000 characters.',
    };
  }

  let zoneId: string | undefined;
  if (raw.zoneId !== undefined && raw.zoneId !== null) {
    if (typeof raw.zoneId !== 'string' || raw.zoneId.trim() === '') {
      return {
        valid: false,
        code: 'INVALID_ZONE_ID',
        message: 'Field "zoneId" must be a non-empty string when provided.',
      };
    }
    const cleanZoneId = raw.zoneId.trim();
    if (!isValidZoneId(cleanZoneId)) {
      return {
        valid: false,
        code: 'INVALID_ZONE_ID_FORMAT',
        message: `Field "zoneId" "${cleanZoneId}" contains invalid characters.`,
      };
    }
    zoneId = cleanZoneId;
  }

  return {
    valid: true,
    data: {
      question,
      ...(zoneId ? { zoneId } : {}),
    },
  };
}
