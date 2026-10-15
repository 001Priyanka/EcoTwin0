import React from 'react';
import { Wind, Flame, Trash2, Activity, AlertCircle } from 'lucide-react';
import { LayerId, RiskScore } from '../../types/environmental';

interface RiskMetricProps {
  title: string;
  metricKey: LayerId | 'ecoScore';
  data: RiskScore;
  subtitle?: string;
}

const METRIC_CONFIG: Record<
  LayerId | 'ecoScore',
  { icon: React.ReactNode; accentColor: string; barColor: string; gradientStyle: string }
> = {
  air: {
    icon: <Wind className="w-4 h-4 text-[#22D3EE]" />,
    accentColor: '#22D3EE',
    barColor: '#22D3EE',
    gradientStyle: 'linear-gradient(90deg, #22D3EE 0%, #38BDF8 100%)',
  },
  heat: {
    icon: <Flame className="w-4 h-4 text-[#FB923C]" />,
    accentColor: '#FB923C',
    barColor: '#FB923C',
    gradientStyle: 'linear-gradient(90deg, #FB923C 0%, #F97316 100%)',
  },
  waste: {
    icon: <Trash2 className="w-4 h-4 text-[#C084FC]" />,
    accentColor: '#C084FC',
    barColor: '#C084FC',
    gradientStyle: 'linear-gradient(90deg, #C084FC 0%, #A855F7 100%)',
  },
  ecoScore: {
    icon: <Activity className="w-4 h-4 text-[#38BDF8]" />,
    accentColor: '#38BDF8',
    barColor: '#38BDF8',
    gradientStyle: 'linear-gradient(90deg, #38BDF8 0%, #2563EB 100%)',
  },
};

export const RiskMetric: React.FC<RiskMetricProps> = ({
  title,
  metricKey,
  data,
  subtitle,
}) => {
  const cfg = METRIC_CONFIG[metricKey] ?? METRIC_CONFIG.ecoScore;
  const isAvailable = data.value !== null && data.value !== undefined;
  const val = isAvailable ? (data.value as number) : 0;

  const getSeverity = (v: number) => {
    if (v >= 75) return { label: 'High Risk',      badge: 'bg-rose-950/70 text-[#F87171] border-rose-500/30' };
    if (v >= 50) return { label: 'Elevated',       badge: 'bg-amber-950/70 text-[#FB923C] border-amber-500/30' };
    return           { label: 'Low Risk',          badge: 'bg-emerald-950/70 text-[#34D399] border-emerald-500/30' };
  };

  const severity = isAvailable ? getSeverity(val) : {
    label: 'No Data',
    badge: 'bg-slate-800/60 text-slate-400 border-slate-700/40',
  };

  const getValueColor = (v: number) => {
    if (v >= 75) return '#F87171';
    if (v >= 50) return '#FB923C';
    return '#34D399';
  };

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 border transition-all duration-200 card-glow-cyan"
      style={{ background: '#0D1B2E', borderColor: `rgba(${metricKey === 'air' ? '34,211,238' : metricKey === 'heat' ? '251,146,60' : metricKey === 'waste' ? '192,132,252' : '56,189,248'},0.15)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.10)' }}>
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-[#CBD5E1] truncate">{title}</h3>
            {subtitle && <p className="text-[10px] text-[#475569] truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${severity.badge}`}>
          {severity.label}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1.5">
        {isAvailable ? (
          <>
            <span
              className="text-4xl font-bold font-mono tabular-nums leading-none"
              style={{ color: getValueColor(val) }}
            >
              {val}
            </span>
            <span className="text-sm text-[#475569] font-mono">/100</span>
          </>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <AlertCircle className="w-4 h-4 text-slate-500" />
            <span className="text-base font-mono text-slate-500">No data</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {isAvailable && (
            <div
              className="h-full rounded-full risk-bar-fill"
              style={{
                '--risk-pct': `${val}%`,
                width: `${val}%`,
                background: cfg.gradientStyle,
                boxShadow: `0 0 8px ${cfg.accentColor}50`,
              } as React.CSSProperties}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-[#334155]">
          <span>0</span>
          <span className="text-[#475569]">Higher = more risk</span>
          <span>100</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-[#334155]">
        <span className="font-mono uppercase tracking-wider">{data.status}</span>
        <span className="flex items-center gap-1">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Live feed
        </span>
      </div>
    </div>
  );
};
