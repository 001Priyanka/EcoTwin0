import React, { useEffect, useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { environmentalApi } from '../../services/environmentalApi';
import { ApiClientError } from '../../services/apiClient';
import { EnvironmentalZone, SimulationResponse } from '../../types/environmental';

interface WhatIfSimulatorProps {
  zones: EnvironmentalZone[];
  selectedZoneId: string | null;
}

const interventionTypes = [
  ['increase-waste-collection', 'Increase waste collection'],
  ['reduce-air-emissions', 'Reduce air emissions'],
  ['add-urban-cooling', 'Add urban cooling'],
] as const;

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ zones, selectedZoneId }) => {
  const [zoneId, setZoneId] = useState(selectedZoneId ?? zones[0]?.id ?? '');
  const [type, setType] = useState<string>(interventionTypes[0][0]);
  const [intensity, setIntensity] = useState(20);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedZoneId) setZoneId(selectedZoneId);
  }, [selectedZoneId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      setResult(await environmentalApi.simulate({ zoneId, intervention: { type, intensity } }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.getUserFriendlyMessage() : 'Unable to run the simulation right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto space-y-5">
      <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#10233A] flex items-center justify-center text-[#22D3EE]"><Calculator className="w-5 h-5" /></div>
          <div><h2 className="text-lg font-semibold">What-if Simulator</h2><p className="text-sm text-[#94A3B8] mt-1">Run a deterministic heuristic scenario. This is not a validated forecast.</p></div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-medium text-[#CBD5E1]">Zone<select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="mt-1 w-full rounded-md bg-[#07111F] border border-slate-700 px-3 py-2 text-sm">{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
          <label className="block text-xs font-medium text-[#CBD5E1]">Intervention<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 w-full rounded-md bg-[#07111F] border border-slate-700 px-3 py-2 text-sm">{interventionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block text-xs font-medium text-[#CBD5E1]">Intensity: {intensity}<input type="range" min="0" max="100" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} className="mt-2 w-full accent-blue-500" /></label>
          <button disabled={isLoading || !zoneId} className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold disabled:opacity-60">{isLoading && <Loader2 className="w-4 h-4 animate-spin" />}Run simulation</button>
        </form>
      </div>
      {error && <div role="alert" className="rounded-md border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
      {result && <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-6 space-y-3"><div className="grid grid-cols-3 gap-3 text-center"><div><div className="text-xs text-slate-400">Baseline</div><div className="text-xl font-semibold">{result.baselineEcoScore ?? '—'}</div></div><div><div className="text-xs text-slate-400">Estimated</div><div className="text-xl font-semibold text-[#22D3EE]">{result.estimatedEcoScore ?? '—'}</div></div><div><div className="text-xs text-slate-400">Change</div><div className={`text-xl font-semibold ${(result.estimatedChange ?? 0) <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{result.estimatedChange === null ? '—' : `${result.estimatedChange > 0 ? '+' : ''}${result.estimatedChange}`}</div></div></div><div className="border-t border-slate-800 pt-3 text-xs text-slate-400"><div className="uppercase text-[#22D3EE]">{result.modelType} model</div>{result.assumptions.map((assumption) => <p key={assumption} className="mt-1">• {assumption}</p>)}</div></div>}
    </section>
  );
};
