import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { EnvironmentalZone, ZoneDetails, LayerId } from '../../types/environmental';
import { BarChart3, Layers, AlertCircle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ZoneRiskChart } from './ZoneRiskChart';

interface EnvironmentalAnalyticsProps {
  zones: (ZoneDetails | EnvironmentalZone)[];
  selectedZone: (ZoneDetails | EnvironmentalZone) | null;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  activeLayer: LayerId;
}

interface ComparativeItem {
  id: string;
  name: string;
  shortName: string;
  airRisk: number | null;
  heatRisk: number | null;
  wasteRisk: number | null;
  ecoScore: number | null;
  dataStatus: string;
  isSelected: boolean;
}

export const EnvironmentalAnalytics: React.FC<EnvironmentalAnalyticsProps> = ({
  zones,
  selectedZone,
  selectedZoneId,
  onSelectZone,
  activeLayer,
}) => {
  // Comparative data across priority zones
  // Preserves backend-provided order: Panchganga, Shahupuri, Mahadwar
  const comparativeData: ComparativeItem[] = zones.map((z) => ({
    id: z.id,
    name: z.name,
    shortName: z.name.split(' ')[0], // e.g. "Panchganga", "Shahupuri", "Mahadwar"
    airRisk: z.airRisk,
    heatRisk: z.heatRisk,
    wasteRisk: z.wasteRisk,
    ecoScore: z.ecoScore,
    dataStatus: z.dataStatus,
    isSelected: z.id === selectedZoneId,
  }));

  // Custom Comparative Tooltip
  const CustomComparativeTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; name: string; value: number | null; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const matchingZone = comparativeData.find((z) => z.shortName === label || z.name === label);

    return (
      <div className="bg-[#07111F]/95 backdrop-blur-md border border-[rgba(148,163,184,0.25)] rounded-lg p-3.5 shadow-2xl text-xs text-[#F1F5F9] min-w-[220px]">
        <div className="flex items-center justify-between pb-2 border-b border-[rgba(148,163,184,0.15)] mb-2">
          <div>
            <span className="font-bold block text-sm">{matchingZone?.name || label}</span>
            <span className="text-[10px] text-[#94A3B8]">
              {matchingZone?.id} · {matchingZone?.isSelected ? 'Currently Selected' : 'Click to select'}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#10233A] border border-[rgba(148,163,184,0.14)] text-amber-300">
            {matchingZone?.dataStatus || 'simulated'}
          </span>
        </div>

        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[#94A3B8]">{entry.name}:</span>
              </div>
              <span className="font-mono font-semibold tabular-nums">
                {entry.value !== null && entry.value !== undefined ? (
                  `${entry.value} / 100`
                ) : (
                  <span className="text-slate-400 italic font-normal">Unavailable</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2.5 pt-2 border-t border-[rgba(148,163,184,0.10)] text-[10px] text-[#94A3B8] flex items-center justify-between">
          <span>Higher = Greater Risk</span>
          <span className="text-[#22D3EE] font-medium">Click bar to select zone</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5 shadow-sm space-y-6">
      {/* Analytics Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgba(148,163,184,0.14)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#22D3EE] bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
              Phase 3 · Step 1
            </span>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded uppercase">
              Simulated Analytics
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#F1F5F9] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#22D3EE]" />
            Environmental Risk Analytics & Multi-Criteria Indices
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Synchronized risk profiling across Air, Heat, Waste, and composite EcoScore dimensions (0–100 scale).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
          <span className="p-1 rounded bg-[#10233A] border border-[rgba(148,163,184,0.14)] text-[#22D3EE]">
            Recharts Engine
          </span>
        </div>
      </div>

      {/* Grid: Selected Zone Risk Breakdown (Left) & Comparative Priority Assessment (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Selected Zone Deep-Dive Chart (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          {selectedZone ? (
            <div className="space-y-3 h-full flex flex-col justify-between">
              <ZoneRiskChart
                zone={selectedZone}
                activeLayer={activeLayer}
              />
              <div className="p-3 rounded-lg bg-[#07111F]/70 border border-[rgba(148,163,184,0.1)] text-xs text-[#94A3B8] leading-relaxed">
                <div className="flex items-center gap-1.5 text-[#F1F5F9] font-semibold mb-1">
                  <Info className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>Interpretation Guide</span>
                </div>
                EcoScore reflects composite environmental risk across monitored stress layers. Missing data is labeled <strong>Unavailable</strong> and omitted from bar heights to prevent false 0-risk interpretations.
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[220px] rounded-lg border border-[rgba(148,163,184,0.14)] bg-[#07111F]/50 flex flex-col items-center justify-center p-6 text-center">
              <Layers className="w-8 h-8 text-[#94A3B8] mb-2" />
              <h4 className="text-sm font-semibold text-[#F1F5F9]">No Zone Selected</h4>
              <p className="text-xs text-[#94A3B8] max-w-xs mt-1">
                Select any priority zone above or click a map feature to inspect its localized risk chart breakdown.
              </p>
              {zones.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectZone(zones[0].id)}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-md transition-colors"
                >
                  Select {zones[0].name.split(' ')[0]}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Comparative Priority Zones Multi-Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[#0A1628]/80 border border-[rgba(148,163,184,0.14)] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h4 className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  Priority Zones Comparative Risk Profile
                </h4>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Multi-vector comparison across Kolhapur priority study areas (Air, Heat, Waste & EcoScore)
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10233A] border border-[rgba(148,163,184,0.14)] text-slate-400">
                {comparativeData.length} Study Areas
              </span>
            </div>

            {/* Comparative Multi-Bar Chart */}
            <div className="w-full h-[230px] min-h-[200px] my-2">
              {comparativeData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-700/60 rounded-md">
                  No priority zones available to compare.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparativeData}
                    margin={{ top: 12, right: 12, left: -22, bottom: 4 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const clickedId = (state.activePayload[0].payload as ComparativeItem)?.id;
                      if (clickedId) {
                        onSelectZone(clickedId);
                      }
                    }
                  }}
                  className="cursor-pointer"
                  aria-label="Comparative environmental risk chart across Kolhapur study areas"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148,163,184,0.16)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148,163,184,0.16)' }}
                  />
                  <Tooltip content={<CustomComparativeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', color: '#94A3B8' }}
                  />
                  <Bar dataKey="airRisk" name="Air Risk" fill="#22D3EE" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="heatRisk" name="Heat Risk" fill="#FB923C" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="wasteRisk" name="Waste Risk" fill="#C084FC" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="ecoScore" name="EcoScore" fill="#38BDF8" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Interactive Zone Selection Selector Chips */}
          <div className="pt-3 border-t border-[rgba(148,163,184,0.10)]">
            <div className="text-[11px] font-semibold text-[#F1F5F9] mb-2 flex items-center justify-between">
              <span>Interactive Focus Selection:</span>
              <span className="text-[10px] text-[#94A3B8]">Click any zone to focus map & telemetry</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {comparativeData.map((item, idx) => {
                const isSelected = item.id === selectedZoneId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectZone(item.id)}
                    className={`p-2 rounded-md border text-left transition-all ${
                      isSelected
                        ? 'bg-[#10233A] border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/40'
                        : 'bg-[#07111F]/70 border-[rgba(148,163,184,0.12)] hover:bg-[#10233A]/50 hover:border-[rgba(148,163,184,0.24)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                      <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-[#07111F] text-amber-300 border border-amber-500/20">
                        {item.dataStatus}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#F1F5F9] truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-[#94A3B8]">
                      <span>EcoScore:</span>
                      <span className={`font-bold ${isSelected ? 'text-[#22D3EE]' : 'text-[#F1F5F9]'}`}>
                        {item.ecoScore !== null ? item.ecoScore : 'Unavailable'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
