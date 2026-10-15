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
import { getZones, getPriorityZones } from '../services/zonesApi';
import { ApiClientError } from '../services/apiClient';
import { MOCK_PRIORITY_ZONES, MOCK_CITY_SUMMARY } from '../data/mockZones';

export interface UseEnvironmentalDataResult {
  zones: EnvironmentalZone[];
  priorityZones: EnvironmentalZone[];
  citySummary: CitySummaryData;
  selectedZoneDetails: ZoneDetails | null;
  isLoading: boolean;
  isPriorityZonesLoading: boolean;
  priorityZonesError: ApiClientError | null;
  priorityZonesErrorMessage: string | null;
  isZoneDetailsLoading: boolean;
  zoneDetailsError: ApiClientError | null;
  zoneDetailsErrorMessage: string | null;
  error: ApiClientError | null;
  userErrorMessage: string | null;
  refresh: () => Promise<void>;
  retryPriorityZones: () => Promise<void>;
  retryZoneDetails: () => Promise<void>;
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
  const [priorityZones, setPriorityZones] = useState<EnvironmentalZone[]>(MOCK_PRIORITY_ZONES.slice(0, 5));
  const [citySummary, setCitySummary] = useState<CitySummaryData>(MOCK_CITY_SUMMARY);
  const [selectedZoneDetails, setSelectedZoneDetails] = useState<ZoneDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPriorityZonesLoading, setIsPriorityZonesLoading] = useState<boolean>(false);
  const [priorityZonesError, setPriorityZonesError] = useState<ApiClientError | null>(null);
  const [isZoneDetailsLoading, setIsZoneDetailsLoading] = useState<boolean>(false);
  const [zoneDetailsError, setZoneDetailsError] = useState<ApiClientError | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);

  const fetchPriorityZones = useCallback(async () => {
    setIsPriorityZonesLoading(true);
    setPriorityZonesError(null);
    try {
      const fetched = await getPriorityZones(5);
      if (Array.isArray(fetched)) {
        setPriorityZones(fetched);
      }
    } catch (err) {
      setPriorityZones([]);
      if (err instanceof ApiClientError) {
        setPriorityZonesError(err);
      } else {
        setPriorityZonesError(
          new ApiClientError({
            message: err instanceof Error ? err.message : 'Failed to load priority environmental zones.',
            code: 'PRIORITY_ZONES_FETCH_ERROR',
          })
        );
      }
    } finally {
      setIsPriorityZonesLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedZones, fetchedSummary] = await Promise.all([
        getZones(),
        environmentalApi.getCitySummary(),
        fetchPriorityZones(),
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
  }, [fetchPriorityZones]);

  // Initial city-wide load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load detailed telemetry for selected zone
  const fetchSelectedZone = useCallback(async (zoneId: string | null) => {
    if (!zoneId) {
      setSelectedZoneDetails(null);
      setIsZoneDetailsLoading(false);
      setZoneDetailsError(null);
      return;
    }

    setIsZoneDetailsLoading(true);
    setZoneDetailsError(null);

    try {
      const details = await environmentalApi.getZoneById(zoneId);
      setSelectedZoneDetails(details);
    } catch (err) {
      setSelectedZoneDetails(null);
      if (err instanceof ApiClientError) {
        setZoneDetailsError(err);
      } else {
        setZoneDetailsError(
          new ApiClientError({
            message: err instanceof Error ? err.message : `Failed to load telemetry for zone "${zoneId}".`,
            code: 'ZONE_DETAILS_FETCH_ERROR',
          })
        );
      }
    } finally {
      setIsZoneDetailsLoading(false);
    }
  }, []);

  // Synchronize whenever selectedZoneId changes
  useEffect(() => {
    let isCancelled = false;

    if (!selectedZoneId) {
      setSelectedZoneDetails(null);
      setIsZoneDetailsLoading(false);
      setZoneDetailsError(null);
      return;
    }

    setIsZoneDetailsLoading(true);
    setZoneDetailsError(null);

    environmentalApi
      .getZoneById(selectedZoneId)
      .then((details) => {
        if (!isCancelled) {
          setSelectedZoneDetails(details);
          setZoneDetailsError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setSelectedZoneDetails(null);
          if (err instanceof ApiClientError) {
            setZoneDetailsError(err);
          } else {
            setZoneDetailsError(
              new ApiClientError({
                message: err instanceof Error ? err.message : `Failed to load telemetry for zone "${selectedZoneId}".`,
                code: 'ZONE_DETAILS_FETCH_ERROR',
              })
            );
          }
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsZoneDetailsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedZoneId]);

  const retryZoneDetails = useCallback(async () => {
    if (selectedZoneId) {
      await fetchSelectedZone(selectedZoneId);
    }
  }, [selectedZoneId, fetchSelectedZone]);

  return {
    zones,
    priorityZones,
    citySummary,
    selectedZoneDetails,
    isLoading,
    isPriorityZonesLoading,
    priorityZonesError,
    priorityZonesErrorMessage: priorityZonesError ? priorityZonesError.getUserFriendlyMessage() : null,
    isZoneDetailsLoading,
    zoneDetailsError,
    zoneDetailsErrorMessage: zoneDetailsError ? zoneDetailsError.getUserFriendlyMessage() : null,
    error,
    userErrorMessage: error ? error.getUserFriendlyMessage() : null,
    refresh: fetchData,
    retryPriorityZones: fetchPriorityZones,
    retryZoneDetails,
  };
}
