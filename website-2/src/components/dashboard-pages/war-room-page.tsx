"use client";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Crosshair,
  ShieldCheck,
  Loader2,
  Play,
  RefreshCw,
  Radar,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";
import { useMemory, useWinningPatterns, useSentinelStatus, useStorageStatus } from "@/lib/hooks";
import { useDashboardSurface } from "@/components/dashboard-shell";
import { DashboardEmptyState, DashboardErrorBanner, DashboardLoadingState } from "@/components/dashboard-state";
import {
  DEMO_ACTIVE_SCANS,
  DEMO_ALERT_DETAILS,
  DEMO_COMMAND_CENTER_CHANGES,
  DEMO_COMPETITOR_PROFILES,
  DEMO_DEAL_WORKSPACE,
  DEMO_MEMORY,
  DEMO_MOVEMENT_TICKER,
  DEMO_WAR_ROOM_FEED,
  DEMO_WATCHLIST_SUMMARY,
  DEMO_WHY_IT_MATTERS,
} from "@/lib/demo-data";
import { AnimatedCounter, LiveBadge, MiniSparkline, StatusChip, TickingClock } from "@/components/ui/live-indicators";
import { ActionListPanel, EvidenceListPanel, WorkflowBar } from "@/components/ui/demo-terminal-primitives";

export default function WarRoomPage() {
  const { triggerScan, liveOperations, connected, lastSync } = useWebSocket();
  const { data: memory, loading: memLoading, error: memError, refresh: refreshMemory } = useMemory();
  const { data: patterns } = useWinningPatterns();
  const { data: sentinel } = useSentinelStatus();
  const { data: storageStatus, refresh: refreshStorageStatus } = useStorageStatus();
  const { basePath, isDemoSurface } = useDashboardSurface();
  const [selectedGraphNode, setSelectedGraphNode] = useState(DEMO_COMPETITOR_PROFILES[0]?.id || "gong");

  const metrics = useMemo(() => {
    if (!memory) return null;
    const entries = Object.entries(memory);
    const scores = entries.map(([, e]) => e.deal_health_score).filter(Boolean);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const totalAnalyses = entries.reduce((s, [, e]) => s + (e.analysis_count || 0), 0);
    const riskyDeals = entries.filter(([, e]) => e.deal_health_score < 50);
    return { avgScore, totalAnalyses, competitorCount: entries.length, riskyDeals, entries };
  }, [memory]);

  const feedItems = useMemo(() => {
    if (isDemoSurface) {
      return DEMO_WAR_ROOM_FEED;
    }
    if (!memory) return [];
    const items: { time: string; title: string; desc: string; severity: "high" | "medium" | "low"; url: string }[] = [];
    Object.entries(memory).forEach(([url, entry]) => {
      const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (entry.timeline && entry.timeline.length > 0) {
        const latest = entry.timeline[entry.timeline.length - 1];
        items.push({
          time: latest.ts ? new Date(latest.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
          title: `${name} — Score ${latest.score}/100`,
          desc: latest.top_clash || entry.clashes_detected?.slice(0, 120) || "Monitoring active",
          severity: latest.score < 40 ? "high" : latest.score < 65 ? "medium" : "low",
          url,
        });
      }
    });
    return items.sort((a, b) => (a.severity === "high" ? -1 : b.severity === "high" ? 1 : 0)).slice(0, 10);
  }, [memory]);

  const commandMetrics = isDemoSurface
    ? [
        { title: "ARR Defended", value: "$3.8M", trend: "↑ 14%", trendType: "good" as const, subtitle: "Active influenced pipeline", sparkData: [2.1, 2.5, 2.8, 3.1, 3.4, 3.8], href: `${basePath}/executive` },
        { title: "Pipeline at Risk", value: "$1.24M", trend: "5 deals", trendType: "bad" as const, subtitle: "Needs counter-positioning now", sparkData: [0.4, 0.5, 0.7, 0.9, 1.1, 1.24], href: `${basePath}/forecast` },
        { title: "Proof Coverage", value: "87%", trend: "31 artifacts", trendType: "good" as const, subtitle: "Field-ready evidence attached", sparkData: [52, 61, 68, 74, 80, 87], href: `${basePath}/deals` },
        { title: "Live Operations", value: "3", trend: "Sentinel", trendType: "neutral" as const, subtitle: "Scans and briefs running", sparkData: undefined, href: `${basePath}/targets` },
      ]
    : [
        { title: "Competitors Tracked", value: metrics ? metrics.competitorCount.toString() : "—", trend: sentinel ? `${sentinel.watched_urls} URLs` : "", trendType: "neutral" as const, subtitle: "In Neural Memory Bank", sparkData: undefined, href: undefined },
        { title: "Win Rate", value: patterns ? `${Math.round(patterns.win_rate * 100)}%` : "—", trend: patterns && patterns.total_outcomes > 0 ? `${patterns.total_outcomes} outcomes` : "", trendType: "good" as const, subtitle: patterns ? `$${Math.round(patterns.deal_value_won / 1000)}K won` : "No data yet", sparkData: undefined, href: undefined },
        { title: "Avg Health Score", value: metrics ? `${metrics.avgScore}/100` : "—", trend: metrics && metrics.avgScore >= 60 ? "Healthy" : metrics && metrics.avgScore > 0 ? "At Risk" : "", trendType: (metrics && metrics.avgScore >= 60 ? "good" : "bad") as "good" | "bad", subtitle: "Across all deals", sparkData: undefined, href: undefined },
        { title: "Total Analyses", value: metrics ? metrics.totalAnalyses.toString() : "—", trend: patterns ? `${patterns.winning_strategies.length} playbooks` : "", trendType: "neutral" as const, subtitle: "Agents deployed", sparkData: undefined, href: undefined },
      ];

  const selectedProfile = DEMO_COMPETITOR_PROFILES.find((profile) => profile.id === selectedGraphNode) || DEMO_COMPETITOR_PROFILES[0];
  const selectedDeals = DEMO_DEAL_WORKSPACE.filter((deal) => deal.competitorId === selectedProfile.id);
  const selectedAlerts = DEMO_ALERT_DETAILS.filter((alert) => alert.competitorId === selectedProfile.id);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* HEADER — denser, with live badges */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white tracking-tight">The War Room</h1>
              <LiveBadge label="LIVE" color="green" />
              {isDemoSurface && <StatusChip label="6 SOURCES" variant="wire" />}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Live Competitive Intelligence & Deal Pacing</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshMemory}
            disabled={memLoading}
            className="flex items-center gap-1.5 text-[11px] font-medium bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${memLoading ? "animate-spin" : ""}`} /> Refresh
          </button>

          <button
            onClick={() => triggerScan("All Competitors")}
            disabled={liveOperations.some((o) => o.type === "scan")}
            className="flex items-center gap-1.5 text-[11px] font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors text-white px-2.5 py-1 rounded"
          >
            {liveOperations.some((o) => o.type === "scan") ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Run Scan
              </>
            )}
          </button>

          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono bg-zinc-900/50 px-2.5 py-1 rounded border border-zinc-800">
            <div className={`flex items-center gap-1.5 ${connected ? "text-green-500" : "text-red-500"}`}>
              <span className="relative flex h-1.5 w-1.5">
                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connected ? "bg-green-500" : "bg-red-500"}`}></span>
              </span>
              {connected ? "SYSTEM NORMAL" : "CONNECTING"}
            </div>
            <span className="text-zinc-600">|</span>
            <TickingClock className="text-zinc-400" />
          </div>
        </div>
      </div>

      {memError ? (
        <DashboardErrorBanner
          title="Oakwell memory bank is unavailable"
          message={`${memError}. The War Room only reflects durable backend memory, so Oakwell is surfacing the storage issue instead of showing a misleading reset.`}
          actionLabel="Retry"
          onAction={refreshMemory}
        />
      ) : null}

      {!memError && storageStatus && storageStatus.persistence_ready === false ? (
        <DashboardErrorBanner
          title="Backend online, but durable memory is unavailable"
          message={[
            storageStatus.persistence_reason || "Firestore storage is unavailable.",
            storageStatus.firestore_project
              ? `Project: ${storageStatus.firestore_project}`
              : "",
            storageStatus.firestore_project_source
              ? `Source: ${storageStatus.firestore_project_source}`
              : "",
          ].filter(Boolean).join(" ")}
          actionLabel="Re-check storage"
          onAction={refreshStorageStatus}
        />
      ) : null}

      {memLoading && !memory ? (
        <DashboardLoadingState
          icon={Loader2}
          title="Connecting to Oakwell Engine"
          message="Pulling memory, live watch status, and recent competitive signals so the War Room reflects the current market picture."
        />
      ) : null}

      {isDemoSurface ? (
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#0d111a] via-[#090909] to-[#050505] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-blue-400">Global movement ticker</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Competitive pressure is live across pricing, messaging, and launch activity.</h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
              <Radar className="h-3.5 w-3.5 text-blue-400" />
              Oakwell demo universe synchronized
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {DEMO_MOVEMENT_TICKER.map((item) => (
              <Link
                key={`${item.competitor}-${item.signal}`}
                href={`${basePath}/alerts`}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  item.tone === "critical"
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : item.tone === "high"
                      ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
                      : item.tone === "medium"
                        ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300"
                }`}
              >
                <span className="font-semibold">{item.competitor}</span>
                <span className="mx-2 text-zinc-500">/</span>
                {item.signal}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {commandMetrics.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
            trendType={metric.trendType}
            subtitle={metric.subtitle}
            sparkData={metric.sparkData}
            href={metric.href}
          />
        ))}
      </div>

      {/* BLOOMBERG-STYLE COMPETITOR SCORE STRIP */}
      {isDemoSurface && (
        <div className="rounded-lg border border-zinc-800 bg-[#08090d] overflow-x-auto">
          <div className="flex items-stretch min-w-max divide-x divide-zinc-800">
            <div className="flex items-center px-3 gap-1.5 shrink-0 bg-zinc-900/50">
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">INTEL</span>
            </div>
            {[
              { name: "GONG", score: 72, delta: "+4", dir: "up" as const, deals: 3 },
              { name: "CLARI", score: 58, delta: "-3", dir: "down" as const, deals: 2 },
              { name: "CHORUS", score: 38, delta: "-11", dir: "down" as const, deals: 1 },
              { name: "SALESLOFT", score: 65, delta: "+2", dir: "up" as const, deals: 2 },
              { name: "OUTREACH", score: 81, delta: "+7", dir: "up" as const, deals: 4 },
              { name: "MINDTICKLE", score: 44, delta: "-6", dir: "down" as const, deals: 1 },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900/40 transition-colors cursor-pointer group">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 tracking-widest block">{c.name}</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className={`text-sm font-mono font-bold ${
                      c.score >= 70 ? "text-green-400" : c.score >= 50 ? "text-amber-400" : "text-red-400"
                    }`}>{c.score}</span>
                    <span className="text-[9px] font-mono text-zinc-600">/100</span>
                    <span className={`text-[9px] font-mono font-semibold ${c.dir === "up" ? "text-green-500" : "text-red-500"}`}>
                      {c.dir === "up" ? "▲" : "▼"}{c.delta}
                    </span>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-zinc-600 border-l border-zinc-800 pl-3">
                  <span className="block text-zinc-500">{c.deals} deals</span>
                  <span className="block">at risk</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDemoSurface ? (
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <WarRoomExposureMap
            basePath={basePath}
            selectedProfile={selectedProfile}
            selectedDeals={selectedDeals}
            selectedAlerts={selectedAlerts}
            onSelectCompetitor={setSelectedGraphNode}
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Watchlist Summary</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">Live monitoring across competitors, segments, and at-risk deals.</p>
                </div>
                <Crosshair className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <WatchMetric label="Tracked competitors" value={DEMO_WATCHLIST_SUMMARY.trackedCompetitors} />
                <WatchMetric label="Tracked segments" value={DEMO_WATCHLIST_SUMMARY.trackedSegments} />
                <WatchMetric label="Deals at risk" value={DEMO_WATCHLIST_SUMMARY.dealsAtRisk} tone="alert" />
                <WatchMetric label="Changes in 24h" value={DEMO_WATCHLIST_SUMMARY.changes24h} tone="live" />
                <WatchMetric label="Changes in 7d" value={DEMO_WATCHLIST_SUMMARY.changes7d} />
                <WatchMetric label="Exec risks" value={DEMO_WATCHLIST_SUMMARY.executiveRisks} tone="critical" />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">What Changed Today</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">No dead-end summaries. Each item routes to the next operating surface.</p>
                </div>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-4 space-y-2">
                {DEMO_COMMAND_CENTER_CHANGES.map((item) => (
                  <Link key={item.title} href={`${basePath}${item.href}`} className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 transition-colors hover:border-zinc-700">
                    <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{item.detail}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDemoSurface ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            <EvidenceListPanel
              title={`${selectedProfile.name} Evidence`}
              subtitle={`Why Oakwell believes the current posture. ${selectedProfile.sourceCount} sources · ${selectedProfile.freshness} · ${selectedProfile.confidence}`}
              items={selectedProfile.evidence}
            />
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Truth Pane</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">What is true right now across segment overlap, sentiment, and strategic risk.</p>
                </div>
                <Shield className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <TruthList title="Segments" items={selectedProfile.segmentOverlap} />
                <TruthList title="Review Themes" items={selectedProfile.reviewThemes} />
                <TruthList title="Strategic Risks" items={selectedProfile.strategicRisks} />
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Why Oakwell believes this</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{selectedProfile.pricingPosition} {selectedProfile.messagingShift}</p>
                  <p className="mt-2 text-[10px] text-zinc-500">Sentiment: {selectedProfile.sentiment}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <ActionListPanel
              title="Action Pane"
              subtitle="What to do next with this competitor across live deals and executive workflows."
              items={[
                selectedProfile.recommendedAction,
                ...selectedDeals.slice(0, 3).map((deal) => `${deal.account}: ${deal.nextAction}`),
              ]}
            />
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Linked Deals</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">Every risk traces to an active motion, owner, and next action.</p>
                </div>
                <LiveBadge count={selectedDeals.length} label="" color="blue" />
              </div>
              <div className="mt-4 space-y-2">
                {selectedDeals.map((deal) => (
                  <Link key={deal.id} href={`${basePath}/deals?deal=${encodeURIComponent(deal.id)}`} className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 transition-colors hover:border-zinc-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-zinc-200">{deal.account}</p>
                      <span className="text-[10px] font-mono text-zinc-500">{deal.stage}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">{deal.owner} · {Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(deal.arr)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-300">{deal.truthSummary}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-4">
                <WorkflowBar
                  actions={[
                    { label: "Open competitor profile", href: `${basePath}/targets?competitor=${encodeURIComponent(selectedProfile.id)}`, tone: "info" },
                    { label: "Open evidence", href: `${basePath}/alerts?competitor=${encodeURIComponent(selectedProfile.id)}`, tone: "live" },
                    { label: "Mark for exec review", href: `${basePath}/executive?competitor=${encodeURIComponent(selectedProfile.id)}`, tone: "critical" },
                    { label: "Push to Slack", tone: "alert" },
                  ]}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Priority Alerts</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">Directly linked to this competitor and its active deals.</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-orange-400" />
              </div>
              <div className="mt-4 space-y-2">
                {selectedAlerts.map((alert) => (
                  <Link key={alert.id} href={`${basePath}/alerts?alert=${encodeURIComponent(alert.id)}`} className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 transition-colors hover:border-zinc-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-zinc-200">{alert.title}</p>
                      <StatusChip label={alert.severity.toUpperCase()} variant={alert.severity === "critical" ? "critical" : alert.severity === "high" ? "alert" : "info"} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{alert.whyOakwellBelieves}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDemoSurface ? (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Why this matters now</h2>
                <p className="mt-1 text-xs text-zinc-500">Crisp narrative framing for your VibeCon walkthrough.</p>
              </div>
              <Sparkles className="h-4 w-4 text-blue-400" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {DEMO_WHY_IT_MATTERS.map((item) => (
                <Link
                  key={item.title}
                  href={`${basePath}${item.href}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.title}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{item.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{item.detail}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-300">
                    Open view <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Active scans</h2>
              <span className="text-[10px] font-mono text-zinc-500">3 live pipelines</span>
            </div>
            <div className="space-y-3">
              {DEMO_ACTIVE_SCANS.map((scan) => (
                <div key={scan.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{scan.label}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{scan.owner}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${
                      scan.status === "live"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : scan.status === "queued"
                          ? "bg-blue-500/10 text-blue-300"
                          : "bg-amber-500/10 text-amber-300"
                    }`}>
                      {scan.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-400">{scan.progress}</p>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>ETA {scan.eta}</span>
                    <span>Oakwell operator loop</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Deal Intelligence</h2>
              <LiveBadge count={isDemoSurface ? 6 : (metrics?.entries.length || 0)} label="" color="blue" />
            </div>
            <Link href={`${basePath}/deals`} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">View All →</Link>
          </div>

          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="py-2 px-3 text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Competitor</th>
                  <th className="py-2 px-3 text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Health</th>
                  <th className="py-2 px-3 text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Trend</th>
                  <th className="py-2 px-3 text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Analyses</th>
                  <th className="py-2 px-3 text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {isDemoSurface ? (
                  Object.entries(DEMO_MEMORY).slice(0, 6).map(([url, entry]) => {
                    const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                    const score = entry.deal_health_score || 0;
                    const risk = score < 40 ? "CRITICAL" : score < 55 ? "HIGH" : score < 70 ? "MEDIUM" : "LOW";
                    const riskVariant = score < 40 ? "critical" : score < 55 ? "alert" : score < 70 ? "info" : "live";
                    return (
                      <tr key={url} className="hover:bg-zinc-900/50 transition-colors group cursor-pointer">
                        <td className="py-2 px-3">
                          <div className="text-xs font-medium text-zinc-200">{name}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs font-mono font-semibold ${score >= 70 ? "text-green-400" : score >= 55 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400"}`}>{score}</span>
                        </td>
                        <td className="py-2 px-3">
                          <MiniSparkline data={entry.score_history || []} width={56} height={18} />
                        </td>
                        <td className="py-2 px-3 text-xs text-zinc-400 font-mono">{entry.analysis_count}</td>
                        <td className="py-2 px-3">
                          <StatusChip label={risk} variant={riskVariant as "critical" | "alert" | "info" | "live"} />
                        </td>
                      </tr>
                    );
                  })
                ) : metrics && metrics.entries.length > 0 ? (
                  metrics.entries.slice(0, 8).map(([url, entry]) => {
                    const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                    const score = entry.deal_health_score || 0;
                    const risk = score < 40 ? "High" : score < 65 ? "Medium" : "Low";
                    return (
                      <TableRow
                        key={url}
                        account={name}
                        rep={`${entry.analysis_count || 0} runs`}
                        amount={`${score}/100`}
                        stage={entry.last_analysis_ts ? new Date(entry.last_analysis_ts).toLocaleDateString() : "—"}
                        risk={risk}
                        riskReason={entry.clashes_detected?.slice(0, 150) || "No issues detected"}
                      />
                    );
                  })
                ) : !memLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-zinc-600">
                      No deals analyzed yet. <Link href={`${basePath}/deals`} className="text-blue-400 underline">Open Deal Desk</Link>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orange-500" />
                Sentinel Feed
              </h2>
              <LiveBadge count={feedItems.length} label="" color="orange" />
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-3 space-y-2.5 h-[320px] overflow-y-auto">
            {feedItems.length > 0 ? feedItems.map((item, i) => (
              <FeedItem
                key={("id" in item && item.id) || i}
                time={item.time}
                title={item.title}
                desc={item.desc}
                severity={item.severity}
                href={("href" in item && item.href) ? `${basePath}${item.href}` : undefined}
              />
            )) : !memLoading ? (
              <DashboardEmptyState
                icon={Activity}
                eyebrow={isDemoSurface ? "Demo intelligence" : "Production intelligence"}
                title="No live intelligence has landed yet"
                message="Run a competitive analysis in Deal Desk and Oakwell will start filling this feed with score shifts, clash summaries, and watchtower updates."
                ctaHref={`${basePath}/deals`}
                ctaLabel="Open Deal Desk"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function WarRoomExposureMap({
  basePath,
  selectedProfile,
  selectedDeals,
  selectedAlerts,
  onSelectCompetitor,
}: {
  basePath: string;
  selectedProfile: (typeof DEMO_COMPETITOR_PROFILES)[number];
  selectedDeals: (typeof DEMO_DEAL_WORKSPACE)[number][];
  selectedAlerts: (typeof DEMO_ALERT_DETAILS)[number][];
  onSelectCompetitor: (competitorId: string) => void;
}) {
  const adjacentCompetitors = DEMO_COMPETITOR_PROFILES.filter((profile) =>
    selectedProfile.directCompetitors.includes(profile.id)
  ).slice(0, 3);

  const keyEvidence = selectedProfile.evidence.slice(0, 3);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Relationship Exposure Map</h3>
          <p className="mt-1 text-[11px] text-zinc-500">
            Center threat in the middle, exposed deals on the left, market context on the right, and proof plus triggers underneath.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <span>MIDDLE = THREAT</span>
          <span>/</span>
          <span>LEFT = DEALS</span>
          <span>/</span>
          <span>RIGHT = MARKET</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {DEMO_COMPETITOR_PROFILES.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onSelectCompetitor(profile.id)}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
              selectedProfile.id === profile.id
                ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {profile.name}
          </button>
        ))}
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-[linear-gradient(180deg,#090b10,#060606)] p-4">
        <div className="hidden xl:block absolute left-[24%] right-[24%] top-[120px] h-px bg-zinc-800" />
        <div className="hidden xl:block absolute left-1/2 top-[160px] h-[110px] w-px -translate-x-1/2 bg-zinc-800" />

        <div className="grid gap-4 xl:grid-cols-[0.88fr_1.24fr_0.88fr] xl:items-start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Accounts Exposed</p>
              <StatusChip label={`${selectedDeals.length} DEALS`} variant="alert" />
            </div>
            {selectedDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`${basePath}/deals?deal=${encodeURIComponent(deal.id)}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-100">{deal.account}</p>
                  <span className="text-[10px] font-mono text-zinc-500">{deal.stage}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(deal.arr)} / {deal.owner}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{deal.truthSummary}</p>
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 shadow-[0_0_30px_rgba(59,130,246,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-blue-200">Selected Threat</p>
                  <h4 className="mt-2 text-xl font-semibold text-white">{selectedProfile.name}</h4>
                  <p className="mt-1 text-[11px] text-blue-100/70">{selectedProfile.domain} / {selectedProfile.confidence} / {selectedProfile.sourceCount} sources</p>
                </div>
                <StatusChip label={`${selectedProfile.linkedDeals.length} LINKED`} variant="wire" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-blue-500/20 bg-[#09111f] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">What changed</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-100">{selectedProfile.pricingPosition}</p>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-[#09111f] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Why it matters</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-100">{selectedProfile.messagingShift}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedProfile.strategicRisks.map((risk) => (
                  <span key={risk} className="rounded-full border border-zinc-800 bg-[#0a0a0a] px-2 py-1 text-[10px] text-zinc-300">
                    {risk}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Operator readout</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{selectedProfile.recommendedAction}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Market Context</p>
              <StatusChip label={`${adjacentCompetitors.length} PEERS`} variant="info" />
            </div>
            {adjacentCompetitors.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelectCompetitor(profile.id)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-left transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-100">{profile.name}</p>
                  <span className="text-[10px] font-mono text-zinc-500">{profile.confidence}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">{profile.segmentOverlap.join(" / ")}</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{profile.pricingPosition}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Source Proof</p>
              <StatusChip label={`${keyEvidence.length} ITEMS`} variant="live" />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {keyEvidence.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.source}</p>
                  <p className="mt-2 text-xs font-medium text-zinc-100">{item.label}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{item.summary}</p>
                  <p className="mt-2 text-[10px] font-mono text-zinc-500">{item.freshness} / {item.confidence}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Live Triggers</p>
              <StatusChip label={`${selectedAlerts.length} ALERTS`} variant="alert" />
            </div>
            <div className="mt-3 space-y-2">
              {selectedAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={`${basePath}/alerts?alert=${encodeURIComponent(alert.id)}`}
                  className="block rounded-lg border border-zinc-800 bg-[#0a0a0a] px-3 py-3 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-zinc-100">{alert.title}</p>
                    <StatusChip label={alert.severity.toUpperCase()} variant={alert.severity === "critical" ? "critical" : alert.severity === "high" ? "alert" : "info"} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{alert.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, trendType, subtitle, sparkData, href }: { title: string; value: string; trend: string; trendType: "good" | "bad" | "neutral"; subtitle: string; sparkData?: number[]; href?: string }) {
  const isGood = trendType === "good";
  const isBad = trendType === "bad";

  const content = (
    <>
      <div className="flex justify-between items-start mb-1.5">
        <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{title}</h3>
        <span className={`text-[9px] flex items-center gap-0.5 font-mono ${
          isGood ? "text-green-500 bg-green-500/10" :
          isBad ? "text-red-500 bg-red-500/10" :
          "text-zinc-400 bg-zinc-800"
        } px-1.5 py-0.5 rounded`}>
          {isGood && <ArrowUpRight size={9} />}
          {isBad && <ArrowDownRight size={9} />}
          {trend}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-semibold text-white tracking-tight">{value}</div>
          <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{subtitle}</div>
        </div>
        {sparkData && <MiniSparkline data={sparkData} width={52} height={22} color={isGood ? "#22c55e" : isBad ? "#ef4444" : "#3b82f6"} />}
      </div>
    </>
  );

  return (
    href ? (
      <Link href={href} className="bg-gradient-to-br from-[#0c0c0c] to-[#080808] border border-zinc-800 rounded-lg p-4 flex flex-col justify-between group hover:border-zinc-700 transition-colors relative overflow-hidden">
        {content}
      </Link>
    ) : (
      <div className="bg-gradient-to-br from-[#0c0c0c] to-[#080808] border border-zinc-800 rounded-lg p-4 flex flex-col justify-between group hover:border-zinc-700 transition-colors relative overflow-hidden">
        {content}
      </div>
    )
  );
}

function WatchMetric({ label, value, tone }: { label: string; value: number; tone?: "critical" | "alert" | "live" }) {
  const text = tone === "critical" ? "text-red-300" : tone === "alert" ? "text-orange-300" : tone === "live" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${text}`}>{value}</p>
    </div>
  );
}

function TruthList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="text-xs text-zinc-300">{item}</div>
        ))}
      </div>
    </div>
  );
}

function TableRow({ account, rep, amount, stage, risk, riskReason }: { account: string; rep: string; amount: string; stage: string; risk: string; riskReason: string }) {
  const isHighRisk = risk === "High";
  return (
    <tr className="hover:bg-zinc-900/50 transition-colors group cursor-pointer">
      <td className="py-3 px-4">
        <div className="font-medium text-sm text-zinc-200">{account}</div>
        <div className="text-[10px] text-zinc-500">Rep: {rep}</div>
      </td>
      <td className="py-3 px-4 text-sm text-zinc-300 font-mono">{amount}</td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
          {stage}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-start gap-2">
          {!isHighRisk && <Crosshair className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />}
          {isHighRisk && <Activity className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
          <div>
            <div className={`text-xs font-medium ${isHighRisk ? "text-red-400" : "text-yellow-400"}`}>
              {risk} Risk
            </div>
            <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5 group-hover:line-clamp-none transition-all">
              {riskReason}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function FeedItem({
  time,
  title,
  desc,
  severity,
  href,
}: {
  time: string;
  title: string;
  desc: string;
  severity: "high" | "medium" | "low" | "critical";
  href?: string;
}) {
  const dot = severity === "critical" ? "bg-red-500" : severity === "high" ? "bg-orange-500" : severity === "medium" ? "bg-blue-500" : "bg-green-500";
  const content = (
    <div className="flex gap-3">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-zinc-200">{title}</p>
          <span className="shrink-0 text-[10px] font-mono text-zinc-500">{time}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
      </div>
    </div>
  );

  if (!href) {
    return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">{content}</div>;
  }

  return (
    <Link href={href} className="block rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70">
      {content}
    </Link>
  );
}
