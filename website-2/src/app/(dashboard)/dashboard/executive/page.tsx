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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert, 
  DollarSign, 
  Users, 
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar
} from "lucide-react";

// Executive data — high-level KPIs a CRO or CEO cares about
const REVENUE_TREND = [
  { month: "Sep", arr: 0, target: 50000 },
  { month: "Oct", arr: 12000, target: 100000 },
  { month: "Nov", arr: 45000, target: 200000 },
  { month: "Dec", arr: 68000, target: 300000 },
  { month: "Jan", arr: 125000, target: 400000 },
  { month: "Feb", arr: 210000, target: 500000 },
  { month: "Mar", arr: 340000, target: 600000 },
];

const DEAL_VELOCITY = [
  { stage: "Discovery", avg: 8, deals: 12 },
  { stage: "Demo", avg: 12, deals: 8 },
  { stage: "Negotiation", avg: 15, deals: 5 },
  { stage: "Commit", avg: 7, deals: 3 },
  { stage: "Closed", avg: 3, deals: 2 },
];

const MARKET_SHARE = [
  { name: "Gong", value: 35, color: "#ef4444" },
  { name: "Clari", value: 25, color: "#f97316" },
  { name: "Oakwell", value: 8, color: "#3b82f6" },
  { name: "Outreach", value: 18, color: "#8b5cf6" },
  { name: "Others", value: 14, color: "#6b7280" },
];

const EXEC_ALERTS = [
  { severity: "critical", title: "Clari pricing undercuts by 12%", impact: "3 deals at risk ($455K)", time: "2h ago" },
  { severity: "high", title: "Gong shipped AI Copilot", impact: "Feature parity gap widened", time: "Yesterday" },
  { severity: "medium", title: "Win rate trending up +8%", impact: "Talk tracks working", time: "This week" },
  { severity: "low", title: "Chorus removed public pricing", impact: "Enterprise pivot signal", time: "3 days ago" },
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

export default function ExecutivePortalPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-up">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Executive Portal</h1>
          <p className="text-sm text-zinc-500 mt-1">Board-ready revenue intelligence — Q1 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs font-medium bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors">
            <Calendar className="w-3 h-3" /> Q1 2026
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded transition-colors">
            <Download className="w-3 h-3" /> Export PDF
          </button>
        </div>
      </div>

      {/* Top-Line Metrics (The 4 numbers a CEO asks for) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ExecMetric 
          icon={<DollarSign className="w-4 h-4 text-green-400" />}
          title="ARR" 
          value="$340K" 
          change="+62%" 
          positive
          subtitle="Q1 target: $600K" 
        />
        <ExecMetric 
          icon={<Target className="w-4 h-4 text-blue-400" />}
          title="Pipeline" 
          value="$1.39M" 
          change="+12%" 
          positive
          subtitle="23 active deals" 
        />
        <ExecMetric 
          icon={<Users className="w-4 h-4 text-purple-400" />}
          title="Win Rate" 
          value="42%" 
          change="+8pp" 
          positive
          subtitle="vs 34% industry" 
        />
        <ExecMetric 
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          title="Sales Cycle" 
          value="45 Days" 
          change="-7d" 
          positive
          subtitle="Down from 52d" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ARR Growth */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">ARR Growth vs Target</h3>
            <span className="text-[10px] font-mono text-zinc-500">Monthly</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={REVENUE_TREND} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} tickFormatter={(v) => `$${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="target" name="Target" stroke="#3f3f46" strokeDasharray="4 4" strokeWidth={1.5} fill="none" />
              <Area type="monotone" dataKey="arr" name="ARR" stroke="#3b82f6" strokeWidth={2} fill="url(#arrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Executive Alert Summary */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Priority Alerts</h3>
          </div>
          <div className="divide-y divide-zinc-800/30">
            {EXEC_ALERTS.map((alert, i) => {
              const colors: Record<string, string> = {
                critical: "bg-red-500",
                high: "bg-orange-500",
                medium: "bg-green-500",
                low: "bg-zinc-500",
              };
              return (
                <div key={i} className="px-5 py-3 hover:bg-zinc-900/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors[alert.severity]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{alert.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{alert.impact}</p>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-600 shrink-0">{alert.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Deal Velocity */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Deal Velocity (Avg Days per Stage)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={DEAL_VELOCITY} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={{ stroke: "#1a1a1a" }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg" name="Avg Days" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Competitive Market Share */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Competitive Landscape (Est. Market Share)</h3>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie 
                  data={MARKET_SHARE} 
                  dataKey="value" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={80} 
                  strokeWidth={0}
                >
                  {MARKET_SHARE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {MARKET_SHARE.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className={`text-xs flex-1 ${item.name === "Oakwell" ? "text-white font-semibold" : "text-zinc-400"}`}>
                    {item.name}
                  </span>
                  <span className={`text-xs font-mono ${item.name === "Oakwell" ? "text-blue-400 font-semibold" : "text-zinc-300"}`}>
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Board Summary Section */}
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Oakwell AI Executive Summary</h3>
        <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
          <p>
            <span className="text-green-400 font-medium">↑ Positive:</span> Win rate improved 8 percentage points to 42%, 
            driven by AI-generated talk tracks deployed across 14 active deals. Sales cycle compressed by 7 days. 
            Pipeline coverage at 1.7x against $800K quarterly target.
          </p>
          <p>
            <span className="text-red-400 font-medium">↓ Concerns:</span> Clari&apos;s new Enterprise Plus tier ($140/seat) 
            directly undercuts our pricing on 3 deals totaling $455K. Gong shipped an AI Copilot that overlaps 
            with 3 of our core differentiators. Champion at Vercel ($85K deal) left the company.
          </p>
          <p>
            <span className="text-blue-400 font-medium">→ Recommendation:</span> Deploy competitive battlecards against 
            Clari immediately. Accelerate feature development on real-time coaching to maintain differentiation 
            against Gong Copilot. Identify new champion at Vercel within 7 days or risk deal slipping to Q2.
          </p>
        </div>
      </div>
    </div>
  );
}

function ExecMetric({ icon, title, value, change, positive, subtitle }: {
  icon: React.ReactNode; title: string; value: string; change: string; positive: boolean; subtitle: string;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-md bg-zinc-900 border border-zinc-800">{icon}</div>
        <span className={`text-[10px] flex items-center gap-0.5 font-mono px-1.5 py-0.5 rounded ${
          positive 
            ? "bg-green-500/10 text-green-400" 
            : "bg-red-500/10 text-red-400"
        }`}>
          {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {change}
        </span>
      </div>
      <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
      <p className="text-[10px] text-zinc-500 mt-1">{title} — {subtitle}</p>
    </div>
  );
}
