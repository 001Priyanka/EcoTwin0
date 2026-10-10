import React from 'react';
import { Wind, Flame, Trash2, Activity, AlertCircle } from 'lucide-react';
import { LayerId, RiskScore } from '../../types/environmental';

interface RiskMetricProps {
  title: string;
  metricKey: LayerId | 'ecoScore';
  data: RiskScore;
  subtitle?: string;
  isEcoScore?: boolean;
}

export const RiskMetric: React.FC<RiskMetricProps> = ({
  title,
  metricKey,
  data,
  subtitle,
}) => {
  const getIcon = () => {
    switch (metricKey) {
      case 'air':
        return <Wind className="w-5 h-5 text-[#22D3EE]" aria-hidden="true" />;
      case 'heat':
        return <Flame className="w-5 h-5 text-[#FB923C]" aria-hidden="true" />;
      case 'waste':
        return <Trash2 className="w-5 h-5 text-[#C084FC]" aria-hidden="true" />;
      case 'ecoScore':
        return <Activity className="w-5 h-5 text-[#38BDF8]" aria-hidden="true" />;
      default:
        return <AlertCircle className="w-5 h-5 text-[#94A3B8]" aria-hidden="true" />;
    }
  };

  const isValueAvailable = data.value !== null && data.value !== undefined;

  // Severity color calculation: Higher score strictly denotes greater environmental risk (0-100)
  const getSeverityStyle = () => {
    if (!isValueAvailable) {
      return {
        text: 'text-[#94A3B8]',
        badgeBg: 'bg-slate-800/70 text-slate-300 border-slate-700/60',
        label: 'Unavailable',
      };
    }

    const val = data.value as number;

    if (val >= 75) {
      return { 
        text: 'text-[#F87171]', 
        badgeBg: 'bg-rose-950/60 text-[#F87171] border-rose-500/30', 
        label: 'High Risk' 
      };
    }
    if (val >= 50) {
      return { 
        text: 'text-[#FB923C]', 
        badgeBg: 'bg-amber-950/60 text-[#FB923C] border-amber-500/30', 
        label: 'Elevated Risk' 
      };
    }
    return { 
      text: 'text-[#34D399]', 
      badgeBg: 'bg-emerald-950/60 text-[#34D399] border-emerald-500/30', 
      label: 'Low Risk' 
    };
  };

  const severity = getSeverityStyle();

  return (
    <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5 flex flex-col justify-between hover:border-[rgba(148,163,184,0.28)] transition-colors focus-within:ring-2 focus-within:ring-[#2563EB]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-[#10233A] border border-[rgba(148,163,184,0.14)]">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F1F5F9] leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Status Tag */}
        <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(148,163,184,0.14)]">
          {data.status}
        </span>
      </div>

      {/* Metric Value Body */}
      <div className="my-4">
        {isValueAvailable ? (
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono tabular-nums tracking-tight ${severity.text}`}>
              {data.value}
            </span>
            <span className="text-xs text-[#94A3B8] font-mono">/ 100</span>
            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded border ${severity.badgeBg}`}>
              {severity.label}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <span className="text-2xl font-mono text-slate-400 font-bold">
              Unavailable
            </span>
            <span className="text-xs px-2 py-0.5 rounded border border-slate-700/60 bg-slate-800/40 text-slate-400 font-mono">
              Null Sensor Feed
            </span>
          </div>
        )}
      </div>

      {/* Explanatory Context Footer */}
      <div className="pt-3 border-t border-[rgba(148,163,184,0.10)] text-[11px] text-[#94A3B8] flex items-center justify-between">
        <span>Higher score indicates greater environmental risk</span>
        <span className="text-[10px] text-amber-400/80 font-mono">
          Simulated Index
        </span>
      </div>
    </div>
  );
};
