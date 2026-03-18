"use client";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUpRight, Target, Trophy, ShieldAlert } from "lucide-react";

// Mock data modeled after real CRO dashboards (Clari/Gong style)
const PIPELINE_DATA = [
  { stage: "Discovery", value: 420000, deals: 8, color: "#3b82f6" },
  { stage: "Demo", value: 310000, deals: 5, color: "#6366f1" },
  { stage: "Negotiation", value: 220000, deals: 3, color: "#8b5cf6" },
  { stage: "Best Case", value: 185000, deals: 4, color: "#a855f7" },
  { stage: "Commit", value: 162000, deals: 2, color: "#22c55e" },
  { stage: "Closed Won", value: 95000, deals: 1, color: "#10b981" },
];

const WIN_RATE_TREND = [
  { month: "Oct", rate: 31, deals: 12 },
  { month: "Nov", rate: 34, deals: 15 },
  { month: "Dec", rate: 28, deals: 10 },
  { month: "Jan", rate: 38, deals: 18 },
  { month: "Feb", rate: 42, deals: 14 },
  { month: "Mar", rate: 46, deals: 8 },
];

const COMPETITOR_WINS = [
  { name: "vs Gong", wins: 12, losses: 8, winRate: 60 },
  { name: "vs Clari", wins: 7, losses: 10, winRate: 41 },
  { name: "vs Outreach", wins: 9, losses: 4, winRate: 69 },
  { name: "vs Chorus", wins: 15, losses: 3, winRate: 83 },
  { name: "No Comp", wins: 22, losses: 5, winRate: 81 },
];

const FORECAST_WEEKLY = [
  { week: "W1", target: 200000, actual: 95000, pipeline: 420000 },
  { week: "W2", target: 400000, actual: 180000, pipeline: 380000 },
  { week: "W3", target: 600000, actual: 310000, pipeline: 350000 },
  { week: "W4", target: 800000, actual: null, pipeline: 320000 },
];

const LOSS_REASONS = [
  { reason: "Pricing", value: 35, color: "#ef4444" },
  { reason: "Feature Gap", value: 25, color: "#f97316" },
  { reason: "No Decision", value: 20, color: "#eab308" },
  { reason: "Competitor", value: 15, color: "#8b5cf6" },
  { reason: "Other", value: 5, color: "#6b7280" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-zinc-400 font-mono mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-white font-medium">
            {entry.name}: {typeof entry.value === "number" && entry.value > 1000 
              ? `$${(entry.value / 1000).toFixed(0)}K` 
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ForecastPage() {
  const totalPipeline = PIPELINE_DATA.reduce((sum, s) => sum + s.value, 0);
  const quotaTarget = 800000;
  const attainment = Math.round((95000 / quotaTarget) * 100);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Revenue Forecast</h1>
          <p className="text-sm text-zinc-500 mt-1">Q1 2026 — Pipeline health, win rates, and competitive performance</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded text-zinc-400">
            Quota: ${(quotaTarget / 1000).toFixed(0)}K
          </span>
          <span className={`px-3 py-1 rounded border ${attainment >= 80 ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
            {attainment}% Attainment
          </span>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Pipeline" 
          value={`$${(totalPipeline / 1000).toFixed(0)}K`} 
          subtitle={`${PIPELINE_DATA.reduce((s, d) => s + d.deals, 0)} active deals`}
          trend="+12%" 
          trendType="good" 
        />
        <MetricCard 
          title="Q1 Win Rate" 
          value="42%" 
          subtitle="vs 34% industry avg"
          trend="+8%" 
          trendType="good" 
        />
        <MetricCard 
          title="Avg Deal Cycle" 
          value="45 Days" 
          subtitle="Down from 52 last quarter"
          trend="-7 days" 
          trendType="good" 
        />
        <MetricCard 
          title="Pipeline Coverage" 
          value={`${(totalPipeline / quotaTarget).toFixed(1)}x`} 
          subtitle={`Need 3x for ${quotaTarget / 1000}K target`}
          trend={totalPipeline / quotaTarget >= 3 ? "Healthy" : "At Risk"} 
          trendType={totalPipeline / quotaTarget >= 3 ? "good" : "bad"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pipeline by Stage */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Pipeline by Stage</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={PIPELINE_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} tickFormatter={(v) => `$${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Pipeline" radius={[4, 4, 0, 0]}>
                {PIPELINE_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate Trend */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Win Rate Trend (6mo)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={WIN_RATE_TREND} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#27272a" }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" name="Win Rate" stroke="#22c55e" strokeWidth={2} fill="url(#winGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Competitive Win/Loss */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Competitive Win/Loss</h3>
          <div className="space-y-3">
            {COMPETITOR_WINS.map((comp) => (
              <div key={comp.name} className="flex items-center gap-4">
                <span className="text-xs text-zinc-400 w-24 shrink-0 font-mono">{comp.name}</span>
                <div className="flex-1 h-6 bg-zinc-900 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-green-500/80 flex items-center justify-end pr-2"
                    style={{ width: `${comp.winRate}%` }}
                  >
                    <span className="text-[9px] font-mono text-white font-bold">{comp.wins}W</span>
                  </div>
                  <div 
                    className="h-full bg-red-500/60 flex items-center pl-2"
                    style={{ width: `${100 - comp.winRate}%` }}
                  >
                    <span className="text-[9px] font-mono text-white font-bold">{comp.losses}L</span>
                  </div>
                </div>
                <span className={`text-xs font-mono w-10 text-right ${comp.winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                  {comp.winRate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Loss Reasons */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Loss Reasons (Q1)</h3>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie 
                  data={LOSS_REASONS} 
                  dataKey="value" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={45} 
                  outerRadius={70} 
                  strokeWidth={0}
                >
                  {LOSS_REASONS.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-1">
              {LOSS_REASONS.map((r) => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-xs text-zinc-400 flex-1">{r.reason}</span>
                  <span className="text-xs font-mono text-zinc-300">{r.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, trend, trendType }: {
  title: string; value: string; subtitle: string; trend: string; trendType: "good" | "bad";
}) {
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