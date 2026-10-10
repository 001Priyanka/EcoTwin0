import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Map as MapLibreMap, 
  NavigationControl, 
  ScaleControl, 
  AttributionControl,
  setWorkerUrl,
  FilterSpecification,
  MapMouseEvent
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  RotateCcw, 
  Compass, 
  MapPin, 
  RefreshCw, 
  AlertTriangle,
  Layers as LayersIcon,
  X
} from 'lucide-react';
import { EnvironmentalZone, LayerId, ZoneDetails } from '../../types/environmental';
import { 
  KOLHAPUR_ZONES_POLYGONS, 
  KOLHAPUR_ZONES_CENTROIDS 
} from '../../data/mockGeoJson';
import { MapLegend } from './MapLegend';

interface CityMapProps {
  selectedZoneId?: string | null;
  onSelectZone?: (zoneId: string) => void;
  onClearSelection?: () => void;
  activeLayer?: LayerId;
  onSelectLayer?: (layer: LayerId) => void;
  zones?: (EnvironmentalZone | ZoneDetails)[];
}

// Initial camera coordinates for Kolhapur, Maharashtra
const KOLHAPUR_CENTER: [number, number] = [74.2433, 16.7050];
const INITIAL_ZOOM = 12.8;
const INITIAL_PITCH = 25;
const INITIAL_BEARING = 0;

// Configure MapLibre to use locally hosted same-origin worker from /public
if (typeof window !== 'undefined') {
  try {
    const origin = window.location.origin || '';
    setWorkerUrl(`${origin}/maplibre-gl-worker.mjs`);
  } catch (err) {
    console.warn('MapLibre setWorkerUrl notice:', err);
  }
}

export const CityMap: React.FC<CityMapProps> = ({
  selectedZoneId,
  onSelectZone,
  onClearSelection,
  activeLayer = 'air',
  onSelectLayer,
  zones = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Mutable refs to prevent stale closures and duplicate listener registration
  const activeLayerRef = useRef<LayerId>(activeLayer);
  const selectedZoneIdRef = useRef<string | null | undefined>(selectedZoneId);
  const onSelectZoneRef = useRef<((zoneId: string) => void) | undefined>(onSelectZone);
  const zonesRef = useRef<(EnvironmentalZone | ZoneDetails)[]>(zones);

  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);

  useEffect(() => {
    selectedZoneIdRef.current = selectedZoneId;
  }, [selectedZoneId]);

  useEffect(() => {
    onSelectZoneRef.current = onSelectZone;
  }, [onSelectZone]);

  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(INITIAL_ZOOM);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(KOLHAPUR_CENTER);
  const [showLegend, setShowLegend] = useState<boolean>(true);

  // Read configurable map style URL from environment variable or default to OpenFreeMap dark style
  const mapStyleUrl =
    import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/dark';

  // Function to register GeoJSON sources and environmental layers
  const setupLayers = useCallback((map: MapLibreMap) => {
    // 1. Add polygon source if not already present
    if (!map.getSource('zones-polygons-source')) {
      map.addSource('zones-polygons-source', {
        type: 'geojson',
        data: KOLHAPUR_ZONES_POLYGONS,
      });
    }

    // 2. Add centroid points source if not already present
    if (!map.getSource('zones-centroids-source')) {
      map.addSource('zones-centroids-source', {
        type: 'geojson',
        data: KOLHAPUR_ZONES_CENTROIDS,
      });
    }

    // 3. Base polygon hairline boundary (neutral study area outline)
    if (!map.getLayer('zones-base-stroke')) {
      map.addLayer({
        id: 'zones-base-stroke',
        type: 'line',
        source: 'zones-polygons-source',
        paint: {
          'line-color': 'rgba(148, 163, 184, 0.45)',
          'line-width': 1.5,
          'line-dasharray': [2, 2],
        },
      });
    }

    // 4. AIR Quality Fill Layer
    if (!map.getLayer('layer-air-fill')) {
      map.addLayer({
        id: 'layer-air-fill',
        type: 'fill',
        source: 'zones-polygons-source',
        layout: {
          visibility: activeLayerRef.current === 'air' ? 'visible' : 'none',
        },
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'airRisk'], null],
            '#64748B',
            ['>=', ['get', 'airRisk'], 75],
            '#F87171',
            ['>=', ['get', 'airRisk'], 50],
            '#FB923C',
            '#34D399',
          ],
          'fill-opacity': 0.38,
        },
      });
    }

    // 5. URBAN HEAT Island Fill Layer
    if (!map.getLayer('layer-heat-fill')) {
      map.addLayer({
        id: 'layer-heat-fill',
        type: 'fill',
        source: 'zones-polygons-source',
        layout: {
          visibility: activeLayerRef.current === 'heat' ? 'visible' : 'none',
        },
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'heatRisk'], null],
            '#64748B',
            ['>=', ['get', 'heatRisk'], 70],
            '#EF4444',
            ['>=', ['get', 'heatRisk'], 50],
            '#FB923C',
            '#38BDF8',
          ],
          'fill-opacity': 0.42,
        },
      });
    }

    // 6. WASTE Management Fill Layer
    if (!map.getLayer('layer-waste-fill')) {
      map.addLayer({
        id: 'layer-waste-fill',
        type: 'fill',
        source: 'zones-polygons-source',
        layout: {
          visibility: activeLayerRef.current === 'waste' ? 'visible' : 'none',
        },
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'wasteRisk'], null],
            '#64748B', // Neutral styling for unavailable data (e.g. Mahadwar precinct)
            ['>=', ['get', 'wasteRisk'], 75],
            '#E11D48',
            ['>=', ['get', 'wasteRisk'], 50],
            '#C084FC',
            '#34D399',
          ],
          'fill-opacity': 0.40,
        },
      });
    }

    // 7. Centroid Highlight Circles for Active Layer
    if (!map.getLayer('layer-air-centroids')) {
      map.addLayer({
        id: 'layer-air-centroids',
        type: 'circle',
        source: 'zones-centroids-source',
        layout: {
          visibility: activeLayerRef.current === 'air' ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 12,
          'circle-color': [
            'case',
            ['==', ['get', 'airRisk'], null],
            '#64748B',
            ['>=', ['get', 'airRisk'], 75],
            '#F87171',
            ['>=', ['get', 'airRisk'], 50],
            '#FB923C',
            '#34D399',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#07111F',
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer('layer-heat-centroids')) {
      map.addLayer({
        id: 'layer-heat-centroids',
        type: 'circle',
        source: 'zones-centroids-source',
        layout: {
          visibility: activeLayerRef.current === 'heat' ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 14,
          'circle-color': [
            'case',
            ['==', ['get', 'heatRisk'], null],
            '#64748B',
            ['>=', ['get', 'heatRisk'], 70],
            '#EF4444',
            ['>=', ['get', 'heatRisk'], 50],
            '#FB923C',
            '#38BDF8',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#07111F',
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer('layer-waste-centroids')) {
      map.addLayer({
        id: 'layer-waste-centroids',
        type: 'circle',
        source: 'zones-centroids-source',
        layout: {
          visibility: activeLayerRef.current === 'waste' ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 12,
          'circle-color': [
            'case',
            ['==', ['get', 'wasteRisk'], null],
            '#64748B',
            ['>=', ['get', 'wasteRisk'], 75],
            '#E11D48',
            ['>=', ['get', 'wasteRisk'], 50],
            '#C084FC',
            '#34D399',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#07111F',
          'circle-opacity': 0.85,
        },
      });
    }

    // 8. Persistent Selected Zone Fill Highlight (Remains visible across layer changes)
    const currentSelectedId = selectedZoneIdRef.current || '';
    const initialFilter: FilterSpecification = ['==', ['get', 'zoneId'], currentSelectedId];

    if (!map.getLayer('zones-selected-fill')) {
      map.addLayer({
        id: 'zones-selected-fill',
        type: 'fill',
        source: 'zones-polygons-source',
        filter: initialFilter,
        paint: {
          'fill-color': '#2563EB',
          'fill-opacity': 0.35,
        },
      });
    }

    // 9. Persistent Selected Zone Stroke Outline (Bright Cyan Highlight)
    if (!map.getLayer('zones-selected-stroke')) {
      map.addLayer({
        id: 'zones-selected-stroke',
        type: 'line',
        source: 'zones-polygons-source',
        filter: initialFilter,
        paint: {
          'line-color': '#22D3EE',
          'line-width': 3.5,
          'line-opacity': 1,
        },
      });
    }

    // 10. Persistent Selected Zone Centroid Outer Ring
    if (!map.getLayer('zones-selected-centroid')) {
      map.addLayer({
        id: 'zones-selected-centroid',
        type: 'circle',
        source: 'zones-centroids-source',
        filter: initialFilter,
        paint: {
          'circle-radius': 18,
          'circle-color': '#22D3EE',
          'circle-opacity': 0.25,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#22D3EE',
        },
      });
    }

    // 11. Persistent Selected Zone Centroid Inner Point
    if (!map.getLayer('zones-selected-centroid-inner')) {
      map.addLayer({
        id: 'zones-selected-centroid-inner',
        type: 'circle',
        source: 'zones-centroids-source',
        filter: initialFilter,
        paint: {
          'circle-radius': 6,
          'circle-color': '#22D3EE',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }
  }, []);

  // Synchronize Layer Visibility when activeLayer changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    try {
      if (map.getLayer('layer-air-fill')) {
        map.setLayoutProperty('layer-air-fill', 'visibility', activeLayer === 'air' ? 'visible' : 'none');
      }
      if (map.getLayer('layer-heat-fill')) {
        map.setLayoutProperty('layer-heat-fill', 'visibility', activeLayer === 'heat' ? 'visible' : 'none');
      }
      if (map.getLayer('layer-waste-fill')) {
        map.setLayoutProperty('layer-waste-fill', 'visibility', activeLayer === 'waste' ? 'visible' : 'none');
      }
      if (map.getLayer('layer-air-centroids')) {
        map.setLayoutProperty('layer-air-centroids', 'visibility', activeLayer === 'air' ? 'visible' : 'none');
      }
      if (map.getLayer('layer-heat-centroids')) {
        map.setLayoutProperty('layer-heat-centroids', 'visibility', activeLayer === 'heat' ? 'visible' : 'none');
      }
      if (map.getLayer('layer-waste-centroids')) {
        map.setLayoutProperty('layer-waste-centroids', 'visibility', activeLayer === 'waste' ? 'visible' : 'none');
      }
    } catch (err) {
      console.warn('Error updating layer visibility:', err);
    }
  }, [activeLayer]);

  // Synchronize Selected Zone Highlight & Smooth Camera animation when selectedZoneId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    try {
      const filter: FilterSpecification = ['==', ['get', 'zoneId'], selectedZoneId || ''];
      if (map.getLayer('zones-selected-fill')) {
        map.setFilter('zones-selected-fill', filter);
      }
      if (map.getLayer('zones-selected-stroke')) {
        map.setFilter('zones-selected-stroke', filter);
      }
      if (map.getLayer('zones-selected-centroid')) {
        map.setFilter('zones-selected-centroid', filter);
      }
      if (map.getLayer('zones-selected-centroid-inner')) {
        map.setFilter('zones-selected-centroid-inner', filter);
      }

      // Smoothly animate map camera toward selected zone centroid when selected
      if (selectedZoneId) {
        const centroidFeature = KOLHAPUR_ZONES_CENTROIDS.features.find(
          (f) => f.properties.zoneId === selectedZoneId
        );
        if (centroidFeature && centroidFeature.geometry?.coordinates) {
          const currentCenter = map.getCenter();
          const targetCoords = centroidFeature.geometry.coordinates;
          const dist = Math.hypot(
            currentCenter.lng - targetCoords[0],
            currentCenter.lat - targetCoords[1]
          );

          map.flyTo({
            center: targetCoords,
            zoom: Math.max(map.getZoom(), 13.2),
            speed: dist > 0.05 ? 0.85 : 0.6,
            curve: 1.1,
            essential: true,
            maxDuration: 1300,
          });
        } else {
          console.info(`[EcoTwin Map] Selected zone "${selectedZoneId}" has no mapped geographic feature; camera remains stationary.`);
        }
      }
    } catch (err) {
      console.warn('[EcoTwin Map] Error synchronizing selected zone state:', err);
    }
  }, [selectedZoneId]);

  // Initialize MapLibre GL map instance
  const initMap = useCallback(() => {
    if (!mapContainerRef.current) return;

    // Verify WebGL availability
    if (typeof window !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const hasWebGL = Boolean(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
        if (!hasWebGL) {
          setMapError('WebGL is not supported or is disabled in your browser environment.');
          setIsLoading(false);
          return;
        }
      } catch {
        // Continue and let MapLibre constructor handle context initialization
      }
    }

    // Cleanly destroy previous instance if re-initializing
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch {
        // Ignore cleanup errors on stale instances
      }
      mapRef.current = null;
    }

    setIsLoading(true);
    setMapError(null);

    try {
      // Re-assert worker URL right before map creation
      if (typeof window !== 'undefined') {
        const origin = window.location.origin || '';
        setWorkerUrl(`${origin}/maplibre-gl-worker.mjs`);
      }

      const map = new MapLibreMap({
        container: mapContainerRef.current,
        style: mapStyleUrl,
        center: KOLHAPUR_CENTER,
        zoom: INITIAL_ZOOM,
        pitch: INITIAL_PITCH,
        bearing: INITIAL_BEARING,
        attributionControl: false, // Explicit AttributionControl added below
      });

      // Add navigation controls (zoom in/out, compass with pitch/bearing visualization)
      map.addControl(
        new NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add Scale control in metric units
      map.addControl(
        new ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        }),
        'bottom-left'
      );

      // Add Attribution control to guarantee provider credits (OpenFreeMap & OpenStreetMap)
      map.addControl(
        new AttributionControl({
          compact: false,
          customAttribution: 'EcoTwin Kolhapur Digital Twin',
        }),
        'bottom-right'
      );

      // Centralized click handler for interactive GeoJSON feature selection
      const handleMapClick = (e: MapMouseEvent) => {
        if (!map.isStyleLoaded()) return;

        const activeFillLayer = `layer-${activeLayerRef.current}-fill`;
        const activeCentroidLayer = `layer-${activeLayerRef.current}-centroids`;
        const candidateLayers = [
          activeFillLayer,
          activeCentroidLayer,
          'zones-selected-fill',
          'zones-selected-stroke',
          'zones-selected-centroid',
          'zones-base-stroke',
        ].filter((id) => Boolean(map.getLayer(id)));

        const features = map.queryRenderedFeatures(e.point, { layers: candidateLayers });

        if (features && features.length > 0) {
          const clickedFeature = features[0];
          const rawZoneId = clickedFeature.properties?.zoneId;

          // 1 & 2. Validate that zoneId is a non-empty string
          if (typeof rawZoneId !== 'string' || !rawZoneId) {
            console.warn('[EcoTwin Map] Feature clicked with missing or non-string zoneId:', clickedFeature);
            return;
          }

          // 3. Find matching zone by ID and log diagnostic if unregistered
          const matchingZone = zonesRef.current.find((z) => z.id === rawZoneId);
          if (!matchingZone) {
            console.warn(`[EcoTwin Map] Clicked zoneId "${rawZoneId}" is not present in registered zones list.`);
          }

          // 4 & 5. Update selectedZoneId
          if (onSelectZoneRef.current) {
            onSelectZoneRef.current(rawZoneId);
          }
        }
      };

      // Pointer cursor hover feedback
      const handleMouseMove = (e: MapMouseEvent) => {
        if (!map.isStyleLoaded()) return;

        const activeFillLayer = `layer-${activeLayerRef.current}-fill`;
        const activeCentroidLayer = `layer-${activeLayerRef.current}-centroids`;
        const candidateLayers = [
          activeFillLayer,
          activeCentroidLayer,
          'zones-selected-fill',
          'zones-selected-stroke',
          'zones-selected-centroid',
        ].filter((id) => Boolean(map.getLayer(id)));

        const features = map.queryRenderedFeatures(e.point, { layers: candidateLayers });
        map.getCanvas().style.cursor = features && features.length > 0 ? 'pointer' : '';
      };

      map.on('click', handleMapClick);
      map.on('mousemove', handleMouseMove);

      // Handle style data loaded event to attach GeoJSON overlays
      map.on('styledata', () => {
        if (!isMountedRef.current) return;
        setupLayers(map);
        setIsLoading(false);
        setMapError(null);
      });

      // Handle map load event
      map.on('load', () => {
        if (!isMountedRef.current) return;
        setupLayers(map);
        setIsLoading(false);
        setMapError(null);
        map.resize();
      });

      // Handle render event to dismiss loading as soon as frames draw
      map.on('render', () => {
        if (!isMountedRef.current) return;
        if (map.isStyleLoaded()) {
          setIsLoading(false);
        }
      });

      // Event listener for camera move/zoom updates
      map.on('move', () => {
        if (!isMountedRef.current) return;
        const center = map.getCenter();
        setCurrentCenter([
          parseFloat(center.lng.toFixed(4)),
          parseFloat(center.lat.toFixed(4)),
        ]);
        setCurrentZoom(parseFloat(map.getZoom().toFixed(2)));
      });

      // Error handler: differentiate fatal style load errors from benign tile/glyph 404s
      map.on('error', (e) => {
        if (!isMountedRef.current) return;

        const message = e.error?.message || (typeof e === 'object' && 'status' in e ? `Status ${e.status}` : '');
        const errorUrl = (e.error as unknown as { url?: string })?.url || message;

        // Ignore benign 404s on optional font glyphs (.pbf), sprites (.png/.json), or raster tile edge misses
        if (
          errorUrl.includes('/fonts/') ||
          errorUrl.includes('/sprites/') ||
          errorUrl.includes('.pbf') ||
          errorUrl.includes('.png') ||
          errorUrl.includes('.webp') ||
          map.isStyleLoaded()
        ) {
          console.debug('MapLibre GL non-fatal resource notice:', message);
          return;
        }

        // Only surface a fatal error if the base style itself fails to load
        console.warn('MapLibre GL style error:', message);
        if (!map.isStyleLoaded()) {
          setMapError(`Unable to load map style from "${mapStyleUrl}". Please verify network connectivity or VITE_MAP_STYLE_URL.`);
          setIsLoading(false);
        }
      });

      // Safety timeout: ensure loading spinner is dismissed once tiles begin loading
      setTimeout(() => {
        if (isMountedRef.current && mapRef.current) {
          setIsLoading(false);
          mapRef.current.resize();
        }
      }, 1200);

      mapRef.current = map;
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const errMsg = err instanceof Error ? err.message : 'Failed to initialize MapLibre GL';
      setMapError(errMsg);
      setIsLoading(false);
    }
  }, [mapStyleUrl, setupLayers]);

  // Lifecycle hook for map mount, resize observer, and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    initMap();

    // Trigger explicit resize after brief layout settling
    const resizeTimer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 250);

    // Responsive container resize observer
    if (mapContainerRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserverRef.current.observe(mapContainerRef.current);
    }

    const handleWindowResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isMountedRef.current = false;
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // Ignore unmount cleanup errors
        }
        mapRef.current = null;
      }
    };
  }, [initMap]);

  // Reset view to Kolhapur default camera position
  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: KOLHAPUR_CENTER,
        zoom: INITIAL_ZOOM,
        pitch: INITIAL_PITCH,
        bearing: INITIAL_BEARING,
        essential: true,
      });
    }
  };

  const selectedZone = selectedZoneId
    ? zones.find((z) => z.id === selectedZoneId) || null
    : null;

  return (
    <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Top Map Toolbar */}
      <div className="bg-[#0A1628] border-b border-[rgba(148,163,184,0.14)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[#10233A] border border-[rgba(148,163,184,0.14)] text-[#22D3EE]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              Kolhapur Urban Geospatial Viewport
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10233A] border border-[#22D3EE]/30 text-[#22D3EE]">
                MapLibre GL JS
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Multi-layer environmental study areas · 3D perspective camera
            </p>
          </div>
        </div>

        {/* Selected Zone Pill, Camera telemetry & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Active Selected Zone Pill */}
          {selectedZone && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10233A] border border-[#22D3EE]/40 text-xs text-[#22D3EE]">
              <MapPin className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
              <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]" title={selectedZone.name}>
                {selectedZone.name}
              </span>
              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="ml-1 p-0.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#07111F] rounded transition-colors focus:outline-none"
                  title="Clear zone selection"
                  aria-label="Clear zone selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Toggle Legend Button */}
          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
              showLegend
                ? 'bg-[#10233A] text-[#22D3EE] border-[#22D3EE]/30'
                : 'bg-[#07111F] text-[#94A3B8] border-[rgba(148,163,184,0.14)] hover:text-[#F1F5F9]'
            }`}
            title="Toggle environmental layer controls and legend"
          >
            <LayersIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Layers & Legend</span>
          </button>

          {/* Telemetry indicator */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#07111F] border border-[rgba(148,163,184,0.14)] text-[11px] font-mono text-[#94A3B8]">
            <MapPin className="w-3 h-3 text-[#22D3EE]" />
            <span>{currentCenter[1].toFixed(4)}°N, {currentCenter[0].toFixed(4)}°E</span>
            <span className="text-slate-600">|</span>
            <span>z{currentZoom}</span>
          </div>

          {/* Reset View Button */}
          <button
            type="button"
            onClick={handleResetView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F1F5F9] bg-[#10233A] hover:bg-[#1a3352] border border-[rgba(148,163,184,0.2)] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            title="Reset camera to Kolhapur municipal center"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Map Canvas Container with explicit physical dimensions */}
      <div className="relative w-full h-[600px] min-h-[520px] bg-[#07111F]">
        {/* Stable HTML DOM container reference */}
        <div
          ref={mapContainerRef}
          className="w-full h-full relative"
          style={{ width: '100%', height: '100%', minHeight: '520px' }}
          aria-label="MapLibre interactive map of Kolhapur"
        />

        {/* Floating Layer Controls & Legend Panel */}
        {showLegend && (
          <div className="absolute top-3 left-3 z-20 pointer-events-auto">
            <MapLegend
              activeLayer={activeLayer}
              onSelectLayer={(layer) => {
                if (onSelectLayer) {
                  onSelectLayer(layer);
                }
              }}
            />
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !mapError && (
          <div className="absolute inset-0 bg-[#07111F]/70 backdrop-blur-xs flex flex-col items-center justify-center z-10 text-center p-4 pointer-events-none">
            <div className="w-9 h-9 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-3" />
            <h3 className="text-xs font-semibold text-[#F1F5F9]">
              Rendering Kolhapur Basemap & Overlays...
            </h3>
          </div>
        )}

        {/* Visible Error Overlay */}
        {mapError && (
          <div className="absolute inset-0 bg-[#07111F]/90 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-center p-6">
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-full text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#F1F5F9]">
              Map Style Load Error
            </h3>
            <p className="text-xs text-rose-300 max-w-md mt-1 leading-relaxed">
              {mapError}
            </p>
            <p className="text-[11px] text-[#94A3B8] max-w-md mt-2">
              Configured style: <code className="font-mono text-cyan-300 break-all">{mapStyleUrl}</code>
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={initMap}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Information */}
      <div className="bg-[#0A1628] border-t border-[rgba(148,163,184,0.14)] px-4 py-2 text-[11px] text-[#94A3B8] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#F1F5F9]">Active Layer:</span>
          <span className="font-mono text-cyan-300 uppercase font-semibold">
            {activeLayer} Quality
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400 font-mono text-[10px]">
            Simulated Demonstration Overlays
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          Click any study area on map or in priority list to inspect telemetry
        </div>
      </div>
    </div>
  );
};
