import React from 'react';
import { ChevronRight, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { ZoneDetails, EnvironmentalZone, LayerId } from '../../types/environmental';

interface PriorityZoneListProps {
  zones: (ZoneDetails | EnvironmentalZone)[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  activeLayer?: LayerId;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const LAYER_BADGE: Record<LayerId, { label: string; style: React.CSSProperties }> = {
  air:   { label: 'Air',   style: { color: '#22D3EE', background: 'rgba(34,211,238,0.1)',   border: '1px solid rgba(34,211,238,0.25)'  } },
  heat:  { label: 'Heat',  style: { color: '#FB923C', background: 'rgba(251,146,60,0.1)',   border: '1px solid rgba(251,146,60,0.25)'  } },
  waste: { label: 'Waste', style: { color: '#C084FC', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.25)' } },
};

const RANK_COLORS = ['#F87171', '#FB923C', '#FCD34D', '#34D399', '#38BDF8', '#818CF8', '#C084FC'];

function getEcoScoreColor(val: number | null): string {
  if (val === null || val === undefined) return '#475569';
  if (val >= 75) return '#F87171';
  if (val >= 50) return '#FB923C';
  return '#34D399';
}

function getScoreForLayer(zone: EnvironmentalZone | ZoneDetails, layer: LayerId): number | null {
  if (layer === 'air')   return zone.airRisk;
  if (layer === 'heat')  return zone.heatRisk;
  if (layer === 'waste') return zone.wasteRisk;
  return null;
}

export const PriorityZoneList: React.FC<PriorityZoneListProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  activeLayer = 'air',
  isLoading = false,
  error = null,
  onRetry,
}) => {
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: '#0D1B2E', borderColor: 'rgba(148,163,184,0.12)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.10)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Priority Zones</h2>
        </div>
        <span className="text-[10px] font-mono text-[#475569] px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.10)' }}>
          {isLoading ? '…' : `${zones.length} ranked`}
        </span>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
          <RefreshCw className="w-5 h-5 text-[#22D3EE] animate-spin" />
          <p className="text-xs text-[#475569]">Loading priority rankings…</p>
        </div>
      ) : error ? (
        <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <p className="text-xs text-[#475569] max-w-xs">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      ) : zones.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-[#334155]">No priority zones available.</p>
        </div>
      ) : (
        <div role="listbox" aria-label="Priority environmental zones">
          {zones.map((zone, index) => {
            const isSelected = zone.id === selectedZoneId;
            const layerBadge = LAYER_BADGE[zone.primaryRiskLayer] ?? LAYER_BADGE.air;
            const rankColor = RANK_COLORS[index] ?? '#94A3B8';
            const layerScore = getScoreForLayer(zone, activeLayer);
            const ecoColor = getEcoScoreColor(zone.ecoScore);

            return (
              <button
                key={zone.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelectZone(zone.id)}
                className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-inset transition-colors"
                style={{
                  borderBottom: '1px solid rgba(148,163,184,0.06)',
                  background: isSelected
                    ? 'linear-gradient(90deg, rgba(37,99,235,0.1) 0%, rgba(34,211,238,0.04) 100%)'
                    : 'transparent',
                }}
              >
                {/* Left rank accent bar */}
                <div className="flex items-stretch">
                  <div
                    className="w-1 shrink-0 rounded-r-sm transition-all"
                    style={{ background: isSelected ? '#22D3EE' : 'transparent' }}
                  />

                  <div className="flex-1 px-4 py-3">
                    {/* Row 1: rank + name + primary-risk badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Rank chip */}
                      <span
                        className="text-[10px] font-mono font-bold w-5 h-5 rounded flex items-center justify-center shrink-0"
                        style={{ background: `${rankColor}18`, color: rankColor, border: `1px solid ${rankColor}35` }}
                      >
                        {index + 1}
                      </span>

                      <span className="text-sm font-semibold text-[#CBD5E1] truncate flex-1">
                        {zone.name}
                      </span>

                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                        style={layerBadge.style}>
                        {layerBadge.label}
                      </span>
                    </div>

                    {/* Row 2: Marathi name / ward */}
                    {zone.marathiName && (
                      <p className="text-[11px] text-[#334155] mt-0.5 truncate">
                        {zone.marathiName}
                        <span className="ml-1.5 font-mono text-[10px] text-[#2d3f55]">
                          · {zone.wardIdentifier}
                        </span>
                      </p>
                    )}

                    {/* Row 3: metric strip */}
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {(['air', 'heat', 'waste'] as LayerId[]).map((layer) => {
                        const score = getScoreForLayer(zone, layer);
                        const badge = LAYER_BADGE[layer];
                        const isActiveLayer = layer === activeLayer;
                        return (
                          <div key={layer} className="rounded px-1.5 py-1 text-center"
                            style={{
                              background: isActiveLayer ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                              border: isActiveLayer ? `1px solid ${(badge.style as React.CSSProperties & { color?: string }).color}30` : '1px solid rgba(148,163,184,0.06)',
                            }}>
                            <div className="text-[9px] text-[#334155] uppercase font-mono">{layer}</div>
                            <div className="text-[11px] font-mono font-bold tabular-nums mt-0.5"
                              style={{ color: score !== null ? (badge.style as React.CSSProperties & { color?: string }).color : '#334155' }}>
                              {score !== null ? score : '—'}
                            </div>
                          </div>
                        );
                      })}
                      {/* EcoScore */}
                      <div className="rounded px-1.5 py-1 text-center"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(148,163,184,0.06)' }}>
                        <div className="text-[9px] text-[#334155] uppercase font-mono">Eco</div>
                        <div className="text-[11px] font-mono font-bold tabular-nums mt-0.5"
                          style={{ color: ecoColor }}>
                          {zone.ecoScore !== null ? zone.ecoScore : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: chevron */}
                  <div className="flex items-center pr-3">
                    <ChevronRight
                      className="w-4 h-4 transition-transform"
                      style={{ color: isSelected ? '#22D3EE' : '#334155', transform: isSelected ? 'translateX(2px)' : undefined }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
