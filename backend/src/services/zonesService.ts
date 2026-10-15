import { ZonesRepository } from '../data-access/zonesRepository.js';
import { EnvironmentalZone, ZoneDetails } from '../types/index.js';

export class ZonesService {
  /**
   * Retrieves all zones from the repository.
   * Preserves exact null values for missing measurements.
   */
  public static async listZones(): Promise<EnvironmentalZone[]> {
    return await ZonesRepository.getAllZones();
  }

  /**
   * Retrieves a single zone by ID from the repository.
   */
  public static async getZoneById(zoneId: string): Promise<EnvironmentalZone | null> {
    return await ZonesRepository.getZoneById(zoneId);
  }

  /**
   * Retrieves full ZoneDetails by ID from the repository conforming to the shared contract.
   */
  public static async getZoneDetails(zoneId: string): Promise<ZoneDetails | null> {
    return await ZonesRepository.getZoneDetailsById(zoneId);
  }

  /**
   * Retrieves priority zones ranked by environmental vulnerability (highest ecoScore first).
   * Zones with null ecoScore are placed at the end. Ties broken by id.
   * Does NOT calculate or alter ecoScore values.
   */
  public static async listPriorityZones(limit: number = 5): Promise<EnvironmentalZone[]> {
    const allZones = await ZonesRepository.getAllZones();

    // Sort zones by ecoScore descending (higher score = greater risk)
    // Preserve existing ecoScore without recalculation
    const sorted = [...allZones].sort((a, b) => {
      if (a.ecoScore === null && b.ecoScore === null) return a.id.localeCompare(b.id);
      if (a.ecoScore === null) return 1;
      if (b.ecoScore === null) return -1;
      if (b.ecoScore !== a.ecoScore) {
        return b.ecoScore - a.ecoScore;
      }
      return a.id.localeCompare(b.id);
    });

    return sorted.slice(0, limit);
  }
}
