import React from 'react';
import { ShieldAlert, Info, MapPin, Activity, Map as MapIcon } from 'lucide-react';
import { CitySummaryData } from '../../types/environmental';
import { RiskMetric } from './RiskMetric';

interface CitySummaryProps {
  summary: CitySummaryData;
  onOpenMap?: () => void;
}

export const CitySummary: React.FC<CitySummaryProps> = ({ summary, onOpenMap }) => {
  return (
    <section aria-labelledby="city-overview-heading" className="space-y-4">
      {/* City Banner & Explanatory Guidance */}
      <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#22D3EE] bg-[#10233A] px-2.5 py-1 rounded border border-[rgba(34,211,238,0.2)]">
                <MapPin className="w-3.5 h-3.5 text-[#22D3EE]" />
                {summary.cityName}, {summary.region} (KMC Jurisdiction)
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                SIMULATED DATASET
              </span>
            </div>
            <h2 id="city-overview-heading" className="text-xl font-bold text-[#F1F5F9] tracking-tight">
              City Environmental Risk Profile
            </h2>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-3xl leading-relaxed">
              Multi-layer spatial risk scores for Kolhapur urban area. Higher risk scores indicate elevated environmental risk. EcoScore represents the composite environmental vulnerability index across all stress vectors.
            </p>
          </div>

          {/* Quick telemetry badges and map link */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[rgba(148,163,184,0.14)] pt-3 md:pt-0 md:pl-5 text-xs text-[#94A3B8]">
            <div>
              <div className="font-mono text-lg font-bold text-[#F1F5F9] tabular-nums">
                {summary.totalMonitoredZones}
              </div>
              <div className="text-[11px] text-[#94A3B8]">Monitored Zones</div>
            </div>
            <div className="w-px h-8 bg-[rgba(148,163,184,0.14)]" />
            <div>
              <div className="font-mono text-lg font-bold text-[#FB923C] tabular-nums">
                {summary.priorityZonesCount}
              </div>
              <div className="text-[11px] text-[#94A3B8]">Priority Zones</div>
            </div>

            {onOpenMap && (
              <>
                <div className="w-px h-8 bg-[rgba(148,163,184,0.14)] hidden sm:block" />
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#10233A] hover:bg-[#1a3352] border border-[#22D3EE]/30 text-xs font-semibold text-[#22D3EE] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>City Map</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Regulatory & Interpretation Notice */}
        <div className="mt-4 pt-3 border-t border-[rgba(148,163,184,0.10)] flex items-start gap-2.5 text-xs text-[#94A3B8] bg-[#07111F]/60 p-3 rounded-md">
          <Info className="w-4 h-4 text-[#22D3EE] shrink-0 mt-0.5" />
          <div className="leading-normal">
            <span className="font-semibold text-[#F1F5F9]">Methodology Note: </span>
            <span>
              Risk metrics represent simulated multi-criteria risk indices (0–100) generated for prototype demonstration. These values do <strong>not</strong> represent official Central Pollution Control Board (CPCB) or Maharashtra Pollution Control Board (MPCB) National Air Quality Index (NAAQS AQI) observations.
            </span>
          </div>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskMetric
          title="Air Quality Risk"
          metricKey="air"
          subtitle="Particulate & transit stress index"
          data={summary.metrics.airQualityRisk}
        />
        <RiskMetric
          title="Urban Heat Risk"
          metricKey="heat"
          subtitle="Impervious surface thermal index"
          data={summary.metrics.urbanHeatRisk}
        />
        <RiskMetric
          title="Waste Management Risk"
          metricKey="waste"
          subtitle="Riparian & commercial disposal stress"
          data={summary.metrics.wasteManagementRisk}
        />
        <RiskMetric
          title="EcoScore"
          metricKey="ecoScore"
          subtitle="Composite environmental risk index"
          isEcoScore={true}
          data={summary.metrics.ecoScore}
        />
      </div>
    </section>
  );
};
