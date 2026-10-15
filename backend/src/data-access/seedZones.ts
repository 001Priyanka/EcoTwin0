import { getZonesTableName } from './dynamoClient.js';
import { ZonesRepository } from './zonesRepository.js';
import { EnvironmentalZone } from '../types/index.js';

/**
 * Verified Kolhapur environmental zone seed records.
 * All records strictly adhere to the contract:
 * - dataStatus: "simulated" (clearly labeled, never pretending to be official Kolhapur Municipal measurements)
 * - missing indicators remain null, never zero
 * - ecoScore denotes environmental risk (higher = greater risk)
 */
export const SEED_ZONES: EnvironmentalZone[] = [
  {
    id: 'zone-panchganga',
    name: 'Panchganga Ghat & Shiroli Gateway',
    marathiName: 'पंचगंगा घाट व शिरोली प्रवेशद्वार',
    category: 'Industrial',
    wardIdentifier: 'Ward 28-B',
    description: 'Riparian interface bordering northern industrial manufacturing fringe and river discharge channels.',
    primaryRiskLayer: 'waste',
    factors: ['Industrial stormwater runoff', 'Corridor diesel transport', 'Riparian bank accumulation'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T10:10:00Z',
    airRisk: 71,
    heatRisk: 49,
    wasteRisk: 88,
    ecoScore: 84, // Highest composite risk rank (#1)
  },
  {
    id: 'zone-shahupuri',
    name: 'Shahupuri Commercial Hub & Central Station',
    marathiName: 'शाहूपुरी व्यापारी केंद्र व मध्यवर्ती स्थानक',
    category: 'Commercial',
    wardIdentifier: 'Ward 14-A',
    description: 'High-density commercial market core surrounding central railway transit artery and bus terminal.',
    primaryRiskLayer: 'air',
    factors: ['Idling diesel transit buses', 'Narrow urban canyon trapped PM2.5', 'High asphalt thermal retention'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T10:15:00Z',
    airRisk: 78,
    heatRisk: 72,
    wasteRisk: 61,
    ecoScore: 76,
  },
  {
    id: 'zone-laxmipuri',
    name: 'Laxmipuri Grain Market & Bindu Chowk',
    marathiName: 'लक्ष्मीपुरी धान्य बाजार व बिंदू चौक',
    category: 'Commercial',
    wardIdentifier: 'Ward 08-C',
    description: 'Traditional wholesale grain, vegetable, and perishable commodity logistics marketplace.',
    primaryRiskLayer: 'waste',
    factors: ['Organic produce decomposition', 'High micro-freight turnover', 'Impervious paved surfaces'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T09:45:00Z',
    airRisk: 64,
    heatRisk: 69,
    wasteRisk: 75,
    ecoScore: 72,
  },
  {
    id: 'zone-mahalaxmi',
    name: 'Mahalaxmi Temple Heritage Precinct',
    marathiName: 'श्री महालक्ष्मी (अंबाबाई) मंदिर परिसर',
    category: 'Heritage',
    wardIdentifier: 'Ward 04-A',
    description: 'Ancient stone temple precinct characterized by massive daily pilgrimage foot traffic and stone microclimates.',
    primaryRiskLayer: 'heat',
    factors: ['Stone courtyard thermal absorption', 'Extreme pedestrian crowding heat', 'Ceremonial organic waste streams'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T09:50:00Z',
    airRisk: 52,
    heatRisk: 74,
    wasteRisk: 58,
    ecoScore: 65,
  },
  {
    id: 'zone-rajarampuri',
    name: 'Rajarampuri Mixed-Use Avenues',
    marathiName: 'राजारामपुरी व्यापारी व निवासी मार्ग',
    category: 'Mixed-use',
    wardIdentifier: 'Ward 19-B',
    description: 'Balanced grid-planned residential district interspersed with bustling retail corridors.',
    primaryRiskLayer: 'heat',
    factors: ['Rooftop solar heat gain', 'Intermittent retail delivery emissions', 'Vegetation canopy deficit'],
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
    marathiName: 'रंकाळा तलाव व पद्मराजे उद्यान',
    category: 'Residential',
    wardIdentifier: 'Ward 02-A',
    description: 'Historic freshwater reservoir basin providing substantial ecological buffer and evening urban breeze.',
    primaryRiskLayer: 'waste',
    factors: ['Tourism evening plastic remnants', 'Lake weed eutrophication', 'Runoff from promenade food stalls'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T10:00:00Z',
    airRisk: 34,
    heatRisk: 38,
    wasteRisk: 46,
    ecoScore: 41,
  },
  {
    id: 'zone-kasaba-bawada',
    name: 'Kasaba Bawada Agro-Riparian Basin',
    marathiName: 'कसबा बावडा शेती व नदीकाठ परिसर',
    category: 'Residential',
    wardIdentifier: 'Ward 31-A',
    description: 'Northern suburban zone featuring sugar processing agricultural peripheries and open river meanders.',
    primaryRiskLayer: 'air',
    factors: ['Seasonal agricultural biomass burning', 'Unpaved road dust resuspension'],
    dataStatus: 'simulated',
    updatedAt: '2026-10-10T08:30:00Z',
    airRisk: 58,
    heatRisk: 39,
    wasteRisk: null, // Sparse waste telemetry honestly preserved as null
    ecoScore: 49,
  },
];

/**
 * Checks if the target table represents a production deployment environment.
 */
export function isProductionTarget(tableName: string): boolean {
  const stage = process.env.ENVIRONMENT_STAGE?.toLowerCase();
  const nameLower = tableName.toLowerCase();
  return (
    stage === 'prod' ||
    stage === 'production' ||
    nameLower.includes('-prod') ||
    nameLower.includes('prod-') ||
    nameLower.includes('_prod') ||
    nameLower.endsWith('prod') ||
    nameLower.includes('production')
  );
}

export interface SeedOptions {
  tableName?: string;
  allowProd?: boolean;
}

/**
 * Seeding script execution entry point.
 * Populates verified Kolhapur baseline zones into DynamoDB with production safeguards.
 */
export async function seedZones(options?: SeedOptions): Promise<{ seededCount: number; targetTable: string }> {
  const effectiveTableName = options?.tableName || process.env.ZONES_TABLE_NAME || process.env.DYNAMODB_ZONES_TABLE || getZonesTableName();

  // Safety check: Prevent accidental seeding of production tables unless explicitly allowed
  if (isProductionTarget(effectiveTableName)) {
    const isExplicitlyAllowed = options?.allowProd === true || process.env.ALLOW_PROD_SEED === 'true';
    if (!isExplicitlyAllowed) {
      throw new Error(
        `[SAFETY ABORT] Refusing to seed production table "${effectiveTableName}". ` +
        `To override this safety guard, set ALLOW_PROD_SEED=true in the environment or pass --allow-prod.`
      );
    }
  }

  console.log(`[Seed Script] Target table: "${effectiveTableName}"`);
  console.log(`[Seed Script] Seeding ${SEED_ZONES.length} verified Kolhapur baseline zones...`);

  await ZonesRepository.batchPutZones(SEED_ZONES, effectiveTableName);

  console.log(`[Seed Script] Successfully seeded ${SEED_ZONES.length} zones into table "${effectiveTableName}".`);
  return {
    seededCount: SEED_ZONES.length,
    targetTable: effectiveTableName,
  };
}

// Allow direct CLI execution: node dist/src/data-access/seedZones.js [--table <name>] [--allow-prod]
if (process.argv[1]?.endsWith('seedZones.js')) {
  const args = process.argv.slice(2);
  let explicitTable: string | undefined;
  let allowProd = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--table' && args[i + 1]) {
      explicitTable = args[i + 1];
      i++;
    } else if (args[i] === '--allow-prod') {
      allowProd = true;
    } else if (!args[i].startsWith('--') && !explicitTable) {
      explicitTable = args[i];
    }
  }

  seedZones({ tableName: explicitTable, allowProd })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Script Error]:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
