import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/handlers/health.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('GET /health Lambda Handler', () => {
  it('should return HTTP 200 with ok status and ecotwin-api service name', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/health',
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '/health',
      body: null,
      isBase64Encoded: false,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers?.['Content-Type'], 'application/json');
    assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');

    const body = JSON.parse(response.body);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.service, 'ecotwin-api');
    assert.ok(typeof body.timestamp === 'string');
    assert.ok(typeof body.version === 'string');
  });

  it('should handle OPTIONS preflight request with 200 and CORS headers', async () => {
    const mockEvent = {
      httpMethod: 'OPTIONS',
      path: '/health',
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');
    assert.strictEqual(response.headers?.['Access-Control-Allow-Methods'], 'GET,OPTIONS');
  });
});
