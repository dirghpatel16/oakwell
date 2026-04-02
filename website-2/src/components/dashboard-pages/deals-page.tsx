"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  Search,
  Play,
  Activity,
  Loader2,
  Send,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Database,
  Clock3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMemory, useDealAnalysis, useEmailGeneration, useAnalysisRuns, useWorkspace } from "@/lib/hooks";
import { useWebSocket } from "@/lib/websocket-context";
import { useDemoMode } from "@/lib/demo-context";
import { getProofUrl } from "@/lib/api";
import { DashboardEmptyState, DashboardErrorBanner, DashboardLoadingState } from "@/components/dashboard-state";

export default function DealDeskPage() {
  const { data: memory, loading: memLoading, error: memError, refresh: refreshMemory } = useMemory();
  const { analyze, jobStatus, isRunning, error: analysisError, reset } = useDealAnalysis();
  const { email, loading: emailLoading, generate: generateEmail } = useEmailGeneration();
  const { data: workspace } = useWorkspace();
  const { triggerDealAnalysis } = useWebSocket();
  const { isDemo } = useDemoMode();
  const lastCompletedJobRef = useRef<string | null>(null);

  const [transcript, setTranscript] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [yourProduct, setYourProduct] = useState("");
  const [dealStage, setDealStage] = useState<string>("discovery");
  const [dealValue, setDealValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingPersistenceJobId, setPendingPersistenceJobId] = useState<string | null>(null);
  const [persistenceIssue, setPersistenceIssue] = useState<string | null>(null);

  const deals = useMemo(() => {
    if (!memory) return [];
    return Object.entries(memory).map(([url, entry]) => ({
      url,
      name: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      score: entry.deal_health_score || 0,
      lastContact: entry.last_analysis_ts ? timeAgo(entry.last_analysis_ts) : "Never",
      risk: (entry.deal_health_score || 0) < 40 ? "high" : (entry.deal_health_score || 0) < 65 ? "medium" : "low",
      analyses: entry.analysis_count || 0,
      clashes: entry.clashes_detected || "",
      talkTrack: entry.talk_track || "",
      proofFiles: entry.proof_filenames || [],
      timeline: entry.timeline || [],
      scoreHistory: entry.score_history || [],
      analysisMode: entry.analysis_mode,
      evidenceStatus: entry.evidence_status,
      evidenceSummary: entry.evidence_summary,
      verificationReason: entry.verification_reason,
      claimCount: entry.claim_count,
      verifiedClaimCount: entry.verified_claim_count,
      evidenceItems: entry.evidence_items || [],
      sourceCoverage: entry.source_coverage || [],
      analysisRunId: entry.analysis_run_id,
      analysisCompletedAt: entry.analysis_completed_at,
    }));
  }, [memory]);

  const filtered = filterText
    ? deals.filter((d) => d.name.toLowerCase().includes(filterText.toLowerCase()))
    : deals;

  const selectedDeal = selectedUrl ? deals.find((d) => d.url === selectedUrl) : null;
  const completedResult = jobStatus?.status === "completed" ? jobStatus.result : null;
  const persistedCompletedDeal = completedResult?.competitor_url
    ? deals.find((deal) => deal.url === completedResult.competitor_url)
    : null;
  const activeDeal = persistedCompletedDeal ?? selectedDeal;
  const analysisRunsUrl = activeDeal?.url;
  const {
    data: analysisRuns,
    loading: runsLoading,
    error: runsError,
    refresh: refreshRuns,
  } = useAnalysisRuns(analysisRunsUrl);
  const completionPersistencePending =
    Boolean(completedResult) &&
    Boolean(jobStatus?.job_id) &&
    pendingPersistenceJobId === jobStatus?.job_id;
  const validatingPersistence =
    completionPersistencePending && memLoading && !persistedCompletedDeal && !memError;
  const canGenerateCompletionEmail =
    Boolean(jobStatus?.job_id) &&
    activeDeal?.url === completedResult?.competitor_url;
  const memoryUnavailableForAnalysis = Boolean(memError);
  const memoryUnavailableMessage = memError
    ? `${memError}. Oakwell requires durable memory before starting a production analysis.`
    : null;

  useEffect(() => {
    if (workspace?.workspace?.company_name && !yourProduct) {
      setYourProduct(workspace.workspace.company_name);
    }
  }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (jobStatus?.status !== "completed" || !jobStatus.job_id) return;
    if (lastCompletedJobRef.current === jobStatus.job_id) return;

    lastCompletedJobRef.current = jobStatus.job_id;
    queueMicrotask(() => {
      setPendingPersistenceJobId(jobStatus.job_id);
      setPersistenceIssue(null);
      refreshMemory();
    });
  }, [jobStatus, refreshMemory]);

  useEffect(() => {
    const completedJobResult =
      jobStatus?.status === "completed" ? jobStatus.result : null;
    if (
      !pendingPersistenceJobId ||
      !completedJobResult ||
      !jobStatus ||
      jobStatus.status !== "completed" ||
      jobStatus.job_id !== pendingPersistenceJobId ||
      !completedJobResult.competitor_url
    ) {
      return;
    }

    if (memLoading) return;

    if (memError) {
      queueMicrotask(() => {
        setPersistenceIssue(
          `Oakwell completed the analysis but could not reload durable memory. ${memError}`
        );
        setPendingPersistenceJobId(null);
      });
      return;
    }

    const persistedEntry = memory?.[completedJobResult.competitor_url];
    if (persistedEntry) {
      queueMicrotask(() => {
        setSelectedUrl(completedJobResult.competitor_url);
        setPersistenceIssue(null);
        setPendingPersistenceJobId(null);
      });
      return;
    }

    queueMicrotask(() => {
      setPersistenceIssue(
        "Oakwell completed the analysis, but the record was not confirmed in durable memory. This result has not been treated as saved."
      );
      setPendingPersistenceJobId(null);
    });
  }, [pendingPersistenceJobId, jobStatus, memLoading, memError, memory]);

  const handleAnalyze = async () => {
    if (!transcript || !competitorUrl || memoryUnavailableForAnalysis) return;
    setPersistenceIssue(null);
    setPendingPersistenceJobId(null);
    triggerDealAnalysis(competitorName || competitorUrl);
    await analyze({
      transcript,
      competitor_url: competitorUrl,
      competitor_name: competitorName || undefined,
      your_product: yourProduct || undefined,
      deal_stage: dealStage as "discovery" | "technical_eval" | "proposal" | "negotiation" | "closing",
      deal_value: dealValue ? parseFloat(dealValue) : undefined,
    });
    setShowForm(false);
  };

  const handleGenerateEmail = async () => {
    if (jobStatus?.job_id) {
      await generateEmail(jobStatus.job_id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-full bg-[#050505] overflow-hidden">
      <div className="w-full lg:w-[380px] border-r border-zinc-800/50 bg-[#0a0a0a] flex flex-col lg:flex shrink-0">
        <div className="p-4 border-b border-zinc-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-tight">Analyzed Deals</h2>
            <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">
              {deals.length} in Memory
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Filter by competitor..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full h-8 bg-zinc-900/50 border border-zinc-800 rounded pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="h-8 px-3 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-medium transition-colors"
            >
              + New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {memLoading && deals.length === 0 ? (
            <div className="p-4">
              <DashboardLoadingState
                icon={Loader2}
                title="Loading deal memory"
                message="Pulling competitor records, score history, and proof artifacts from the Oakwell memory bank."
              />
            </div>
          ) : memError && deals.length === 0 ? (
            <div className="p-4">
              <DashboardErrorBanner
                title="Memory bank unavailable"
                message={`${memError}. Oakwell is refusing to pretend local session data is durable memory.`}
                actionLabel="Retry"
                onAction={refreshMemory}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <DashboardEmptyState
                icon={FileText}
                eyebrow={isDemo ? "Demo analysis" : "Production analysis"}
                title="The memory bank is waiting for its first live deal"
                message="Run a competitor analysis and Oakwell will turn the transcript, proof artifacts, score, and talk track into a reusable record for the whole dashboard."
              />
            </div>
          ) : (
            filtered.map((deal) => (
              <div
                key={deal.url}
                onClick={() => { setSelectedUrl(deal.url); setShowForm(false); }}
                className={`p-3 border-b border-zinc-800/50 cursor-pointer group transition-colors ${
                  selectedUrl === deal.url ? "border-l-2 border-l-blue-500 bg-zinc-900/80" : "hover:bg-zinc-900/50"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">{deal.name}</h3>
                  <span className="text-xs font-mono text-zinc-500">{deal.score}/100</span>
                </div>
                <p className="text-[10px] text-zinc-600 mb-2 truncate">Last: {deal.lastContact} • {deal.analyses} runs</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    deal.risk === "high" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    deal.risk === "medium" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                    "bg-green-500/10 text-green-500 border-green-500/20"
                  }`}>{deal.risk} risk</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex-col min-w-0 bg-[#050505] hidden lg:flex overflow-y-auto">
        {showForm && (
          <div className="p-6 space-y-5 max-w-2xl">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">New Deal Analysis</h2>
              <p className="text-sm text-zinc-500">Paste a call transcript and competitor URL. Oakwell&apos;s 10-stage AI pipeline will analyze it.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Competitor URL *</label>
                <input
                  type="text"
                  placeholder="e.g. https://gong.io"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Competitor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Gong"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Your Product</label>
                  <input
                    type="text"
                    placeholder="e.g. Oakwell"
                    value={yourProduct}
                    onChange={(e) => setYourProduct(e.target.value)}
                    className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Deal Stage</label>
                  <select
                    value={dealStage}
                    onChange={(e) => setDealStage(e.target.value)}
                    className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-600 appearance-none"
                  >
                    <option value="discovery">Discovery</option>
                    <option value="technical_eval">Technical Eval</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closing">Closing</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Deal Value ($)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Call Transcript / Notes *</label>
                <textarea
                  placeholder="Paste your call transcript, meeting notes, or deal context here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none font-mono"
                />
              </div>
              {analysisError && (
                <DashboardErrorBanner
                  title="Analysis failed"
                  message={`${analysisError}. Check the competitor URL, tighten the transcript, and try again.`}
                />
              )}
              {memoryUnavailableMessage && (
                <DashboardErrorBanner
                  title="Memory unavailable"
                  message={memoryUnavailableMessage}
                  actionLabel="Retry Memory Check"
                  onAction={refreshMemory}
                />
              )}
              <button
                onClick={handleAnalyze}
                disabled={isRunning || !transcript || !competitorUrl || memoryUnavailableForAnalysis}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                  </>
                ) : memoryUnavailableForAnalysis ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Memory Unavailable
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Run Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {jobStatus && (jobStatus.status === "pending" || jobStatus.status === "running") && (
          <div className="border-b border-zinc-800/50 bg-blue-500/5 px-6 py-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Analysis in progress...</span>
              <span className="ml-auto text-[10px] font-mono text-zinc-500">{jobStatus.job_id?.slice(0, 8)}</span>
            </div>
            {jobStatus.progress_message && (
              <p className="text-xs text-zinc-400 font-mono">{jobStatus.progress_message}</p>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {getAnalysisProgressSteps(jobStatus.progress_message).map((step) => (
                <div
                  key={step.label}
                  className={`rounded-lg border px-3 py-2 ${
                    step.state === "current"
                      ? "border-blue-500/30 bg-blue-500/10"
                      : step.state === "done"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-zinc-800 bg-[#0a0a0a]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{step.label}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        step.state === "current"
                          ? "text-blue-300"
                          : step.state === "done"
                            ? "text-emerald-300"
                            : "text-zinc-600"
                      }`}
                    >
                      {step.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {completedResult && !showForm && validatingPersistence && (
          <div className="p-6 max-w-3xl">
            <DashboardLoadingState
              icon={ShieldCheck}
              title="Validating durable memory"
              message="Oakwell finished the analysis. Confirming the record was written back to the memory bank before treating it as saved."
            />
          </div>
        )}

        {completedResult && !showForm && persistenceIssue && !persistedCompletedDeal && (
          <div className="p-6 space-y-4 max-w-3xl">
            <DashboardErrorBanner
              title="Analysis completed but durable persistence failed"
              message={persistenceIssue}
              actionLabel="Retry Memory Sync"
              onAction={refreshMemory}
            />
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] px-6 py-8">
              <h3 className="text-sm font-semibold text-white">Why Oakwell is stopping here</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Oakwell no longer treats transient job state as the source of truth. Once durable memory is healthy,
                rerun the analysis or retry memory sync so the dashboard can trust the record across reloads and days.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={refreshMemory}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
                >
                  Retry Memory Sync
                </button>
                <button
                  onClick={() => {
                    setPersistenceIssue(null);
                    setPendingPersistenceJobId(null);
                    reset();
                    setShowForm(true);
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                >
                  Start New Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {completedResult && !persistedCompletedDeal && !showForm && !validatingPersistence && !persistenceIssue && (
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Analysis Complete</h2>
                <p className="text-sm text-zinc-500">{completedResult.competitor_url}</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-mono font-bold ${
                  completedResult.deal_health_score >= 70 ? "text-green-400" :
                  completedResult.deal_health_score >= 40 ? "text-yellow-400" : "text-red-400"
                }`}>{completedResult.deal_health_score}/100</div>
                <div className="text-xs text-zinc-500">Health Score</div>
              </div>
            </div>

            {completedResult.risk_level && (
              <div className={`px-4 py-3 rounded-lg border text-sm ${
                completedResult.risk_level === "HIGH" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                completedResult.risk_level === "MEDIUM" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                "bg-green-500/10 border-green-500/20 text-green-400"
              }`}>
                Risk Level: {completedResult.risk_level}
                {completedResult.score_reasoning && <span className="text-zinc-400 ml-2">— {completedResult.score_reasoning}</span>}
              </div>
            )}

            <EvidenceStateCard
              analysisMode={completedResult.analysis_mode}
              evidenceStatus={completedResult.evidence_status}
              evidenceSummary={completedResult.evidence_summary}
              verificationReason={completedResult.verification_reason}
              claimCount={completedResult.claim_count}
              verifiedClaimCount={completedResult.verified_claim_count}
              proofAvailable={completedResult.proof_available || completedResult.all_proof_filenames.length > 0}
            />

            <SourceCoverageCard coverage={completedResult.source_coverage || []} />

            <EvidenceLedgerCard
              items={completedResult.evidence_items || []}
              isDemo={isDemo}
            />

            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Clashes Detected</h4>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{completedResult.clashes_detected}</p>
            </div>

            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Talk Track</h4>
                <button onClick={() => copyToClipboard(completedResult.talk_track)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{completedResult.talk_track}</p>
            </div>

            {completedResult.adversarial_critique && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">Adversarial Critique</h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{completedResult.adversarial_critique}</p>
              </div>
            )}

            {completedResult.key_pivot_points && completedResult.key_pivot_points.length > 0 && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">Key Pivot Points</h4>
                <ul className="space-y-1.5">
                  {completedResult.key_pivot_points.map((pt, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-green-500">→</span> {pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {completedResult.stage_specific_actions && completedResult.stage_specific_actions.length > 0 && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">
                  Actions for {completedResult.deal_stage} Stage
                </h4>
                <ul className="space-y-1.5">
                  {completedResult.stage_specific_actions.map((act, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-purple-400">•</span> {act}</li>
                  ))}
                </ul>
              </div>
            )}

            {completedResult.market_drift && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">Market Drift</h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{completedResult.market_drift}</p>
              </div>
            )}

            {completedResult.all_proof_filenames.length > 0 && (
              <ProofArtifactsCard filenames={completedResult.all_proof_filenames} isDemo={isDemo} />
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGenerateEmail}
                disabled={emailLoading}
                className="flex-1 bg-white text-black hover:bg-zinc-200 transition-colors py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
              >
                {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Generate Battlecard Email
              </button>
              <button
                onClick={() => { reset(); setShowForm(true); }}
                className="flex-1 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors py-2 rounded-lg text-xs font-medium border border-zinc-700"
              >
                New Analysis
              </button>
            </div>

            {email && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Generated Email</h4>
                  <button onClick={() => copyToClipboard(email)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <pre className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">{email}</pre>
              </div>
            )}
          </div>
        )}

        {activeDeal && (!completedResult || Boolean(persistedCompletedDeal)) && !showForm && (
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">{activeDeal.name}</h2>
                <p className="text-sm text-zinc-500">Last analyzed: {activeDeal.lastContact} • {activeDeal.analyses} analyses</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-mono font-bold ${
                  activeDeal.score >= 70 ? "text-green-400" :
                  activeDeal.score >= 40 ? "text-yellow-400" : "text-red-400"
                }`}>{activeDeal.score}/100</div>
                <div className="text-xs text-zinc-500">Health Score</div>
              </div>
            </div>

            {activeDeal.clashes && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Clashes Detected</h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{activeDeal.clashes}</p>
              </div>
            )}

            <EvidenceStateCard
              analysisMode={activeDeal.analysisMode}
              evidenceStatus={activeDeal.evidenceStatus}
              evidenceSummary={activeDeal.evidenceSummary}
              verificationReason={activeDeal.verificationReason}
              claimCount={activeDeal.claimCount}
              verifiedClaimCount={activeDeal.verifiedClaimCount}
              proofAvailable={activeDeal.proofFiles.length > 0}
            />

            <SourceCoverageCard coverage={activeDeal.sourceCoverage || []} />

            <EvidenceLedgerCard
              items={activeDeal.evidenceItems || []}
              isDemo={isDemo}
            />

            {activeDeal.talkTrack && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Talk Track</h4>
                  <button onClick={() => copyToClipboard(activeDeal.talkTrack)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{activeDeal.talkTrack}</p>
              </div>
            )}

            {activeDeal.proofFiles.length > 0 && (
              <ProofArtifactsCard filenames={activeDeal.proofFiles} isDemo={isDemo} />
            )}

            {activeDeal.scoreHistory.length > 1 && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Score Trend</h4>
                <div className="flex items-end gap-1 h-16">
                  {activeDeal.scoreHistory.map((s, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${
                        s >= 70 ? "bg-green-500/60" : s >= 40 ? "bg-yellow-500/60" : "bg-red-500/60"
                      }`}
                      style={{ height: `${Math.max(s, 5)}%` }}
                      title={`Score: ${s}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <RecentAnalysisRunsCard
              runs={analysisRuns || []}
              loading={runsLoading}
              error={runsError}
              onRetry={refreshRuns}
            />

            <div className="flex gap-3">
              {canGenerateCompletionEmail ? (
                <button
                  onClick={handleGenerateEmail}
                  disabled={emailLoading}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 transition-colors py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                >
                  {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Generate Battlecard Email
                </button>
              ) : null}
              <button
                onClick={() => {
                  setPersistenceIssue(null);
                  setPendingPersistenceJobId(null);
                  setCompetitorUrl(activeDeal.url);
                  setCompetitorName(activeDeal.name);
                  setShowForm(true);
                  setSelectedUrl(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Re-Analyze This Competitor
              </button>
            </div>

            {email && canGenerateCompletionEmail && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Generated Email</h4>
                  <button onClick={() => copyToClipboard(email)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <pre className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">{email}</pre>
              </div>
            )}
          </div>
        )}

        {!showForm && !completedResult && !selectedDeal && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Activity className="w-7 h-7 text-zinc-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-400">Deal Intelligence Engine</h2>
            <p className="text-sm text-zinc-600 max-w-sm">
              Select a deal from the list to view its analysis, or click <span className="text-blue-400">+ New</span> to run a fresh competitive analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getAnalysisProgressSteps(progressMessage?: string) {
  const message = (progressMessage || "").toLowerCase();
  const isStrategyOnly =
    message.includes("strategic brief") || message.includes("no concrete public claims");

  const steps = isStrategyOnly
    ? [
        { label: "Classify", detail: "Determine whether the transcript contains public claims worth verifying.", done: ["classifying"], current: ["classifying"] },
        { label: "Route", detail: "Switch to the fast strategic path when Oakwell does not have proof-worthy claims.", done: ["no concrete public claims"], current: ["strategic brief"] },
        { label: "Brief", detail: "Generate buyer tension, stakeholder framing, and next-step guidance.", done: ["writing", "persisting", "analysis complete"], current: ["generating fast strategic brief", "writing"] },
        { label: "Persist", detail: "Save the brief to memory so the rest of the dashboard updates immediately.", done: ["analysis complete"], current: ["persisting"] },
      ]
    : [
        { label: "Classify", detail: "Extract the public claims that Oakwell can verify externally.", done: ["found", "capturing proof", "cache fresh", "verifying", "analysis complete"], current: ["classifying"] },
        { label: "Capture", detail: "Take a proof screenshot or reuse a recent verified artifact from memory.", done: ["verifying", "running discrepancy", "analysis complete"], current: ["capturing proof", "cache fresh"] },
        { label: "Verify", detail: "Check each public claim, then score and synthesize the competitive angle.", done: ["writing", "persisting", "analysis complete"], current: ["verifying", "running discrepancy", "scanning 6 sources", "scoring deal health"] },
        { label: "Brief", detail: "Write the rep guidance, then persist the result back into Oakwell memory.", done: ["analysis complete"], current: ["writing", "adversarial", "persisting"] },
      ];

  return steps.map((step) => {
    const isDone = step.done.some((token) => message.includes(token));
    const isCurrent = !isDone && step.current.some((token) => message.includes(token));
    return {
      label: step.label,
      detail: step.detail,
      state: isCurrent ? "current" : isDone ? "done" : "upcoming",
      badge: isCurrent ? "LIVE" : isDone ? "DONE" : "NEXT",
    };
  });
}

function EvidenceStateCard({
  analysisMode,
  evidenceStatus,
  evidenceSummary,
  verificationReason,
  claimCount,
  verifiedClaimCount,
  proofAvailable,
}: {
  analysisMode?: string;
  evidenceStatus?: string;
  evidenceSummary?: string;
  verificationReason?: string;
  claimCount?: number;
  verifiedClaimCount?: number;
  proofAvailable?: boolean;
}) {
  const isStrategyOnly = analysisMode === "strategy_only";
  const title = isStrategyOnly ? "Strategic Brief" : "Evidence State";
  const badge = isStrategyOnly
    ? "Strategy-only"
    : evidenceStatus === "proof_captured"
      ? "Proof-backed"
      : evidenceStatus === "proof_unavailable"
        ? "Proof missing"
        : "Standard";

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{title}</h4>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
          isStrategyOnly
            ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
            : proofAvailable
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/20 bg-amber-500/10 text-amber-300"
        }`}>
          {badge}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        {evidenceSummary || verificationReason || "Oakwell is standardizing this analysis result."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
        {typeof claimCount === "number" && (
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1">
            {claimCount} claim{claimCount === 1 ? "" : "s"} detected
          </span>
        )}
        {typeof verifiedClaimCount === "number" && (
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1">
            {verifiedClaimCount} claim{verifiedClaimCount === 1 ? "" : "s"} checked
          </span>
        )}
        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1">
          {proofAvailable ? "Proof available" : "No proof in this result"}
        </span>
      </div>
    </div>
  );
}

function SourceCoverageCard({
  coverage,
}: {
  coverage: { source_type: string; source_label: string; item_count: number; trust_level?: string }[];
}) {
  if (!coverage.length) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Database className="h-4 w-4 text-cyan-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Source Coverage</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {coverage.map((source) => (
          <span
            key={`${source.source_type}-${source.source_label}`}
            className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
          >
            {source.source_label} · {source.item_count}
            {source.trust_level ? (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500">
                {source.trust_level}
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Oakwell keeps the latest competitive rollup in memory, but the source mix above shows which public signals informed this view.
      </p>
    </div>
  );
}

function EvidenceLedgerCard({
  items,
  isDemo,
}: {
  items: {
    id: string;
    source_label: string;
    title: string;
    summary: string;
    verdict: string;
    confidence_score: number;
    captured_at: string | null;
    source_url?: string;
    artifact_path?: string;
    claim?: string;
    freshness?: string;
    trust_level?: string;
  }[];
  isDemo: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;

  const visibleItems = expanded ? items : items.slice(0, 3);

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Evidence Ledger</h4>
        </div>
        {items.length > 3 ? (
          <button
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-white"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Collapse" : `Show ${items.length - 3} more`}
          </button>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {visibleItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                {item.source_label}
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                {item.verdict.replace(/_/g, " ")}
              </span>
              {item.freshness ? (
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                  {item.freshness}
                </span>
              ) : null}
            </div>
            <h5 className="mt-3 text-sm font-medium text-white">{item.title}</h5>
            {item.claim ? (
              <p className="mt-1 text-xs text-blue-300">Claim: {item.claim}</p>
            ) : null}
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              {item.captured_at ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {timeAgo(item.captured_at)}
                </span>
              ) : null}
              <span>Confidence {Math.round((item.confidence_score || 0) * 100)}%</span>
              {item.trust_level ? <span>Trust {item.trust_level}</span> : null}
              {!isDemo && item.artifact_path ? (
                <a
                  href={getProofUrl(item.artifact_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-300 transition-colors hover:text-emerald-200"
                >
                  Open proof
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {item.source_url ? (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-300 transition-colors hover:text-cyan-200"
                >
                  Source URL
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Oakwell stores evidence separately from the final talk track so reps can inspect provenance without cluttering the main workflow.
      </p>
    </div>
  );
}

function ProofArtifactsCard({ filenames, isDemo }: { filenames: string[]; isDemo: boolean }) {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Proof Artifacts</h4>
      </div>
      {!isDemo && (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {filenames.slice(0, 4).map((filename) => (
            <a
              key={`preview-${filename}`}
              href={getProofUrl(filename)}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition-colors hover:border-emerald-500/30"
            >
              {/* Proof artifacts are served dynamically from the backend, so plain img avoids extra Next image config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getProofUrl(filename)}
                alt={`Proof artifact ${filename}`}
                className="h-40 w-full object-cover"
              />
              <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
                {filename}
              </div>
            </a>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {filenames.map((filename) =>
          isDemo ? (
            <span
              key={filename}
              className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300"
            >
              {filename}
            </span>
          ) : (
            <a
              key={filename}
              href={getProofUrl(filename)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:border-emerald-400/30 hover:bg-emerald-500/15"
            >
              Open {filename}
            </a>
          )
        )}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        {isDemo
          ? "Demo mode shows deterministic proof artifact names so the surface remains polished and repeatable."
          : "These screenshots are the underlying evidence Oakwell captured while verifying competitor claims. Click any preview to inspect the full artifact."}
      </p>
    </div>
  );
}

function RecentAnalysisRunsCard({
  runs,
  loading,
  error,
  onRetry,
}: {
  runs: {
    analysis_run_id: string;
    created_at: string | null;
    deal_health_score: number;
    analysis_mode?: string;
    evidence_status?: string;
    claim_count?: number;
    verified_claim_count?: number;
  }[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-orange-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-400">Recent Analysis Runs</h4>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading immutable run history…</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">{error}</p>
          <button
            onClick={onRetry}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
          >
            Retry
          </button>
        </div>
      ) : !runs.length ? (
        <p className="text-sm text-zinc-500">No immutable run history has been recorded for this competitor yet.</p>
      ) : (
        <div className="space-y-3">
          {runs.slice(0, 5).map((run) => (
            <div key={run.analysis_run_id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{run.deal_health_score}/100</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {run.created_at ? timeAgo(run.created_at) : "unknown"} · {run.analysis_mode === "strategy_only" ? "strategy-only" : "proof-backed"}
                  </p>
                </div>
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400">
                  {run.evidence_status || "standard"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                {typeof run.claim_count === "number" ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1">
                    {run.claim_count} detected
                  </span>
                ) : null}
                {typeof run.verified_claim_count === "number" ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1">
                    {run.verified_claim_count} checked
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        Each run is stored as an immutable record so the memory bank can keep the latest rollup without losing auditability.
      </p>
    </div>
  );
}
