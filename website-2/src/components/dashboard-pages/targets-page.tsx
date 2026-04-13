"use client";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Eye,
  Clock,
  ExternalLink,
  Camera,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Briefcase,
  MessagesSquare,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";
import { useMemory, useSentinelStatus } from "@/lib/hooks";
import { useDashboardSurface } from "@/components/dashboard-shell";
import { DashboardEmptyState, DashboardLoadingState } from "@/components/dashboard-state";
import { DEMO_COMPETITOR_PROFILES, DEMO_DEAL_WORKSPACE, DEMO_SENTINEL_COMPETITORS, DEMO_SIGNAL_CATEGORIES } from "@/lib/demo-data";
import { LiveBadge, StatusChip, MiniSparkline } from "@/components/ui/live-indicators";
import { ActionListPanel, EvidenceListPanel, WorkflowBar } from "@/components/ui/demo-terminal-primitives";

type CompetitorRow = {
  name: string;
  domain: string;
  status: string;
  lastScan: string;
  analysisCount: number;
  changesThisWeek: number;
  threatLevel: string;
  score: number;
  proofFiles: string[];
  clashes: string;
  category?: string;
  confidence?: string;
  pricingSignal?: string;
  messagingShift?: string;
  hiringSignal?: string;
  productSignal?: string;
  recommendedAction?: string;
  recentChanges: { page: string; type: string; detail: string; time: string; severity: string; score: number }[];
};

export default function MarketSentinelPage() {
  const { triggerScan, liveOperations } = useWebSocket();
  const { data: memory, loading: memLoading } = useMemory();
  const { data: sentinel } = useSentinelStatus();
  const { basePath, isDemoSurface } = useDashboardSurface();
  const [focus, setFocus] = useState<"all" | "pricing" | "messaging" | "hiring" | "product">("all");
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorRow | null>(null);
  const [detailTab, setDetailTab] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [requestedCompetitor, setRequestedCompetitor] = useState<string | null>(null);
  const [requestedTab, setRequestedTab] = useState<string | null>(null);
  const isScanning = liveOperations.some((o) => o.type === "scan");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedCompetitor(params.get("competitor"));
    setRequestedTab(params.get("tab"));
  }, []);

  const competitors = useMemo<CompetitorRow[]>(() => {
    if (isDemoSurface) {
      return DEMO_SENTINEL_COMPETITORS.map((item, index) => ({
        name: item.competitor,
        domain: item.url,
        status: "active",
        lastScan: item.freshness,
        analysisCount: index + 7,
        changesThisWeek: 4 + (index % 3),
        threatLevel: index < 3 ? "high" : index === 5 ? "low" : "medium",
        score: Object.values(memory || {})[index]?.deal_health_score || [72, 58, 38, 65, 81, 44][index] || 60,
        proofFiles: Object.values(memory || {})[index]?.proof_filenames || [],
        clashes: item.messagingShift,
        category: item.category,
        confidence: item.confidence,
        pricingSignal: item.pricingSignal,
        messagingShift: item.messagingShift,
        hiringSignal: item.hiringSignal,
        productSignal: item.productSignal,
        recommendedAction: item.recommendedAction,
        recentChanges: [
          { page: item.url, type: "pricing_change" as const, detail: item.pricingSignal, time: item.freshness, severity: "high", score: 0 },
          { page: item.url, type: "messaging_shift" as const, detail: item.messagingShift, time: item.freshness, severity: "medium", score: 0 },
          { page: item.url, type: "feature_launch" as const, detail: item.productSignal, time: item.freshness, severity: "medium", score: 0 },
          { page: item.url, type: "analysis" as const, detail: item.hiringSignal, time: item.freshness, severity: "low", score: 0 },
        ],
      }));
    }
    if (!memory) return [];
    return Object.entries(memory).map(([url, entry]) => {
      const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const score = entry.deal_health_score || 0;
      const threatLevel = score < 40 ? "critical" : score < 55 ? "high" : score < 70 ? "medium" : "low";

      const changes = (entry.timeline || []).slice(-5).reverse().map((t) => ({
        page: url,
        type: "analysis" as const,
        detail: t.top_clash || "Score update",
        time: t.ts ? new Date(t.ts).toLocaleString() : "Unknown",
        severity: t.score < 40 ? "critical" : t.score < 65 ? "high" : t.score < 80 ? "medium" : "low",
        score: t.score,
      }));

      return {
        name,
        domain: url,
        status: "active",
        lastScan: entry.last_analysis_ts ? timeAgo(entry.last_analysis_ts) : "Never",
        analysisCount: entry.analysis_count || 0,
        changesThisWeek: changes.length,
        threatLevel,
        score,
        proofFiles: entry.proof_filenames || [],
        clashes: entry.clashes_detected || "",
        recentChanges: changes,
      };
    }).sort((a, b) => a.score - b.score);
  }, [memory]);

  const scanStats = useMemo(() => ({
    totalCompetitors: competitors.length,
    watchedUrls: sentinel?.watched_urls || 0,
    totalAnalyses: competitors.reduce((s, c) => s + c.analysisCount, 0),
    proofsCaptured: competitors.reduce((s, c) => s + c.proofFiles.length, 0),
  }), [competitors, sentinel]);

  const visibleCompetitors = useMemo(() => {
    if (focus === "all") return competitors;
    return competitors.filter((competitor) => {
      const comp = competitor as Record<string, unknown>;
      if (focus === "pricing") return comp.pricingSignal;
      if (focus === "messaging") return comp.messagingShift;
      if (focus === "hiring") return comp.hiringSignal;
      return comp.productSignal;
    });
  }, [competitors, focus]);

  const scoreHistories: Record<string, number[]> = {
    "gong.io": [45, 52, 58, 63, 55, 60, 67, 72],
    "clari.com": [65, 60, 55, 58, 52, 55, 58, 58],
    "chorus.ai": [50, 44, 40, 42, 38, 35, 38, 38],
    "salesloft.com": [60, 62, 65, 63, 68, 65, 65],
    "outreach.io": [72, 74, 78, 80, 82, 81, 81],
    "mindtickle.com": [52, 50, 48, 44, 46, 44, 44],
  };

  const selectedProfile = selectedCompetitor
    ? DEMO_COMPETITOR_PROFILES.find((profile) => profile.domain === selectedCompetitor.domain) || null
    : null;
  const selectedDeals = selectedProfile
    ? DEMO_DEAL_WORKSPACE.filter((deal) => deal.competitorId === selectedProfile.id)
    : [];

  useEffect(() => {
    if (!isDemoSurface || competitors.length === 0) return;

    if (requestedCompetitor) {
      const normalized = requestedCompetitor.toLowerCase();
      const match = competitors.find((competitor) =>
        competitor.name.toLowerCase().includes(normalized) ||
        normalized.includes(competitor.name.toLowerCase()) ||
        competitor.domain.toLowerCase().includes(normalized) ||
        DEMO_COMPETITOR_PROFILES.some((profile) => profile.domain === competitor.domain && profile.id === normalized)
      );
      if (match && selectedCompetitor?.domain !== match.domain) {
        setSelectedCompetitor(match);
      }
    }

    if (requestedTab) {
      const tabMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
        overview: 1,
        pricing: 2,
        messaging: 3,
        hiring: 4,
        proof: 5,
      };
      const nextTab = tabMap[requestedTab.toLowerCase()];
      if (nextTab && nextTab !== detailTab) {
        setDetailTab(nextTab);
      }
    }
  }, [competitors, detailTab, isDemoSurface, requestedCompetitor, requestedTab, selectedCompetitor?.domain]);

  return (
    <div className="relative flex h-full">
    <div className={`flex-1 min-w-0 p-4 md:p-6 max-w-[1600px] mx-auto space-y-5 transition-all duration-300 ${selectedCompetitor ? "xl:mr-[420px]" : ""}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">Market Sentinel</h1>
            <LiveBadge label="LIVE" color={isScanning ? "blue" : "amber"} />
            {isDemoSurface && <StatusChip label={`${scanStats.watchedUrls} URLS`} variant="wire" />}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">24/7 Autonomous Competitor Monitoring</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4 text-xs font-mono bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800">
            <div className={`flex items-center gap-2 ${isScanning ? "text-blue-400" : "text-amber-400"}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: isScanning ? "#60a5fa" : "#fbbf24" }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: isScanning ? "#3b82f6" : "#f59e0b" }}></span>
              </span>
              {isScanning ? "SCANNING..." : "WATCHING"}
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">{scanStats.watchedUrls} URLS</span>
          </div>
          <button
            onClick={() => triggerScan("All Competitors")}
            disabled={isScanning}
            className="flex items-center gap-1.5 text-xs font-medium bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-50 transition-colors"
          >
            {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {isScanning ? "Scanning..." : "Force Scan"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Globe className="w-4 h-4" />} label="Competitors Tracked" value={scanStats.totalCompetitors.toString()} />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Watched URLs" value={scanStats.watchedUrls.toString()} />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Total Analyses" value={scanStats.totalAnalyses.toString()} accent="text-amber-400" />
        <StatCard icon={<Camera className="w-4 h-4" />} label="Proofs Captured" value={scanStats.proofsCaptured.toString()} />
      </div>

      {isDemoSurface ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Signal focus</h2>
              <p className="mt-1 text-xs text-zinc-500">Filter the watchtower by the signal class you want to narrate in the demo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "pricing", "messaging", "hiring", "product"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFocus(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    focus === item
                      ? "border-zinc-700 bg-zinc-900 text-white"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {DEMO_SIGNAL_CATEGORIES.map((signal) => (
              <div key={signal.label} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{signal.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{signal.count}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Tracked competitors</button>
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Tracked segments</button>
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Deals at risk</button>
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Fresh in 24h</button>
          </div>
        </div>
      ) : null}

      {memLoading && competitors.length === 0 ? (
        <DashboardLoadingState
          icon={Loader2}
          title="Loading competitor intelligence"
          message="Refreshing watched accounts, proof artifacts, and the latest movement across the market perimeter."
        />
      ) : null}

      {!memLoading && competitors.length === 0 ? (
        <DashboardEmptyState
          icon={Globe}
          eyebrow={isDemoSurface ? "Demo watchtower" : "Production watchtower"}
          title="No competitors are being watched yet"
          message="The Sentinel becomes valuable as soon as Oakwell processes a live deal. The first analysis seeds tracked competitors, proof artifacts, and drift history."
          ctaHref={`${basePath}/deals`}
          ctaLabel="Seed from Deal Desk"
        />
      ) : null}

      <div className="space-y-3">
        {visibleCompetitors.map((comp) => (
          <CompetitorCard
            key={comp.domain}
            competitor={comp}
            basePath={basePath}
            isDemoSurface={isDemoSurface}
            isSelected={selectedCompetitor?.domain === comp.domain}
            onClick={() => {
              setSelectedCompetitor(selectedCompetitor?.domain === comp.domain ? null : comp);
              setDetailTab(1);
            }}
          />
        ))}
      </div>

      {selectedCompetitor ? (
        <div className="xl:hidden rounded-2xl border border-zinc-800 bg-[#08090d] p-4 space-y-4">
          <SentinelDetailHeader selectedCompetitor={selectedCompetitor} detailTab={detailTab} setDetailTab={setDetailTab} onClose={() => setSelectedCompetitor(null)} />
          <SentinelDetailContent
            basePath={basePath}
            detailTab={detailTab}
            selectedCompetitor={selectedCompetitor}
            selectedProfile={selectedProfile}
            selectedDeals={selectedDeals}
            onSelectCompetitor={(competitorId) => {
              const match = competitors.find((competitor) => DEMO_COMPETITOR_PROFILES.some((profile) => profile.domain === competitor.domain && profile.id === competitorId));
              if (match) {
                setSelectedCompetitor(match);
                setDetailTab(1);
              }
            }}
          />
        </div>
      ) : null}
    </div>

    {/* BLOOMBERG-STYLE DETAIL PANEL — slides in from right */}
    {selectedCompetitor && (
      <div className="hidden xl:flex xl:flex-col fixed right-0 top-14 bottom-7 w-[420px] bg-[#08090d] border-l border-zinc-800 z-20 overflow-hidden animate-slide-in-right">
        <SentinelDetailHeader selectedCompetitor={selectedCompetitor} detailTab={detailTab} setDetailTab={setDetailTab} onClose={() => setSelectedCompetitor(null)} />
        <div className="flex-1 overflow-y-auto">
          <SentinelDetailContent
            basePath={basePath}
            detailTab={detailTab}
            selectedCompetitor={selectedCompetitor}
            selectedProfile={selectedProfile}
            selectedDeals={selectedDeals}
            onSelectCompetitor={(competitorId) => {
              const match = competitors.find((competitor) => DEMO_COMPETITOR_PROFILES.some((profile) => profile.domain === competitor.domain && profile.id === competitorId));
              if (match) {
                setSelectedCompetitor(match);
                setDetailTab(1);
              }
            }}
          />
        </div>
      </div>
    )}
    </div>
  );
}

function SentinelDetailHeader({
  selectedCompetitor,
  detailTab,
  setDetailTab,
  onClose,
}: {
  selectedCompetitor: CompetitorRow;
  detailTab: 1 | 2 | 3 | 4 | 5;
  setDetailTab: (tab: 1 | 2 | 3 | 4 | 5) => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-[#0d111a] border-b border-zinc-700 px-4 py-3 rounded-t-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-white tracking-widest uppercase">{selectedCompetitor.name}</span>
            <span className={`font-mono text-xs font-bold ${
              selectedCompetitor.score >= 70 ? "text-green-400" :
              selectedCompetitor.score >= 40 ? "text-amber-400" : "text-red-400"
            }`}>{selectedCompetitor.score}/100</span>
            <span className={`font-mono text-[10px] ${selectedCompetitor.score >= 60 ? "text-green-400" : "text-red-400"}`}>
              {selectedCompetitor.score >= 60 ? <TrendingUp className="inline w-3 h-3" /> : <TrendingDown className="inline w-3 h-3" />}
              {" "}{selectedCompetitor.threatLevel?.toUpperCase()} THREAT
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-zinc-500">
            <span>{selectedCompetitor.domain}</span>
            <span>·</span>
            <span>{selectedCompetitor.analysisCount} analyses</span>
            <span>·</span>
            <span>last scan {selectedCompetitor.lastScan}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-0 mt-3 border-b border-zinc-700/50 -mx-4 px-4 overflow-x-auto">
        {([
          [1, "Overview"],
          [2, "Pricing"],
          [3, "Messaging"],
          [4, "Hiring"],
          [5, "Proof"],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setDetailTab(tab)}
            className={`text-[10px] font-mono px-3 py-1.5 border-b-2 transition-colors whitespace-nowrap ${
              detailTab === tab
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}) {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SentinelDetailContent({
  basePath,
  detailTab,
  selectedCompetitor,
  selectedProfile,
  selectedDeals,
  onSelectCompetitor,
}: {
  basePath: string;
  detailTab: 1 | 2 | 3 | 4 | 5;
  selectedCompetitor: CompetitorRow;
  selectedProfile: typeof DEMO_COMPETITOR_PROFILES[number] | null;
  selectedDeals: typeof DEMO_DEAL_WORKSPACE;
  onSelectCompetitor: (competitorId: string) => void;
}) {
  if (detailTab === 1) {
    return (
      <div className="p-4 space-y-4">
        {selectedProfile ? (
          <SentinelExposureMap
            basePath={basePath}
            selectedProfile={selectedProfile}
            selectedDeals={selectedDeals}
            onSelectCompetitor={onSelectCompetitor}
          />
        ) : null}
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Key Intelligence</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{selectedCompetitor.clashes || "No clash data yet."}</p>
        </div>
        {selectedProfile ? (
          <EvidenceListPanel
            title="Source Ledger"
            subtitle={`${selectedProfile.sourceCount} sources · ${selectedProfile.freshness} · ${selectedProfile.confidence}`}
            items={selectedProfile.evidence}
          />
        ) : null}
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Recommended Action</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{selectedCompetitor.recommendedAction || "Run a deal analysis to generate a recommendation."}</p>
        </div>
        {selectedProfile ? (
          <ActionListPanel
            title="Integrated Workflow"
            subtitle="Keep this terminal actionable, not just informative."
            items={[
              selectedProfile.recommendedAction,
              ...selectedDeals.map((deal) => `${deal.account}: ${deal.nextAction}`),
            ]}
          />
        ) : null}
        {selectedProfile ? (
          <WorkflowBar
            actions={[
              { label: "Open deal", href: `${basePath}/deals?competitor=${encodeURIComponent(selectedProfile.id)}`, tone: "live" },
              { label: "Open evidence", href: `${basePath}/alerts?competitor=${encodeURIComponent(selectedProfile.id)}`, tone: "alert" },
              { label: "Save view", tone: "low" },
              { label: "Add to watchlist", tone: "info" },
            ]}
          />
        ) : null}
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Activity Log</p>
          <div className="space-y-2">
            {selectedCompetitor.recentChanges.map((c, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-zinc-800/50">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                  c.severity === "critical" || c.severity === "high" ? "bg-red-500" : c.severity === "medium" ? "bg-amber-500" : "bg-zinc-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-400 leading-relaxed">{c.detail}</p>
                  <p className="text-[9px] font-mono text-zinc-600 mt-0.5">{c.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (detailTab === 2) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Pricing Signal</p>
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
          <AlertTriangle className="w-4 h-4 text-orange-400 mb-2" />
          <p className="text-xs text-zinc-300 leading-relaxed">{selectedCompetitor.pricingSignal || "No pricing signal detected."}</p>
        </div>
      </div>
    );
  }

  if (detailTab === 3) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Messaging Shift</p>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <MessagesSquare className="w-4 h-4 text-blue-400 mb-2" />
          <p className="text-xs text-zinc-300 leading-relaxed">{selectedCompetitor.messagingShift || "No messaging shift detected."}</p>
        </div>
      </div>
    );
  }

  if (detailTab === 4) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Hiring Signal</p>
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4">
          <Briefcase className="w-4 h-4 text-violet-400 mb-2" />
          <p className="text-xs text-zinc-300 leading-relaxed">{selectedCompetitor.hiringSignal || "No hiring signal detected."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Proof Artifacts</p>
      {selectedCompetitor.proofFiles.length > 0 ? (
        <div className="space-y-2">
          {selectedCompetitor.proofFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-400">
              <Camera className="w-3 h-3 text-zinc-500 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">No proof artifacts captured yet. Run a Deal Desk analysis to generate them.</p>
      )}
      <Link href={`${basePath}/deals?competitor=${encodeURIComponent(selectedProfile?.id || selectedCompetitor.name)}`} className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-2">
        Go to Deal Desk →
      </Link>
      {selectedProfile ? (
        <div className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Review / sentiment themes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedProfile.reviewThemes.map((theme) => (
              <span key={theme} className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300">{theme}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SentinelExposureMap({
  basePath,
  selectedProfile,
  selectedDeals,
  onSelectCompetitor,
}: {
  basePath: string;
  selectedProfile: typeof DEMO_COMPETITOR_PROFILES[number];
  selectedDeals: typeof DEMO_DEAL_WORKSPACE;
  onSelectCompetitor: (competitorId: string) => void;
}) {
  const adjacentCompetitors = DEMO_COMPETITOR_PROFILES.filter((profile) =>
    selectedProfile.directCompetitors.includes(profile.id)
  ).slice(0, 3);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Relationship Map</h3>
          <p className="mt-1 text-[11px] text-zinc-500">Exposed deals on the left, selected company in the center, market context on the right.</p>
        </div>
        <StatusChip label="LIVE CONTEXT" variant="wire" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.2fr_0.85fr]">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Linked deals</p>
          {selectedDeals.map((deal) => (
            <Link key={deal.id} href={`${basePath}/deals?deal=${encodeURIComponent(deal.id)}`} className="block rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-3 transition-colors hover:border-zinc-700">
              <p className="text-xs font-medium text-zinc-100">{deal.account}</p>
              <p className="mt-1 text-[10px] text-zinc-500">{deal.stage} / {deal.owner}</p>
            </Link>
          ))}
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-blue-200">Selected company</p>
          <h4 className="mt-2 text-lg font-semibold text-white">{selectedProfile.name}</h4>
          <p className="mt-2 text-sm leading-relaxed text-zinc-100">{selectedProfile.pricingPosition}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{selectedProfile.messagingShift}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedProfile.strategicRisks.map((risk) => (
              <span key={risk} className="rounded-full border border-zinc-800 bg-[#0a0a0a] px-2 py-1 text-[10px] text-zinc-300">{risk}</span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Adjacent context</p>
          {adjacentCompetitors.map((profile) => (
            <button key={profile.id} type="button" onClick={() => onSelectCompetitor(profile.id)} className="block w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-left transition-colors hover:border-zinc-700">
              <p className="text-xs font-medium text-zinc-100">{profile.name}</p>
              <p className="mt-1 text-[10px] text-zinc-500">{profile.segmentOverlap.join(" / ")}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
      <div className="text-zinc-500">{icon}</div>
      <div>
        <div className={`text-xl font-semibold tracking-tight ${accent || "text-white"}`}>{value}</div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function CompetitorCard({
  competitor,
  basePath,
  isDemoSurface,
  isSelected,
  onClick,
}: {
  competitor: {
    name: string;
    domain: string;
    lastScan: string;
    analysisCount: number;
    changesThisWeek: number;
    threatLevel: string;
    score: number;
    proofFiles: string[];
    clashes: string;
    category?: string;
    confidence?: string;
    pricingSignal?: string;
    messagingShift?: string;
    hiringSignal?: string;
    productSignal?: string;
    recommendedAction?: string;
    recentChanges: { page: string; type: string; detail: string; time: string; severity: string; score: number }[];
  };
  basePath: string;
  isDemoSurface: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const threatColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-green-500/10 text-green-400 border-green-500/20",
  };

  return (
    <div
      className={`bg-[#0a0a0a] border rounded-lg overflow-hidden transition-all cursor-pointer ${
        isSelected ? "border-amber-500/50 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]" : "border-zinc-800 hover:border-zinc-700"
      }`}
      onClick={onClick}
    >
      <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-white">
            {competitor.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{competitor.name}</h3>
              <span className={`text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${threatColors[competitor.threatLevel] || threatColors.medium}`}>
                {competitor.threatLevel} threat
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                competitor.score >= 70 ? "bg-green-500/10 text-green-400" :
                competitor.score >= 40 ? "bg-yellow-500/10 text-yellow-400" :
                "bg-red-500/10 text-red-400"
              }`}>{competitor.score}/100</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-zinc-500 font-mono">
              <span>{competitor.domain}</span>
              <span>•</span>
              <span>{competitor.analysisCount} analyses</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {competitor.lastScan}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {competitor.proofFiles.length > 0 && (
            <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {competitor.proofFiles.length} proofs
            </span>
          )}
          <a href={competitor.domain.startsWith("http") ? competitor.domain : `https://${competitor.domain}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {competitor.clashes && (
        <div className="px-5 py-3 border-b border-zinc-800/30 bg-zinc-900/20">
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{competitor.clashes}</p>
        </div>
      )}

      {isDemoSurface ? (
        <div className="grid gap-3 border-b border-zinc-800/30 bg-zinc-950/60 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
          <SignalChip icon={<AlertTriangle className="h-3.5 w-3.5 text-orange-400" />} label="Pricing" value={competitor.pricingSignal || "No pricing signal"} />
          <SignalChip icon={<MessagesSquare className="h-3.5 w-3.5 text-blue-400" />} label="Messaging" value={competitor.messagingShift || "No messaging shift"} />
          <SignalChip icon={<Briefcase className="h-3.5 w-3.5 text-violet-400" />} label="Hiring" value={competitor.hiringSignal || "No hiring signal"} />
          <SignalChip icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />} label="Product" value={competitor.productSignal || "No product signal"} />
          <div className="md:col-span-2 xl:col-span-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-[#0a0a0a] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-500">
              {competitor.category ? <span>{competitor.category}</span> : null}
              {competitor.confidence ? <span>• confidence {competitor.confidence}</span> : null}
              <span>• {competitor.changesThisWeek} notable shifts this week</span>
            </div>
            {competitor.recommendedAction ? (
              <Link href={`${basePath}/deals`} className="text-xs font-medium text-blue-300 hover:text-blue-200">
                {competitor.recommendedAction} →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {competitor.recentChanges.length > 0 ? (
        <div className="divide-y divide-zinc-800/30">
          {competitor.recentChanges.map((change, i) => (
            <ChangeRow key={i} change={change} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-3 text-xs text-zinc-600">No timeline data available.</div>
      )}
    </div>
  );
}

function SignalChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-300">{value}</p>
    </div>
  );
}

function ChangeRow({ change }: { change: { page: string; type: string; detail: string; time: string; severity: string; score: number } }) {
  const typeIcons: Record<string, React.ReactNode> = {
    pricing_change: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
    feature_launch: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />,
    messaging_shift: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    analysis: <Eye className="w-3.5 h-3.5 text-zinc-400" />,
  };

  const typeLabels: Record<string, string> = {
    pricing_change: "Pricing",
    feature_launch: "Feature",
    messaging_shift: "Messaging",
    analysis: "Analysis",
  };

  const severityDots: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-zinc-500",
  };

  return (
    <div className="px-5 py-3 flex items-start gap-4 hover:bg-zinc-900/30 transition-colors group cursor-pointer">
      <div className="mt-0.5 shrink-0">{typeIcons[change.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500">
            {typeLabels[change.type]}
          </span>
          <span className="text-[10px] font-mono text-zinc-600">{change.page}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${severityDots[change.severity]}`} />
        </div>
        <p className="text-sm text-zinc-300 leading-snug">{change.detail}</p>
      </div>
      <div className="text-[10px] font-mono text-zinc-600 shrink-0 mt-0.5">{change.time}</div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
