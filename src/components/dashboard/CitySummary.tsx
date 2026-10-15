import React from 'react';
import { MapPin, Activity, Map as MapIcon, TrendingUp } from 'lucide-react';
import { CitySummaryData } from '../../types/environmental';
import { RiskMetric } from './RiskMetric';

interface CitySummaryProps {
  summary: CitySummaryData;
  onOpenMap?: () => void;
}

export const CitySummary: React.FC<CitySummaryProps> = ({ summary, onOpenMap }) => {
  return (
    <section aria-labelledby="city-overview-heading" className="space-y-4">
      {/* City Banner */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: 'linear-gradient(135deg, #0D1B2E 0%, #091525 50%, #0D1B2E 100%)',
          borderColor: 'rgba(34,211,238,0.15)',
          boxShadow: '0 0 40px rgba(34,211,238,0.04)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {/* Location breadcrumb */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono"
                style={{ color: '#22D3EE', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', padding: '3px 10px', borderRadius: '6px' }}>
                <MapPin className="w-3 h-3" />
                {summary.cityName}, {summary.region}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', color: '#FCD34D' }}>
                SIMULATED DATA
              </span>
            </div>

            <h2 id="city-overview-heading" className="text-2xl font-bold text-[#F1F5F9] tracking-tight">
              City Environmental
              <span className="ml-2" style={{ color: '#22D3EE' }}>Risk Profile</span>
            </h2>
            <p className="text-sm text-[#475569] mt-1 max-w-2xl leading-relaxed">
              Multi-layer spatial risk scores across {summary.totalMonitoredZones} monitored zones.
              Higher scores indicate greater environmental stress.
            </p>
          </div>

          {/* Quick stats + map link */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* Zone count */}
            <div className="text-center px-4 py-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.10)' }}>
              <div className="text-2xl font-bold font-mono text-[#F1F5F9] tabular-nums">
                {summary.totalMonitoredZones}
              </div>
              <div className="text-[10px] text-[#475569] mt-0.5">Zones</div>
            </div>

            {/* Priority count */}
            <div className="text-center px-4 py-3 rounded-lg"
              style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
              <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: '#FB923C' }}>
                {summary.priorityZonesCount}
              </div>
              <div className="text-[10px] text-[#475569] mt-0.5">Priority</div>
            </div>

            {onOpenMap && (
              <button
                type="button"
                onClick={onOpenMap}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                style={{
                  background: 'rgba(34,211,238,0.1)',
                  border: '1px solid rgba(34,211,238,0.3)',
                  color: '#22D3EE',
                }}
              >
                <MapIcon className="w-3.5 h-3.5" />
                City Map
              </button>
            )}
          </div>
        </div>

        {/* Methodology note */}
        <div className="mt-4 pt-3 flex items-start gap-2 text-[11px] text-[#334155]"
          style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
          <TrendingUp className="w-3.5 h-3.5 text-[#22D3EE] shrink-0 mt-0.5" />
          <span>
            <span className="text-[#94A3B8] font-medium">Methodology: </span>
            Simulated multi-criteria risk indices (0–100). Not official CPCB/MPCB AQI readings.
            Higher scores always denote higher environmental risk.
          </span>
        </div>
      </div>

      {/* 4 Risk Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskMetric
          title="Air Quality Risk"
          metricKey="air"
          subtitle="Particulate & transit stress"
          data={summary.metrics.airQualityRisk}
        />
        <RiskMetric
          title="Urban Heat Risk"
          metricKey="heat"
          subtitle="Impervious surface thermal index"
          data={summary.metrics.urbanHeatRisk}
        />
        <RiskMetric
          title="Waste Management"
          metricKey="waste"
          subtitle="Riparian & disposal stress"
          data={summary.metrics.wasteManagementRisk}
        />
        <RiskMetric
          title="EcoScore"
          metricKey="ecoScore"
          subtitle="Composite risk index"
          data={summary.metrics.ecoScore}
        />
      </div>
    </section>
  );
};
