import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Database, 
  FileText, 
  HelpCircle,
  X
} from 'lucide-react';
import { 
  EnvironmentalZone, 
  ZoneDetails, 
  AskEcoTwinRequest, 
  AskEcoTwinResponse,
  AskEvidenceItem
} from '../../types/environmental';
import { askEcoTwin } from '../../services/askApi';
import { ApiClientError } from '../../services/apiClient';

interface AskEcoTwinProps {
  zones: (ZoneDetails | EnvironmentalZone)[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  selectedZone?: (ZoneDetails | EnvironmentalZone) | null;
}

export const AskEcoTwin: React.FC<AskEcoTwinProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  selectedZone,
}) => {
  const [question, setQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AskEcoTwinResponse | null>(null);

  // Track the zone and question that the active response actually answers
  const [answeredZoneId, setAnsweredZoneId] = useState<string | null>(null);
  const [answeredQuestion, setAnsweredQuestion] = useState<string>('');

  // Store last submitted request for clean retry
  const [lastRequest, setLastRequest] = useState<AskEcoTwinRequest | null>(null);

  // Invalidate or warn if selected zone changes after response was received
  const [zoneMismatchWarning, setZoneMismatchWarning] = useState<boolean>(false);

  useEffect(() => {
    if (answeredZoneId && answeredZoneId !== selectedZoneId) {
      setZoneMismatchWarning(true);
    } else {
      setZoneMismatchWarning(false);
    }
  }, [selectedZoneId, answeredZoneId]);

  const activeZone = zones.find((z) => z.id === selectedZoneId) || selectedZone || null;

  const handleSubmitQuestion = useCallback(async (customQuestion?: string) => {
    const q = (customQuestion ?? question).trim();
    if (!q || q.length < 3) {
      setError('Please enter a question with at least 3 characters.');
      return;
    }

    const payload: AskEcoTwinRequest = {
      question: q,
      ...(selectedZoneId ? { zoneId: selectedZoneId } : {}),
    };

    setIsLoading(true);
    setError(null);
    setLastRequest(payload);

    try {
      const res = await askEcoTwin(payload);
      setResponse(res);
      setAnsweredZoneId(selectedZoneId);
      setAnsweredQuestion(q);
      setZoneMismatchWarning(false);
    } catch (err) {
      setResponse(null);
      if (err instanceof ApiClientError) {
        setError(err.getUserFriendlyMessage());
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred while communicating with the assistant.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [question, selectedZoneId]);

  const handleRetry = useCallback(() => {
    if (lastRequest) {
      handleSubmitQuestion(lastRequest.question);
    } else {
      handleSubmitQuestion();
    }
  }, [lastRequest, handleSubmitQuestion]);

  // Suggested starter prompts
  const SUGGESTED_PROMPTS = [
    'What are the primary environmental stress drivers in this zone?',
    'How does composite EcoScore risk compare to municipal averages?',
    'What particulate concentrations and air quality levels are recorded?',
    'Why is urban heat vulnerability elevated in this sector?',
  ];

  const getDataStatusBadge = (status: string) => {
    switch (status) {
      case 'real':
        return { text: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-500/40', label: 'REAL SENSOR TELEMETRY' };
      case 'derived':
        return { text: 'text-cyan-400', bg: 'bg-cyan-950/50 border-cyan-500/40', label: 'DERIVED SPATIAL MODEL' };
      default:
        return { text: 'text-amber-300', bg: 'bg-amber-950/50 border-amber-500/40', label: 'SIMULATED DEMO DATA' };
    }
  };

  const answeredZone = zones.find((z) => z.id === answeredZoneId);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#22D3EE] bg-[#10233A] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                Environmental Q&A Assistant
              </span>
              <span className="text-xs font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                POST /ask
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#F1F5F9] mt-2">
              Ask EcoTwin
            </h2>
            <p className="text-xs text-[#94A3B8] max-w-2xl mt-1 leading-relaxed">
              Query localized environmental risks, air quality dispersion, microclimate heat, and waste management indices across Kolhapur.
            </p>
          </div>

          {/* Active Sector Scope Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#94A3B8]">Context Scope:</span>
            {activeZone ? (
              <span className="text-xs font-mono font-semibold text-[#22D3EE] bg-[#10233A] px-3 py-1.5 rounded border border-[rgba(34,211,238,0.3)]">
                {activeZone.name} ({activeZone.wardIdentifier})
              </span>
            ) : (
              <span className="text-xs font-mono text-[#94A3B8] bg-[#10233A] px-3 py-1.5 rounded border border-[rgba(148,163,184,0.14)]">
                City-Wide (No Zone Selected)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Q&A Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input and Scope Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#22D3EE]" />
                Inquiry Context
              </h3>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                INPUT QUERY
              </span>
            </div>

            {/* Target Sector Switcher */}
            <div className="space-y-1.5">
              <label htmlFor="ask-zone-select" className="block text-xs font-semibold text-[#F1F5F9]">
                Sector Focus (Optional)
              </label>
              <select
                id="ask-zone-select"
                value={selectedZoneId || ''}
                onChange={(e) => onSelectZone(e.target.value)}
                className="w-full bg-[#10233A] border border-[rgba(148,163,184,0.2)] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="">City-Wide Scope (All Monitored Sectors)</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.wardIdentifier})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#94A3B8]">
                {selectedZoneId
                  ? 'Queries will be evaluated with localized telemetry for this sector.'
                  : 'Queries will evaluate composite city-wide environmental telemetry.'}
              </p>
            </div>

            {/* Suggested Questions */}
            <div className="space-y-1.5 pt-1">
              <span className="block text-xs font-semibold text-[#F1F5F9]">
                Suggested Inquiries:
              </span>
              <div className="space-y-1.5">
                {SUGGESTED_PROMPTS.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuestion(promptText);
                      handleSubmitQuestion(promptText);
                    }}
                    className="w-full text-left p-2 rounded bg-[#0A1628]/80 hover:bg-[#10233A] border border-[rgba(148,163,184,0.12)] hover:border-[rgba(34,211,238,0.3)] text-[11px] text-[#94A3B8] hover:text-[#F1F5F9] transition-all"
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitQuestion();
              }}
              className="space-y-2 pt-2"
            >
              <label htmlFor="ask-input" className="block text-xs font-semibold text-[#F1F5F9]">
                Your Environmental Question:
              </label>
              <textarea
                id="ask-input"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about air particulate dispersion, thermal hotspots, waste overflow risks..."
                className="w-full bg-[#10233A] border border-[rgba(148,163,184,0.2)] rounded-lg p-3 text-xs text-[#F1F5F9] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#94A3B8]">
                  Min 3 characters · Respects selected zone context
                </span>
                <button
                  type="submit"
                  disabled={isLoading || question.trim().length < 3}
                  className={`py-2 px-4 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    isLoading || question.trim().length < 3
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-[#2563EB] hover:bg-blue-600 text-white'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Querying...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Query</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Assistant Response & Evidence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isLoading ? (
            /* Loading State */
            <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-10 flex flex-col items-center justify-center text-center min-h-[420px] animate-pulse">
              <div className="w-12 h-12 rounded-full bg-[#10233A] border border-[rgba(34,211,238,0.3)] flex items-center justify-center text-[#22D3EE] mb-4">
                <RefreshCw className="w-6 h-6 animate-spin text-[#22D3EE]" />
              </div>
              <h3 className="text-base font-bold text-[#F1F5F9]">
                Consulting Environmental Twin Intelligence
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mt-1.5 leading-relaxed">
                Evaluating telemetry streams and spatial vulnerability metrics for {activeZone ? activeZone.name : 'Kolhapur'}...
              </p>
              <div className="mt-5 px-3 py-1.5 rounded bg-[#07111F] border border-[rgba(34,211,238,0.2)] text-[11px] font-mono text-[#22D3EE]">
                POST /ask payload dispatching
              </div>
            </div>
          ) : error ? (
            /* Error State with Retry */
            <div className="bg-[#0D1B2E] border border-rose-500/30 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[420px]">
              <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 bg-rose-950/40 px-2.5 py-0.5 rounded border border-rose-500/30">
                Inquiry Request Failed
              </span>
              <h3 className="text-base font-bold text-[#F1F5F9] mt-2">
                Unable to Answer Environmental Query
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
                  Retry Question
                </button>
              </div>
            </div>
          ) : !response ? (
            /* Empty State */
            <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-10 flex flex-col items-center justify-center text-center min-h-[420px]">
              <div className="w-12 h-12 rounded-full bg-[#10233A] border border-[rgba(148,163,184,0.14)] flex items-center justify-center text-[#94A3B8] mb-4">
                <HelpCircle className="w-6 h-6 text-[#22D3EE]" />
              </div>
              <h3 className="text-base font-bold text-[#F1F5F9]">
                Ask About Kolhapur's Environment
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mt-1.5 leading-relaxed">
                Select a suggested question or enter your inquiry on the left to receive telemetry-backed environmental analysis.
              </p>
              {activeZone && (
                <div className="mt-5 p-3 rounded bg-[#0A1628] border border-[rgba(148,163,184,0.1)] text-xs text-[#94A3B8] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#22D3EE] shrink-0" />
                  <span>
                    Currently focused on <strong>{activeZone.name}</strong> ({activeZone.wardIdentifier}).
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Active Answer Card */
            <div className="space-y-5">
              {/* Context Mismatch Alert if user switched zones after answering */}
              {zoneMismatchWarning && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Active zone changed to <strong>{activeZone?.name}</strong>. The response below was generated for <strong>{answeredZone?.name || 'City-Wide'}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSubmitQuestion(answeredQuestion)}
                    className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                  >
                    Re-run for Current Zone
                  </button>
                </div>
              )}

              {/* Main Answer Presentation */}
              <div className="bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[rgba(148,163,184,0.14)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded border bg-[#10233A] border-[rgba(34,211,238,0.3)] text-[#22D3EE]">
                      {response.zoneId ? `ZONE: ${response.zoneId}` : 'CITY-WIDE SCOPE'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getDataStatusBadge(response.dataStatus).bg} ${getDataStatusBadge(response.dataStatus).text}`}>
                      {getDataStatusBadge(response.dataStatus).label}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#94A3B8] font-mono">
                    POST /ask response
                  </span>
                </div>

                {/* Question Echo */}
                <div className="p-2.5 rounded bg-[#0A1628] border border-[rgba(148,163,184,0.10)]">
                  <span className="text-[10px] uppercase font-mono text-[#94A3B8] block">Question:</span>
                  <p className="text-xs font-semibold text-[#F1F5F9] mt-0.5">
                    "{answeredQuestion}"
                  </p>
                </div>

                {/* Narrative Answer */}
                <div className="p-4 rounded-lg bg-[#07111F] border border-[rgba(148,163,184,0.14)] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F1F5F9] font-mono">
                    <Sparkles className="w-4 h-4 text-[#22D3EE]" />
                    Environmental Intelligence Assessment:
                  </div>
                  <p className="text-xs text-[#F1F5F9] leading-relaxed">
                    {response.answer}
                  </p>
                </div>

                {/* Evidence & Provenance Section */}
                {response.evidence && response.evidence.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[rgba(148,163,184,0.1)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 font-mono">
                        <Database className="w-3.5 h-3.5 text-[#22D3EE]" />
                        Supporting Telemetry & Evidence Streams
                      </span>
                      <span className="text-[10px] font-mono text-[#94A3B8]">
                        {response.evidence.length} Source{response.evidence.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {response.evidence.map((item, idx) => {
                        const evidenceText = typeof item === 'string' 
                          ? item 
                          : item.detail || `${item.source || 'Sensor'}: ${item.metric || 'Reading'} = ${item.value ?? 'N/A'}`;

                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-[#0A1628] border border-[rgba(148,163,184,0.08)] flex items-start gap-2 text-xs text-[#94A3B8]"
                          >
                            <span className="text-[10px] font-mono text-[#22D3EE] bg-[#10233A] px-1.5 py-0.5 rounded shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-[11px] leading-relaxed text-[#F1F5F9]">
                              {evidenceText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Audit & Disclaimer Footer */}
                <div className="pt-2 text-[10px] text-[#94A3B8] border-t border-[rgba(148,163,184,0.08)] flex items-center justify-between">
                  <span>Data provenance: {response.dataStatus} observation stream</span>
                  <span>EcoTwin Intelligence Core</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
