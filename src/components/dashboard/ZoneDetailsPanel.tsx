import React from 'react';
import { ZoneDetails, LayerId } from '../../types/environmental';
import { 
  Database, 
  Clock, 
  X, 
  Layers, 
  Wind, 
  Flame, 
  Trash2, 
  Activity, 
  Info,
  Radio,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { ZoneRiskChart } from './ZoneRiskChart';

interface ZoneDetailsPanelProps {
  zone: ZoneDetails | null;
  onClearSelection: () => void;
  onSelectDefaultZone?: () => void;
  activeLayer?: LayerId;
}

export const ZoneDetailsPanel: React.FC<ZoneDetailsPanelProps> = ({
  zone,
  onClearSelection,
  onSelectDefaultZone,
  activeLayer = 'air',
}) => {
  if (!zone) {
    return (
      <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div className="w-12 h-12 rounded-full bg-[#10233A] border border-[rgba(148,163,184,0.14)] flex items-center justify-center text-[#94A3B8] mb-4">
          <Layers className="w-6 h-6 text-[#22D3EE]" />
        </div>
        <h3 className="text-base font-bold text-[#F1F5F9]">No Zone Selected</h3>
        <p className="text-xs text-[#94A3B8] max-w-xs mt-1.5 leading-relaxed">
          Select any priority zone from the list or click a demonstration area directly on the map to inspect localized telemetry and risk indices.
        </p>
        {onSelectDefaultZone && (
          <button
            type="button"
            onClick={onSelectDefaultZone}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-md transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
          >
            Select Sample Zone
          </button>
        )}
      </div>
    );
  }

  // Qualitative severity label for environmental risk (higher score = greater risk)
  const getRiskSeverity = (val: number | null) => {
    if (val === null || val === undefined) {
      return { text: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700/60', label: 'Unavailable' };
    }
    if (val >= 75) {
      return { text: 'text-[#F87171]', bg: 'bg-rose-950/60 border-rose-500/30 text-[#F87171]', label: 'High Risk' };
    }
    if (val >= 50) {
      return { text: 'text-[#FB923C]', bg: 'bg-amber-950/60 border-amber-500/30 text-[#FB923C]', label: 'Elevated Risk' };
    }
    return { text: 'text-[#34D399]', bg: 'bg-emerald-950/60 border-emerald-500/30 text-[#34D399]', label: 'Low Risk' };
  };

  const ecoSeverity = getRiskSeverity(zone.ecoScore);

  return (
    <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5 flex flex-col justify-between h-full shadow-sm">
      <div className="space-y-4">
        {/* Top Header Row with Name, Ward ID, and Close button */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[rgba(148,163,184,0.14)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[#22D3EE] bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                {zone.wardIdentifier}
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                {zone.dataStatus} DATA
              </span>
              <span className="text-xs text-[#94A3B8] px-2 py-0.5 rounded bg-slate-800/40">
                {zone.category}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#F1F5F9] leading-tight">
              {zone.name}
            </h3>
            {zone.marathiName && (
              <p className="text-xs text-[#94A3B8]">{zone.marathiName}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Clear selected zone"
            className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#10233A] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Narrative Description */}
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          {zone.description}
        </p>

        {/* EcoScore Composite Risk Banner (Higher score = higher environmental risk) */}
        <div className="p-3.5 rounded-lg bg-[#07111F] border border-[rgba(148,163,184,0.14)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#22D3EE]" />
              <div>
                <span className="text-xs font-bold text-[#F1F5F9] block">
                  EcoScore (Composite Risk)
                </span>
                <span className="text-[10px] text-[#94A3B8]">
                  Higher score indicates greater environmental risk
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold font-mono tabular-nums ${ecoSeverity.text}`}>
                  {zone.ecoScore !== null ? zone.ecoScore : 'Unavailable'}
                </span>
                {zone.ecoScore !== null && (
                  <span className="text-[10px] text-[#94A3B8] font-mono">/ 100</span>
                )}
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${ecoSeverity.bg}`}>
                {ecoSeverity.label}
              </span>
            </div>
          </div>
        </div>

        {/* Key Observed Stress Drivers */}
        {zone.factors && zone.factors.length > 0 && (
          <div className="p-2.5 rounded bg-[#0A1628] border border-[rgba(148,163,184,0.1)]">
            <span className="text-[11px] font-semibold text-[#F1F5F9] block mb-1">
              Key Stress Drivers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {zone.factors.map((factor, idx) => (
                <span
                  key={idx}
                  className="text-[11px] text-[#94A3B8] bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(148,163,184,0.14)]"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Criteria Risk Analytics Visualization */}
        <ZoneRiskChart
          zone={zone}
          activeLayer={activeLayer}
          compact={true}
        />

        {/* 3 Detailed Environmental Layer Observation Cards */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
            <span>Layer Observations & Telemetry</span>
            <span className="text-[10px] text-[#22D3EE]">Active: {activeLayer.toUpperCase()}</span>
          </div>

          {/* 1. AIR QUALITY SECTION */}
          <div className={`p-3.5 rounded-lg bg-[#0A1628] border transition-all ${
            activeLayer === 'air'
              ? 'border-[#22D3EE] ring-1 ring-[#22D3EE]/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]'
              : 'border-[rgba(148,163,184,0.12)]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#10233A] text-[#22D3EE]">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#F1F5F9] block">
                    Air Quality Risk
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">
                    Status: {zone.air.status}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-bold font-mono text-[#22D3EE] tabular-nums">
                  {zone.airRisk !== null ? `${zone.airRisk}/100` : 'Unavailable'}
                </span>
                {activeLayer === 'air' && (
                  <span className="block text-[9px] font-mono text-[#22D3EE]">Map Focus</span>
                )}
              </div>
            </div>

            {/* Granular Measurements */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[rgba(148,163,184,0.08)]">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Estimated AQI</span>
                <span className="font-mono text-[#F1F5F9] tabular-nums">
                  {zone.air.aqi !== null ? zone.air.aqi : 'Unavailable'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] block">PM2.5 Concentration</span>
                <span className="font-mono text-[#F1F5F9] tabular-nums">
                  {zone.air.pm25 !== null ? `${zone.air.pm25} µg/m³` : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Source & Timestamp */}
            <div className="mt-2 pt-2 border-t border-[rgba(148,163,184,0.06)] text-[10px] text-slate-400 flex items-center justify-between">
              <span className="truncate max-w-[200px]" title={zone.air.source || 'No source sensor mapped'}>
                Source: {zone.air.source || 'Unavailable'}
              </span>
              <span>{zone.air.timestamp ? new Date(zone.air.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No timestamp'}</span>
            </div>
          </div>

          {/* 2. URBAN HEAT SECTION */}
          <div className={`p-3.5 rounded-lg bg-[#0A1628] border transition-all ${
            activeLayer === 'heat'
              ? 'border-[#FB923C] ring-1 ring-[#FB923C]/30 shadow-[0_0_12px_rgba(251,146,60,0.1)]'
              : 'border-[rgba(148,163,184,0.12)]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#10233A] text-[#FB923C]">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#F1F5F9] block">
                    Urban Heat Risk
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">
                    Status: {zone.heat.status}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-bold font-mono text-[#FB923C] tabular-nums">
                  {zone.heatRisk !== null ? `${zone.heatRisk}/100` : 'Unavailable'}
                </span>
                {activeLayer === 'heat' && (
                  <span className="block text-[9px] font-mono text-[#FB923C]">Map Focus</span>
                )}
              </div>
            </div>

            {/* Granular Measurements */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[rgba(148,163,184,0.08)]">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Surface Thermal Index</span>
                <span className="font-mono text-[#F1F5F9] tabular-nums">
                  {zone.heat.temperatureC !== null ? `${zone.heat.temperatureC} °C` : 'Unavailable'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Microclimate Vulnerability</span>
                <span className="font-mono text-[#F1F5F9] tabular-nums">
                  {zone.heat.heatRisk !== null ? `${zone.heat.heatRisk}/100` : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Source & Timestamp */}
            <div className="mt-2 pt-2 border-t border-[rgba(148,163,184,0.06)] text-[10px] text-slate-400 flex items-center justify-between">
              <span className="truncate max-w-[200px]" title={zone.heat.source || 'No source sensor mapped'}>
                Source: {zone.heat.source || 'Unavailable'}
              </span>
              <span>{zone.heat.timestamp ? new Date(zone.heat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No timestamp'}</span>
            </div>
          </div>

          {/* 3. WASTE MANAGEMENT SECTION */}
          <div className={`p-3.5 rounded-lg bg-[#0A1628] border transition-all ${
            activeLayer === 'waste'
              ? 'border-[#C084FC] ring-1 ring-[#C084FC]/30 shadow-[0_0_12px_rgba(192,132,252,0.1)]'
              : 'border-[rgba(148,163,184,0.12)]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#10233A] text-[#C084FC]">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#F1F5F9] block">
                    Waste Management Risk
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">
                    Status: {zone.waste.status}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-lg font-bold font-mono tabular-nums ${
                  zone.wasteRisk !== null ? 'text-[#C084FC]' : 'text-slate-400 italic'
                }`}>
                  {zone.wasteRisk !== null ? `${zone.wasteRisk}/100` : 'Unavailable'}
                </span>
                {activeLayer === 'waste' && (
                  <span className="block text-[9px] font-mono text-[#C084FC]">Map Focus</span>
                )}
              </div>
            </div>

            {/* Granular Measurements */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[rgba(148,163,184,0.08)]">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Overflow Backlog</span>
                <span className="font-mono text-[#F1F5F9] tabular-nums">
                  {zone.waste.reportedOverflowCount !== null ? `${zone.waste.reportedOverflowCount} reports` : 'Unavailable'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Route Clearance</span>
                <span className="font-mono text-[#F1F5F9] tabular-nums">
                  {zone.waste.collectionEfficiencyPct !== null ? `${zone.waste.collectionEfficiencyPct}% efficiency` : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Source & Timestamp */}
            <div className="mt-2 pt-2 border-t border-[rgba(148,163,184,0.06)] text-[10px] text-slate-400 flex items-center justify-between">
              <span className="truncate max-w-[200px]" title={zone.waste.source || 'Sensor route offline'}>
                Source: {zone.waste.source || 'Unavailable (No Telemetry)'}
              </span>
              <span>{zone.waste.timestamp ? new Date(zone.waste.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No timestamp'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Audit Metadata */}
      <div className="mt-5 pt-3 border-t border-[rgba(148,163,184,0.10)] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>Zone ID: <code className="font-mono text-[#F1F5F9]">{zone.id}</code></span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{zone.lastUpdated}</span>
        </div>
      </div>
    </div>
  );
};
