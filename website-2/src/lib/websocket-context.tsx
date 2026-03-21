"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useDemoMode } from "./demo-context";
import { DEMO_ALERTS } from "./demo-data";

// Types for the real-time system
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
  progress: number; // 0-100
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
  // Actions
  triggerScan: (competitor: string) => void;
  triggerDealAnalysis: (dealName: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  clearOperation: (id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be inside WebSocketProvider");
  return ctx;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isDemo } = useDemoMode();
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "reconnecting">("connecting");
  const [liveOperations, setLiveOperations] = useState<LiveOperation[]>([]);
  const [realtimeAlerts, setRealtimeAlerts] = useState<RealtimeAlert[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const operationTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Connection + alerts
  useEffect(() => {
    // Quick "connect" animation
    const t = setTimeout(() => {
      setConnected(true);
      setConnectionStatus("connected");
      setLastSync(new Date());
    }, isDemo ? 600 : 1200);

    // Heartbeat
    const heartbeat = setInterval(() => setLastSync(new Date()), 5000);

    // DEMO MODE: Load rich pre-built alerts
    if (isDemo) {
      setRealtimeAlerts(DEMO_ALERTS as RealtimeAlert[]);
    }
    // PRODUCTION MODE: No fake alerts — real alerts will come from SSE/webhooks later

    return () => {
      clearTimeout(t);
      clearInterval(heartbeat);
      operationTimers.current.forEach(t => clearTimeout(t));
    };
  }, [isDemo]);

  const simulateOperation = useCallback((op: LiveOperation) => {
    setLiveOperations(prev => [op, ...prev]);

    const steps: { step: AgentStep; progress: number; message: string; delay: number }[] = [
      { step: "connecting", progress: 5, message: "Establishing secure connection...", delay: 500 },
      { step: "scanning_pages", progress: 20, message: `Scanning ${op.target} pages...`, delay: 2000 },
      { step: "extracting_claims", progress: 45, message: "Extracting pricing & feature claims...", delay: 3000 },
      { step: "verifying_claims", progress: 70, message: "Cross-referencing with Vision AI...", delay: 2500 },
      { step: "generating_strategy", progress: 90, message: "Generating strategic recommendations...", delay: 2000 },
      { step: "complete", progress: 100, message: "\u2713 Analysis complete", delay: 1000 },
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
        setLiveOperations(prev =>
          prev.map(o =>
            o.id === op.id
              ? { ...o, step, progress, messages: [...o.messages, message] }
              : o
          )
        );
      }, totalDelay);
      operationTimers.current.set(`${op.id}-${step}`, timer);
    });

    const removeTimer = setTimeout(() => {
      setLiveOperations(prev => prev.filter(o => o.id !== op.id));
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
    setRealtimeAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setRealtimeAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }, []);

  const clearOperation = useCallback((id: string) => {
    setLiveOperations(prev => prev.filter(o => o.id !== id));
  }, []);

  const unreadAlertCount = realtimeAlerts.filter(a => !a.read).length;

  return (
    <WebSocketContext.Provider value={{
      connected,
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
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}
