import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AskService } from '../services/askService.js';
import { ZoneNotFoundError } from '../services/simulationService.js';
import { validateAskPayload } from '../validation/requestValidator.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

/**
 * AWS Lambda handler for POST /ask endpoint.
 *
 * Requirements:
 * - Accept question and optional zoneId in JSON body.
 * - Retrieve requested zone (or city-wide dataset) from DynamoDB.
 * - Return HTTP 404 if a specific zoneId is provided but does not exist.
 * - Validate JSON body, question non-empty, and min length.
 * - Reject invalid requests with HTTP 400 and structured error envelope.
 * - Domain question-answering logic decoupled into AskService.
 * - Ground answers in real/simulated telemetry and risk indicators from DynamoDB.
 * - Provide citations/evidence in evidence array.
 * - Transparently report data provenance.
 * - Safe error handling with no AWS internal leaks.
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
          message: 'Request body is required for POST /ask.',
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

  // Validate payload
  const validation = validateAskPayload(parsedBody);
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
    const result = await AskService.askEcoTwin(validation.data);

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

    // Log internal error server-side for CloudWatch observability
    console.error('Unhandled error in POST /ask handler:', err);

    // Return safe structured error without leaking AWS internals
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal error occurred while processing environmental question.',
        },
      }),
    };
  }
};
