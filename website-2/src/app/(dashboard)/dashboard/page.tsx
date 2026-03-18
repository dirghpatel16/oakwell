"use client";
import React from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Clock, 
  Target, 
  Activity, 
  Crosshair,
  Loader2,
  Play
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";
import { ConnectionStatus } from "@/components/live-activity";

export default function WarRoomPage() {
  const { triggerScan, triggerDealAnalysis, liveOperations, connected, lastSync } = useWebSocket();

  const timeSince = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 1000) : null;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* HEADER: High-Density Exec Level */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">The War Room</h1>
          <p className="text-sm text-zinc-500 mt-1">Live Competitive Intelligence & Deal Pacing</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live scan trigger */}
          <button 
            onClick={() => triggerScan("All Competitors")}
            disabled={liveOperations.some(o => o.type === "scan")}
            className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors text-white px-3 py-1.5 rounded"
          >
            {liveOperations.some(o => o.type === "scan") ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Scanning...</>
            ) : (
              <><Play className="w-3 h-3" /> Run Scan</>
            )}
          </button>

          {/* Timestamp & Status (Bloomberg vibe) */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800">
            <div className={`flex items-center gap-2 ${connected ? "text-green-500" : "text-red-500"}`}>
              <span className="relative flex h-2 w-2">
                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-green-500" : "bg-red-500"}`}></span>
              </span>
              {connected ? "SYSTEM NORMAL" : "CONNECTING"}
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">LAST SYNC: {timeSince !== null ? `${timeSince}s AGO` : "..."}</span>
          </div>
        </div>
      </div>

      {/* QUADRANT 1: The Macro Metrics (Clari style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Pipeline at Risk" 
          value="$1.2M" 
          trend="-4%" 
          trendType="good" 
          subtitle="Competitor mentions up" 
        />
        <MetricCard 
          title="Win Rate (vs Competitors)" 
          value="42%" 
          trend="+8%" 
          trendType="good" 
          subtitle="Gong is primary threat" 
        />
        <MetricCard 
          title="Avg Deal Cycle" 
          value="45 Days" 
          trend="+2 Days" 
          trendType="bad" 
          subtitle="Slowing in EMEA" 
        />
        <MetricCard 
          title="Active Talk Tracks" 
          value="14" 
          trend="+3" 
          trendType="neutral" 
          subtitle="Agents deployed" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* QUADRANT 2: Active Deal Risk (Left Column - 2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Critical Deal Exceptions</h2>
            <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View All Deals →</button>
          </div>
          
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg overflow-hidden">
            {/* Dense Data Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Account</th>
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Stage</th>
                  <th className="py-3 px-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">AI Risk Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <TableRow 
                  account="Stripe" 
                  rep="Sarah J."
                  amount="$150,000" 
                  stage="Commit" 
                  risk="High" 
                  riskReason="Competitor 'Clari' mentioned 4x on last call. Pricing objection unhandled." 
                />
                <TableRow 
                  account="Vercel" 
                  rep="Mike T."
                  amount="$85,000" 
                  stage="Best Case" 
                  risk="Medium" 
                  riskReason="Champion left company. No executive alignment." 
                />
                <TableRow 
                  account="Anthropic" 
                  rep="Dirgh P."
                  amount="$220,000" 
                  stage="Negotiation" 
                  risk="Low" 
                  riskReason="Security review passed. Awaiting legal redlines." 
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* QUADRANT 3: Market Sentinel Live Feed (Right Column) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              Sentinel Live Feed
            </h2>
          </div>
          
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4 space-y-4 h-[320px] overflow-y-auto">
            {/* Live Feed Items (Looks like terminal logs) */}
            <FeedItem 
              time="10:42 AM" 
              type="pricing_change" 
              title="Gong updated Pricing Page" 
              desc="Detected new tier 'Enterprise Plus' at $140/user." 
              severity="high" 
            />
            <FeedItem 
              time="09:15 AM" 
              type="feature_launch" 
              title="Clari shipped 'Copilot'" 
              desc="New generative AI feature detected on homepage." 
              severity="medium" 
            />
            <FeedItem 
              time="Yesterday" 
              type="sentiment" 
              title="Reddit: Competitor Churn" 
              desc="3 posts in r/sales complaining about Chorus API limits." 
              severity="low" 
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// Micro-components for density
function MetricCard({ title, value, trend, trendType, subtitle }: any) {
  const isGood = trendType === 'good';
  const isBad = trendType === 'bad';
  
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5 flex flex-col justify-between group hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xs font-medium text-zinc-500">{title}</h3>
        <span className={`text-[10px] flex items-center gap-1 font-mono ${
          isGood ? 'text-green-500 bg-green-500/10' : 
          isBad ? 'text-red-500 bg-red-500/10' : 
          'text-zinc-400 bg-zinc-800'
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

function TableRow({ account, rep, amount, stage, risk, riskReason }: any) {
  const isHighRisk = risk === 'High';
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
          {isHighRisk && <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
          {!isHighRisk && <Crosshair className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />}
          <div>
            <div className={`text-xs font-medium ${isHighRisk ? 'text-red-400' : 'text-yellow-400'}`}>
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

function FeedItem({ time, title, desc, severity }: any) {
  return (
    <div className="flex gap-3 items-start border-l-2 pl-3 pb-4 border-zinc-800 last:border-transparent last:pb-0 relative">
      <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border border-[#0a0a0a] ${
        severity === 'high' ? 'bg-red-500' : 
        severity === 'medium' ? 'bg-orange-500' : 
        'bg-blue-500'
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