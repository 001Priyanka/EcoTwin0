import React from 'react';
import { Wind, Flame, Trash2, Info, AlertCircle, ShieldAlert } from 'lucide-react';
import { LayerId } from '../../types/environmental';

interface MapLegendProps {
  activeLayer: LayerId;
  onSelectLayer: (layer: LayerId) => void;
  className?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  activeLayer,
  onSelectLayer,
  className = '',
}) => {
  const getLayerDetails = () => {
    switch (activeLayer) {
      case 'air':
        return {
          title: 'Air Quality Risk Overlay',
          subtitle: 'Particulate exposure & congestion stress index (0–100)',
          lowLabel: 'Low (0–49)',
          midLabel: 'Elevated (50–74)',
          highLabel: 'High Risk (75–100)',
          lowColor: 'bg-[#34D399]',
          midColor: 'bg-[#FB923C]',
          highColor: 'bg-[#F87171]',
        };
      case 'heat':
        return {
          title: 'Urban Heat Island Overlay',
          subtitle: 'Surface thermal retention & microclimate stress index (0–100)',
          lowLabel: 'Buffered (0–49)',
          midLabel: 'Warm (50–69)',
          highLabel: 'Thermal Hotspot (≥70)',
          lowColor: 'bg-[#38BDF8]',
          midColor: 'bg-[#FB923C]',
          highColor: 'bg-[#EF4444]',
        };
      case 'waste':
        return {
          title: 'Waste Management Risk Overlay',
          subtitle: 'Disposal backlog & riparian runoff vulnerability (0–100)',
          lowLabel: 'Managed (0–49)',
          midLabel: 'Stressed (50–74)',
          highLabel: 'Critical Backlog (≥75)',
          lowColor: 'bg-[#34D399]',
          midColor: 'bg-[#C084FC]',
          highColor: 'bg-[#E11D48]',
        };
    }
  };

  const details = getLayerDetails();

  return (
    <div
      className={`bg-[#07111F]/90 backdrop-blur-md border border-[rgba(148,163,184,0.18)] rounded-lg p-3.5 shadow-xl text-xs text-[#F1F5F9] max-w-sm ${className}`}
      aria-label="Map layer controls and environmental risk legend"
    >
      {/* Layer Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#0A1628] rounded-md border border-[rgba(148,163,184,0.12)] mb-3">
        <button
          type="button"
          onClick={() => onSelectLayer('air')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB] ${
            activeLayer === 'air'
              ? 'bg-[#10233A] text-[#22D3EE] font-semibold border border-[rgba(34,211,238,0.3)] shadow-xs'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#10233A]/50'
          }`}
          aria-pressed={activeLayer === 'air'}
        >
          <Wind className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>Air</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectLayer('heat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB] ${
            activeLayer === 'heat'
              ? 'bg-[#10233A] text-[#FB923C] font-semibold border border-[rgba(251,146,60,0.3)] shadow-xs'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#10233A]/50'
          }`}
          aria-pressed={activeLayer === 'heat'}
        >
          <Flame className="w-3.5 h-3.5 text-[#FB923C]" />
          <span>Heat</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectLayer('waste')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB] ${
            activeLayer === 'waste'
              ? 'bg-[#10233A] text-[#C084FC] font-semibold border border-[rgba(192,132,252,0.3)] shadow-xs'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#10233A]/50'
          }`}
          aria-pressed={activeLayer === 'waste'}
        >
          <Trash2 className="w-3.5 h-3.5 text-[#C084FC]" />
          <span>Waste</span>
        </button>
      </div>

      {/* Active Layer Header */}
      <div className="mb-2.5">
        <div className="font-semibold text-[#F1F5F9] text-xs leading-tight">
          {details.title}
        </div>
        <div className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
          {details.subtitle}
        </div>
      </div>

      {/* Color Scale Legend */}
      <div className="space-y-1.5 pt-2 border-t border-[rgba(148,163,184,0.12)]">
        <div className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider">
          Risk Scale (Higher = Greater Risk)
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${details.lowColor} shrink-0`} />
            <span className="text-slate-300">{details.lowLabel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${details.midColor} shrink-0`} />
            <span className="text-slate-300">{details.midLabel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${details.highColor} shrink-0`} />
            <span className="text-slate-300">{details.highLabel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#64748B] border border-dashed border-slate-400 shrink-0" />
            <span className="text-[#94A3B8] italic">Unavailable (N/A)</span>
          </div>
        </div>
      </div>

      {/* Mandatory Data Status Label */}
      <div className="mt-3 pt-2.5 border-t border-[rgba(148,163,184,0.12)] space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
          <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
          <span>SIMULATED DEMONSTRATION DATA — NOT LIVE MEASUREMENTS</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Demonstration study polygons · Not official administrative ward boundaries. Click any zone on the map to inspect.
        </p>
      </div>
    </div>
  );
};
