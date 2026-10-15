import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/handlers/getPriorityZones.js';
import { ZonesService } from '../src/services/zonesService.js';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { EnvironmentalZone } from '../src/types/index.js';

describe('GET /priority-zones Lambda Handler', () => {
  const sampleZones: EnvironmentalZone[] = [
    {
      id: 'zone-panchganga',
      name: 'Panchganga Ghat & Shiroli Gateway',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:10:00Z',
      airRisk: 71,
      heatRisk: 49,
      wasteRisk: 88,
      ecoScore: 84, // Highest risk rank
    },
    {
      id: 'zone-shahupuri',
      name: 'Shahupuri Commercial Hub',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:15:00Z',
      airRisk: 78,
      heatRisk: 72,
      wasteRisk: 61,
      ecoScore: 76,
    },
    {
      id: 'zone-laxmipuri',
      name: 'Laxmipuri Grain Market',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T09:45:00Z',
      airRisk: 64,
      heatRisk: 69,
      wasteRisk: 75,
      ecoScore: 72,
    },
    {
      id: 'zone-mahalaxmi',
      name: 'Mahalaxmi Temple Precinct',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T09:50:00Z',
      airRisk: 52,
      heatRisk: 74,
      wasteRisk: 58,
      ecoScore: 65,
    },
    {
      id: 'zone-rajarampuri',
      name: 'Rajarampuri Mixed-Use',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T09:30:00Z',
      airRisk: 48,
      heatRisk: 61,
      wasteRisk: 42,
      ecoScore: 53,
    },
    {
      id: 'zone-rankala',
      name: 'Rankala Lake & Padmaraje Promenade',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:00:00Z',
      airRisk: 34,
      heatRisk: 38,
      wasteRisk: 46,
      ecoScore: 41,
    },
  ];

  it('should handle OPTIONS preflight request with HTTP 200 and CORS headers', async () => {
    const mockEvent = {
      httpMethod: 'OPTIONS',
      path: '/priority-zones',
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');
    assert.strictEqual(response.headers?.['Access-Control-Allow-Methods'], 'GET,OPTIONS');
    assert.strictEqual(response.body, '');
  });

  it('should default to limit=5 when no query parameter is provided', async () => {
    let capturedLimit: number | undefined;
    const originalListPriorityZones = ZonesService.listPriorityZones;
    ZonesService.listPriorityZones = async (limit: number) => {
      capturedLimit = limit;
      return sampleZones.slice(0, limit);
    };

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/priority-zones',
        queryStringParameters: null,
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(capturedLimit, 5, 'Default limit must be 5');

      const parsed = JSON.parse(response.body);
      assert.ok(Array.isArray(parsed.zones), 'Response must have zones array');
      assert.strictEqual(parsed.zones.length, 5);
      assert.strictEqual(parsed.zones[0].id, 'zone-panchganga');
    } finally {
      ZonesService.listPriorityZones = originalListPriorityZones;
    }
  });

  it('should accept custom limit parameter and return requested count', async () => {
    let capturedLimit: number | undefined;
    const originalListPriorityZones = ZonesService.listPriorityZones;
    ZonesService.listPriorityZones = async (limit: number) => {
      capturedLimit = limit;
      return sampleZones.slice(0, limit);
    };

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/priority-zones',
        queryStringParameters: { limit: '3' },
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(capturedLimit, 3);

      const parsed = JSON.parse(response.body);
      assert.strictEqual(parsed.zones.length, 3);
      assert.strictEqual(parsed.zones[0].ecoScore, 84);
      assert.strictEqual(parsed.zones[1].ecoScore, 76);
      assert.strictEqual(parsed.zones[2].ecoScore, 72);
    } finally {
      ZonesService.listPriorityZones = originalListPriorityZones;
    }
  });

  it('should reject non-numeric limit with HTTP 400 and structured error', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/priority-zones',
      queryStringParameters: { limit: 'abc' },
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const parsed = JSON.parse(response.body);
    assert.strictEqual(parsed.error.code, 'INVALID_LIMIT');
  });

  it('should reject float/decimal limit with HTTP 400 and structured error', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/priority-zones',
      queryStringParameters: { limit: '2.5' },
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const parsed = JSON.parse(response.body);
    assert.strictEqual(parsed.error.code, 'INVALID_LIMIT');
  });

  it('should reject out-of-range negative or zero limit with HTTP 400', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/priority-zones',
      queryStringParameters: { limit: '0' },
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const parsed = JSON.parse(response.body);
    assert.strictEqual(parsed.error.code, 'LIMIT_OUT_OF_RANGE');
  });

  it('should reject limit greater than max limit (20) with HTTP 400', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/priority-zones',
      queryStringParameters: { limit: '21' },
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const parsed = JSON.parse(response.body);
    assert.strictEqual(parsed.error.code, 'LIMIT_OUT_OF_RANGE');
    assert.strictEqual(
      parsed.error.message,
      'Query parameter "limit" must be between 1 and 20. Received: 21.'
    );
  });

  it('should handle service failures gracefully without leaking AWS internals', async () => {
    const originalListPriorityZones = ZonesService.listPriorityZones;
    ZonesService.listPriorityZones = async () => {
      throw new Error('ProvisionedThroughputExceededException: The level of configured throughput was exceeded');
    };

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/priority-zones',
        queryStringParameters: { limit: '5' },
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 500);
      const parsed = JSON.parse(response.body);
      assert.strictEqual(parsed.error.code, 'INTERNAL_SERVER_ERROR');
      // No AWS exception leak
      assert.ok(!parsed.error.message.includes('ProvisionedThroughputExceededException'));
    } finally {
      ZonesService.listPriorityZones = originalListPriorityZones;
    }
  });
});
