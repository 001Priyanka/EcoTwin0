/**
 * EcoTwin Kolhapur — Environmental Data Hook
 *
 * Provides reactive access to monitored zones, city summary, and zone details.
 * Communicates with the EcoTwin API client foundation while respecting demo mode
 * and graceful fallback.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  EnvironmentalZone, 
  ZoneDetails, 
  CitySummaryData 
} from '../types/environmental';
import { environmentalApi } from '../services/environmentalApi';
import { getZones } from '../services/zonesApi';
import { ApiClientError } from '../services/apiClient';
import { MOCK_PRIORITY_ZONES, MOCK_CITY_SUMMARY } from '../data/mockZones';

export interface UseEnvironmentalDataResult {
  zones: EnvironmentalZone[];
  citySummary: CitySummaryData;
  selectedZoneDetails: ZoneDetails | null;
  isLoading: boolean;
  error: ApiClientError | null;
  userErrorMessage: string | null;
  refresh: () => Promise<void>;
}

export function ensureZoneDetails(zone: EnvironmentalZone): ZoneDetails {
  const maybeDetails = zone as unknown as ZoneDetails;
  if (maybeDetails.air && maybeDetails.heat && maybeDetails.waste) {
    return maybeDetails;
  }
  return {
    ...zone,
    air: {
      aqi: null,
      pm25: null,
      source: 'Air Sensor Network',
      status: zone.dataStatus,
      timestamp: zone.updatedAt,
    },
    heat: {
      temperatureC: null,
      heatRisk: zone.heatRisk,
      source: 'Thermal Microclimate Sensor',
      status: zone.dataStatus,
      timestamp: zone.updatedAt,
    },
    waste: {
      wasteRisk: zone.wasteRisk,
      reportedOverflowCount: null,
      collectionEfficiencyPct: null,
      source: 'Municipal Waste Telemetry',
      status: zone.dataStatus,
      timestamp: zone.updatedAt,
    },
  };
}

export function useEnvironmentalData(selectedZoneId: string | null): UseEnvironmentalDataResult {
  const [zones, setZones] = useState<EnvironmentalZone[]>(MOCK_PRIORITY_ZONES);
  const [citySummary, setCitySummary] = useState<CitySummaryData>(MOCK_CITY_SUMMARY);
  const [selectedZoneDetails, setSelectedZoneDetails] = useState<ZoneDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedZones, fetchedSummary] = await Promise.all([
        getZones(),
        environmentalApi.getCitySummary(),
      ]);

      if (Array.isArray(fetchedZones)) {
        setZones(fetchedZones);
      }
      if (fetchedSummary) {
        setCitySummary(fetchedSummary);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(
          new ApiClientError({
            message: err instanceof Error ? err.message : 'Unknown data loading error',
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load selected zone details when selectedZoneId changes
  useEffect(() => {
    if (!selectedZoneId) {
      setSelectedZoneDetails(null);
      return;
    }

    let isCancelled = false;
    environmentalApi
      .getZoneById(selectedZoneId)
      .then((details) => {
        if (!isCancelled) {
          setSelectedZoneDetails(details);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn(`[EcoTwin] Could not load details for zone ${selectedZoneId}:`, err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedZoneId]);

  return {
    zones,
    citySummary,
    selectedZoneDetails,
    isLoading,
    error,
    userErrorMessage: error ? error.getUserFriendlyMessage() : null,
    refresh: fetchData,
  };
}
