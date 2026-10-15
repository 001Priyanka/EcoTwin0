import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SimulationService, ZoneNotFoundError, ZoneNullEcoScoreError } from '../services/simulationService.js';
import { validateSimulationPayload } from '../validation/requestValidator.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

/**
 * AWS Lambda handler for POST /simulate endpoint.
 *
 * Requirements:
 * - Retrieve selected zone from DynamoDB.
 * - Return HTTP 404 when zone does not exist.
 * - Validate JSON, zoneId, intervention type, and intensity (1-100).
 * - Reject invalid requests with HTTP 400 and structured error envelope.
 * - Keep simulation logic in a separate service.
 * - Use a deterministic, documented heuristic model.
 * - Never claim that a hypothetical result is a measured outcome.
 * - Preserve the meaning of EcoScore: higher means greater environmental risk.
 * - A negative estimatedChange means estimated risk decreased.
 * - Return modelType: "heuristic".
 * - Do not save simulation results to DynamoDB.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight options request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  // Parse JSON request body
  if (!event.body) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'MISSING_REQUEST_BODY',
          message: 'Request body is required for POST /simulate.',
        },
      }),
    };
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (_parseErr) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INVALID_JSON_BODY',
          message: 'Malformed request: payload could not be parsed as valid JSON.',
        },
      }),
    };
  }

  // Validate payload against schema and supported interventions
  const validation = validateSimulationPayload(parsedBody);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: validation.code,
          message: validation.message,
        },
      }),
    };
  }

  try {
    const result = await SimulationService.simulateScenario(validation.data);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (err: unknown) {
    if (err instanceof ZoneNotFoundError) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: {
            code: 'ZONE_NOT_FOUND',
            message: err.message,
          },
        }),
      };
    }

    if (err instanceof ZoneNullEcoScoreError) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: {
            code: 'CANNOT_SIMULATE_NULL_ECOSCORE',
            message: err.message,
          },
        }),
      };
    }

    // Log internal error server-side for CloudWatch observability
    console.error('Unhandled error in POST /simulate handler:', err);

    // Return safe structured error without leaking AWS internals
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal error occurred while executing scenario simulation.',
        },
      }),
    };
  }
};
