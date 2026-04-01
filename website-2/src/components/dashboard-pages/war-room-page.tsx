"use client";
import Link from "next/link";
import React, { useMemo } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Crosshair,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";
import { useMemory, useWinningPatterns, useSentinelStatus } from "@/lib/hooks";
import { useDashboardSurface } from "@/components/dashboard-shell";
import { DashboardEmptyState, DashboardErrorBanner, DashboardLoadingState } from "@/components/dashboard-state";

export default function WarRoomPage() {
  const { triggerScan, liveOperations, connected, lastSync } = useWebSocket();
  const { data: memory, loading: memLoading, error: memError, refresh: refreshMemory } = useMemory();
  const { data: patterns } = useWinningPatterns();
  const { data: sentinel } = useSentinelStatus();
  const { basePath, isDemoSurface } = useDashboardSurface();
  const lastSyncLabel = lastSync
    ? lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "...";

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

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">The War Room</h1>
          <p className="text-sm text-zinc-500 mt-1">Live Competitive Intelligence & Deal Pacing</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshMemory}
            disabled={memLoading}
            className="flex items-center gap-1.5 text-xs font-medium bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${memLoading ? "animate-spin" : ""}`} /> Refresh
          </button>

          <button
            onClick={() => triggerScan("All Competitors")}
            disabled={liveOperations.some((o) => o.type === "scan")}
            className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors text-white px-3 py-1.5 rounded"
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

          <div className="hidden md:flex items-center gap-4 text-xs font-mono bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800">
            <div className={`flex items-center gap-2 ${connected ? "text-green-500" : "text-red-500"}`}>
              <span className="relative flex h-2 w-2">
                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-green-500" : "bg-red-500"}`}></span>
              </span>
              {connected ? "SYSTEM NORMAL" : "CONNECTING"}
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">LAST SYNC: {lastSyncLabel}</span>
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

      {memLoading && !memory ? (
        <DashboardLoadingState
          icon={Loader2}
          title="Connecting to Oakwell Engine"
          message="Pulling memory, live watch status, and recent competitive signals so the War Room reflects the current market picture."
        />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Competitors Tracked"
          value={metrics ? metrics.competitorCount.toString() : "—"}
          trend={sentinel ? `${sentinel.watched_urls} URLs` : ""}
          trendType="neutral"
          subtitle="In Neural Memory Bank"
        />
        <MetricCard
          title="Win Rate"
          value={patterns ? `${Math.round(patterns.win_rate * 100)}%` : "—"}
          trend={patterns && patterns.total_outcomes > 0 ? `${patterns.total_outcomes} outcomes` : ""}
          trendType="good"
          subtitle={patterns ? `$${Math.round(patterns.deal_value_won / 1000)}K won` : "No data yet"}
        />
        <MetricCard
          title="Avg Health Score"
          value={metrics ? `${metrics.avgScore}/100` : "—"}
          trend={metrics && metrics.avgScore >= 60 ? "Healthy" : metrics && metrics.avgScore > 0 ? "At Risk" : ""}
          trendType={metrics && metrics.avgScore >= 60 ? "good" : "bad"}
          subtitle="Across all deals"
        />
        <MetricCard
          title="Total Analyses"
          value={metrics ? metrics.totalAnalyses.toString() : "—"}
          trend={patterns ? `${patterns.winning_strategies.length} playbooks` : ""}
          trendType="neutral"
          subtitle="Agents deployed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Deal Intelligence</h2>
            <Link href={`${basePath}/deals`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View All Deals →</Link>
          </div>

          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Competitor</th>
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Health</th>
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Analyses</th>
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">AI Risk Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {metrics && metrics.entries.length > 0 ? (
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
                    <td colSpan={4} className="py-8 text-center text-sm text-zinc-600">
                      No deals analyzed yet. Go to <Link href={`${basePath}/deals`} className="text-blue-400 underline">Deal Desk</Link> to run your first analysis.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              Sentinel Live Feed
            </h2>
          </div>

          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4 space-y-4 h-[320px] overflow-y-auto">
            {feedItems.length > 0 ? feedItems.map((item, i) => (
              <FeedItem key={i} time={item.time} title={item.title} desc={item.desc} severity={item.severity} />
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

function MetricCard({ title, value, trend, trendType, subtitle }: { title: string; value: string; trend: string; trendType: "good" | "bad" | "neutral"; subtitle: string }) {
  const isGood = trendType === "good";
  const isBad = trendType === "bad";

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5 flex flex-col justify-between group hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xs font-medium text-zinc-500">{title}</h3>
        <span className={`text-[10px] flex items-center gap-1 font-mono ${
          isGood ? "text-green-500 bg-green-500/10" :
          isBad ? "text-red-500 bg-red-500/10" :
          "text-zinc-400 bg-zinc-800"
        } px-1.5 py-0.5 rounded`}>
          {isGood && <ArrowUpRight size={10} />}
          {isBad && <ArrowDownRight size={10} />}
          {!isGood && !isBad && "-"}
          {trend}
        </span>
      </div>
      <div>
        <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
        <div className="text-[10px] text-zinc-500 mt-1 truncate">{subtitle}</div>
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

function FeedItem({ time, title, desc, severity }: { time: string; title: string; desc: string; severity: "high" | "medium" | "low" }) {
  return (
    <div className="flex gap-3 items-start border-l-2 pl-3 pb-4 border-zinc-800 last:border-transparent last:pb-0 relative">
      <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border border-[#0a0a0a] ${
        severity === "high" ? "bg-red-500" :
        severity === "medium" ? "bg-orange-500" :
        "bg-blue-500"
      }`} />
      <div className="w-12 shrink-0 pt-0.5">
        <span className="text-[9px] font-mono text-zinc-600">{time}</span>
      </div>
      <div>
        <h4 className="text-xs font-medium text-zinc-300 leading-tight">{title}</h4>
        <p className="text-[10px] text-zinc-500 mt-1 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
