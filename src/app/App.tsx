import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { CitySummary } from '../components/dashboard/CitySummary';
import { PriorityZoneList } from '../components/dashboard/PriorityZoneList';
import { ZoneDetailsPanel } from '../components/dashboard/ZoneDetailsPanel';
import { EnvironmentalAnalytics } from '../components/dashboard/EnvironmentalAnalytics';
import { CityMap } from '../components/map/CityMap';
import { WhatIfSimulator } from '../components/dashboard/WhatIfSimulator';
import { AskEcoTwin } from '../components/dashboard/AskEcoTwin';
import { MOCK_PRIORITY_ZONES } from '../data/mockZones';
import { NavigationItemId, LayerId } from '../types/environmental';
import { ArrowLeft, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { useEnvironmentalData } from '../hooks/useEnvironmentalData';

const PAGE_TITLES: Record<NavigationItemId, string> = {
  'overview':          'Overview · Environmental Digital Twin',
  'city-map':          'City Map · Spatial Geospatial Layers',
  'air-quality':       'Air Quality · Particulate & Dispersion Risk',
  'urban-heat':        'Urban Heat · Thermal Microclimates',
  'waste-management':  'Waste Management · Runoff & Backlog Risk',
  'ask-ecotwin':       'Ask EcoTwin · Environmental Q&A',
  'what-if-simulator': 'What-if Simulator · Scenario Modeling',
  'settings':          'Settings · Digital Twin Preferences',
};

export default function App() {
  const [activeItem, setActiveItem] = useState<NavigationItemId>('overview');
  const [activeLayer, setActiveLayer] = useState<LayerId>('air');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(MOCK_PRIORITY_ZONES[0].id);

  const {
    zones,
    priorityZones,
    citySummary,
    selectedZoneDetails,
    isPriorityZonesLoading,
    priorityZonesErrorMessage,
    isZoneDetailsLoading,
    zoneDetailsErrorMessage,
    userErrorMessage,
    refresh,
    retryPriorityZones,
    retryZoneDetails,
  } = useEnvironmentalData(selectedZoneId);

  const selectedZone = selectedZoneId
    ? selectedZoneDetails || zones.find((z) => z.id === selectedZoneId) || null
    : null;

  const handleNavigate = (item: NavigationItemId) => {
    if (item === 'air-quality')      { setActiveLayer('air');   setActiveItem('city-map'); return; }
    if (item === 'urban-heat')       { setActiveLayer('heat');  setActiveItem('city-map'); return; }
    if (item === 'waste-management') { setActiveLayer('waste'); setActiveItem('city-map'); return; }
    setActiveItem(item);
  };

  // Shared map+details grid used in both Overview and City Map
  const MapWorkspace = (
    <section aria-label="City Geospatial & Risk Analysis" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-8">
        <CityMap
          selectedZoneId={selectedZoneId}
          onSelectZone={(id) => setSelectedZoneId(id)}
          onClearSelection={() => setSelectedZoneId(null)}
          activeLayer={activeLayer}
          onSelectLayer={(layer) => setActiveLayer(layer)}
          zones={zones}
        />
      </div>
      <div className="lg:col-span-4 space-y-5">
        <ZoneDetailsPanel
          zone={selectedZoneDetails}
          selectedZoneId={selectedZoneId}
          isLoading={isZoneDetailsLoading}
          error={zoneDetailsErrorMessage}
          onRetry={retryZoneDetails}
          onClearSelection={() => setSelectedZoneId(null)}
          onSelectDefaultZone={() => setSelectedZoneId(zones[0]?.id ?? null)}
          activeLayer={activeLayer}
        />
        <PriorityZoneList
          zones={priorityZones}
          selectedZoneId={selectedZoneId}
          onSelectZone={(id) => setSelectedZoneId(id)}
          activeLayer={activeLayer}
          isLoading={isPriorityZonesLoading}
          error={priorityZonesErrorMessage}
          onRetry={retryPriorityZones}
        />
      </div>
    </section>
  );

  const AnalyticsSection = (
    <section aria-label="Environmental Risk Analytics">
      <EnvironmentalAnalytics
        zones={zones}
        selectedZone={selectedZone}
        selectedZoneId={selectedZoneId}
        onSelectZone={(id) => setSelectedZoneId(id)}
        activeLayer={activeLayer}
      />
    </section>
  );

  return (
    <DashboardLayout
      activeItem={activeItem}
      pageTitle={PAGE_TITLES[activeItem]}
      onSelectItem={handleNavigate}
    >
      <div className="space-y-5">

        {/* Global error banner */}
        {userErrorMessage && (
          <div
            className="rounded-lg px-4 py-3 text-xs flex items-center justify-between gap-3"
            style={{ background: 'rgba(120,53,15,0.2)', border: '1px solid rgba(251,146,60,0.3)', color: '#FCD34D' }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{userErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* ── Overview ─────────────────────────────────────────── */}
        {activeItem === 'overview' && (
          <>
            <CitySummary
              summary={citySummary}
              onOpenMap={() => setActiveItem('city-map')}
            />
            {MapWorkspace}
            {AnalyticsSection}
          </>
        )}

        {/* ── City Map ─────────────────────────────────────────── */}
        {activeItem === 'city-map' && (
          <>
            {MapWorkspace}
            {AnalyticsSection}
          </>
        )}

        {/* ── What-if Simulator ────────────────────────────────── */}
        {activeItem === 'what-if-simulator' && (
          <WhatIfSimulator
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
            selectedZone={selectedZone}
          />
        )}

        {/* ── Ask EcoTwin ──────────────────────────────────────── */}
        {activeItem === 'ask-ecotwin' && (
          <AskEcoTwin
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => setSelectedZoneId(id)}
            selectedZone={selectedZone}
          />
        )}

        {/* ── Settings placeholder ─────────────────────────────── */}
        {activeItem === 'settings' && (
          <div
            className="rounded-xl border p-10 text-center max-w-lg mx-auto mt-8"
            style={{ background: '#0D1B2E', borderColor: 'rgba(148,163,184,0.12)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}
            >
              <Settings className="w-6 h-6 text-[#22D3EE]" />
            </div>
            <h2 className="text-lg font-bold text-[#F1F5F9]">Settings</h2>
            <p className="text-sm text-[#475569] mt-2">
              Configuration options coming in a future release.
            </p>
            <button
              type="button"
              onClick={() => setActiveItem('overview')}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
