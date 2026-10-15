import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZonesService } from '../services/zonesService.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

/**
 * AWS Lambda handler for GET /priority-zones?limit={limit} endpoint.
 *
 * Requirements:
 * - Expected response: { "zones": [ ... ] }
 * - Validate limit as a positive integer between 1 and 20 (default: 5).
 * - Reject non-numeric or out-of-range limit values with HTTP 400 and structured error.
 * - Retrieve prioritized zones.
 * - Do not calculate or alter EcoScore in the handler.
 * - Preserve null measurements.
 * - Preserve data provenance.
 * - Structured error handling with no internal AWS leaks.
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

  // Parse and validate query parameter 'limit'
  let limit = DEFAULT_LIMIT;
  const rawLimit = event.queryStringParameters?.limit;

  if (rawLimit !== undefined && rawLimit !== null && rawLimit !== '') {
    // Check if integer
    const parsed = Number(rawLimit);
    if (!Number.isInteger(parsed) || isNaN(parsed)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: {
            code: 'INVALID_LIMIT',
            message: `Query parameter "limit" must be a valid positive integer. Received: "${rawLimit}".`,
          },
        }),
      };
    }

    if (parsed < 1 || parsed > MAX_LIMIT) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: {
            code: 'LIMIT_OUT_OF_RANGE',
            message: `Query parameter "limit" must be between 1 and ${MAX_LIMIT}. Received: ${parsed}.`,
          },
        }),
      };
    }

    limit = parsed;
  }

  try {
    const priorityZones = await ZonesService.listPriorityZones(limit);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        zones: priorityZones,
      }),
    };
  } catch (err: unknown) {
    // Log internal error server-side for CloudWatch observability
    console.error('Unhandled error in GET /priority-zones handler:', err);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal error occurred while retrieving priority zones.',
        },
      }),
    };
  }
};
