import React, { useState } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { environmentalApi } from '../../services/environmentalApi';
import { ApiClientError } from '../../services/apiClient';
import { EnvironmentalZone, AskResponse } from '../../types/environmental';

interface AskEcoTwinProps {
  zones: EnvironmentalZone[];
  selectedZoneId: string | null;
}

export const AskEcoTwin: React.FC<AskEcoTwinProps> = ({ zones, selectedZoneId }) => {
  const [question, setQuestion] = useState('');
  const [zoneId, setZoneId] = useState(selectedZoneId ?? '');
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResponse(null);
    setIsLoading(true);
    try {
      setResponse(await environmentalApi.ask(question, zoneId || undefined));
      setQuestion('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.getUserFriendlyMessage() : 'Unable to get an answer right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto space-y-5">
      <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#10233A] flex items-center justify-center text-[#22D3EE]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Ask EcoTwin</h2>
            <p className="text-sm text-[#94A3B8] mt-1">Ask about backend-retrieved zone evidence. Responses identify simulated or unavailable data.</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-xs font-medium text-[#CBD5E1]">
            Zone
            <select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="mt-1 w-full rounded-md bg-[#07111F] border border-slate-700 px-3 py-2 text-sm">
              <option value="">All priority zones</option>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#CBD5E1]">
            Question
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} required rows={3} placeholder="Why is this zone high risk?" className="mt-1 w-full rounded-md bg-[#07111F] border border-slate-700 px-3 py-2 text-sm placeholder:text-slate-600" />
          </label>
          <button disabled={isLoading} className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ask EcoTwin
          </button>
        </form>
      </div>
      {error && <div role="alert" className="rounded-md border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
      {response && (
        <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-6 space-y-4">
          <p className="text-sm leading-6 text-slate-200">{response.answer}</p>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]"><span>Status:</span><span className="text-[#22D3EE] uppercase">{response.dataStatus}</span></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {response.evidence.map((item) => <div key={item.field} className="rounded bg-[#07111F] px-3 py-2 text-xs"><span className="text-slate-400">{item.field}</span><span className="float-right text-slate-100">{item.value ?? 'Unavailable'}</span></div>)}
          </div>
        </div>
      )}
    </section>
  );
};
