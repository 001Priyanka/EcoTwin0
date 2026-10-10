import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { CitySummary } from '../components/dashboard/CitySummary';
import { PriorityZoneList } from '../components/dashboard/PriorityZoneList';
import { ZoneDetailsPanel } from '../components/dashboard/ZoneDetailsPanel';
import { EnvironmentalAnalytics } from '../components/dashboard/EnvironmentalAnalytics';
import { CityMap } from '../components/map/CityMap';
import { MOCK_PRIORITY_ZONES } from '../data/mockZones';
import { NavigationItemId, LayerId } from '../types/environmental';
import { Construction, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useEnvironmentalData, ensureZoneDetails } from '../hooks/useEnvironmentalData';

const PAGE_TITLES: Record<NavigationItemId, string> = {
  'overview': 'Overview · Environmental Digital Twin',
  'city-map': 'City Map · Spatial Geospatial Layers',
  'air-quality': 'Air Quality · Particulate & Dispersion Risk',
  'urban-heat': 'Urban Heat · Thermal Microclimates',
  'waste-management': 'Waste Management · Runoff & Backlog Risk',
  'ask-ecotwin': 'Ask EcoTwin · Environmental Q&A',
  'what-if-simulator': 'What-if Simulator · Scenario Modeling',
  'settings': 'Settings · Digital Twin Preferences',
};

export default function App() {
  const [activeItem, setActiveItem] = useState<NavigationItemId>('overview');
  // Canonical active layer state for MapLibre overlays
  const [activeLayer, setActiveLayer] = useState<LayerId>('air');
  // Selected zone identified strictly by stable string ID, not array index
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(MOCK_PRIORITY_ZONES[0].id);

  // Reactive data fetching via EcoTwin API client foundation
  const { 
    zones, 
    citySummary, 
    selectedZoneDetails, 
    isLoading, 
    userErrorMessage, 
    refresh 
  } = useEnvironmentalData(selectedZoneId);

  const selectedZone = selectedZoneId
    ? selectedZoneDetails || (() => {
        const found = zones.find((z) => z.id === selectedZoneId);
        return found ? ensureZoneDetails(found) : null;
      })()
    : null;

  // Handle navigation bar selection
  const handleNavigate = (item: NavigationItemId) => {
    if (item === 'air-quality') {
      setActiveLayer('air');
      setActiveItem('city-map');
      return;
    }
    if (item === 'urban-heat') {
      setActiveLayer('heat');
      setActiveItem('city-map');
      return;
    }
    if (item === 'waste-management') {
      setActiveLayer('waste');
      setActiveItem('city-map');
      return;
    }
    setActiveItem(item);
  };

  return (
    <DashboardLayout
      activeItem={activeItem}
      pageTitle={PAGE_TITLES[activeItem]}
      onSelectItem={handleNavigate}
    >
      {userErrorMessage && (
        <div className="mb-4 bg-[#10233A] border border-amber-500/40 rounded-lg p-3 text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{userErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {activeItem === 'overview' ? (
        <div className="space-y-6">
          {/* Section 1: City Overview with 4 RiskMetric cards */}
          <CitySummary
            summary={citySummary}
            onOpenMap={() => setActiveItem('city-map')}
          />

          {/* Section 2: Central Geospatial Map with Zone Inspection Workspace */}
          <section aria-label="City Geospatial & Risk Analysis" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Dedicated Interactive City Map (8 cols on desktop) */}
            <div className="lg:col-span-8">
              <CityMap
                selectedZoneId={selectedZoneId}
                onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
                onClearSelection={() => setSelectedZoneId(null)}
                activeLayer={activeLayer}
                onSelectLayer={(layer) => setActiveLayer(layer)}
                zones={zones}
              />
            </div>

            {/* Right Column: Selected Zone Details & Priority Zone List (4 cols on desktop) */}
            <div className="lg:col-span-4 space-y-6">
              <ZoneDetailsPanel
                zone={selectedZone}
                onClearSelection={() => setSelectedZoneId(null)}
                onSelectDefaultZone={() => setSelectedZoneId(zones[0]?.id || null)}
                activeLayer={activeLayer}
              />
              <PriorityZoneList
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
                activeLayer={activeLayer}
              />
            </div>
          </section>

          {/* Section 3: Environmental Dashboard Analytics (Phase 3, Step 1) */}
          <section aria-label="Environmental Risk Analytics">
            <EnvironmentalAnalytics
              zones={zones}
              selectedZone={selectedZone}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
              activeLayer={activeLayer}
            />
          </section>
        </div>
      ) : activeItem === 'city-map' ? (
        /* Dedicated CityMap workspace */
        <div className="space-y-6">
          <section aria-label="City Map Workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Map Column: MapLibre interactive canvas (8 cols on large screens) */}
            <div className="lg:col-span-8">
              <CityMap
                selectedZoneId={selectedZoneId}
                onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
                onClearSelection={() => setSelectedZoneId(null)}
                activeLayer={activeLayer}
                onSelectLayer={(layer) => setActiveLayer(layer)}
                zones={zones}
              />
            </div>

            {/* Inspection & Priority Zone Panels (4 cols on large screens) */}
            <div className="lg:col-span-4 space-y-6">
              <ZoneDetailsPanel
                zone={selectedZone}
                onClearSelection={() => setSelectedZoneId(null)}
                onSelectDefaultZone={() => setSelectedZoneId(zones[0]?.id || null)}
                activeLayer={activeLayer}
              />
              <PriorityZoneList
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
                activeLayer={activeLayer}
              />
            </div>
          </section>

          {/* Environmental Dashboard Analytics */}
          <section aria-label="Environmental Risk Analytics">
            <EnvironmentalAnalytics
              zones={zones}
              selectedZone={selectedZone}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
              activeLayer={activeLayer}
            />
          </section>
        </div>
      ) : (
        /* Scoped Milestone Boundary for remaining non-implemented items */
        <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-[#10233A] border border-[rgba(148,163,184,0.2)] flex items-center justify-center text-amber-400 mx-auto mb-4">
            <Construction className="w-6 h-6" />
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#22D3EE] bg-[#10233A] px-2.5 py-1 rounded border border-[rgba(34,211,238,0.2)]">
            Milestone Boundary
          </span>
          <h2 className="text-xl font-bold text-[#F1F5F9] mt-3">
            {PAGE_TITLES[activeItem].split(' · ')[0]} Module
          </h2>
          <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
            This module is reserved for subsequent implementation milestones (such as AI integrations or scenario simulation engines). 
            Active foundation, MapLibre basemap, and environmental GeoJSON overlays are functional under <strong>Overview</strong> and <strong>City Map</strong>.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setActiveItem('overview')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Overview
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
