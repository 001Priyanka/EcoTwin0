import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AskService } from '../src/services/askService.js';
import { ZonesRepository } from '../src/data-access/zonesRepository.js';
import { ZoneNotFoundError } from '../src/services/simulationService.js';
import { ZoneDetails, EnvironmentalZone } from '../src/types/index.js';

describe('AskService', () => {
  const mockPanchgangaDetails: ZoneDetails = {
    id: 'zone-panchganga',
    name: 'Panchganga Ghat & Shiroli Gateway',
    marathiName: 'पंचगंगा घाट व शिरोली प्रवेशद्वार',
    category: 'Industrial',
    wardIdentifier: 'Ward 28-B',
    description: 'Riparian interface bordering northern industrial manufacturing fringe.',
    primaryRiskLayer: 'waste',
    factors: ['Industrial stormwater runoff', 'Corridor diesel transport'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T10:10:00Z',
    airRisk: 71,
    heatRisk: 49,
    wasteRisk: 88,
    ecoScore: 84,
    air: {
      aqi: 154,
      pm25: 64.2,
      source: 'Panchganga Air Monitor #01',
      status: 'simulated',
      timestamp: '2026-10-10T10:10:00Z',
    },
    heat: {
      temperatureC: 32.4,
      heatRisk: 49,
      source: 'Microclimate Thermal Sensor',
      status: 'simulated',
      timestamp: '2026-10-10T10:00:00Z',
    },
    waste: {
      wasteRisk: 88,
      reportedOverflowCount: 14,
      collectionEfficiencyPct: 58,
      source: 'Shiroli Outfall Telemetry',
      status: 'simulated',
      timestamp: '2026-10-10T09:45:00Z',
    },
  };

  const mockCityZones: EnvironmentalZone[] = [
    {
      id: 'zone-panchganga',
      name: 'Panchganga Ghat & Shiroli Gateway',
      airRisk: 71,
      heatRisk: 49,
      wasteRisk: 88,
      ecoScore: 84,
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:10:00Z',
    },
    {
      id: 'zone-shahupuri',
      name: 'Shahupuri Commercial Hub',
      airRisk: 78,
      heatRisk: 72,
      wasteRisk: 61,
      ecoScore: 76,
      dataStatus: 'simulated',
      updatedAt: '2026-10-10T10:15:00Z',
    },
  ];

  it('should throw ZoneNotFoundError when the targeted zoneId does not exist', async () => {
    const originalGetZoneDetails = ZonesRepository.getZoneDetailsById;
    ZonesRepository.getZoneDetailsById = async () => null;

    try {
      await assert.rejects(
        async () => {
          await AskService.askEcoTwin({
            question: 'What are the air pollution levels here?',
            zoneId: 'non-existent-zone',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ZoneNotFoundError);
          assert.strictEqual((err as ZoneNotFoundError).zoneId, 'non-existent-zone');
          return true;
        }
      );
    } finally {
      ZonesRepository.getZoneDetailsById = originalGetZoneDetails;
    }
  });

  it('should evaluate air quality questions for a specific zone with accurate telemetry evidence', async () => {
    const originalGetZoneDetails = ZonesRepository.getZoneDetailsById;
    ZonesRepository.getZoneDetailsById = async () => mockPanchgangaDetails;

    try {
      const response = await AskService.askEcoTwin({
        question: 'What are the current PM2.5 concentrations and air risk?',
        zoneId: 'zone-panchganga',
      });

      assert.strictEqual(response.zoneId, 'zone-panchganga');
      assert.strictEqual(response.dataStatus, 'simulated');
      assert.ok(response.answer.includes('64.2 µg/m³'));
      assert.ok(response.answer.includes('Air Quality Risk is 71/100'));
      assert.ok(Array.isArray(response.evidence) && response.evidence.length > 0);
    } finally {
      ZonesRepository.getZoneDetailsById = originalGetZoneDetails;
    }
  });

  it('should evaluate waste management questions citing overflow reports', async () => {
    const originalGetZoneDetails = ZonesRepository.getZoneDetailsById;
    ZonesRepository.getZoneDetailsById = async () => mockPanchgangaDetails;

    try {
      const response = await AskService.askEcoTwin({
        question: 'Why is waste overflow and garbage backlog high in Panchganga?',
        zoneId: 'zone-panchganga',
      });

      assert.strictEqual(response.zoneId, 'zone-panchganga');
      assert.ok(response.answer.includes('14 overflow backlog'));
      assert.ok(response.answer.includes('58%'));
      assert.ok(response.evidence.length >= 2);
    } finally {
      ZonesRepository.getZoneDetailsById = originalGetZoneDetails;
    }
  });

  it('should evaluate city-wide questions when zoneId is omitted', async () => {
    const originalGetAllZones = ZonesRepository.getAllZones;
    ZonesRepository.getAllZones = async () => mockCityZones;

    try {
      const response = await AskService.askEcoTwin({
        question: 'What is the city-wide average environmental risk across Kolhapur?',
      });

      assert.strictEqual(response.zoneId, null);
      assert.strictEqual(response.dataStatus, 'simulated');
      assert.ok(response.answer.includes('2 monitored municipal sectors'));
      assert.ok(response.answer.includes('80/100')); // (84 + 76)/2 = 80
      assert.ok(response.answer.includes('Panchganga Ghat'));
      assert.ok(Array.isArray(response.evidence) && response.evidence.length >= 3);
    } finally {
      ZonesRepository.getAllZones = originalGetAllZones;
    }
  });
});
