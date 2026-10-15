import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/handlers/getZoneById.js';
import { ZonesService } from '../src/services/zonesService.js';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ZoneDetails } from '../src/types/index.js';

describe('GET /zones/{zoneId} Lambda Handler', () => {
  it('should handle OPTIONS preflight request with HTTP 200 and CORS headers', async () => {
    const mockEvent = {
      httpMethod: 'OPTIONS',
      path: '/zones/zone-shahupuri',
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');
    assert.strictEqual(response.headers?.['Access-Control-Allow-Methods'], 'GET,OPTIONS');
    assert.strictEqual(response.body, '');
  });

  it('should return HTTP 400 when zoneId path parameter is missing or empty', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/zones/',
      pathParameters: {},
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.headers?.['Content-Type'], 'application/json');

    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_ZONE_ID');
    assert.ok(body.error.message.includes('required'));
  });

  it('should return HTTP 400 when zoneId has invalid characters', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/zones/bad!zone@id',
      pathParameters: { zoneId: 'bad!zone@id' },
      headers: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'INVALID_ZONE_ID_FORMAT');
  });

  it('should return HTTP 404 with structured error when zone does not exist', async () => {
    const originalGetZoneDetails = ZonesService.getZoneDetails;
    ZonesService.getZoneDetails = async () => null;

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/zones/non-existent-zone',
        pathParameters: { zoneId: 'non-existent-zone' },
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 404);
      assert.strictEqual(response.headers?.['Content-Type'], 'application/json');
      assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');

      const body = JSON.parse(response.body);
      assert.strictEqual(body.error.code, 'ZONE_NOT_FOUND');
      assert.ok(body.error.message.includes('non-existent-zone'));
    } finally {
      ZonesService.getZoneDetails = originalGetZoneDetails;
    }
  });

  it('should return HTTP 200 with complete ZoneDetails payload conforming to contract', async () => {
    const mockDetails: ZoneDetails = {
      id: 'zone-shahupuri',
      name: 'Shahupuri Commercial Hub & Central Station',
      marathiName: 'शाहूपुरी व्यापारी केंद्र व मध्यवर्ती स्थानक',
      category: 'Commercial',
      wardIdentifier: 'Ward 14-A',
      description: 'High-density commercial market core surrounding central railway transit artery.',
      primaryRiskLayer: 'air',
      factors: ['Idling diesel transit buses', 'Narrow urban canyon trapped PM2.5'],
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:15:00Z',
      airRisk: 78,
      heatRisk: 72,
      wasteRisk: 61,
      ecoScore: 76,
      air: {
        aqi: 168,
        pm25: 72.4,
        source: 'Simulated Shahupuri Station Sensor #02',
        status: 'simulated',
        timestamp: '2026-10-10T10:15:00Z',
      },
      heat: {
        temperatureC: 36.8,
        heatRisk: 72,
        source: 'Derived Thermal Infrared Radiance',
        status: 'derived',
        timestamp: '2026-10-10T10:00:00Z',
      },
      waste: {
        wasteRisk: 61,
        reportedOverflowCount: 6,
        collectionEfficiencyPct: 76,
        source: 'Simulated KMC Route Telemetry',
        status: 'simulated',
        timestamp: '2026-10-10T09:30:00Z',
      },
    };

    const originalGetZoneDetails = ZonesService.getZoneDetails;
    ZonesService.getZoneDetails = async (id: string) => {
      if (id === 'zone-shahupuri') return mockDetails;
      return null;
    };

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/zones/zone-shahupuri',
        pathParameters: { zoneId: 'zone-shahupuri' },
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers?.['Content-Type'], 'application/json');
      assert.strictEqual(response.headers?.['Access-Control-Allow-Origin'], '*');

      const parsed: ZoneDetails = JSON.parse(response.body);
      assert.strictEqual(parsed.id, 'zone-shahupuri');
      assert.strictEqual(parsed.name, 'Shahupuri Commercial Hub & Central Station');
      assert.strictEqual(parsed.ecoScore, 76);
      assert.strictEqual(parsed.dataStatus, 'simulated');

      // Check granular telemetry objects
      assert.ok(parsed.air);
      assert.strictEqual(parsed.air.aqi, 168);
      assert.strictEqual(parsed.air.pm25, 72.4);

      assert.ok(parsed.heat);
      assert.strictEqual(parsed.heat.temperatureC, 36.8);
      assert.strictEqual(parsed.heat.status, 'derived');

      assert.ok(parsed.waste);
      assert.strictEqual(parsed.waste.reportedOverflowCount, 6);
    } finally {
      ZonesService.getZoneDetails = originalGetZoneDetails;
    }
  });

  it('should preserve null measurements honestly without coercing to zero', async () => {
    const mockSparseDetails: ZoneDetails = {
      id: 'zone-kasaba-bawada',
      name: 'Kasaba Bawada Agro-Riparian Basin',
      category: 'Residential',
      wardIdentifier: 'Ward 31-A',
      description: 'Northern suburban zone.',
      primaryRiskLayer: 'air',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T08:30:00Z',
      airRisk: 58,
      heatRisk: 39,
      wasteRisk: null, // Sparse measurement
      ecoScore: 49,
      air: {
        aqi: null,
        pm25: null,
        source: null,
        status: 'simulated',
        timestamp: null,
      },
      heat: {
        temperatureC: null,
        heatRisk: 39,
        source: null,
        status: 'simulated',
        timestamp: null,
      },
      waste: {
        wasteRisk: null,
        reportedOverflowCount: null,
        collectionEfficiencyPct: null,
        source: null,
        status: 'simulated',
        timestamp: null,
      },
    };

    const originalGetZoneDetails = ZonesService.getZoneDetails;
    ZonesService.getZoneDetails = async () => mockSparseDetails;

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/zones/zone-kasaba-bawada',
        pathParameters: { zoneId: 'zone-kasaba-bawada' },
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);
      assert.strictEqual(response.statusCode, 200);

      const parsed: ZoneDetails = JSON.parse(response.body);
      assert.strictEqual(parsed.wasteRisk, null, 'Must remain null');
      assert.strictEqual(parsed.waste.wasteRisk, null);
      assert.strictEqual(parsed.waste.reportedOverflowCount, null);
      assert.strictEqual(parsed.air.aqi, null);
    } finally {
      ZonesService.getZoneDetails = originalGetZoneDetails;
    }
  });

  it('should return HTTP 500 without leaking AWS internal error details on failure', async () => {
    const originalGetZoneDetails = ZonesService.getZoneDetails;
    ZonesService.getZoneDetails = async () => {
      throw new Error('ResourceNotFoundException: Cannot do operations on a non-existent table');
    };

    try {
      const mockEvent = {
        httpMethod: 'GET',
        path: '/zones/zone-shahupuri',
        pathParameters: { zoneId: 'zone-shahupuri' },
        headers: {},
        body: null,
      } as unknown as APIGatewayProxyEvent;

      const response = await handler(mockEvent);

      assert.strictEqual(response.statusCode, 500);
      assert.strictEqual(response.headers?.['Content-Type'], 'application/json');

      const body = JSON.parse(response.body);
      assert.strictEqual(body.error.code, 'INTERNAL_SERVER_ERROR');
      // Verify no AWS ResourceNotFoundException details leaked
      assert.ok(!body.error.message.includes('ResourceNotFoundException'));
      assert.ok(!body.error.message.includes('table'));
    } finally {
      ZonesService.getZoneDetails = originalGetZoneDetails;
    }
  });
});
