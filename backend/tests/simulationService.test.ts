import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SimulationService, ZoneNotFoundError, ZoneNullEcoScoreError } from '../src/services/simulationService.js';
import { ZonesRepository } from '../src/data-access/zonesRepository.js';
import { EnvironmentalZone } from '../src/types/index.js';

describe('SimulationService', () => {
  const mockPanchgangaZone: EnvironmentalZone = {
    id: 'zone-panchganga',
    name: 'Panchganga Ghat & Shiroli Gateway',
    marathiName: 'पंचगंगा घाट व शिरोली प्रवेशद्वार',
    category: 'Industrial',
    wardIdentifier: 'Ward 28-B',
    description: 'Riparian interface bordering northern industrial manufacturing fringe and river discharge channels.',
    primaryRiskLayer: 'waste',
    factors: ['Industrial stormwater runoff', 'Corridor diesel transport'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T10:10:00Z',
    airRisk: 71,
    heatRisk: 49,
    wasteRisk: 88,
    ecoScore: 84,
  };

  it('should throw ZoneNotFoundError when the requested zone does not exist', async () => {
    const originalGetZoneById = ZonesRepository.getZoneById;
    ZonesRepository.getZoneById = async () => null;

    try {
      await assert.rejects(
        async () => {
          await SimulationService.simulateScenario({
            zoneId: 'non-existent-zone',
            intervention: {
              type: 'waste-segregation',
              intensity: 50,
            },
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ZoneNotFoundError);
          assert.strictEqual((err as ZoneNotFoundError).zoneId, 'non-existent-zone');
          return true;
        }
      );
    } finally {
      ZonesRepository.getZoneById = originalGetZoneById;
    }
  });

  it('should throw ZoneNullEcoScoreError when the zone has null baseline ecoScore', async () => {
    const originalGetZoneById = ZonesRepository.getZoneById;
    ZonesRepository.getZoneById = async () => ({
      ...mockPanchgangaZone,
      ecoScore: null,
    });

    try {
      await assert.rejects(
        async () => {
          await SimulationService.simulateScenario({
            zoneId: 'zone-panchganga',
            intervention: {
              type: 'urban-greening',
              intensity: 40,
            },
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ZoneNullEcoScoreError);
          assert.strictEqual((err as ZoneNullEcoScoreError).zoneId, 'zone-panchganga');
          return true;
        }
      );
    } finally {
      ZonesRepository.getZoneById = originalGetZoneById;
    }
  });

  it('should calculate deterministic heuristic simulation for a valid zone and intervention', async () => {
    const originalGetZoneById = ZonesRepository.getZoneById;
    ZonesRepository.getZoneById = async () => mockPanchgangaZone;

    try {
      const result = await SimulationService.simulateScenario({
        zoneId: 'zone-panchganga',
        intervention: {
          type: 'waste-segregation',
          intensity: 50,
        },
      });

      assert.strictEqual(result.baselineEcoScore, 84);
      assert.strictEqual(result.modelType, 'heuristic');
      assert.ok(result.estimatedChange < 0, 'Estimated change should be negative denoting risk reduction');
      assert.strictEqual(result.estimatedEcoScore, result.baselineEcoScore + result.estimatedChange);
      assert.ok(result.estimatedEcoScore >= 0 && result.estimatedEcoScore <= 100);
      assert.ok(Array.isArray(result.assumptions) && result.assumptions.length >= 4);
      for (const a of result.assumptions) {
        assert.strictEqual(typeof a, 'string');
        assert.ok(a.length > 0);
      }
    } finally {
      ZonesRepository.getZoneById = originalGetZoneById;
    }
  });

  it('should result in greater risk reduction with higher intervention intensity', async () => {
    const originalGetZoneById = ZonesRepository.getZoneById;
    ZonesRepository.getZoneById = async () => mockPanchgangaZone;

    try {
      const lowResult = await SimulationService.simulateScenario({
        zoneId: 'zone-panchganga',
        intervention: {
          type: 'waste-segregation',
          intensity: 20,
        },
      });

      const highResult = await SimulationService.simulateScenario({
        zoneId: 'zone-panchganga',
        intervention: {
          type: 'waste-segregation',
          intensity: 80,
        },
      });

      // Since change is negative, high intensity should have a more negative change (larger absolute reduction)
      assert.ok(
        Math.abs(highResult.estimatedChange) > Math.abs(lowResult.estimatedChange),
        'Higher intensity must yield higher reduction magnitude'
      );
      assert.ok(highResult.estimatedEcoScore < lowResult.estimatedEcoScore);
    } finally {
      ZonesRepository.getZoneById = originalGetZoneById;
    }
  });
});
