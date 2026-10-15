import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ZonesRepository } from '../src/data-access/zonesRepository.js';
import { dynamoDbClient } from '../src/data-access/dynamoClient.js';
import { seedZones, isProductionTarget, SEED_ZONES } from '../src/data-access/seedZones.js';
import { EnvironmentalZone } from '../src/types/index.js';

describe('ZonesRepository Unit Tests (Isolated Mock Suite)', () => {
  it('getAllZones returns an empty array when DynamoDB returns no items', async () => {
    const originalSend = dynamoDbClient.send;
    // Mock DynamoDB send to return empty Items
    dynamoDbClient.send = (async () => ({
      Items: [],
    })) as any;

    try {
      const zones = await ZonesRepository.getAllZones('mock-table');
      assert.ok(Array.isArray(zones));
      assert.strictEqual(zones.length, 0);
    } finally {
      dynamoDbClient.send = originalSend;
    }
  });

  it('getAllZones handles undefined Items gracefully by returning empty array', async () => {
    const originalSend = dynamoDbClient.send;
    dynamoDbClient.send = (async () => ({})) as any;

    try {
      const zones = await ZonesRepository.getAllZones('mock-table');
      assert.ok(Array.isArray(zones));
      assert.strictEqual(zones.length, 0);
    } finally {
      dynamoDbClient.send = originalSend;
    }
  });

  it('getZoneById returns null when the item does not exist in DynamoDB', async () => {
    const originalSend = dynamoDbClient.send;
    dynamoDbClient.send = (async () => ({
      Item: undefined,
    })) as any;

    try {
      const zone = await ZonesRepository.getZoneById('non-existent-zone', 'mock-table');
      assert.strictEqual(zone, null);
    } finally {
      dynamoDbClient.send = originalSend;
    }
  });

  it('getZoneById returns parsed zone when found in DynamoDB', async () => {
    const originalSend = dynamoDbClient.send;
    dynamoDbClient.send = (async () => ({
      Item: {
        zoneId: 'zone-rankala',
        name: 'Rankala Lake Promenade',
        dataStatus: 'simulated',
        updatedAt: '2026-10-10T12:00:00Z',
        airRisk: 34,
        heatRisk: 38,
        wasteRisk: 46,
        ecoScore: 41,
      },
    })) as any;

    try {
      const zone = await ZonesRepository.getZoneById('zone-rankala', 'mock-table');
      assert.ok(zone !== null);
      assert.strictEqual(zone.id, 'zone-rankala');
      assert.strictEqual(zone.name, 'Rankala Lake Promenade');
      assert.strictEqual(zone.ecoScore, 41);
    } finally {
      dynamoDbClient.send = originalSend;
    }
  });

  it('batchPutZones returns immediately without DynamoDB calls if array is empty', async () => {
    let sendCalled = false;
    const originalSend = dynamoDbClient.send;
    dynamoDbClient.send = (async () => {
      sendCalled = true;
      return {};
    }) as any;

    try {
      await ZonesRepository.batchPutZones([], 'mock-table');
      assert.strictEqual(sendCalled, false);
    } finally {
      dynamoDbClient.send = originalSend;
    }
  });

  it('batchPutZones chunks more than 25 items into multiple batches of <= 25 items', async () => {
    const capturedBatches: any[] = [];
    const originalSend = dynamoDbClient.send;
    dynamoDbClient.send = (async (command: any) => {
      capturedBatches.push(command.input);
      return {};
    }) as any;

    try {
      // Create 30 fake zones
      const zones: EnvironmentalZone[] = Array.from({ length: 30 }, (_, i) => ({
        id: `zone-${i}`,
        name: `Zone ${i}`,
        dataStatus: 'simulated' as const,
        updatedAt: null,
        airRisk: 50,
        heatRisk: 50,
        wasteRisk: 50,
        ecoScore: 50,
      }));

      await ZonesRepository.batchPutZones(zones, 'mock-table');

      assert.strictEqual(capturedBatches.length, 2, 'Should divide 30 items into 2 DynamoDB batches');
      const batch1Requests = capturedBatches[0].RequestItems['mock-table'];
      const batch2Requests = capturedBatches[1].RequestItems['mock-table'];
      assert.strictEqual(batch1Requests.length, 25, 'First batch must have 25 items');
      assert.strictEqual(batch2Requests.length, 5, 'Second batch must have 5 items');
    } finally {
      dynamoDbClient.send = originalSend;
    }
  });
});

describe('Seed Data Integrity and Safety Suite', () => {
  it('correctly identifies production table naming patterns', () => {
    assert.strictEqual(isProductionTarget('ecotwin-zones-prod'), true);
    assert.strictEqual(isProductionTarget('my-app-production'), true);
    assert.strictEqual(isProductionTarget('prod-zones'), true);
    assert.strictEqual(isProductionTarget('ecotwin-zones-dev'), false);
    assert.strictEqual(isProductionTarget('ecotwin-zones-staging'), false);
  });

  it('blocks accidental seeding of production tables without explicit allow flag', async () => {
    await assert.rejects(
      async () => {
        await seedZones({ tableName: 'ecotwin-zones-prod', allowProd: false });
      },
      {
        message: /\[SAFETY ABORT\] Refusing to seed production table/,
      }
    );
  });

  it('all 7 seed zones strictly comply with the EcoTwin shared API contract', () => {
    assert.strictEqual(SEED_ZONES.length, 7);

    for (const zone of SEED_ZONES) {
      assert.ok(typeof zone.id === 'string' && zone.id.startsWith('zone-'), `Zone ID must be valid: ${zone.id}`);
      assert.ok(typeof zone.name === 'string' && zone.name.length > 0, `Zone name must be non-empty`);
      assert.strictEqual(zone.dataStatus, 'simulated', `Seed data must be labeled as simulated for provenance transparency`);

      if (zone.ecoScore !== null) {
        assert.ok(zone.ecoScore >= 0 && zone.ecoScore <= 100, `ecoScore must be between 0 and 100 or null`);
      }

      if (zone.airRisk !== null) {
        assert.ok(zone.airRisk >= 0 && zone.airRisk <= 100);
      }
      if (zone.heatRisk !== null) {
        assert.ok(zone.heatRisk >= 0 && zone.heatRisk <= 100);
      }
      if (zone.wasteRisk !== null) {
        assert.ok(zone.wasteRisk >= 0 && zone.wasteRisk <= 100);
      }
    }
  });
});
