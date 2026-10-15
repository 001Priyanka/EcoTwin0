import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { ZoneDetails, EnvironmentalZone, LayerId } from '../../types/environmental';
import { Activity, AlertCircle, Info } from 'lucide-react';

interface ZoneRiskChartProps {
  zone: ZoneDetails | EnvironmentalZone;
  activeLayer?: LayerId;
  compact?: boolean;
}

interface RiskDatum {
  key: string;
  name: string;
  label: string;
  score: number | null;
  status: string;
  fill: string;
  unit: string;
  isActive: boolean;
}

export const ZoneRiskChart: React.FC<ZoneRiskChartProps> = ({
  zone,
  activeLayer,
  compact = false,
}) => {
  // Construct data items adhering to the strict 0-100 normalized risk scale
  // Null values are preserved as null and NEVER coerced to 0
  const data: RiskDatum[] = [
    {
      key: 'air',
      name: 'Air Risk',
      label: 'Air Quality Risk',
      score: zone.airRisk,
      status: 'air' in zone && zone.air ? zone.air.status : zone.dataStatus,
      fill: '#22D3EE', // Cyan
      unit: '/ 100',
      isActive: activeLayer === 'air',
    },
    {
      key: 'heat',
      name: 'Heat Risk',
      label: 'Urban Heat Risk',
      score: zone.heatRisk,
      status: 'heat' in zone && zone.heat ? zone.heat.status : zone.dataStatus,
      fill: '#FB923C', // Orange
      unit: '/ 100',
      isActive: activeLayer === 'heat',
    },
    {
      key: 'waste',
      name: 'Waste Risk',
      label: 'Waste Management Risk',
      score: zone.wasteRisk,
      status: 'waste' in zone && zone.waste ? zone.waste.status : zone.dataStatus,
      fill: '#C084FC', // Purple
      unit: '/ 100',
      isActive: activeLayer === 'waste',
    },
    {
      key: 'ecoScore',
      name: 'EcoScore',
      label: 'Composite EcoScore Risk',
      score: zone.ecoScore,
      status: zone.dataStatus,
      fill: '#38BDF8', // Sky Blue
      unit: '/ 100',
      isActive: false,
    },
  ];

  // Helper for custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RiskDatum }> }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;

    return (
      <div className="bg-[#07111F]/95 backdrop-blur-md border border-[rgba(148,163,184,0.25)] rounded-md p-3 shadow-xl text-xs text-[#F1F5F9] min-w-[180px]">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[rgba(148,163,184,0.15)] mb-1.5">
          <span className="font-semibold">{item.label}</span>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#10233A] border border-[rgba(148,163,184,0.14)] text-amber-300">
            {item.status}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-[#94A3B8]">Risk Index:</span>
          {item.score !== null ? (
            <span className="font-mono font-bold text-sm text-[#F1F5F9] tabular-nums" style={{ color: item.fill }}>
              {item.score} <span className="text-[10px] text-[#94A3B8]">/ 100</span>
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-400 italic">
              Unavailable
            </span>
          )}
        </div>
        <div className="mt-1 text-[10px] text-[#94A3B8] leading-tight">
          {item.score !== null
            ? item.score >= 75
              ? 'High vulnerability corridor'
              : item.score >= 50
              ? 'Elevated stress observed'
              : 'Low risk observed'
            : 'No continuous telemetry stream mapped'}
        </div>
      </div>
    );
  };

  // Recharts customized shape or bar renderer that visibly flags unavailable null items
  const hasUnavailableMetric = data.some((d) => d.score === null);

  return (
    <div className={`bg-[#0A1628]/80 border border-[rgba(148,163,184,0.14)] rounded-lg p-4 flex flex-col justify-between ${compact ? 'text-xs' : ''}`}>
      {/* Chart Title & Explanation */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
            Environmental Risk Profile · {zone.name}
          </h4>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Normalized 0–100 risk scale · Higher scores denote higher environmental risk
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10233A] border border-[rgba(148,163,184,0.14)] text-slate-400 shrink-0">
          Risk Analytics
        </span>
      </div>

      {/* Recharts Bar Container */}
      <div className="w-full h-[180px] min-h-[160px] my-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: -22, bottom: 4 }}
            aria-label={`Risk metrics bar chart for ${zone.name}`}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis
              dataKey="name"
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={38}>
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.fill}
                  stroke={entry.isActive ? '#FFFFFF' : 'none'}
                  strokeWidth={entry.isActive ? 1.5 : 0}
                  opacity={entry.score === null ? 0.2 : entry.isActive ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Unavailable Items Notice if null exists (e.g. Mahadwar wasteRisk) */}
      {hasUnavailableMetric && (
        <div className="mb-2 px-2.5 py-1.5 rounded bg-slate-900/60 border border-slate-700/50 flex items-center gap-2 text-[10px] text-slate-400">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Metrics with missing data are labeled <strong>Unavailable</strong> and excluded from bar heights (never treated as 0).
          </span>
        </div>
      )}

      {/* Metric Breakdown Badges Strip */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[rgba(148,163,184,0.10)] text-center">
        {data.map((item) => (
          <div
            key={item.key}
            className={`p-1.5 rounded border transition-colors ${
              item.isActive
                ? 'bg-[#10233A] border-[#22D3EE]/40 ring-1 ring-[#22D3EE]/20'
                : 'bg-[#07111F]/70 border-[rgba(148,163,184,0.08)]'
            }`}
          >
            <span className="text-[10px] text-[#94A3B8] block truncate" title={item.label}>
              {item.name}
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums block ${
                item.score === null ? 'text-slate-400 italic text-[11px]' : ''
              }`}
              style={item.score !== null ? { color: item.fill } : undefined}
            >
              {item.score !== null ? `${item.score}` : 'Unavailable'}
            </span>
            <span className="text-[9px] font-mono text-slate-500 uppercase block">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
