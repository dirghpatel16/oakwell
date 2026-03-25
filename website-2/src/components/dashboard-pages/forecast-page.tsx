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
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingDown, ArrowUpRight, Loader2 } from "lucide-react";
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

export default function ForecastPage() {
  const { data: memory, loading: memLoading } = useMemory();
  const { data: patterns, loading: patLoading } = useWinningPatterns();

  const loading = memLoading || patLoading;

  const scoreDistribution = useMemo(() => {
    if (!memory) return [];
    return Object.entries(memory).map(([url, e], i) => ({
      name: url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 15),
      score: e.deal_health_score || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })).sort((a, b) => a.score - b.score);
  }, [memory]);

  const scoreTrend = useMemo(() => {
    if (!memory) return [];
    const all: { ts: string; score: number }[] = [];
    Object.values(memory).forEach((e) => {
      if (e.timeline) {
        e.timeline.forEach((t) => {
          if (t.ts) all.push({ ts: t.ts, score: t.score });
        });
      }
    });
    return all
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      .map((item, i) => ({ analysis: `#${i + 1}`, score: item.score }));
  }, [memory]);

  const riskBreakdown = useMemo(() => {
    if (!memory) return [];
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    Object.values(memory).forEach((e) => {
      const s = e.deal_health_score || 0;
      if (s < 40) critical++;
      else if (s < 55) high++;
      else if (s < 70) medium++;
      else low++;
    });
    return [
      { reason: "Critical (<40)", value: critical, color: "#ef4444" },
      { reason: "High (40-54)", value: high, color: "#f97316" },
      { reason: "Medium (55-69)", value: medium, color: "#eab308" },
      { reason: "Low (70+)", value: low, color: "#22c55e" },
    ].filter((r) => r.value > 0);
  }, [memory]);

  const metrics = useMemo(() => {
    if (!memory) return { total: 0, avgScore: 0, riskCount: 0, analyses: 0 };
    const entries = Object.values(memory);
    const scores = entries.map((e) => e.deal_health_score || 0);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const risk = scores.filter((s) => s < 55).length;
    const analyses = entries.reduce((sum, e) => sum + (e.timeline?.length || 0), 0);
    return { total: entries.length, avgScore: avg, riskCount: risk, analyses };
  }, [memory]);

  const winRate = useMemo(() => {
    if (!patterns) return 0;
    return patterns.total_outcomes > 0 ? Math.round(patterns.win_rate * 100) : 0;
  }, [patterns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 py-20">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        <span className="text-sm text-zinc-500 font-mono">Loading forecast data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Competitive Forecast</h1>
          <p className="text-sm text-zinc-500 mt-1">Win/loss patterns, risk distribution, and competitive performance</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded text-zinc-400">
            {metrics.total} Competitors
          </span>
          <span className={`px-3 py-1 rounded border ${
            winRate >= 50 ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {winRate}% Win Rate
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Competitors Tracked" value={String(metrics.total)} subtitle={`${metrics.riskCount} at risk`} trend={metrics.riskCount === 0 ? "Clean" : `${metrics.riskCount} flagged`} trendType={metrics.riskCount === 0 ? "good" : "bad"} />
        <MetricCard title="Win Rate" value={`${winRate}%`} subtitle={`${patterns ? Math.round(patterns.win_rate * patterns.total_outcomes) : 0}W / ${patterns ? patterns.total_outcomes - Math.round(patterns.win_rate * patterns.total_outcomes) : 0}L`} trend={winRate >= 50 ? "Winning" : "Losing"} trendType={winRate >= 50 ? "good" : "bad"} />
        <MetricCard title="Avg Health Score" value={`${metrics.avgScore}/100`} subtitle="Across all competitors" trend={metrics.avgScore >= 60 ? "Healthy" : "At Risk"} trendType={metrics.avgScore >= 60 ? "good" : "bad"} />
        <MetricCard title="Total Analyses" value={String(metrics.analyses)} subtitle="Intelligence runs completed" trend="Active" trendType="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Health Score by Competitor</h3>
          {scoreDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Health Score" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-600 text-xs">No data yet</div>
          )}
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Score Trend Over Time</h3>
          {scoreTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={scoreTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="analysis" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Health Score" stroke="#22c55e" strokeWidth={2} fill="url(#forecastGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-600 text-xs">No trend data yet</div>
          )}
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Risk Distribution</h3>
          {riskBreakdown.length > 0 ? (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={riskBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} strokeWidth={0}>
                    {riskBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {riskBreakdown.map((r) => (
                  <div key={r.reason} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-xs text-zinc-400 flex-1">{r.reason}</span>
                    <span className="text-xs font-mono text-zinc-300">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[160px] text-zinc-600 text-xs">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, trend, trendType }: { title: string; value: string; subtitle: string; trend: string; trendType: "good" | "bad" }) {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-xs font-medium text-zinc-500">{title}</h4>
        <span className={`text-[10px] flex items-center gap-0.5 font-mono px-1.5 py-0.5 rounded ${
          trendType === "good" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
        }`}>
          {trendType === "good" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {trend}
        </span>
      </div>
      <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
      <div className="text-[10px] text-zinc-500 mt-1">{subtitle}</div>
    </div>
  );
}
