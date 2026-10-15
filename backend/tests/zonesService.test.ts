import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ZonesService } from '../src/services/zonesService.js';
import { ZonesRepository } from '../src/data-access/zonesRepository.js';
import { EnvironmentalZone, ZoneDetails } from '../src/types/index.js';

describe('ZonesService Unit Tests', () => {
  const sampleZones: EnvironmentalZone[] = [
    {
      id: 'zone-panchganga',
      name: 'Panchganga Ghat & Shiroli Gateway',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:10:00Z',
      airRisk: 71,
      heatRisk: 49,
      wasteRisk: 88,
      ecoScore: 84, // Rank #1
    },
    {
      id: 'zone-shahupuri',
      name: 'Shahupuri Commercial Hub',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:15:00Z',
      airRisk: 78,
      heatRisk: 72,
      wasteRisk: 61,
      ecoScore: 76, // Rank #2
    },
    {
      id: 'zone-null-risk',
      name: 'Sparse Observation Sector',
      dataStatus: 'simulated',
      updatedAt: null,
      airRisk: null,
      heatRisk: null,
      wasteRisk: null,
      ecoScore: null, // Null risk (placed at end)
    },
    {
      id: 'zone-laxmipuri',
      name: 'Laxmipuri Grain Market',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T09:45:00Z',
      airRisk: 64,
      heatRisk: 69,
      wasteRisk: 75,
      ecoScore: 72, // Rank #3
    },
  ];

  it('listPriorityZones orders zones by ecoScore descending without recalculating scores', async () => {
    const originalGetAllZones = ZonesRepository.getAllZones;
    ZonesRepository.getAllZones = async () => sampleZones;

    try {
      const priority = await ZonesService.listPriorityZones(5);

      assert.strictEqual(priority.length, 4);
      // Rank 1: Panchganga (84)
      assert.strictEqual(priority[0].id, 'zone-panchganga');
      assert.strictEqual(priority[0].ecoScore, 84);

      // Rank 2: Shahupuri (76)
      assert.strictEqual(priority[1].id, 'zone-shahupuri');
      assert.strictEqual(priority[1].ecoScore, 76);

      // Rank 3: Laxmipuri (72)
      assert.strictEqual(priority[2].id, 'zone-laxmipuri');
      assert.strictEqual(priority[2].ecoScore, 72);

      // Rank 4: Null risk at end
      assert.strictEqual(priority[3].id, 'zone-null-risk');
      assert.strictEqual(priority[3].ecoScore, null);
    } finally {
      ZonesRepository.getAllZones = originalGetAllZones;
    }
  });

  it('listPriorityZones respects the limit parameter', async () => {
    const originalGetAllZones = ZonesRepository.getAllZones;
    ZonesRepository.getAllZones = async () => sampleZones;

    try {
      const priority = await ZonesService.listPriorityZones(2);

      assert.strictEqual(priority.length, 2);
      assert.strictEqual(priority[0].id, 'zone-panchganga');
      assert.strictEqual(priority[1].id, 'zone-shahupuri');
    } finally {
      ZonesRepository.getAllZones = originalGetAllZones;
    }
  });

  it('getZoneDetails delegates to ZonesRepository.getZoneDetailsById', async () => {
    const mockDetails: ZoneDetails = {
      id: 'zone-rankala',
      name: 'Rankala Lake',
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:00:00Z',
      airRisk: 34,
      heatRisk: 38,
      wasteRisk: 46,
      ecoScore: 41,
      air: {
        aqi: null,
        pm25: null,
        source: null,
        status: 'simulated',
        timestamp: null,
      },
      heat: {
        temperatureC: null,
        heatRisk: 38,
        source: null,
        status: 'simulated',
        timestamp: null,
      },
      waste: {
        wasteRisk: 46,
        reportedOverflowCount: null,
        collectionEfficiencyPct: null,
        source: null,
        status: 'simulated',
        timestamp: null,
      },
    };

    const originalGetDetails = ZonesRepository.getZoneDetailsById;
    ZonesRepository.getZoneDetailsById = async (id: string) => {
      if (id === 'zone-rankala') return mockDetails;
      return null;
    };

    try {
      const result = await ZonesService.getZoneDetails('zone-rankala');
      assert.ok(result);
      assert.strictEqual(result.id, 'zone-rankala');
      assert.strictEqual(result.air.status, 'simulated');

      const nonExistent = await ZonesService.getZoneDetails('does-not-exist');
      assert.strictEqual(nonExistent, null);
    } finally {
      ZonesRepository.getZoneDetailsById = originalGetDetails;
    }
  });
});
