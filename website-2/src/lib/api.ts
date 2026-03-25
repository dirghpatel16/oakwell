// =============================================================================
// Oakwell API Client — Typed wrapper for all backend endpoints
// Backend: FastAPI on Google Cloud Run
// =============================================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://oakwell-570217803515.us-central1.run.app";

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
  deep_sentiment?: Record<string, unknown>;
  [key: string]: unknown;
}

export type MemoryBank = Record<string, MemoryEntry>;

export interface SentinelStatus {
  watched_urls: number;
  interval_seconds: number;
  registry: Record<string, string[]>;
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
    deep_sentiment: isRecord(entry.deep_sentiment) ? entry.deep_sentiment : undefined,
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
  };
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
    throw new ApiError(text, res.status);
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
export async function getHealth(): Promise<{ status: string }> {
  return request<{ status: string }>("/health");
}

/** Autonomous sentinel status */
export async function getSentinelStatus(): Promise<SentinelStatus> {
  return request<SentinelStatus>("/sentinel-status");
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
