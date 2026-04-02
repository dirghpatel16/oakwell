// =============================================================================
// Oakwell API Client — Typed wrapper for all backend endpoints
// Backend: FastAPI on Google Cloud Run
// =============================================================================

const API_URL = "/api/backend";

type JsonRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Types — mirroring FastAPI response schemas
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  deal_health_score: number;
  talk_track: string;
  clashes_detected: string;
  visual_proof_summary: string;
  proof_filenames: string[];
  score_history: number[];
  timeline: { ts: string; score: number; top_clash?: string }[];
  analysis_count: number;
  last_analysis_ts: string | null;
  analysis_mode?: string;
  evidence_status?: string;
  evidence_summary?: string;
  verification_reason?: string;
  claim_count?: number;
  verified_claim_count?: number;
  analysis_run_id?: string;
  analysis_completed_at?: string;
  evidence_items?: EvidenceItem[];
  source_coverage?: SourceCoverageItem[];
  deep_sentiment?: Record<string, unknown>;
  [key: string]: unknown;
}

export type MemoryBank = Record<string, MemoryEntry>;

export interface SentinelStatus {
  watched_urls: number;
  interval_seconds: number;
  registry: Record<string, string[]>;
}

export interface HealthStatus {
  status: string;
  persistence_ready?: boolean;
  persistence_backend?: string;
  persistence_reason?: string | null;
}

export interface EvidenceItem {
  id: string;
  source_type: string;
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
}

export interface SourceCoverageItem {
  source_type: string;
  source_label: string;
  item_count: number;
  trust_level?: string;
}

export interface AnalysisRun {
  analysis_run_id: string;
  created_at: string | null;
  competitor_url: string;
  competitor_name?: string;
  deal_health_score: number;
  analysis_mode?: string;
  evidence_status?: string;
  evidence_summary?: string;
  verification_reason?: string;
  claim_count?: number;
  verified_claim_count?: number;
  proof_filenames: string[];
  proof_available?: boolean;
  score_reasoning?: string;
  risk_level?: string;
  deal_stage?: string;
  deal_value?: number;
  evidence_items: EvidenceItem[];
  source_coverage: SourceCoverageItem[];
}

export interface WinningPatterns {
  win_rate: number;
  avg_winning_score: number;
  avg_losing_score: number;
  winning_strategies: string[];
  losing_pitfalls: string[];
  total_outcomes: number;
  deal_value_won: number;
  deal_value_lost: number;
}

export interface StorageStatus {
  owner_scope: string;
  storage_mode: "firestore" | "local_fallback";
  firestore_project: string;
  firestore_collection: string;
  firestore_available: boolean;
  firestore_status_reason?: string | null;
  firestore_init_error?: string | null;
}

export interface AnalyzeDealRequest {
  transcript: string;
  competitor_url: string;
  competitor_name?: string;
  your_product?: string;
  slack_webhook_url?: string;
  org_id?: string;
  deal_stage?: "discovery" | "technical_eval" | "proposal" | "negotiation" | "closing";
  deal_value?: number;
}

export interface AnalyzeDealResponse {
  job_id: string;
}

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface DealStatusResponse {
  job_id: string;
  status: JobStatus;
  progress_message?: string;
  error?: string;
  result?: DealResult;
}

export interface DealResult {
  deal_health_score: number;
  clashes_detected: string;
  talk_track: string;
  proof_artifact_path?: string;
  all_proof_filenames: string[];
  competitor_url: string;
  market_drift: string;
  score_history: number[];
  timeline: { ts: string; score: number; top_clash?: string }[];
  trend: string;
  cached: boolean;
  deep_sentiment?: Record<string, unknown>;
  adversarial_critique?: string;
  deal_stage?: string;
  deal_value?: number;
  score_reasoning?: string;
  risk_level?: string;
  stage_adjustment?: string;
  key_pivot_points?: string[];
  stage_specific_actions?: string[];
  winning_patterns_summary?: string;
  auto_hardened?: boolean;
  analysis_mode?: string;
  evidence_status?: string;
  evidence_summary?: string;
  verification_reason?: string;
  claim_count?: number;
  verified_claim_count?: number;
  proof_available?: boolean;
  analysis_run_id?: string;
  analysis_completed_at?: string;
  evidence_items?: EvidenceItem[];
  source_coverage?: SourceCoverageItem[];
}

export interface LiveSnippetRequest {
  snippet: string;
  competitor_url?: string;
  urgency_threshold?: number;
}

export interface LiveSnippetResponse {
  status: "analysed" | "skipped" | "error";
  competitor_mentioned: boolean;
  competitors: string[];
  claim_detected?: string;
  pricing_claims: { claim: string; source?: string }[];
  urgency: number;
  urgency_label: "low" | "medium" | "high" | "critical";
  has_actionable_claim: boolean;
  verification_triggered: boolean;
  verification_results: Record<string, unknown>[];
  snippet_length: number;
  reason?: string;
}

export interface CompetitorTrend {
  url: string;
  trend: string;
  timeline: { ts: string; score: number; top_clash?: string }[];
  score_history: number[];
  analysis_count: number;
  last_analysis_ts: string | null;
}

export interface RecordOutcomeRequest {
  competitor_url: string;
  outcome: "won" | "lost" | "stalled";
  deal_value?: number;
  deal_stage?: string;
  reason?: string;
}

export interface GenerateEmailRequest {
  job_id?: string;
  deal_results?: Record<string, unknown>;
}

export interface WorkspacePersona {
  company_name?: string;
  value_prop?: string;
  user_role?: "sdr" | "ae" | "manager" | "exec";
  target_audience?: string;
  competitors?: string[];
}

export interface WorkspaceResponse {
  configured: boolean;
  workspace?: WorkspacePersona;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function summarizeList(items: unknown[]): string {
  return items
    .map((item) => {
      if (typeof item === "string") return item;
      if (!isRecord(item)) return "";

      const claim = asString(item.claim);
      const risk = asString(item.risk) || asString(item.verdict);
      const explanation = asString(item.explanation);
      const summary = [claim, risk, explanation].filter(Boolean).join(" — ");

      if (summary) return summary;

      return Object.values(item)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .slice(0, 3)
        .join(" — ");
    })
    .filter(Boolean)
    .join("\n");
}

function summarizeUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return summarizeList(value);
  if (!isRecord(value)) return "";

  const summary = asString(value.summary);
  const verdict = asString(value.verdict);
  const notes = asString(value.hardening_notes);
  const alerts = Array.isArray(value.alerts) ? summarizeList(value.alerts) : "";
  const missed = Array.isArray(value.missed_ammunition)
    ? summarizeList(value.missed_ammunition)
    : "";

  const parts = [
    verdict ? `Verdict: ${verdict}` : "",
    summary,
    notes ? `Notes: ${notes}` : "",
    alerts,
    missed ? `Missed Ammunition:\n${missed}` : "",
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join("\n");
  }

  return Object.values(value)
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .slice(0, 4)
    .join("\n");
}

function normalizeTimeline(value: unknown): { ts: string; score: number; top_clash?: string }[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    return [{
      ts: asString(item.ts),
      score: typeof item.score === "number" ? item.score : 0,
      top_clash: asString(item.top_clash) || undefined,
    }];
  });
}

function normalizeMemoryEntry(value: unknown): MemoryEntry {
  const entry = isRecord(value) ? value : {};

  return {
    deal_health_score:
      typeof entry.deal_health_score === "number" ? entry.deal_health_score : 0,
    talk_track: asString(entry.talk_track),
    clashes_detected: summarizeUnknown(entry.clashes_detected),
    visual_proof_summary: summarizeUnknown(entry.visual_proof_summary),
    proof_filenames: Array.isArray(entry.proof_filenames)
      ? entry.proof_filenames.filter((item): item is string => typeof item === "string")
      : [],
    score_history: Array.isArray(entry.score_history)
      ? entry.score_history.filter((item): item is number => typeof item === "number")
      : [],
    timeline: normalizeTimeline(entry.timeline),
    analysis_count: typeof entry.analysis_count === "number" ? entry.analysis_count : 0,
    last_analysis_ts: asString(entry.last_analysis_ts) || null,
    analysis_mode: asString(entry.analysis_mode) || undefined,
    evidence_status: asString(entry.evidence_status) || undefined,
    evidence_summary: summarizeUnknown(entry.evidence_summary) || undefined,
    verification_reason: asString(entry.verification_reason) || undefined,
    claim_count: typeof entry.claim_count === "number" ? entry.claim_count : undefined,
    verified_claim_count:
      typeof entry.verified_claim_count === "number"
        ? entry.verified_claim_count
        : undefined,
    analysis_run_id: asString(entry.analysis_run_id) || undefined,
    analysis_completed_at: asString(entry.analysis_completed_at) || undefined,
    evidence_items: normalizeEvidenceItems(entry.evidence_items),
    source_coverage: normalizeSourceCoverage(entry.source_coverage),
    deep_sentiment: isRecord(entry.deep_sentiment) ? entry.deep_sentiment : undefined,
  };
}

function normalizeEvidenceItem(value: unknown): EvidenceItem | null {
  if (!isRecord(value)) return null;
  return {
    id: asString(value.id) || cryptoRandomId(),
    source_type: asString(value.source_type) || "unknown",
    source_label: asString(value.source_label) || "Unknown",
    title: asString(value.title) || "Evidence item",
    summary: asString(value.summary),
    verdict: asString(value.verdict) || "unknown",
    confidence_score: typeof value.confidence_score === "number" ? value.confidence_score : 0,
    captured_at: asString(value.captured_at) || null,
    source_url: asString(value.source_url) || undefined,
    artifact_path: asString(value.artifact_path) || undefined,
    claim: asString(value.claim) || undefined,
    freshness: asString(value.freshness) || undefined,
    trust_level: asString(value.trust_level) || undefined,
  };
}

function normalizeEvidenceItems(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeEvidenceItem(item))
    .filter((item): item is EvidenceItem => item !== null);
}

function normalizeSourceCoverageItem(value: unknown): SourceCoverageItem | null {
  if (!isRecord(value)) return null;
  return {
    source_type: asString(value.source_type) || "unknown",
    source_label: asString(value.source_label) || "Unknown",
    item_count: typeof value.item_count === "number" ? value.item_count : 0,
    trust_level: asString(value.trust_level) || undefined,
  };
}

function normalizeSourceCoverage(value: unknown): SourceCoverageItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSourceCoverageItem(item))
    .filter((item): item is SourceCoverageItem => item !== null);
}

function normalizeAnalysisRun(value: unknown): AnalysisRun | null {
  if (!isRecord(value)) return null;
  return {
    analysis_run_id: asString(value.analysis_run_id) || cryptoRandomId(),
    created_at: asString(value.created_at) || null,
    competitor_url: asString(value.competitor_url),
    competitor_name: asString(value.competitor_name) || undefined,
    deal_health_score: typeof value.deal_health_score === "number" ? value.deal_health_score : 0,
    analysis_mode: asString(value.analysis_mode) || undefined,
    evidence_status: asString(value.evidence_status) || undefined,
    evidence_summary: summarizeUnknown(value.evidence_summary) || undefined,
    verification_reason: asString(value.verification_reason) || undefined,
    claim_count: typeof value.claim_count === "number" ? value.claim_count : undefined,
    verified_claim_count:
      typeof value.verified_claim_count === "number" ? value.verified_claim_count : undefined,
    proof_filenames: Array.isArray(value.proof_filenames)
      ? value.proof_filenames.filter((item): item is string => typeof item === "string")
      : [],
    proof_available:
      typeof value.proof_available === "boolean" ? value.proof_available : undefined,
    score_reasoning: asString(value.score_reasoning) || undefined,
    risk_level: asString(value.risk_level) || undefined,
    deal_stage: asString(value.deal_stage) || undefined,
    deal_value: typeof value.deal_value === "number" ? value.deal_value : undefined,
    evidence_items: normalizeEvidenceItems(value.evidence_items),
    source_coverage: normalizeSourceCoverage(value.source_coverage),
  };
}

function normalizeDealResult(value: unknown): DealResult {
  const result = isRecord(value) ? value : {};

  return {
    deal_health_score:
      typeof result.deal_health_score === "number" ? result.deal_health_score : 0,
    clashes_detected: summarizeUnknown(result.clashes_detected),
    talk_track: asString(result.talk_track),
    proof_artifact_path: asString(result.proof_artifact_path) || undefined,
    all_proof_filenames: Array.isArray(result.all_proof_filenames)
      ? result.all_proof_filenames.filter((item): item is string => typeof item === "string")
      : [],
    competitor_url: asString(result.competitor_url),
    market_drift: summarizeUnknown(result.market_drift),
    score_history: Array.isArray(result.score_history)
      ? result.score_history.filter((item): item is number => typeof item === "number")
      : [],
    timeline: normalizeTimeline(result.timeline),
    trend: asString(result.trend),
    cached: Boolean(result.cached),
    deep_sentiment: isRecord(result.deep_sentiment) ? result.deep_sentiment : undefined,
    adversarial_critique: summarizeUnknown(result.adversarial_critique),
    deal_stage: asString(result.deal_stage) || undefined,
    deal_value: typeof result.deal_value === "number" ? result.deal_value : undefined,
    score_reasoning: asString(result.score_reasoning) || undefined,
    risk_level: asString(result.risk_level) || undefined,
    stage_adjustment: asString(result.stage_adjustment) || undefined,
    key_pivot_points: Array.isArray(result.key_pivot_points)
      ? result.key_pivot_points.filter((item): item is string => typeof item === "string")
      : [],
    stage_specific_actions: Array.isArray(result.stage_specific_actions)
      ? result.stage_specific_actions.filter((item): item is string => typeof item === "string")
      : [],
    winning_patterns_summary: summarizeUnknown(result.winning_patterns_summary) || undefined,
    auto_hardened: Boolean(result.auto_hardened),
    analysis_mode: asString(result.analysis_mode) || undefined,
    evidence_status: asString(result.evidence_status) || undefined,
    evidence_summary: summarizeUnknown(result.evidence_summary) || undefined,
    verification_reason: asString(result.verification_reason) || undefined,
    claim_count: typeof result.claim_count === "number" ? result.claim_count : undefined,
    verified_claim_count:
      typeof result.verified_claim_count === "number"
        ? result.verified_claim_count
        : undefined,
    proof_available:
      typeof result.proof_available === "boolean"
        ? result.proof_available
        : undefined,
    analysis_run_id: asString(result.analysis_run_id) || undefined,
    analysis_completed_at: asString(result.analysis_completed_at) || undefined,
    evidence_items: normalizeEvidenceItems(result.evidence_items),
    source_coverage: normalizeSourceCoverage(result.source_coverage),
  };
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Fetch helper with error handling
// ---------------------------------------------------------------------------

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    let message = text;

    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed.detail === "string" && parsed.detail.trim()) {
        message = parsed.detail;
      } else if (typeof parsed.error === "string" && parsed.error.trim()) {
        message = parsed.error;
      }
    } catch {
      // Preserve the original text response when it is not JSON.
    }

    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** Fetch the full Neural Memory Bank */
export async function getMemory(): Promise<MemoryBank> {
  const memory = await request<Record<string, unknown>>("/memory");
  return Object.fromEntries(
    Object.entries(memory).map(([url, entry]) => [url, normalizeMemoryEntry(entry)])
  );
}

/** Health check */
export async function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/health");
}

/** Backend storage diagnostics */
export async function getStorageStatus(): Promise<StorageStatus> {
  return request<StorageStatus>("/storage-status");
}

/** Autonomous sentinel status */
export async function getSentinelStatus(): Promise<SentinelStatus> {
  return request<SentinelStatus>("/sentinel-status");
}

/** Immutable analysis runs for a competitor */
export async function getAnalysisRuns(url: string, limit = 8): Promise<AnalysisRun[]> {
  const query = `?url=${encodeURIComponent(url)}&limit=${encodeURIComponent(String(limit))}`;
  const payload = await request<{ runs?: unknown[] }>(`/analysis-runs${query}`);
  return Array.isArray(payload.runs)
    ? payload.runs
        .map((run) => normalizeAnalysisRun(run))
        .filter((run): run is AnalysisRun => run !== null)
    : [];
}

/** Winning/losing patterns (optionally filtered by competitor URL) */
export async function getWinningPatterns(url?: string): Promise<WinningPatterns> {
  const q = url ? `?url=${encodeURIComponent(url)}` : "";
  return request<WinningPatterns>(`/winning-patterns${q}`);
}

/** Competitor trend */
export async function getCompetitorTrend(url: string): Promise<CompetitorTrend> {
  return request<CompetitorTrend>(`/competitor-trend?url=${encodeURIComponent(url)}`);
}

/** Start a deal analysis — returns job_id for polling */
export async function analyzeDeal(body: AnalyzeDealRequest): Promise<AnalyzeDealResponse> {
  return request<AnalyzeDealResponse>("/analyze-deal", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Poll deal analysis status */
export async function getDealStatus(jobId: string): Promise<DealStatusResponse> {
  const status = await request<DealStatusResponse>(`/deal-status/${jobId}`);
  return {
    ...status,
    result: status.result ? normalizeDealResult(status.result) : undefined,
  };
}

/** Generate a follow-up email from deal results */
export async function generateEmail(body: GenerateEmailRequest): Promise<{ email: string }> {
  return request<{ email: string }>("/generate-email", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Live meeting snippet analysis (sub-second) */
export async function liveSnippet(body: LiveSnippetRequest): Promise<LiveSnippetResponse> {
  return request<LiveSnippetResponse>("/live-snippet", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Executive summary for a completed job */
export async function getExecutiveSummary(jobId: string): Promise<{ markdown: string }> {
  return request<{ markdown: string }>(`/executive-summary/${jobId}`);
}

/** Record a deal outcome (win/loss/stall) */
export async function recordOutcome(body: RecordOutcomeRequest): Promise<{ status: string; doc_id?: string }> {
  return request<{ status: string; doc_id?: string }>("/record-outcome", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Get proof screenshot URL */
export function getProofUrl(filename: string): string {
  return `${API_URL}/proof/${encodeURIComponent(filename)}`;
}

/** Load the workspace persona for the current user/org */
export async function getWorkspace(): Promise<WorkspaceResponse> {
  return request<WorkspaceResponse>("/workspace");
}

/** Lightweight check — has this user configured a workspace? */
export async function getWorkspaceSetupStatus(): Promise<{ configured: boolean }> {
  return request<{ configured: boolean }>("/workspace-setup");
}

/** Save or update the workspace persona */
export async function saveWorkspace(body: WorkspacePersona): Promise<{ status: string }> {
  return request<{ status: string }>("/workspace", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
