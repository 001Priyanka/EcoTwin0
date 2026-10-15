import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/handlers/getZones.js';
import { ZonesService } from '../src/services/zonesService.js';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { EnvironmentalZone } from '../src/types/index.js';

describe('GET /zones Lambda Handler', () => {
  it('should handle OPTIONS preflight request with 200 and CORS headers', async () => {
    const mockEvent = {
      httpMethod: 'OPTIONS',
      path: '/zones',
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');
    assert.strictEqual(response.headers?.['Access-Control-Allow-Methods'], 'GET,OPTIONS');
    assert.strictEqual(response.body, '');
  });

  it('should return HTTP 200 with zones array matching API contract', async () => {
    const mockZones: EnvironmentalZone[] = [
      {
        id: 'zone-panchganga',
        name: 'Panchganga Ghat & Shiroli Gateway',
        dataStatus: 'simulated',
        updatedAt: '2026-10-10T10:10:00Z',
        airRisk: 71,
        heatRisk: 49,
        wasteRisk: 88,
        ecoScore: 84,
      },
      {
        id: 'zone-sparse',
        name: 'Sparse Monitoring Ward',
        dataStatus: 'real',
        updatedAt: null,
        airRisk: null,
        heatRisk: null,
        wasteRisk: null,
        ecoScore: null,
      },
    ];

    // Mock ZonesService.listZones
    const originalListZones = ZonesService.listZones;
    ZonesService.listZones = async () => mockZones;

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/zones',
        headers: {},
        queryStringParameters: null,
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers?.['Content-Type'], 'application/json');
      assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');

      const parsedBody = JSON.parse(response.body);
      assert.ok(Array.isArray(parsedBody.zones), 'Response envelope must contain zones array');
      assert.strictEqual(parsedBody.zones.length, 2);

      const zone1 = parsedBody.zones[0];
      assert.strictEqual(zone1.id, 'zone-panchganga');
      assert.strictEqual(zone1.ecoScore, 84);

      const zone2 = parsedBody.zones[1];
      assert.strictEqual(zone2.id, 'zone-sparse');
      assert.strictEqual(zone2.ecoScore, null, 'Must preserve null score without conversion to 0');
      assert.strictEqual(zone2.airRisk, null);
    } finally {
      ZonesService.listZones = originalListZones;
    }
  });

  it('should handle service errors gracefully with HTTP 500 and structured error response', async () => {
    const originalListZones = ZonesService.listZones;
    ZonesService.listZones = async () => {
      throw new Error('DynamoDB connection timeout');
    };

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/zones',
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 500);
      assert.strictEqual(response.headers?.['Content-Type'], 'application/json');
      assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');

      const parsedBody = JSON.parse(response.body);
      assert.strictEqual(parsedBody.error.code, 'INTERNAL_SERVER_ERROR');
      assert.strictEqual(parsedBody.error.message, 'DynamoDB connection timeout');
    } finally {
      ZonesService.listZones = originalListZones;
    }
  });
});
