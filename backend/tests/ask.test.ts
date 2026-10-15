import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/handlers/ask.js';
import { AskService } from '../src/services/askService.js';
import { ZoneNotFoundError } from '../src/services/simulationService.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('POST /ask Lambda Handler', () => {
  it('should handle OPTIONS preflight request with HTTP 200 and CORS headers', async () => {
    const mockEvent = {
      httpMethod: 'OPTIONS',
      path: '/ask',
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');
    assert.strictEqual(response.headers?.['Access-Control-Allow-Methods'], 'POST,OPTIONS');
    assert.strictEqual(response.body, '');
  });

  it('should return HTTP 400 when request body is missing', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/ask',
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'MISSING_REQUEST_BODY');
  });

  it('should return HTTP 400 when request body is malformed JSON', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/ask',
      headers: {},
      body: '{ not valid json',
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_JSON_BODY');
  });

  it('should return HTTP 400 when question is missing or empty', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/ask',
      headers: {},
      body: JSON.stringify({
        question: '   ',
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_QUESTION');
  });

  it('should return HTTP 400 when question is shorter than 3 characters', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/ask',
      headers: {},
      body: JSON.stringify({
        question: 'hi',
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'QUESTION_TOO_SHORT');
  });

  it('should return HTTP 400 when zoneId has invalid characters', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/ask',
      headers: {},
      body: JSON.stringify({
        question: 'What is the air quality here?',
        zoneId: 'bad!zone*format',
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_ZONE_ID_FORMAT');
  });

  it('should return HTTP 404 when targeted zoneId is not found', async () => {
    const originalAsk = AskService.askEcoTwin;
    AskService.askEcoTwin = async (req) => {
      throw new ZoneNotFoundError(req.zoneId || 'unknown');
    };

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/ask',
        headers: {},
        body: JSON.stringify({
          question: 'What is the air quality here?',
          zoneId: 'zone-nonexistent',
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 404);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error.code, 'ZONE_NOT_FOUND');
      assert.ok(body.error.message.includes('zone-nonexistent'));
    } finally {
      AskService.askEcoTwin = originalAsk;
    }
  });

  it('should return HTTP 200 with AskEcoTwinResponse when query succeeds with zoneId', async () => {
    const originalAsk = AskService.askEcoTwin;
    AskService.askEcoTwin = async (req) => ({
      answer: `Telemetry for ${req.zoneId}: Air risk is 71/100 with moderate PM2.5 concentrations.`,
      zoneId: req.zoneId || null,
      dataStatus: 'simulated',
      evidence: [
        'Air sensor source: "Panchganga Station Monitor #01"',
        'Recorded PM2.5: 64.2 µg/m³',
      ],
    });

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/ask',
        headers: {},
        body: JSON.stringify({
          question: 'What are the air pollution levels in this sector?',
          zoneId: 'zone-panchganga',
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers?.['Content-Type'], 'application/json');
      assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');

      const body = JSON.parse(response.body);
      assert.strictEqual(body.zoneId, 'zone-panchganga');
      assert.strictEqual(body.dataStatus, 'simulated');
      assert.ok(body.answer.includes('Air risk is 71/100'));
      assert.strictEqual(body.evidence.length, 2);
    } finally {
      AskService.askEcoTwin = originalAsk;
    }
  });

  it('should return HTTP 200 with zoneId null for city-wide inquiries', async () => {
    const originalAsk = AskService.askEcoTwin;
    AskService.askEcoTwin = async () => ({
      answer: 'Across Kolhapur, average composite environmental risk is 71/100.',
      zoneId: null,
      dataStatus: 'simulated',
      evidence: ['City-wide summary across 18 monitored sectors'],
    });

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/ask',
        headers: {},
        body: JSON.stringify({
          question: 'What is the city-wide average environmental risk?',
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.zoneId, null);
      assert.strictEqual(body.dataStatus, 'simulated');
    } finally {
      AskService.askEcoTwin = originalAsk;
    }
  });

  it('should return HTTP 500 when an unexpected internal error occurs', async () => {
    const originalAsk = AskService.askEcoTwin;
    AskService.askEcoTwin = async () => {
      throw new Error('Database connection failed unexpectedly');
    };

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/ask',
        headers: {},
        body: JSON.stringify({
          question: 'What are the primary risk factors?',
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 500);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error.code, 'INTERNAL_SERVER_ERROR');
      assert.ok(!response.body.includes('Database connection failed'));
    } finally {
      AskService.askEcoTwin = originalAsk;
    }
  });
});
