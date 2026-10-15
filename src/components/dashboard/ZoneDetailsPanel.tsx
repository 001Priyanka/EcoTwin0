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
  Radio,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ZoneRiskChart } from './ZoneRiskChart';

interface ZoneDetailsPanelProps {
  zone: ZoneDetails | null;
  onClearSelection: () => void;
  onSelectDefaultZone?: () => void;
  activeLayer?: LayerId;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedZoneId?: string | null;
}

function formatTimestamp(raw: string | null | undefined): string {
  if (!raw) return 'No timestamp';
  // If it looks like an ISO string, format it; otherwise return as-is
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
  } catch {/* ignore */}
  return raw;
}

function getRiskSeverity(val: number | null) {
  if (val === null || val === undefined)
    return { text: '#475569', bg: 'rgba(255,255,255,0.04)', border: 'rgba(148,163,184,0.12)', label: 'N/A' };
  if (val >= 75)
    return { text: '#F87171', bg: 'rgba(127,29,29,0.35)', border: 'rgba(248,113,113,0.25)', label: 'High Risk' };
  if (val >= 50)
    return { text: '#FB923C', bg: 'rgba(120,53,15,0.30)', border: 'rgba(251,146,60,0.25)', label: 'Elevated' };
  return   { text: '#34D399', bg: 'rgba(6,78,59,0.30)',  border: 'rgba(52,211,153,0.25)', label: 'Low Risk' };
}

export const ZoneDetailsPanel: React.FC<ZoneDetailsPanelProps> = ({
  zone,
  onClearSelection,
  onSelectDefaultZone,
  activeLayer = 'air',
  isLoading = false,
  error = null,
  onRetry,
  selectedZoneId,
}) => {
  /* ── Loading ─────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="rounded-xl border p-8 flex flex-col items-center justify-center text-center min-h-[380px]"
        style={{ background: '#0D1B2E', borderColor: 'rgba(148,163,184,0.12)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)' }}>
          <RefreshCw className="w-5 h-5 animate-spin text-[#22D3EE]" />
        </div>
        <h3 className="text-sm font-semibold text-[#CBD5E1]">Loading Zone Telemetry</h3>
        <p className="text-xs text-[#334155] max-w-xs mt-1.5">Retrieving sensor data…</p>
        {selectedZoneId && (
          <div className="mt-4 flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded"
            style={{ color: '#22D3EE', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            GET /zones/{selectedZoneId}
          </div>
        )}
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="rounded-xl border p-8 flex flex-col items-center justify-center text-center min-h-[380px]"
        style={{ background: '#0D1B2E', borderColor: 'rgba(248,113,113,0.25)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(127,29,29,0.35)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <AlertCircle className="w-5 h-5 text-rose-400" />
        </div>
        <h3 className="text-sm font-semibold text-[#CBD5E1] mt-2">Unable to Load Details</h3>
        <p className="text-xs text-[#334155] max-w-sm mt-1.5">{error}</p>
        <div className="mt-5 flex gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-md transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
          <button type="button" onClick={onClearSelection}
            className="px-3 py-2 text-xs text-[#475569] hover:text-[#CBD5E1] hover:bg-white/5 rounded-md transition-colors">
            Clear
          </button>
        </div>
      </div>
    );
  }

  /* ── Empty ───────────────────────────────────────────────── */
  if (!zone) {
    return (
      <div className="rounded-xl border p-8 flex flex-col items-center justify-center text-center min-h-[380px]"
        style={{ background: '#0D1B2E', borderColor: 'rgba(148,163,184,0.12)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)' }}>
          <Layers className="w-5 h-5 text-[#22D3EE]" />
        </div>
        <h3 className="text-sm font-semibold text-[#CBD5E1]">No Zone Selected</h3>
        <p className="text-xs text-[#334155] max-w-xs mt-1.5">
          Select a zone from the list or click on the map to inspect its telemetry.
        </p>
        {onSelectDefaultZone && (
          <button type="button" onClick={onSelectDefaultZone}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-lg transition-colors">
            Select Sample Zone
          </button>
        )}
      </div>
    );
  }

  const ecoSev = getRiskSeverity(zone.ecoScore);

  return (
    <div className="rounded-xl border flex flex-col overflow-hidden"
      style={{ background: '#0D1B2E', borderColor: 'rgba(148,163,184,0.12)' }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.10)', background: 'rgba(255,255,255,0.015)' }}>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22D3EE' }}>
              {zone.wardIdentifier}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase"
              style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#FCD34D' }}>
              {zone.dataStatus}
            </span>
            <span className="text-[10px] text-[#334155] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              {zone.category}
            </span>
          </div>
          <h3 className="text-base font-bold text-[#F1F5F9] truncate">{zone.name}</h3>
          {zone.marathiName && (
            <p className="text-[11px] text-[#334155]">{zone.marathiName}</p>
          )}
        </div>
        <button type="button" onClick={onClearSelection}
          aria-label="Clear selection"
          className="p-1.5 rounded-md text-[#475569] hover:text-[#CBD5E1] hover:bg-white/5 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Description */}
        <p className="text-xs text-[#475569] leading-relaxed">{zone.description}</p>

        {/* EcoScore banner */}
        <div className="rounded-lg px-4 py-3 flex items-center justify-between"
          style={{ background: ecoSev.bg, border: `1px solid ${ecoSev.border}` }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: ecoSev.text }} />
            <div>
              <span className="text-xs font-semibold text-[#CBD5E1] block">EcoScore</span>
              <span className="text-[10px] text-[#334155]">Composite environmental risk</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: ecoSev.text }}>
              {zone.ecoScore !== null ? zone.ecoScore : '—'}
            </span>
            {zone.ecoScore !== null && (
              <span className="text-[10px] text-[#475569] font-mono ml-1">/100</span>
            )}
            <span className="block text-[10px] font-mono" style={{ color: ecoSev.text }}>{ecoSev.label}</span>
          </div>
        </div>

        {/* Stress factors */}
        {zone.factors && zone.factors.length > 0 && (
          <div className="rounded-lg p-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(148,163,184,0.08)' }}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#475569] block mb-2">
              Stress Drivers
            </span>
            <div className="flex flex-wrap gap-1.5">
              {zone.factors.map((f, i) => (
                <span key={i} className="text-[11px] text-[#64748B] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Risk chart */}
        <ZoneRiskChart zone={zone} activeLayer={activeLayer} compact />

        {/* Telemetry cards */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#334155]">
            Layer Telemetry · Active: <span className="text-[#22D3EE]">{activeLayer.toUpperCase()}</span>
          </span>

          {/* Air */}
          <TelemetryCard
            icon={<Wind className="w-4 h-4 text-[#22D3EE]" />}
            label="Air Quality Risk"
            score={zone.airRisk}
            scoreColor="#22D3EE"
            isActive={activeLayer === 'air'}
            activeAccent="rgba(34,211,238,0.2)"
            status={zone.air.status}
            source={zone.air.source}
            timestamp={zone.air.timestamp}
            metrics={[
              { label: 'AQI',   value: zone.air.aqi   !== null ? String(zone.air.aqi)   : null },
              { label: 'PM2.5', value: zone.air.pm25  !== null ? `${zone.air.pm25} µg/m³` : null },
            ]}
          />

          {/* Heat */}
          <TelemetryCard
            icon={<Flame className="w-4 h-4 text-[#FB923C]" />}
            label="Urban Heat Risk"
            score={zone.heatRisk}
            scoreColor="#FB923C"
            isActive={activeLayer === 'heat'}
            activeAccent="rgba(251,146,60,0.2)"
            status={zone.heat.status}
            source={zone.heat.source}
            timestamp={zone.heat.timestamp}
            metrics={[
              { label: 'Surface Temp',  value: zone.heat.temperatureC !== null ? `${zone.heat.temperatureC} °C` : null },
              { label: 'Heat Index',    value: zone.heat.heatRisk     !== null ? `${zone.heat.heatRisk}/100`    : null },
            ]}
          />

          {/* Waste */}
          <TelemetryCard
            icon={<Trash2 className="w-4 h-4 text-[#C084FC]" />}
            label="Waste Management"
            score={zone.wasteRisk}
            scoreColor="#C084FC"
            isActive={activeLayer === 'waste'}
            activeAccent="rgba(192,132,252,0.2)"
            status={zone.waste.status}
            source={zone.waste.source}
            timestamp={zone.waste.timestamp}
            metrics={[
              { label: 'Overflow Reports', value: zone.waste.reportedOverflowCount !== null ? `${zone.waste.reportedOverflowCount}` : null },
              { label: 'Route Efficiency', value: zone.waste.collectionEfficiencyPct !== null ? `${zone.waste.collectionEfficiencyPct}%` : null },
            ]}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 flex items-center justify-between text-[10px] text-[#334155]"
        style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-[#22D3EE]" />
          <code className="font-mono text-[#475569]">{zone.id}</code>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatTimestamp(zone.updatedAt ?? zone.lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
};

/* ── Internal TelemetryCard sub-component ──────────────────── */
interface TelemetryCardProps {
  icon: React.ReactNode;
  label: string;
  score: number | null;
  scoreColor: string;
  isActive: boolean;
  activeAccent: string;
  status: string;
  source: string | null;
  timestamp: string | null | undefined;
  metrics: { label: string; value: string | null }[];
}

function TelemetryCard({
  icon, label, score, scoreColor, isActive, activeAccent,
  status, source, timestamp, metrics,
}: TelemetryCardProps) {
  return (
    <div className="rounded-lg p-3 transition-all"
      style={{
        background: isActive ? `${activeAccent.replace('0.2', '0.06')}` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isActive ? activeAccent : 'rgba(148,163,184,0.08)'}`,
        boxShadow: isActive ? `0 0 12px ${activeAccent.replace('0.2', '0.08')}` : undefined,
      }}>
      {/* Row 1: icon + label + score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>{icon}</div>
          <div>
            <span className="text-xs font-semibold text-[#CBD5E1] block">{label}</span>
            <span className="text-[10px] font-mono text-[#334155] uppercase">{status}</span>
          </div>
        </div>
        <span className="text-lg font-bold font-mono tabular-nums" style={{ color: scoreColor }}>
          {score !== null ? `${score}/100` : '—'}
        </span>
      </div>
      {/* Row 2: metrics grid */}
      <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
        {metrics.map((m) => (
          <div key={m.label}>
            <span className="text-[10px] text-[#334155] block">{m.label}</span>
            <span className="text-xs font-mono text-[#CBD5E1]">{m.value ?? '—'}</span>
          </div>
        ))}
      </div>
      {/* Row 3: source + time */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-[#2d3f55]"
        style={{ borderTop: '1px solid rgba(148,163,184,0.05)', paddingTop: '6px' }}>
        <span className="truncate max-w-[180px]" title={source ?? ''}>{source ?? 'No source'}</span>
        <span>{timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
      </div>
    </div>
  );
}
