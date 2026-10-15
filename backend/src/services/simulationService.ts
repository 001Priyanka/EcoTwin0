import { ZonesRepository } from '../data-access/zonesRepository.js';
import { SimulationRequest, SimulationResult } from '../types/index.js';

export class ZoneNotFoundError extends Error {
  constructor(public readonly zoneId: string) {
    super(`Zone with identifier "${zoneId}" does not exist.`);
    this.name = 'ZoneNotFoundError';
  }
}

export class ZoneNullEcoScoreError extends Error {
  constructor(public readonly zoneId: string) {
    super(`Zone "${zoneId}" has no baseline EcoScore available for scenario simulation.`);
    this.name = 'ZoneNullEcoScoreError';
  }
}

interface InterventionMeta {
  label: string;
  pillar: 'air' | 'heat' | 'waste' | 'multi';
  baseCoefficient: number;
  targetedCoefficient: number;
}

const INTERVENTION_CONFIG: Record<string, InterventionMeta> = {
  'urban-greening': {
    label: 'Urban Tree Canopy & Vegetated Buffers',
    pillar: 'heat',
    baseCoefficient: 0.22,
    targetedCoefficient: 0.26,
  },
  'cool-roofs': {
    label: 'Cool Roof & High-Albedo Surfaces',
    pillar: 'heat',
    baseCoefficient: 0.20,
    targetedCoefficient: 0.25,
  },
  'waste-segregation': {
    label: 'Decentralized Waste Collection & Segregation',
    pillar: 'waste',
    baseCoefficient: 0.24,
    targetedCoefficient: 0.28,
  },
  'clean-transit': {
    label: 'Low-Emission Transit & Freight Diversion',
    pillar: 'air',
    baseCoefficient: 0.22,
    targetedCoefficient: 0.26,
  },
  'riverbank-cleanup': {
    label: 'Riparian Buffer & Drainage Traps',
    pillar: 'waste',
    baseCoefficient: 0.25,
    targetedCoefficient: 0.29,
  },
};

export class SimulationService {
  /**
   * Evaluates a what-if intervention scenario against an existing zone from DynamoDB.
   *
   * Rules:
   * - Retrieves zone by ID from DynamoDB.
   * - Throws ZoneNotFoundError if zone does not exist.
   * - Throws ZoneNullEcoScoreError if zone has null EcoScore.
   * - Uses a deterministic, documented heuristic model.
   * - Preserves EcoScore semantics: higher value = higher environmental risk.
   * - A negative estimatedChange indicates risk reduction.
   * - Never persists hypothetical scenario outcomes to DynamoDB.
   */
  public static async simulateScenario(
    request: SimulationRequest,
    tableName?: string
  ): Promise<SimulationResult> {
    const zone = await ZonesRepository.getZoneById(request.zoneId, tableName);

    if (!zone) {
      throw new ZoneNotFoundError(request.zoneId);
    }

    if (zone.ecoScore === null) {
      throw new ZoneNullEcoScoreError(request.zoneId);
    }

    const baselineEcoScore = zone.ecoScore;
    const { type, intensity } = request.intervention;

    const meta = INTERVENTION_CONFIG[type] || {
      label: type,
      pillar: 'multi',
      baseCoefficient: 0.20,
      targetedCoefficient: 0.22,
    };

    // If intervention aligns with the zone's primary risk layer, apply targeted efficiency
    const isTargeted = zone.primaryRiskLayer && (
      zone.primaryRiskLayer === meta.pillar ||
      (type === 'urban-greening' && (zone.primaryRiskLayer === 'heat' || zone.primaryRiskLayer === 'air'))
    );

    const coefficient = isTargeted ? meta.targetedCoefficient : meta.baseCoefficient;
    const intensityFraction = intensity / 100;

    // Calculate deterministic risk reduction
    const estimatedReduction = Math.max(1, Math.round(baselineEcoScore * coefficient * intensityFraction));
    const estimatedChange = -estimatedReduction;
    const estimatedEcoScore = Math.max(0, baselineEcoScore + estimatedChange);

    const assumptions: string[] = [
      'Illustrative heuristic model: Estimates denote potential scenario changes, not empirical field measurements.',
      `Assumes ${intensity}% target deployment density for "${meta.label}" across ${zone.name}.`,
      'EcoScore denotes environmental risk (0–100 scale); negative change signifies estimated vulnerability reduction.',
      'Assumes standard seasonal weather patterns without extreme climatic anomalies or localized flooding.',
      'Simplified linear response assumption; boundary spillover effects and saturation non-linearities are not resolved.',
    ];

    return {
      baselineEcoScore,
      estimatedEcoScore,
      estimatedChange,
      modelType: 'heuristic',
      assumptions,
    };
  }
}
