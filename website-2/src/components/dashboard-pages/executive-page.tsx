"use client";
import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ShieldAlert,
  Target,
  AlertTriangle,
  Download,
  Loader2,
  BarChart3,
  Activity,
} from "lucide-react";
import { useMemory, useWinningPatterns } from "@/lib/hooks";

const CHART_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#8b5cf6", "#22c55e", "#eab308"];

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-zinc-400 font-mono mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-white font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ExecutivePortalPage() {
  const { data: memory, loading: memLoading } = useMemory();
  const { data: patterns, loading: patLoading } = useWinningPatterns();

  const loading = memLoading || patLoading;

  const metrics = useMemo(() => {
    if (!memory) return null;
    const entries = Object.entries(memory);
    const scores = entries.map(([, e]) => e.deal_health_score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highRisk = scores.filter((s) => s < 50).length;
    const totalAnalyses = entries.reduce((sum, [, e]) => sum + (e.timeline?.length || 0), 0);
    return { total: entries.length, avgScore, highRisk, totalAnalyses };
  }, [memory]);

  const winRate = useMemo(() => {
    if (!patterns) return { rate: 0, wins: 0, losses: 0, stalls: 0 };
    const wins = Math.round(patterns.win_rate * patterns.total_outcomes);
    const losses = patterns.total_outcomes - wins;
    const stalls = 0;
    const total = wins + losses + stalls;
    return { rate: total > 0 ? Math.round((wins / total) * 100) : 0, wins, losses, stalls };
  }, [patterns]);

  const landscape = useMemo(() => {
    if (!memory) return [];
    return Object.entries(memory).map(([url, e], i) => ({
      name: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      value: e.deal_health_score || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [memory]);

  const scoreChart = useMemo(() => {
    if (!memory) return [];
    return Object.entries(memory).map(([url, e]) => ({
      name: url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 15),
      score: e.deal_health_score || 0,
    })).sort((a, b) => a.score - b.score);
  }, [memory]);

  const scoreHistory = useMemo(() => {
    if (!memory) return [];
    const all: { ts: string; score: number }[] = [];
    Object.values(memory).forEach((e) => {
      if (e.timeline) {
        e.timeline.forEach((t) => {
          if (t.ts) all.push({ ts: t.ts, score: t.score });
        });
      }
    });
    return all.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()).map((item, i) => ({
      analysis: `#${i + 1}`,
      score: item.score,
    }));
  }, [memory]);

  const execAlerts = useMemo(() => {
    if (!memory) return [];
    const items: { severity: string; title: string; impact: string; time: string }[] = [];
    Object.entries(memory).forEach(([url, e]) => {
      const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const score = e.deal_health_score || 0;
      if (e.clashes_detected) {
        items.push({
          severity: score < 40 ? "critical" : score < 55 ? "high" : score < 70 ? "medium" : "low",
          title: `${name} — Score ${score}/100`,
          impact: e.clashes_detected.slice(0, 80),
          time: e.last_analysis_ts ? timeAgo(e.last_analysis_ts) : "Unknown",
        });
      }
    });
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => (order[a.severity] || 4) - (order[b.severity] || 4));
  }, [memory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 py-20">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        <span className="text-sm text-zinc-500 font-mono">Loading executive intelligence...</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-up">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Executive Portal</h1>
          <p className="text-sm text-zinc-500 mt-1">Board-ready competitive intelligence — live from Oakwell AI</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs font-medium bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded transition-colors">
            <Download className="w-3 h-3" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ExecMetric icon={<Target className="w-4 h-4 text-blue-400" />} title="Competitors" value={String(metrics?.total || 0)} change={`${metrics?.highRisk || 0} high-risk`} positive={(metrics?.highRisk || 0) === 0} subtitle="Under active monitoring" />
        <ExecMetric icon={<Activity className="w-4 h-4 text-green-400" />} title="Win Rate" value={`${winRate.rate}%`} change={`${winRate.wins}W / ${winRate.losses}L`} positive={winRate.rate > 50} subtitle={`${winRate.stalls} stalled`} />
        <ExecMetric icon={<ShieldAlert className="w-4 h-4 text-amber-400" />} title="Avg Health" value={`${metrics?.avgScore || 0}/100`} change={metrics?.avgScore && metrics.avgScore >= 60 ? "Healthy" : "At Risk"} positive={(metrics?.avgScore || 0) >= 60} subtitle="Across all competitors" />
        <ExecMetric icon={<BarChart3 className="w-4 h-4 text-purple-400" />} title="Analyses" value={String(metrics?.totalAnalyses || 0)} change="Total" positive subtitle="Deal intelligence runs" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Health Score History</h3>
            <span className="text-[10px] font-mono text-zinc-500">{scoreHistory.length} data points</span>
          </div>
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={scoreHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="analysis" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Health Score" stroke="#3b82f6" strokeWidth={2} fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-600 text-xs">
              No score history yet — analyze deals to build trend data
            </div>
          )}
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Priority Alerts</h3>
          </div>
          <div className="divide-y divide-zinc-800/30">
            {execAlerts.length === 0 && (
              <div className="px-5 py-6 text-center text-xs text-zinc-600">No alerts — intelligence clean</div>
            )}
            {execAlerts.map((alert, i) => {
              const colors: Record<string, string> = {
                critical: "bg-red-500",
                high: "bg-orange-500",
                medium: "bg-green-500",
                low: "bg-zinc-500",
              };

              return (
                <div key={i} className="px-5 py-4 flex gap-3 items-start">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors[alert.severity] || colors.low}`} />
                  <div>
                    <p className="text-sm text-zinc-200">{alert.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{alert.impact}</p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-1.5">{alert.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Competitor Landscape</h3>
          {landscape.length > 0 ? (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={landscape} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} strokeWidth={0}>
                    {landscape.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {landscape.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-zinc-400 flex-1 truncate">{item.name}</span>
                    <span className="text-xs font-mono text-zinc-300">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-zinc-600 text-xs">No competitor data yet</div>
          )}
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Score Distribution</h3>
          {scoreChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                  {scoreChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-zinc-600 text-xs">No distribution yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecMetric({ icon, title, value, change, positive, subtitle }: { icon: React.ReactNode; title: string; value: string; change: string; positive: boolean; subtitle: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-zinc-500">{icon}</div>
        <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${positive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {change}
        </div>
      </div>
      <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
      <div className="text-xs text-zinc-400 mt-1">{title}</div>
      <div className="text-[10px] text-zinc-600 mt-1">{subtitle}</div>
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
