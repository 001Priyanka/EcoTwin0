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
import { BarChart3, Layers } from 'lucide-react';
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

const RANK_COLORS = ['#F87171', '#FB923C', '#FCD34D', '#34D399', '#38BDF8', '#818CF8', '#C084FC'];

function getEcoColor(v: number | null): string {
  if (v === null) return '#475569';
  if (v >= 75) return '#F87171';
  if (v >= 50) return '#FB923C';
  return '#34D399';
}

export const EnvironmentalAnalytics: React.FC<EnvironmentalAnalyticsProps> = ({
  zones,
  selectedZone,
  selectedZoneId,
  onSelectZone,
  activeLayer,
}) => {
  const comparativeData: ComparativeItem[] = zones.map((z) => ({
    id: z.id,
    name: z.name,
    shortName: z.name.split(' ')[0],
    airRisk: z.airRisk,
    heatRisk: z.heatRisk,
    wasteRisk: z.wasteRisk,
    ecoScore: z.ecoScore,
    dataStatus: z.dataStatus,
    isSelected: z.id === selectedZoneId,
  }));

  // Tooltip for the comparative chart
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; name: string; value: number | null; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const match = comparativeData.find((z) => z.shortName === label || z.name === label);

    return (
      <div
        className="rounded-lg p-3 text-xs min-w-[200px]"
        style={{
          background: 'rgba(7,17,31,0.95)',
          border: '1px solid rgba(148,163,184,0.2)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div className="pb-2 mb-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
          <span className="font-bold text-[#F1F5F9] block">{match?.name ?? label}</span>
          <span className="text-[10px] text-[#334155]">{match?.id}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                <span className="text-[#64748B]">{entry.name}</span>
              </div>
              <span className="font-mono font-semibold" style={{ color: entry.color }}>
                {entry.value !== null && entry.value !== undefined ? entry.value : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: '#0D1B2E', borderColor: 'rgba(148,163,184,0.12)' }}
    >
      {/* Section Header */}
      <div
        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.10)', background: 'rgba(255,255,255,0.015)' }}
      >
        <div>
          <h3 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#22D3EE]" />
            Environmental Risk Analytics
          </h3>
          <p className="text-xs text-[#334155] mt-0.5">
            Risk profiling across Air · Heat · Waste · EcoScore (0–100 scale)
          </p>
        </div>
        <span
          className="text-[10px] font-mono px-2 py-1 rounded self-start sm:self-auto"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#FCD34D' }}
        >
          SIMULATED DATA
        </span>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Zone risk chart */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {selectedZone ? (
              <ZoneRiskChart zone={selectedZone} activeLayer={activeLayer} />
            ) : (
              <div
                className="flex-1 min-h-[240px] rounded-lg border flex flex-col items-center justify-center p-6 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(148,163,184,0.08)', borderStyle: 'dashed' }}
              >
                <Layers className="w-7 h-7 text-[#334155] mb-3" />
                <h4 className="text-sm font-semibold text-[#CBD5E1]">No Zone Selected</h4>
                <p className="text-xs text-[#334155] max-w-xs mt-1">
                  Select a zone to see its risk breakdown chart.
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

          {/* Right: Comparative chart */}
          <div
            className="lg:col-span-7 rounded-lg p-4 flex flex-col gap-4"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(148,163,184,0.08)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wide font-mono">
                  Comparative Risk Profile
                </h4>
                <p className="text-[11px] text-[#334155] mt-0.5">
                  All zones · Air, Heat, Waste & EcoScore
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#334155]">{comparativeData.length} zones</span>
            </div>

            {/* Chart */}
            <div className="w-full h-[220px]">
              {comparativeData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#334155]">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparativeData}
                    margin={{ top: 8, right: 8, left: -24, bottom: 4 }}
                    onClick={(state) => {
                      const s = state as { activePayload?: Array<{ payload: ComparativeItem }> } | null;
                      const id = s?.activePayload?.[0]?.payload?.id;
                      if (id) onSelectZone(id);
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.06)" vertical={false} />
                    <XAxis
                      dataKey="shortName"
                      stroke="#334155"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(148,163,184,0.10)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      stroke="#334155"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '6px', fontSize: '10px', color: '#475569' }}
                    />
                    <Bar dataKey="airRisk"   name="Air"   fill="#22D3EE" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="heatRisk"  name="Heat"  fill="#FB923C" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="wasteRisk" name="Waste" fill="#C084FC" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="ecoScore"  name="Eco"   fill="#38BDF8" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Zone selector chips */}
            <div style={{ borderTop: '1px solid rgba(148,163,184,0.08)', paddingTop: '12px' }}>
              <p className="text-[10px] font-mono text-[#334155] mb-2 uppercase tracking-wide">
                Click to focus
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {comparativeData.map((item, idx) => {
                  const isSelected = item.id === selectedZoneId;
                  const rankColor = RANK_COLORS[idx] ?? '#94A3B8';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectZone(item.id)}
                      className="p-2 rounded-lg text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      style={{
                        background: isSelected ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSelected ? 'rgba(37,99,235,0.35)' : 'rgba(148,163,184,0.08)'}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${rankColor}18`, color: rankColor }}>
                          #{idx + 1}
                        </span>
                        <span className="text-[9px] font-mono text-[#2d3f55] uppercase">
                          {item.dataStatus}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#CBD5E1] truncate" title={item.name}>
                        {item.name.split(' ')[0]}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[#334155]">Eco</span>
                        <span className="text-[11px] font-mono font-bold"
                          style={{ color: getEcoColor(item.ecoScore) }}>
                          {item.ecoScore ?? '—'}
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
    </div>
  );
};
