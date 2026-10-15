import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HealthService } from '../services/healthService.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

/**
 * AWS Lambda handler for GET /health endpoint.
 * Conforms to EcoTwin Kolhapur backend foundation requirements.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight options request if forwarded to handler
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  try {
    const health = HealthService.getHealth();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(health),
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Unhandled error in health handler:', err);

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
