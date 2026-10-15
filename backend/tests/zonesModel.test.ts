import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ZonesRepository } from '../src/data-access/zonesRepository.js';
import { ZoneRecordItem, EnvironmentalZone } from '../src/types/index.js';

describe('Zones Data Model and Mapping Tests', () => {
  it('correctly maps a complete DynamoDB item to EnvironmentalZone', () => {
    const item: ZoneRecordItem = {
      zoneId: 'zone-panchganga',
      name: 'Panchganga Ghat & Shiroli Gateway',
      marathiName: 'पंचगंगा घाट व शिरोली प्रवेशद्वार',
      category: 'Industrial',
      wardIdentifier: 'Ward 28-B',
      description: 'Riparian interface bordering northern industrial fringe.',
      primaryRiskLayer: 'waste',
      factors: ['Industrial runoff', 'Corridor diesel transport'],
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:10:00Z',
      airRisk: 71,
      heatRisk: 49,
      wasteRisk: 88,
      ecoScore: 84,
    };

    const zone = ZonesRepository.mapItemToZone(item);

    assert.strictEqual(zone.id, 'zone-panchganga');
    assert.strictEqual(zone.name, 'Panchganga Ghat & Shiroli Gateway');
    assert.strictEqual(zone.airRisk, 71);
    assert.strictEqual(zone.heatRisk, 49);
    assert.strictEqual(zone.wasteRisk, 88);
    assert.strictEqual(zone.ecoScore, 84);
    assert.strictEqual(zone.dataStatus, 'simulated');
    assert.strictEqual(zone.updatedAt, '2026-10-10T10:10:00Z');
  });

  it('preserves null for missing measurements and NEVER coerces them to 0', () => {
    const sparseItem: ZoneRecordItem = {
      zoneId: 'zone-sparse',
      name: 'Sparse Sensor Ward',
      dataStatus: 'real',
      updatedAt: null,
      airRisk: null,
      heatRisk: null,
      wasteRisk: null,
      ecoScore: null,
    };

    const zone = ZonesRepository.mapItemToZone(sparseItem);

    assert.strictEqual(zone.id, 'zone-sparse');
    assert.strictEqual(zone.airRisk, null, 'airRisk must be strictly null');
    assert.strictEqual(zone.heatRisk, null, 'heatRisk must be strictly null');
    assert.strictEqual(zone.wasteRisk, null, 'wasteRisk must be strictly null');
    assert.strictEqual(zone.ecoScore, null, 'ecoScore must be strictly null');
    assert.notStrictEqual(zone.ecoScore, 0, 'ecoScore must NOT be 0');
  });

  it('handles undefined DynamoDB fields by mapping them honestly to null', () => {
    // When DynamoDB omits attributes that were not stored
    const partialItem = {
      zoneId: 'zone-partial',
      name: 'Partial Station',
      dataStatus: 'derived',
    } as unknown as ZoneRecordItem;

    const zone = ZonesRepository.mapItemToZone(partialItem);

    assert.strictEqual(zone.id, 'zone-partial');
    assert.strictEqual(zone.airRisk, null);
    assert.strictEqual(zone.heatRisk, null);
    assert.strictEqual(zone.wasteRisk, null);
    assert.strictEqual(zone.ecoScore, null);
    assert.strictEqual(zone.updatedAt, null);
  });

  it('maps an EnvironmentalZone to a DynamoDB storage item with zoneId as partition key', () => {
    const zone: EnvironmentalZone = {
      id: 'zone-shahupuri',
      name: 'Shahupuri Commercial Hub',
      category: 'Commercial',
      dataStatus: 'real',
      updatedAt: '2026-10-10T09:00:00Z',
      airRisk: 62,
      heatRisk: 55,
      wasteRisk: 40,
      ecoScore: 56,
    };

    const item = ZonesRepository.mapZoneToItem(zone);

    assert.strictEqual(item.zoneId, 'zone-shahupuri');
    assert.strictEqual(item.name, 'Shahupuri Commercial Hub');
    assert.strictEqual(item.ecoScore, 56);
    assert.strictEqual(item.dataStatus, 'real');
    assert.ok(typeof item.createdAt === 'string');
  });
});
