import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZonesService } from '../services/zonesService.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

/**
 * AWS Lambda handler for GET /zones endpoint.
 *
 * Requirements:
 * - Scans/retrieves zones from DynamoDB.
 * - Adheres strictly to the shared API contract: `{ "zones": [ ... ] }`.
 * - Missing measurements are preserved as `null`, never 0.
 * - Returns appropriate HTTP status codes and CORS headers.
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

  try {
    const zones = await ZonesService.listZones();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        zones,
      }),
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Unhandled error in GET /zones handler:', err);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: errorMessage,
        },
      }),
    };
  }
};
