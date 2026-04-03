// =============================================================================
// Oakwell React Hooks — SWR-style data fetching + Demo Mode
// When demo mode is ON, returns rich mock data instantly
// When demo mode is OFF, fetches from the real Cloud Run backend
// =============================================================================

"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "./api";
import { useDemoMode } from "./demo-context";
import {
  DEMO_MEMORY,
  DEMO_SENTINEL,
  DEMO_PATTERNS,
  DEMO_DEAL_RESULT,
  DEMO_SNIPPET_RESPONSES,
  DEMO_TRENDS,
  DEMO_EMAIL,
} from "./demo-data";
import type {
  SentinelStatus,
  WinningPatterns,
  DealStatusResponse,
  LiveSnippetResponse,
  CompetitorTrend,
  JobStatus,
  AnalysisRun,
} from "./api";

// ---------------------------------------------------------------------------
// Generic hook for GET requests with refresh
// ---------------------------------------------------------------------------

interface UseQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  refreshInterval?: number,
  demoData?: T | null
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(demoData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!demoData);
  const mountedRef = useRef(true);

  // If demoData is provided, use it immediately
  useEffect(() => {
    if (demoData !== undefined && demoData !== null) {
      setData(demoData);
      setLoading(false);
      setError(null);
    }
  }, [demoData]);

  const load = useCallback(async () => {
    if (demoData !== undefined && demoData !== null) return;
    try {
      setLoading(true);
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, demoData]);

  useEffect(() => {
    mountedRef.current = true;
    if (!demoData) load();
    return () => { mountedRef.current = false; };
  }, [load, demoData]);

  // Optional auto-refresh (only in non-demo mode)
  useEffect(() => {
    if (!refreshInterval || demoData) return;
    const timer = setInterval(load, refreshInterval);
    return () => clearInterval(timer);
  }, [load, refreshInterval, demoData]);

  const refresh = useCallback(() => {
    if (demoData) {
      setLoading(true);
      setTimeout(() => setLoading(false), 400);
      return;
    }
    load();
  }, [load, demoData]);

  return { data, error, loading, refresh };
}

// Stable references to avoid re-render loops when passed as demoData
const DEMO_HEALTH_STATUS = { status: "ok" } as const;
const EMPTY_RUNS: AnalysisRun[] = [];
const DEMO_WORKSPACE: api.WorkspaceResponse = {
  configured: true,
  workspace: { company_name: "Acme Corp (Demo)", user_role: "ae" },
};

// ---------------------------------------------------------------------------
// Domain-specific hooks — all demo-aware
// ---------------------------------------------------------------------------

/** Fetch the entire Neural Memory Bank — refreshes every 30s */
export function useMemory(refreshInterval = 30_000) {
  const { isDemo } = useDemoMode();
  const raw = useQuery<api.MemoryResponse>(
    () => api.getMemory(),
    [isDemo],
    refreshInterval,
    isDemo
      ? { memory: DEMO_MEMORY, persistenceDegraded: false, persistenceReason: null }
      : undefined
  );

  return {
    data: raw.data?.memory ?? null,
    loading: raw.loading,
    error: raw.error,
    refresh: raw.refresh,
    persistenceDegraded: raw.data?.persistenceDegraded ?? false,
    persistenceReason: raw.data?.persistenceReason ?? null,
  };
}

/** Sentinel watcher status */
export function useSentinelStatus(refreshInterval = 60_000) {
  const { isDemo } = useDemoMode();
  return useQuery<SentinelStatus>(
    () => api.getSentinelStatus(),
    [isDemo],
    refreshInterval,
    isDemo ? DEMO_SENTINEL : undefined
  );
}

/** Winning patterns (optionally per-competitor) */
export function useWinningPatterns(competitorUrl?: string) {
  const { isDemo } = useDemoMode();
  return useQuery<WinningPatterns>(
    () => api.getWinningPatterns(competitorUrl),
    [competitorUrl, isDemo],
    undefined,
    isDemo ? DEMO_PATTERNS : undefined
  );
}

/** Competitor trend */
export function useCompetitorTrend(url: string) {
  const { isDemo } = useDemoMode();
  const demoTrend = isDemo ? (DEMO_TRENDS[url] || null) : undefined;
  return useQuery<CompetitorTrend>(
    () => api.getCompetitorTrend(url),
    [url, isDemo],
    undefined,
    demoTrend
  );
}

/** Immutable recent analysis runs for a competitor */
export function useAnalysisRuns(url?: string, refreshInterval = 60_000) {
  const { isDemo } = useDemoMode();
  const shouldBypass = isDemo || !url;
  return useQuery<AnalysisRun[]>(
    () => (url ? api.getAnalysisRuns(url) : Promise.resolve([])),
    [url, isDemo],
    shouldBypass ? undefined : refreshInterval,
    shouldBypass ? EMPTY_RUNS : undefined
  );
}

/** Health check */
export function useHealth(refreshInterval = 15_000) {
  const { isDemo } = useDemoMode();
  return useQuery<api.HealthStatus>(
    () => api.getHealth(),
    [isDemo],
    refreshInterval,
    isDemo ? DEMO_HEALTH_STATUS : undefined
  );
}

/** Detailed storage readiness diagnostics for dashboard truth surfaces */
export function useStorageStatus(refreshInterval = 30_000) {
  const { isDemo } = useDemoMode();
  return useQuery<api.StorageStatus>(
    () => api.getStorageStatus(),
    [isDemo],
    refreshInterval,
    isDemo
      ? {
          owner_scope: "demo:acme",
          storage_mode: "firestore",
          persistence_backend: "firestore",
          persistence_ready: true,
          persistence_reason: null,
          firestore_project: "oakwell-demo",
          firestore_project_source: "demo",
          firestore_collection: "oakwell_deals",
          firestore_available: true,
          firestore_boot_ping_ok: true,
          firestore_scope_probe_ok: true,
          adc_credentials_present: true,
        }
      : undefined
  );
}

/** Workspace persona — company name, role, value prop */
export function useWorkspace() {
  const { isDemo } = useDemoMode();
  return useQuery<api.WorkspaceResponse>(
    () => api.getWorkspace(),
    [isDemo],
    undefined,
    isDemo ? DEMO_WORKSPACE : undefined
  );
}

// ---------------------------------------------------------------------------
// Deal Analysis — async job polling hook (demo-aware)
// ---------------------------------------------------------------------------

interface UseDealAnalysis {
  analyze: (req: api.AnalyzeDealRequest) => Promise<string>;
  jobStatus: DealStatusResponse | null;
  isRunning: boolean;
  error: string | null;
  reset: () => void;
}

export function useDealAnalysis(): UseDealAnalysis {
  const { isDemo } = useDemoMode();
  const [jobStatus, setJobStatus] = useState<DealStatusResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const analyze = useCallback(async (req: api.AnalyzeDealRequest) => {
    setError(null);
    setIsRunning(true);

    if (isDemo) {
      const fakeJobId = `demo-${Date.now()}`;
      setJobStatus({ job_id: fakeJobId, status: "pending", progress_message: "Queued..." });

      const steps: { status: JobStatus; msg: string; delay: number }[] = [
        { status: "running", msg: "Scanning competitor pages...", delay: 800 },
        { status: "running", msg: "Extracting pricing & feature claims...", delay: 1500 },
        { status: "running", msg: "Verifying claims with Vision AI...", delay: 2500 },
        { status: "running", msg: "Generating strategic talk track...", delay: 3500 },
        { status: "running", msg: "Building proof artifacts...", delay: 4500 },
        { status: "running", msg: "Running adversarial hardening...", delay: 5500 },
        { status: "completed", msg: "Analysis complete — 4 proof artifacts generated", delay: 6500 },
      ];

      steps.forEach(({ status, msg, delay }) => {
        setTimeout(() => {
          if (!mountedRef.current) return;
          if (status === "completed") {
            setJobStatus({
              job_id: fakeJobId,
              status: "completed",
              progress_message: msg,
              result: { ...DEMO_DEAL_RESULT, competitor_url: req.competitor_url, deal_stage: req.deal_stage, deal_value: req.deal_value },
            });
            setIsRunning(false);
          } else {
            setJobStatus({ job_id: fakeJobId, status, progress_message: msg });
          }
        }, delay);
      });

      return fakeJobId;
    }

    try {
      const { job_id } = await api.analyzeDeal(req);
      setJobStatus({ job_id, status: "pending" });

      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const status = await api.getDealStatus(job_id);
          if (!mountedRef.current) return;
          setJobStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsRunning(false);
            if (status.status === "failed") {
              setError(status.error || "Analysis failed");
            }
          }
        } catch {
          // Keep polling on transient failures
        }
      }, 3000);

      return job_id;
    } catch (e: unknown) {
      setIsRunning(false);
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      throw e;
    }
  }, [isDemo]);

  const reset = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setJobStatus(null);
    setIsRunning(false);
    setError(null);
  }, []);

  return { analyze, jobStatus, isRunning, error, reset };
}

// ---------------------------------------------------------------------------
// Live Sidekick — demo-aware
// ---------------------------------------------------------------------------

interface UseLiveSidekick {
  send: (snippet: string, competitorUrl?: string) => Promise<LiveSnippetResponse | null>;
  lastResponse: LiveSnippetResponse | null;
  history: LiveSnippetResponse[];
  loading: boolean;
  error: string | null;
}

export function useLiveSidekick(): UseLiveSidekick {
  const { isDemo } = useDemoMode();
  const [lastResponse, setLastResponse] = useState<LiveSnippetResponse | null>(null);
  const [history, setHistory] = useState<LiveSnippetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoIndex = useRef(0);

  const send = useCallback(async (snippet: string, competitorUrl?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
        const res = DEMO_SNIPPET_RESPONSES[demoIndex.current % DEMO_SNIPPET_RESPONSES.length];
        demoIndex.current++;
        setLastResponse(res);
        setHistory(prev => [res, ...prev].slice(0, 100));
        return res;
      }

      const res = await api.liveSnippet({ snippet, competitor_url: competitorUrl });
      setLastResponse(res);
      setHistory(prev => [res, ...prev].slice(0, 100));
      return res;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  return { send, lastResponse, history, loading, error };
}

// ---------------------------------------------------------------------------
// Email generation hook — demo-aware
// ---------------------------------------------------------------------------

export function useEmailGeneration() {
  const { isDemo } = useDemoMode();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (jobId?: string, dealResults?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 1200));
        setEmail(DEMO_EMAIL);
        return DEMO_EMAIL;
      }

      const res = await api.generateEmail({ job_id: jobId, deal_results: dealResults });
      setEmail(res.email);
      return res.email;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate email");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  return { email, loading, error, generate };
}
