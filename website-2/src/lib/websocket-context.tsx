"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDemoMode } from "./demo-context";
import { DEMO_ALERTS } from "./demo-data";
import { useHealth, useMemory, useSentinelStatus } from "./hooks";

export type AgentStep =
  | "idle"
  | "connecting"
  | "scanning_pages"
  | "extracting_claims"
  | "verifying_claims"
  | "generating_strategy"
  | "analyzing_transcript"
  | "scoring_deals"
  | "complete";

export interface LiveOperation {
  id: string;
  type: "scan" | "analysis" | "alert" | "coaching";
  target: string;
  agent: string;
  step: AgentStep;
  progress: number;
  startedAt: Date;
  messages: string[];
}

export interface RealtimeAlert {
  id: string;
  type: "pricing" | "feature" | "mention" | "risk" | "champion_change";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  timestamp: Date;
  read: boolean;
}

interface WebSocketContextType {
  connected: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected" | "reconnecting";
  liveOperations: LiveOperation[];
  realtimeAlerts: RealtimeAlert[];
  unreadAlertCount: number;
  lastSync: Date | null;
  triggerScan: (competitor: string) => void;
  triggerDealAnalysis: (dealName: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  clearOperation: (id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

function severityRank(severity: RealtimeAlert["severity"]) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity];
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be inside WebSocketProvider");
  return ctx;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isDemo } = useDemoMode();
  const { data: health, error: healthError, loading: healthLoading } = useHealth();
  const { data: memory } = useMemory();
  const { data: sentinel } = useSentinelStatus();

  const [liveOperations, setLiveOperations] = useState<LiveOperation[]>([]);
  const [readState, setReadState] = useState<Record<string, boolean>>({});
  const operationTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const timers = operationTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const productionAlerts = useMemo(() => {
    if (!memory) return [];

    const alerts: RealtimeAlert[] = [];
    Object.entries(memory).forEach(([url, entry]) => {
      const competitor = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const latestTimeline = entry.timeline?.length ? entry.timeline[entry.timeline.length - 1] : null;
      const timestampSource = latestTimeline?.ts || entry.last_analysis_ts;
      const timestamp = timestampSource ? new Date(timestampSource) : new Date();
      const headline = entry.clashes_detected?.split("\n")[0] || latestTimeline?.top_clash || "Competitive movement detected";

      if ((entry.deal_health_score || 0) < 55) {
        alerts.push({
          id: `risk-${url}-${entry.last_analysis_ts || "latest"}`,
          type: "risk",
          severity: (entry.deal_health_score || 0) < 40 ? "critical" : "high",
          title: `${competitor} at ${entry.deal_health_score}/100 — ${headline.slice(0, 90)}`,
          timestamp,
          read: false,
        });
      }

      if (latestTimeline?.top_clash) {
        alerts.push({
          id: `mention-${url}-${latestTimeline.ts}`,
          type: "mention",
          severity: latestTimeline.score < 40 ? "high" : latestTimeline.score < 65 ? "medium" : "low",
          title: `${competitor}: ${latestTimeline.top_clash.slice(0, 90)}`,
          timestamp,
          read: false,
        });
      }
    });

    if ((sentinel?.watched_urls || 0) === 0 && Object.keys(memory).length === 0) {
      alerts.push({
        id: "system-empty-watchlist",
        type: "feature",
        severity: "low",
        title: "Oakwell is connected, but the watchlist is still empty. Run your first analysis to seed it.",
        timestamp: new Date(),
        read: false,
      });
    }

    return alerts
      .sort((a, b) => {
        const severityDelta = severityRank(a.severity) - severityRank(b.severity);
        if (severityDelta !== 0) return severityDelta;
        return b.timestamp.getTime() - a.timestamp.getTime();
      })
      .slice(0, 12);
  }, [memory, sentinel]);

  const realtimeAlerts = useMemo(
    () =>
      (isDemo ? (DEMO_ALERTS as RealtimeAlert[]) : productionAlerts).map((alert) => ({
        ...alert,
        read: readState[alert.id] ?? alert.read,
      })),
    [isDemo, productionAlerts, readState]
  );

  const lastSync = useMemo(() => {
    if (!memory) return null;

    const timestamps = Object.values(memory)
      .flatMap((entry) => [entry.last_analysis_ts, ...(entry.timeline || []).map((item) => item.ts)])
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return timestamps[0] ?? null;
  }, [memory]);

  const connected = isDemo ? true : health?.status === "ok" && !healthError;
  const connectionStatus = useMemo<WebSocketContextType["connectionStatus"]>(() => {
    if (isDemo) return "connected";
    if (healthLoading && !health && !healthError) return "connecting";
    if (healthError) return lastSync ? "reconnecting" : "disconnected";
    return connected ? "connected" : "disconnected";
  }, [connected, health, healthError, healthLoading, isDemo, lastSync]);

  const simulateOperation = useCallback((op: LiveOperation) => {
    setLiveOperations((prev) => [op, ...prev]);

    const steps: { step: AgentStep; progress: number; message: string; delay: number }[] = [
      { step: "connecting", progress: 5, message: "Establishing secure connection...", delay: 500 },
      { step: "scanning_pages", progress: 20, message: `Scanning ${op.target} pages...`, delay: 2000 },
      { step: "extracting_claims", progress: 45, message: "Extracting pricing & feature claims...", delay: 3000 },
      { step: "verifying_claims", progress: 70, message: "Cross-referencing with Vision AI...", delay: 2500 },
      { step: "generating_strategy", progress: 90, message: "Generating strategic recommendations...", delay: 2000 },
      { step: "complete", progress: 100, message: "Analysis complete", delay: 1000 },
    ];

    if (op.type === "analysis") {
      steps[1] = { step: "analyzing_transcript", progress: 25, message: `Analyzing ${op.target} transcript...`, delay: 2500 };
      steps[2] = { step: "extracting_claims", progress: 50, message: "Extracting competitor mentions & objections...", delay: 2000 };
      steps[3] = { step: "scoring_deals", progress: 75, message: "Scoring deal risk factors...", delay: 2000 };
      steps[4] = { step: "generating_strategy", progress: 90, message: "Generating coaching recommendations...", delay: 1500 };
    }

    let totalDelay = 0;
    steps.forEach(({ step, progress, message, delay }) => {
      totalDelay += delay;
      const timer = setTimeout(() => {
        setLiveOperations((prev) =>
          prev.map((operation) =>
            operation.id === op.id
              ? { ...operation, step, progress, messages: [...operation.messages, message] }
              : operation
          )
        );
      }, totalDelay);
      operationTimers.current.set(`${op.id}-${step}`, timer);
    });

    const removeTimer = setTimeout(() => {
      setLiveOperations((prev) => prev.filter((operation) => operation.id !== op.id));
    }, totalDelay + 5000);
    operationTimers.current.set(`${op.id}-remove`, removeTimer);
  }, []);

  const triggerScan = useCallback((competitor: string) => {
    const op: LiveOperation = {
      id: `scan-${Date.now()}`,
      type: "scan",
      target: competitor,
      agent: "Market Sentinel",
      step: "idle",
      progress: 0,
      startedAt: new Date(),
      messages: [],
    };
    simulateOperation(op);
  }, [simulateOperation]);

  const triggerDealAnalysis = useCallback((dealName: string) => {
    const op: LiveOperation = {
      id: `analysis-${Date.now()}`,
      type: "analysis",
      target: dealName,
      agent: "Deal Intelligence",
      step: "idle",
      progress: 0,
      startedAt: new Date(),
      messages: [],
    };
    simulateOperation(op);
  }, [simulateOperation]);

  const markAlertRead = useCallback((id: string) => {
    setReadState((prev) => ({ ...prev, [id]: true }));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setReadState((prev) => Object.fromEntries(realtimeAlerts.map((alert) => [alert.id, true]).concat(Object.entries(prev))));
  }, [realtimeAlerts]);

  const clearOperation = useCallback((id: string) => {
    setLiveOperations((prev) => prev.filter((operation) => operation.id !== id));
  }, []);

  const unreadAlertCount = realtimeAlerts.filter((alert) => !alert.read).length;

  return (
    <WebSocketContext.Provider
      value={{
        connected: Boolean(connected),
        connectionStatus,
        liveOperations,
        realtimeAlerts,
        unreadAlertCount,
        lastSync,
        triggerScan,
        triggerDealAnalysis,
        markAlertRead,
        markAllAlertsRead,
        clearOperation,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
