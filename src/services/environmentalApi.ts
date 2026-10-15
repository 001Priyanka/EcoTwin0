/**
 * EcoTwin Kolhapur — Environmental Domain API Service
 *
 * Implements high-level, strongly-typed data operations over the apiClient transport.
 * Respects EcoTwin_Shared_API_Contract.md for all types, status codes, and error formats.
 *
 * Automatically respects VITE_DEMO_MODE:
 * When enabled, or during standalone frontend execution when the backend service is
 * unreachable, transparently serves verified demonstration fixtures with diagnostic logging.
 */

import { apiClient, isDemoMode, ApiClientError } from './apiClient';
import { zonesApi } from './zonesApi';
import { 
  EnvironmentalZone, 
  ZoneDetails, 
  CitySummaryData 
} from '../types/environmental';
import { 
  KOLHAPUR_ZONES_POLYGONS, 
  ZonePolygonFeatureCollection 
} from '../data/mockGeoJson';
import { 
  MOCK_PRIORITY_ZONES, 
  MOCK_CITY_SUMMARY 
} from '../data/mockZones';

export interface EnvironmentalApiService {
  getZones(): Promise<EnvironmentalZone[]>;
  getPriorityZones(limit?: number): Promise<EnvironmentalZone[]>;
  getZoneById(id: string): Promise<ZoneDetails>;
  getCitySummary(): Promise<CitySummaryData>;
  getGeoJson(): Promise<ZonePolygonFeatureCollection>;
}

export class EnvironmentalApiClient implements EnvironmentalApiService {
  /**
   * Fetches the monitored environmental zones.
   * Endpoint: GET /zones
   * Delegates directly to zonesApi.getZones() for runtime validation and strict live-mode contract adherence.
   */
  public async getZones(): Promise<EnvironmentalZone[]> {
    return zonesApi.getZones();
  }

  /**
   * Fetches the authoritative priority environmental zones.
   * Endpoint: GET /priority-zones?limit={limit}
   * Delegates directly to zonesApi.getPriorityZones() for authoritative backend ordering and runtime validation.
   */
  public async getPriorityZones(limit: number = 5): Promise<EnvironmentalZone[]> {
    return zonesApi.getPriorityZones(limit);
  }

  /**
   * Fetches detailed environmental telemetry for a single zone by ID.
   * Endpoint: GET /zones/:id
   * Delegates directly to zonesApi.getZoneById() for runtime validation and strict live-mode contract adherence.
   */
  public async getZoneById(id: string): Promise<ZoneDetails> {
    return zonesApi.getZoneById(id);
  }

  /**
   * Fetches composite city-wide environmental summary & global risk metrics.
   * Endpoint: GET /api/summary
   */
  public async getCitySummary(): Promise<CitySummaryData> {
    if (isDemoMode()) {
      return MOCK_CITY_SUMMARY;
    }

    try {
      return await apiClient.get<CitySummaryData>('/api/summary');
    } catch (err) {
      if (err instanceof ApiClientError && err.isNetworkError) {
        console.info('[EcoTwin API] Backend unavailable; returning demo city summary fixture.');
        return MOCK_CITY_SUMMARY;
      }
      throw err;
    }
  }

  /**
   * Fetches GeoJSON study polygon boundaries for Kolhapur zones.
   * Endpoint: GET /api/geojson
   */
  public async getGeoJson(): Promise<ZonePolygonFeatureCollection> {
    if (isDemoMode()) {
      return KOLHAPUR_ZONES_POLYGONS;
    }

    try {
      return await apiClient.get<ZonePolygonFeatureCollection>('/api/geojson');
    } catch (err) {
      if (err instanceof ApiClientError && err.isNetworkError) {
        console.info('[EcoTwin API] Backend unavailable; returning demo GeoJSON polygon collection.');
        return KOLHAPUR_ZONES_POLYGONS;
      }
      throw err;
    }
  }
}

/**
 * Singleton instance of the environmental API client
 */
export const environmentalApi = new EnvironmentalApiClient();
