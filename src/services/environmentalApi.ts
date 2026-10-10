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
  CitySummaryData,
  SimulationRequest,
  SimulationResponse,
  AskResponse,
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
  getZoneById(id: string): Promise<ZoneDetails>;
  getCitySummary(): Promise<CitySummaryData>;
  getGeoJson(): Promise<ZonePolygonFeatureCollection>;
  simulate(request: SimulationRequest): Promise<SimulationResponse>;
  ask(question: string, zoneId?: string): Promise<AskResponse>;
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
   * Fetches detailed environmental telemetry for a single zone by ID.
   * Endpoint: GET /zones/:id
   */
  public async getZoneById(id: string): Promise<ZoneDetails> {
    if (!id || typeof id !== 'string') {
      throw new ApiClientError({
        message: 'Invalid zone identifier provided.',
        code: 'INVALID_ZONE_ID',
        status: 400,
      });
    }

    if (isDemoMode()) {
      const baseZone = MOCK_PRIORITY_ZONES.find((z) => z.id === id);
      if (!baseZone) {
        throw new ApiClientError({
          message: `The requested zone "${id}" was not found.`,
          code: 'ZONE_NOT_FOUND',
          status: 404,
        });
      }
      return baseZone;
    }

    try {
      const data = await apiClient.get<ZoneDetails | { zone: ZoneDetails }>(`/zones/${encodeURIComponent(id)}`);
      if (data && 'zone' in data && data.zone) {
        return data.zone;
      }
      return data as ZoneDetails;
    } catch (err) {
      if (err instanceof ApiClientError && err.isNetworkError) {
        console.info(`[EcoTwin API] Backend unavailable; returning demo details for zone "${id}".`);
        const fallback = MOCK_PRIORITY_ZONES.find((z) => z.id === id);
        if (fallback) return fallback;
      }
      throw err;
    }
  }

  /**
   * Fetches composite city-wide environmental summary & global risk metrics.
   * Endpoint: GET /summary
   */
  public async getCitySummary(): Promise<CitySummaryData> {
    if (isDemoMode()) {
      return MOCK_CITY_SUMMARY;
    }

    try {
      return await apiClient.get<CitySummaryData>('/summary');
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

  public async simulate(request: SimulationRequest): Promise<SimulationResponse> {
    return apiClient.post<SimulationResponse>('/simulate', request);
  }

  public async ask(question: string, zoneId?: string): Promise<AskResponse> {
    return apiClient.post<AskResponse>('/ask', { question, zoneId });
  }
}

/**
 * Singleton instance of the environmental API client
 */
export const environmentalApi = new EnvironmentalApiClient();
