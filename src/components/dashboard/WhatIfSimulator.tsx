import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sliders, 
  Play, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  ArrowRight, 
  TrendingDown, 
  ShieldAlert, 
  Layers, 
  Sparkles,
  TreePine,
  Sun,
  Trash2,
  Bus,
  Droplets
} from 'lucide-react';
import { 
  EnvironmentalZone, 
  ZoneDetails, 
  SimulationResult, 
  SimulationRequest 
} from '../../types/environmental';
import { 
  simulateScenario, 
  INTERVENTION_OPTIONS, 
  InterventionOption 
} from '../../services/simulationApi';
import { ApiClientError } from '../../services/apiClient';

interface WhatIfSimulatorProps {
  zones: (ZoneDetails | EnvironmentalZone)[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  selectedZone?: (ZoneDetails | EnvironmentalZone) | null;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  selectedZone,
}) => {
  // Local intervention configuration
  const [selectedType, setSelectedType] = useState<string>(INTERVENTION_OPTIONS[0].type);
  const [intensity, setIntensity] = useState<number>(50);

  // Simulation execution state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  
  // Track which zone the current result belongs to, preventing stale results across zone changes
  const [resultZoneId, setResultZoneId] = useState<string | null>(null);

  // Store last submitted request for clean retry
  const [lastRequest, setLastRequest] = useState<SimulationRequest | null>(null);

  // When selectedZoneId changes, invalidate stale simulation results if they belonged to a different zone
  useEffect(() => {
    if (resultZoneId && resultZoneId !== selectedZoneId) {
      setResult(null);
      setError(null);
    }
  }, [selectedZoneId, resultZoneId]);

  const activeZone = zones.find((z) => z.id === selectedZoneId) || selectedZone || zones[0] || null;

  // Find active intervention metadata
  const activeIntervention = INTERVENTION_OPTIONS.find((opt) => opt.type === selectedType) || INTERVENTION_OPTIONS[0];

  const handleRunSimulation = useCallback(async (customRequest?: SimulationRequest) => {
    const targetZoneId = customRequest?.zoneId || selectedZoneId || activeZone?.id;
    if (!targetZoneId) {
      setError('Please select a valid zone before running scenario simulation.');
      return;
    }

    const targetType = customRequest?.intervention.type || selectedType;
    const targetIntensity = customRequest?.intervention.intensity ?? intensity;

    const requestPayload: SimulationRequest = {
      zoneId: targetZoneId,
      intervention: {
        type: targetType,
        intensity: targetIntensity,
      },
    };

    setIsLoading(true);
    setError(null);
    setLastRequest(requestPayload);

    try {
      const response = await simulateScenario(requestPayload);
      setResult(response);
      setResultZoneId(targetZoneId);
    } catch (err) {
      setResult(null);
      if (err instanceof ApiClientError) {
        setError(err.getUserFriendlyMessage());
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred during scenario simulation.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedZoneId, activeZone, selectedType, intensity]);

  const handleRetry = useCallback(() => {
    if (lastRequest) {
      handleRunSimulation(lastRequest);
    } else {
      handleRunSimulation();
    }
  }, [lastRequest, handleRunSimulation]);

  // Qualitative severity label for environmental risk (higher score = greater risk)
  const getRiskSeverity = (val: number | null) => {
    if (val === null || val === undefined) return { text: 'text-[#475569]', label: 'N/A' };
    if (val >= 75) return { text: 'text-[#F87171]', label: 'High Risk' };
    if (val >= 50) return { text: 'text-[#FB923C]', label: 'Elevated' };
    return { text: 'text-[#34D399]', label: 'Low Risk' };
  };

  const getInterventionIcon = (type: string) => {
    switch (type) {
      case 'urban-greening':
        return <TreePine className="w-4 h-4 text-emerald-400" />;
      case 'cool-roofs':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'waste-segregation':
        return <Trash2 className="w-4 h-4 text-purple-400" />;
      case 'clean-transit':
        return <Bus className="w-4 h-4 text-cyan-400" />;
      case 'riverbank-cleanup':
        return <Droplets className="w-4 h-4 text-blue-400" />;
      default:
        return <Sliders className="w-4 h-4 text-[#22D3EE]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Banner */}
      <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#22D3EE] bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                Scenario Modeling Engine
              </span>
              <span className="text-xs font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                POST /simulate
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#F1F5F9] mt-2">
              What-If Environmental Risk Simulator
            </h2>
            <p className="text-xs text-[#94A3B8] max-w-2xl mt-1 leading-relaxed">
              Model targeted urban interventions (tree canopy expansion, reflective surfaces, waste segregation) to project estimated changes in composite environmental risk (EcoScore).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#94A3B8]">Active Sector:</span>
            <span className="text-xs font-mono font-semibold text-[#22D3EE] bg-[#10233A] px-3 py-1.5 rounded border border-[rgba(34,211,238,0.3)]">
              {activeZone ? activeZone.name : 'No Zone Selected'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Parameters on Left, Output & Telemetry on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Parameter Configuration Workspace (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5 space-y-5">
            <div className="pb-3 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#22D3EE]" />
                Scenario Parameters
              </h3>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                INPUT CONFIG
              </span>
            </div>

            {/* 1. Zone Selection */}
            <div className="space-y-2">
              <label htmlFor="zone-select" className="block text-xs font-semibold text-[#F1F5F9]">
                1. Target Environmental Zone
              </label>
              <select
                id="zone-select"
                value={selectedZoneId || activeZone?.id || ''}
                onChange={(e) => onSelectZone(e.target.value)}
                className="w-full bg-[#10233A] border border-[rgba(148,163,184,0.2)] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.wardIdentifier}) — Baseline EcoScore: {zone.ecoScore ?? 'N/A'}
                  </option>
                ))}
              </select>
              {activeZone && (
                <div className="flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
                  <span>Category: {activeZone.category}</span>
                  <span className="font-mono">
                    Baseline Risk: <strong className={getRiskSeverity(activeZone.ecoScore).text}>{activeZone.ecoScore ?? 'Unavailable'} / 100</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 2. Intervention Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#F1F5F9]">
                2. Intervention Strategy
              </label>
              <div className="space-y-2" role="radiogroup" aria-label="Select intervention type">
                {INTERVENTION_OPTIONS.map((option) => {
                  const isChecked = selectedType === option.type;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      role="radio"
                      aria-checked={isChecked}
                      onClick={() => setSelectedType(option.type)}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                        isChecked
                          ? 'bg-[#10233A] border-[#22D3EE] ring-1 ring-[#22D3EE]/30 text-[#F1F5F9]'
                          : 'bg-[#0A1628]/80 border-[rgba(148,163,184,0.12)] text-[#94A3B8] hover:bg-[#10233A]/50 hover:border-[rgba(148,163,184,0.24)]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1 rounded bg-[#07111F] shrink-0 mt-0.5">
                          {getInterventionIcon(option.type)}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-[#F1F5F9] truncate">
                              {option.label}
                            </span>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#07111F] text-[#22D3EE] shrink-0 border border-[rgba(34,211,238,0.2)]">
                              {option.pillar}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94A3B8] leading-tight line-clamp-2">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Intensity Slider */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label htmlFor="intensity-slider" className="text-xs font-semibold text-[#F1F5F9]">
                  3. Deployment Intensity
                </label>
                <span className="text-xs font-mono font-bold text-[#22D3EE] bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                  {intensity}% Intensity
                </span>
              </div>
              <input
                id="intensity-slider"
                type="range"
                min="1"
                max="100"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-2 bg-[#10233A] rounded-lg appearance-none cursor-pointer accent-[#22D3EE]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#94A3B8] px-0.5">
                <span>Pilot (25%)</span>
                <span>Standard (50%)</span>
                <span>Targeted (75%)</span>
                <span>Saturation (100%)</span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleRunSimulation()}
                disabled={isLoading || !activeZone}
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] ${
                  isLoading || !activeZone
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-[#2563EB] hover:bg-blue-600 text-white shadow-blue-900/30'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Scenario Simulation...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Scenario Simulation (POST /simulate)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Simulation Results Workspace (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isLoading ? (
            /* Loading State */
            <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-10 flex flex-col items-center justify-center text-center min-h-[440px] animate-pulse">
              <div className="w-12 h-12 rounded-full bg-[#10233A] border border-[rgba(34,211,238,0.3)] flex items-center justify-center text-[#22D3EE] mb-4">
                <RefreshCw className="w-6 h-6 animate-spin text-[#22D3EE]" />
              </div>
              <h3 className="text-base font-bold text-[#F1F5F9]">
                Computing Environmental Risk Projection
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mt-1.5 leading-relaxed">
                Dispatching request to <code>POST /simulate</code> with intervention <strong>{activeIntervention.label}</strong> ({intensity}% intensity) for <strong>{activeZone?.name}</strong>...
              </p>
              <div className="mt-5 px-3 py-1.5 rounded bg-[#07111F] border border-[rgba(34,211,238,0.2)] text-[11px] font-mono text-[#22D3EE]">
                POST /simulate payload dispatching
              </div>
            </div>
          ) : error ? (
            /* Error State with Retry */
            <div className="bg-[#0D1B2E] border border-rose-500/30 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[440px]">
              <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 bg-rose-950/40 px-2.5 py-0.5 rounded border border-rose-500/30">
                Simulation Request Failed
              </span>
              <h3 className="text-base font-bold text-[#F1F5F9] mt-2">
                Scenario Model Error
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mt-1.5 leading-relaxed">
                {error}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-md transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Simulation
                </button>
              </div>
            </div>
          ) : !result ? (
            /* Ready / Unsimulated Empty State */
            <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-10 flex flex-col items-center justify-center text-center min-h-[440px]">
              <div className="w-12 h-12 rounded-full bg-[#10233A] border border-[rgba(148,163,184,0.14)] flex items-center justify-center text-[#94A3B8] mb-4">
                <Sliders className="w-6 h-6 text-[#22D3EE]" />
              </div>
              <h3 className="text-base font-bold text-[#F1F5F9]">
                Ready to Simulate Scenario
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mt-1.5 leading-relaxed">
                Select an environmental zone, choose an intervention strategy, adjust deployment intensity, and click <strong>Run Scenario Simulation</strong> to project changes in environmental risk.
              </p>
              {activeZone && (
                <div className="mt-5 p-3 rounded bg-[#0A1628] border border-[rgba(148,163,184,0.1)] text-xs text-[#94A3B8] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#22D3EE] shrink-0" />
                  <span>
                    Current baseline EcoScore for <strong>{activeZone.name}</strong> is <strong>{activeZone.ecoScore ?? 'N/A'}</strong> (Risk Scale 0–100).
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Results Presentation */
            <div className="space-y-5">
              {/* Card 1: Risk Delta Banner */}
              <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[rgba(148,163,184,0.14)]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#22D3EE] bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                      Projected Outcome
                    </span>
                    <h3 className="text-base font-bold text-[#F1F5F9] mt-1">
                      EcoScore Risk Comparison
                    </h3>
                  </div>

                  <span className="text-xs font-mono px-2.5 py-1 rounded border bg-[#10233A] border-[rgba(148,163,184,0.2)] text-amber-300">
                    Model: {result.modelType.toUpperCase()}
                  </span>
                </div>

                {/* Score Comparison Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-center">
                  {/* Baseline Score */}
                  <div className="p-3.5 rounded-lg bg-[#07111F] border border-[rgba(148,163,184,0.1)]">
                    <span className="text-[11px] text-[#94A3B8] block">Baseline EcoScore</span>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                      <span className={`text-2xl font-bold font-mono tabular-nums ${getRiskSeverity(result.baselineEcoScore).text}`}>
                        {result.baselineEcoScore}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-mono">/ 100</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      {getRiskSeverity(result.baselineEcoScore).label}
                    </span>
                  </div>

                  {/* Arrow & Delta */}
                  <div className="p-3.5 rounded-lg bg-[#10233A]/60 border border-[rgba(34,211,238,0.2)] flex flex-col items-center justify-center">
                    <span className="text-[11px] text-[#22D3EE] block font-semibold">
                      Estimated Change
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-emerald-400">
                      {result.estimatedChange < 0 ? (
                        <TrendingDown className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ArrowRight className="w-5 h-5 text-amber-400" />
                      )}
                      <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                        {result.estimatedChange > 0 ? `+${result.estimatedChange}` : result.estimatedChange}
                      </span>
                      <span className="text-xs font-mono text-emerald-400">pts</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 block mt-0.5">
                      {result.estimatedChange < 0 ? 'Risk Reduced' : 'Risk Elevated'}
                    </span>
                  </div>

                  {/* Projected Estimated Score */}
                  <div className="p-3.5 rounded-lg bg-[#07111F] border border-[rgba(148,163,184,0.1)]">
                    <span className="text-[11px] text-[#94A3B8] block">Estimated EcoScore</span>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                      <span className={`text-2xl font-bold font-mono tabular-nums ${getRiskSeverity(result.estimatedEcoScore).text}`}>
                        {result.estimatedEcoScore}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-mono">/ 100</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      {getRiskSeverity(result.estimatedEcoScore).label}
                    </span>
                  </div>
                </div>

                {/* EcoScore Risk Semantics Notice */}
                <div className="p-2.5 rounded bg-slate-900/50 border border-slate-700/50 flex items-start gap-2 text-[11px] text-[#94A3B8]">
                  <Info className="w-4 h-4 text-[#22D3EE] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Environmental Risk Semantics:</strong> EcoScore measures estimated vulnerability (0–100 scale, higher score = higher risk). A negative change (<strong>{result.estimatedChange} pts</strong>) reflects a reduction in environmental vulnerability.
                  </p>
                </div>
              </div>

              {/* Card 2: Model Assumptions & Honest Labeling */}
              <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[rgba(148,163,184,0.1)]">
                  <h4 className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 uppercase font-mono">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Model Assumptions & Boundary Conditions
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Transparency Audit
                  </span>
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  The returned projection is generated via a <strong>{result.modelType}</strong> scenario model. Results illustrate estimated scenario potential and are not guaranteed empirical field measurements.
                </p>

                <div className="space-y-2 pt-1">
                  {result.assumptions.map((assumption, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[#0A1628] border border-[rgba(148,163,184,0.08)] flex items-start gap-2 text-xs text-[#F1F5F9]"
                    >
                      <span className="text-[10px] font-mono text-[#22D3EE] bg-[#10233A] px-1.5 py-0.5 rounded shrink-0">
                        #{idx + 1}
                      </span>
                      <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                        {assumption}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
