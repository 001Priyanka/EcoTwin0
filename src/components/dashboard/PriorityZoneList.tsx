import React from 'react';
import { ChevronRight, AlertTriangle, MapPin } from 'lucide-react';
import { ZoneDetails, EnvironmentalZone, LayerId } from '../../types/environmental';

interface PriorityZoneListProps {
  zones: (ZoneDetails | EnvironmentalZone)[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  activeLayer?: LayerId;
}

export const PriorityZoneList: React.FC<PriorityZoneListProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  activeLayer = 'air',
}) => {
  const getLayerBadge = (layer: LayerId) => {
    switch (layer) {
      case 'air':
        return { label: 'Air Risk Focal', color: 'text-[#22D3EE] bg-cyan-950/40 border-cyan-500/30' };
      case 'heat':
        return { label: 'Thermal Hotspot', color: 'text-[#FB923C] bg-amber-950/40 border-amber-500/30' };
      case 'waste':
        return { label: 'Waste Vulnerable', color: 'text-[#C084FC] bg-purple-950/40 border-purple-500/30' };
    }
  };

  const getEcoScoreColor = (val: number | null) => {
    if (val === null || val === undefined) return 'text-slate-400';
    if (val >= 75) return 'text-[#F87171]';
    if (val >= 50) return 'text-[#FB923C]';
    return 'text-[#34D399]';
  };

  return (
    <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5">
      <div className="flex items-center justify-between pb-4 border-b border-[rgba(148,163,184,0.14)]">
        <div>
          <h2 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Priority Environmental Zones
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Ranked by composite EcoScore risk. Select to synchronize inspection & map camera.
          </p>
        </div>
        <span className="text-xs font-mono text-[#94A3B8] bg-[#10233A] px-2.5 py-1 rounded border border-[rgba(148,163,184,0.14)]">
          {zones.length} Ranked Zones
        </span>
      </div>

      {zones.length === 0 ? (
        <div className="mt-4 py-8 px-4 text-center border border-dashed border-slate-700/60 rounded-lg bg-[#0A1628]/40">
          <p className="text-xs text-slate-400">No environmental zones available.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3" role="listbox" aria-label="Priority environmental zones">
          {zones.map((zone, index) => {
            const isSelected = zone.id === selectedZoneId;
            const layerBadge = getLayerBadge(zone.primaryRiskLayer);
            const ecoColor = getEcoScoreColor(zone.ecoScore);

            return (
              <button
              key={zone.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelectZone(zone.id)}
              className={`w-full text-left p-4 rounded-lg border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                isSelected
                  ? 'bg-[#10233A] border-[#2563EB] shadow-[0_0_15px_rgba(37,99,235,0.2)] ring-1 ring-[#2563EB]/40'
                  : 'bg-[#0A1628]/70 border-[rgba(148,163,184,0.14)] hover:bg-[#10233A]/60 hover:border-[rgba(148,163,184,0.28)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-[#07111F] px-1.5 py-0.5 rounded border border-slate-700/60">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-semibold text-[#F1F5F9]">
                      {zone.name}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${layerBadge.color}`}>
                      {layerBadge.label}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#07111F] text-amber-300 border border-amber-500/30">
                      {zone.dataStatus}
                    </span>
                  </div>

                  {zone.marathiName && (
                    <p className="text-xs text-[#94A3B8] font-normal">
                      {zone.marathiName} · <span className="font-mono text-[11px] text-slate-400">{zone.wardIdentifier}</span>
                    </p>
                  )}

                  <p className="text-xs text-[#94A3B8] line-clamp-1 mt-1">
                    {zone.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <span className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                    isSelected ? 'text-[#22D3EE] bg-cyan-950/60 font-medium' : 'text-[#94A3B8]'
                  }`}>
                    {isSelected ? 'Viewing' : 'Inspect'}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-0.5 text-[#22D3EE]' : 'text-slate-500'}`} />
                </div>
              </div>

              {/* Compact 4-metric strip for quick preview */}
              <div className="mt-3 pt-3 border-t border-[rgba(148,163,184,0.10)] grid grid-cols-4 gap-2 text-center">
                <div className={`py-1.5 px-1 rounded border transition-colors ${
                  activeLayer === 'air'
                    ? 'bg-[#10233A] border-[#22D3EE]/40 ring-1 ring-[#22D3EE]/20'
                    : 'bg-[#07111F]/70 border-[rgba(148,163,184,0.08)]'
                }`}>
                  <span className="text-[10px] text-[#94A3B8] block">Air Risk</span>
                  <span className="text-xs font-mono font-semibold text-[#22D3EE] tabular-nums">
                    {zone.airRisk !== null ? zone.airRisk : 'Unavailable'}
                  </span>
                </div>

                <div className={`py-1.5 px-1 rounded border transition-colors ${
                  activeLayer === 'heat'
                    ? 'bg-[#10233A] border-[#FB923C]/40 ring-1 ring-[#FB923C]/20'
                    : 'bg-[#07111F]/70 border-[rgba(148,163,184,0.08)]'
                }`}>
                  <span className="text-[10px] text-[#94A3B8] block">Heat Risk</span>
                  <span className="text-xs font-mono font-semibold text-[#FB923C] tabular-nums">
                    {zone.heatRisk !== null ? zone.heatRisk : 'Unavailable'}
                  </span>
                </div>

                <div className={`py-1.5 px-1 rounded border transition-colors ${
                  activeLayer === 'waste'
                    ? 'bg-[#10233A] border-[#C084FC]/40 ring-1 ring-[#C084FC]/20'
                    : 'bg-[#07111F]/70 border-[rgba(148,163,184,0.08)]'
                }`}>
                  <span className="text-[10px] text-[#94A3B8] block">Waste Risk</span>
                  <span className={`text-xs font-mono font-semibold tabular-nums ${
                    zone.wasteRisk !== null ? 'text-[#C084FC]' : 'text-slate-400 italic'
                  }`}>
                    {zone.wasteRisk !== null ? zone.wasteRisk : 'Unavailable'}
                  </span>
                </div>

                <div className="bg-[#07111F]/70 py-1.5 px-1 rounded border border-[rgba(148,163,184,0.08)]">
                  <span className="text-[10px] text-[#94A3B8] block">EcoScore</span>
                  <span className={`text-xs font-mono font-bold tabular-nums ${ecoColor}`}>
                    {zone.ecoScore !== null ? zone.ecoScore : 'Unavailable'}
                  </span>
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
