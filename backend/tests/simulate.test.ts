import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/handlers/simulate.js';
import { SimulationService, ZoneNotFoundError, ZoneNullEcoScoreError } from '../src/services/simulationService.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('POST /simulate Lambda Handler', () => {
  it('should handle OPTIONS preflight request with HTTP 200 and CORS headers', async () => {
    const mockEvent = {
      httpMethod: 'OPTIONS',
      path: '/simulate',
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
      path: '/simulate',
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'MISSING_REQUEST_BODY');
  });

  it('should return HTTP 400 when request body is invalid JSON', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/simulate',
      headers: {},
      body: '{ not valid json',
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_JSON_BODY');
  });

  it('should return HTTP 400 when zoneId is missing', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/simulate',
      headers: {},
      body: JSON.stringify({
        intervention: {
          type: 'urban-greening',
          intensity: 50,
        },
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_ZONE_ID');
  });

  it('should return HTTP 400 when intervention type is unsupported', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/simulate',
      headers: {},
      body: JSON.stringify({
        zoneId: 'zone-panchganga',
        intervention: {
          type: 'unsupported-intervention-xyz',
          intensity: 50,
        },
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'UNSUPPORTED_INTERVENTION_TYPE');
  });

  it('should return HTTP 400 when intervention intensity is out of range', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      path: '/simulate',
      headers: {},
      body: JSON.stringify({
        zoneId: 'zone-panchganga',
        intervention: {
          type: 'urban-greening',
          intensity: 150,
        },
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_INTENSITY');
  });

  it('should return HTTP 404 when zone does not exist in database', async () => {
    const originalSimulate = SimulationService.simulateScenario;
    SimulationService.simulateScenario = async (req) => {
      throw new ZoneNotFoundError(req.zoneId);
    };

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/simulate',
        headers: {},
        body: JSON.stringify({
          zoneId: 'zone-nonexistent',
          intervention: {
            type: 'urban-greening',
            intensity: 50,
          },
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 404);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error.code, 'ZONE_NOT_FOUND');
      assert.ok(body.error.message.includes('zone-nonexistent'));
    } finally {
      SimulationService.simulateScenario = originalSimulate;
    }
  });

  it('should return HTTP 400 when zone has null baseline ecoScore', async () => {
    const originalSimulate = SimulationService.simulateScenario;
    SimulationService.simulateScenario = async (req) => {
      throw new ZoneNullEcoScoreError(req.zoneId);
    };

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/simulate',
        headers: {},
        body: JSON.stringify({
          zoneId: 'zone-no-score',
          intervention: {
            type: 'urban-greening',
            intensity: 50,
          },
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error.code, 'CANNOT_SIMULATE_NULL_ECOSCORE');
    } finally {
      SimulationService.simulateScenario = originalSimulate;
    }
  });

  it('should return HTTP 200 with simulation results on valid request', async () => {
    const originalSimulate = SimulationService.simulateScenario;
    SimulationService.simulateScenario = async () => ({
      baselineEcoScore: 84,
      estimatedEcoScore: 73,
      estimatedChange: -11,
      modelType: 'heuristic',
      assumptions: ['Illustrative heuristic scenario model.'],
    });

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/simulate',
        headers: {},
        body: JSON.stringify({
          zoneId: 'zone-panchganga',
          intervention: {
            type: 'waste-segregation',
            intensity: 50,
          },
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers?.['Content-Type'], 'application/json');
      assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');

      const body = JSON.parse(response.body);
      assert.strictEqual(body.baselineEcoScore, 84);
      assert.strictEqual(body.estimatedEcoScore, 73);
      assert.strictEqual(body.estimatedChange, -11);
      assert.strictEqual(body.modelType, 'heuristic');
      assert.ok(Array.isArray(body.assumptions));
    } finally {
      SimulationService.simulateScenario = originalSimulate;
    }
  });

  it('should return HTTP 500 when an unexpected internal error occurs', async () => {
    const originalSimulate = SimulationService.simulateScenario;
    SimulationService.simulateScenario = async () => {
      throw new Error('Secret internal DB connection timeout');
    };

    try {
      const mockEvent = {
        httpMethod: 'POST',
        path: '/simulate',
        headers: {},
        body: JSON.stringify({
          zoneId: 'zone-panchganga',
          intervention: {
            type: 'urban-greening',
            intensity: 50,
          },
        }),
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 500);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error.code, 'INTERNAL_SERVER_ERROR');
      // Verify no leak of internal AWS details
      assert.ok(!response.body.includes('Secret internal DB'));
    } finally {
      SimulationService.simulateScenario = originalSimulate;
    }
  });
});
