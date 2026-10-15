import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZonesService } from '../services/zonesService.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

/**
 * AWS Lambda handler for GET /zones/{zoneId} endpoint.
 *
 * Requirements:
 * - Retrieve the requested zone by its stable ID.
 * - Use the existing DynamoDB repository.
 * - Return HTTP 404 when the zone does not exist.
 * - Validate the path parameter.
 * - Return a structured JSON error:
 *   { "error": { "code": "...", "message": "..." } }
 * - Do not return internal AWS error details to the client.
 * - Preserve null measurements.
 * - Preserve data provenance.
 * - Do not calculate EcoScore in the handler.
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

  // Extract and validate zoneId path parameter
  const rawZoneId = event.pathParameters?.zoneId;

  if (!rawZoneId || typeof rawZoneId !== 'string' || rawZoneId.trim() === '') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INVALID_ZONE_ID',
          message: 'Zone ID path parameter is required and cannot be empty.',
        },
      }),
    };
  }

  const zoneId = decodeURIComponent(rawZoneId).trim();

  // Validate format: alphanumeric, dashes, underscores, max length 128
  const validPattern = /^[a-zA-Z0-9_-]{1,128}$/;
  if (!validPattern.test(zoneId)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INVALID_ZONE_ID_FORMAT',
          message: `Zone ID "${zoneId}" contains invalid characters or exceeds allowable length.`,
        },
      }),
    };
  }

  try {
    const zoneDetails = await ZonesService.getZoneDetails(zoneId);

    if (!zoneDetails) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: {
            code: 'ZONE_NOT_FOUND',
            message: `Zone with identifier "${zoneId}" does not exist.`,
          },
        }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(zoneDetails),
    };
  } catch (err: unknown) {
    // Log internal error server-side for CloudWatch observability
    console.error(`Unhandled error in GET /zones/${zoneId} handler:`, err);

    // Return safe, structured error without leaking AWS internals
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal error occurred while retrieving zone telemetry.',
        },
      }),
    };
  }
};
