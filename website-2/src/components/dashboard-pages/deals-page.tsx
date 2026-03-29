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
} from "lucide-react";
import { useMemory, useDealAnalysis, useEmailGeneration } from "@/lib/hooks";
import { useWebSocket } from "@/lib/websocket-context";
import { useDemoMode } from "@/lib/demo-context";
import { getProofUrl } from "@/lib/api";
import { DashboardEmptyState, DashboardErrorBanner, DashboardLoadingState } from "@/components/dashboard-state";

export default function DealDeskPage() {
  const { data: memory, loading: memLoading, refresh: refreshMemory } = useMemory();
  const { analyze, jobStatus, isRunning, error: analysisError, reset } = useDealAnalysis();
  const { email, loading: emailLoading, generate: generateEmail } = useEmailGeneration();
  const { triggerDealAnalysis } = useWebSocket();
  const { isDemo } = useDemoMode();
  const lastCompletedJobRef = useRef<string | null>(null);

  const [transcript, setTranscript] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [yourProduct, setYourProduct] = useState("Oakwell");
  const [dealStage, setDealStage] = useState<string>("discovery");
  const [dealValue, setDealValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [copied, setCopied] = useState(false);

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
    }));
  }, [memory]);

  const filtered = filterText
    ? deals.filter((d) => d.name.toLowerCase().includes(filterText.toLowerCase()))
    : deals;

  const selectedDeal = selectedUrl ? deals.find((d) => d.url === selectedUrl) : null;
  const result = jobStatus?.result;

  useEffect(() => {
    if (jobStatus?.status !== "completed" || !jobStatus.job_id) return;
    if (lastCompletedJobRef.current === jobStatus.job_id) return;

    lastCompletedJobRef.current = jobStatus.job_id;
    refreshMemory();
  }, [jobStatus, refreshMemory]);

  const handleAnalyze = async () => {
    if (!transcript || !competitorUrl) return;
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
              <button
                onClick={handleAnalyze}
                disabled={isRunning || !transcript || !competitorUrl}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Send className="w-4 h-4" /> Run Analysis</>}
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

        {result && !showForm && (
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Analysis Complete</h2>
                <p className="text-sm text-zinc-500">{result.competitor_url}</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-mono font-bold ${
                  result.deal_health_score >= 70 ? "text-green-400" :
                  result.deal_health_score >= 40 ? "text-yellow-400" : "text-red-400"
                }`}>{result.deal_health_score}/100</div>
                <div className="text-xs text-zinc-500">Health Score</div>
              </div>
            </div>

            {result.risk_level && (
              <div className={`px-4 py-3 rounded-lg border text-sm ${
                result.risk_level === "HIGH" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                result.risk_level === "MEDIUM" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                "bg-green-500/10 border-green-500/20 text-green-400"
              }`}>
                Risk Level: {result.risk_level}
                {result.score_reasoning && <span className="text-zinc-400 ml-2">— {result.score_reasoning}</span>}
              </div>
            )}

            <EvidenceStateCard
              analysisMode={result.analysis_mode}
              evidenceStatus={result.evidence_status}
              evidenceSummary={result.evidence_summary}
              verificationReason={result.verification_reason}
              claimCount={result.claim_count}
              verifiedClaimCount={result.verified_claim_count}
              proofAvailable={result.proof_available || result.all_proof_filenames.length > 0}
            />

            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Clashes Detected</h4>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.clashes_detected}</p>
            </div>

            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Talk Track</h4>
                <button onClick={() => copyToClipboard(result.talk_track)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.talk_track}</p>
            </div>

            {result.adversarial_critique && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">Adversarial Critique</h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.adversarial_critique}</p>
              </div>
            )}

            {result.key_pivot_points && result.key_pivot_points.length > 0 && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">Key Pivot Points</h4>
                <ul className="space-y-1.5">
                  {result.key_pivot_points.map((pt, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-green-500">→</span> {pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.stage_specific_actions && result.stage_specific_actions.length > 0 && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">
                  Actions for {result.deal_stage} Stage
                </h4>
                <ul className="space-y-1.5">
                  {result.stage_specific_actions.map((act, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-purple-400">•</span> {act}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.market_drift && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">Market Drift</h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.market_drift}</p>
              </div>
            )}

            {result.all_proof_filenames.length > 0 && (
              <ProofArtifactsCard filenames={result.all_proof_filenames} isDemo={isDemo} />
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

        {selectedDeal && !result && !showForm && (
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">{selectedDeal.name}</h2>
                <p className="text-sm text-zinc-500">Last analyzed: {selectedDeal.lastContact} • {selectedDeal.analyses} analyses</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-mono font-bold ${
                  selectedDeal.score >= 70 ? "text-green-400" :
                  selectedDeal.score >= 40 ? "text-yellow-400" : "text-red-400"
                }`}>{selectedDeal.score}/100</div>
                <div className="text-xs text-zinc-500">Health Score</div>
              </div>
            </div>

            {selectedDeal.clashes && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Clashes Detected</h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedDeal.clashes}</p>
              </div>
            )}

            <EvidenceStateCard
              analysisMode={selectedDeal.analysisMode}
              evidenceStatus={selectedDeal.evidenceStatus}
              evidenceSummary={selectedDeal.evidenceSummary}
              verificationReason={selectedDeal.verificationReason}
              claimCount={selectedDeal.claimCount}
              verifiedClaimCount={selectedDeal.verifiedClaimCount}
              proofAvailable={selectedDeal.proofFiles.length > 0}
            />

            {selectedDeal.talkTrack && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Talk Track</h4>
                  <button onClick={() => copyToClipboard(selectedDeal.talkTrack)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedDeal.talkTrack}</p>
              </div>
            )}

            {selectedDeal.proofFiles.length > 0 && (
              <ProofArtifactsCard filenames={selectedDeal.proofFiles} isDemo={isDemo} />
            )}

            {selectedDeal.scoreHistory.length > 1 && (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Score Trend</h4>
                <div className="flex items-end gap-1 h-16">
                  {selectedDeal.scoreHistory.map((s, i) => (
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

            <button
              onClick={() => {
                setCompetitorUrl(selectedDeal.url);
                setCompetitorName(selectedDeal.name);
                setShowForm(true);
                setSelectedUrl(null);
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" /> Re-Analyze This Competitor
            </button>
          </div>
        )}

        {!showForm && !result && !selectedDeal && (
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
