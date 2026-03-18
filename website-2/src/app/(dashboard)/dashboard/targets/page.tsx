"use client";
import React from "react";
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Clock, 
  ExternalLink,
  Camera,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";

// Mock data based on actual Oakwell agent outputs
const COMPETITORS = [
  {
    name: "Gong",
    domain: "gong.io",
    status: "active",
    lastScan: "2 min ago",
    pagesTracked: 47,
    changesThisWeek: 3,
    threatLevel: "high",
    recentChanges: [
      { page: "/pricing", type: "pricing_change", detail: "Enterprise tier increased from $130 to $155/seat", time: "Today, 10:42 AM", severity: "critical" },
      { page: "/product/copilot", type: "feature_launch", detail: "New 'Revenue AI Copilot' feature page added", time: "Yesterday, 3:15 PM", severity: "high" },
      { page: "/customers", type: "messaging_shift", detail: "Added 12 new enterprise logos including Stripe", time: "2 days ago", severity: "medium" },
    ]
  },
  {
    name: "Clari",
    domain: "clari.com",
    status: "active",
    lastScan: "5 min ago",
    pagesTracked: 38,
    changesThisWeek: 5,
    threatLevel: "critical",
    recentChanges: [
      { page: "/pricing", type: "pricing_change", detail: "New 'Enterprise Plus' tier at $140/user with AI Copilot bundle", time: "Today, 9:15 AM", severity: "critical" },
      { page: "/platform", type: "feature_launch", detail: "Launched RevAI — generative forecasting engine", time: "Today, 8:30 AM", severity: "critical" },
      { page: "/blog", type: "messaging_shift", detail: "Published 'Why Gong customers are switching to Clari'", time: "Yesterday", severity: "high" },
      { page: "/integrations", type: "feature_launch", detail: "Added native HubSpot CRM sync", time: "3 days ago", severity: "medium" },
      { page: "/security", type: "messaging_shift", detail: "SOC 2 Type II badge added to footer", time: "4 days ago", severity: "low" },
    ]
  },
  {
    name: "Chorus (ZoomInfo)",
    domain: "chorus.ai",
    status: "active",
    lastScan: "8 min ago",
    pagesTracked: 29,
    changesThisWeek: 1,
    threatLevel: "low",
    recentChanges: [
      { page: "/pricing", type: "pricing_change", detail: "Removed public pricing page — 'Contact Sales' only", time: "3 days ago", severity: "medium" },
    ]
  },
  {
    name: "Outreach",
    domain: "outreach.io",
    status: "active",
    lastScan: "12 min ago",
    pagesTracked: 52,
    changesThisWeek: 2,
    threatLevel: "medium",
    recentChanges: [
      { page: "/product/kaia", type: "feature_launch", detail: "Kaia AI now supports real-time competitor mention alerts", time: "Yesterday", severity: "high" },
      { page: "/pricing", type: "pricing_change", detail: "Professional tier discounted 15% for annual contracts", time: "2 days ago", severity: "medium" },
    ]
  },
];

const SCAN_STATS = {
  totalPages: 166,
  scansToday: 1247,
  changesDetected: 11,
  screenshotsCaptured: 34,
};

export default function MarketSentinelPage() {
  const { triggerScan, liveOperations } = useWebSocket();
  const isScanning = liveOperations.some(o => o.type === "scan");

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Market Sentinel</h1>
          <p className="text-sm text-zinc-500 mt-1">24/7 Autonomous Competitor Monitoring</p>
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
            <span className="text-zinc-400">{SCAN_STATS.totalPages} PAGES</span>
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

      {/* Scan Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Globe className="w-4 h-4" />} label="Pages Tracked" value={SCAN_STATS.totalPages.toString()} />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Scans Today" value={SCAN_STATS.scansToday.toLocaleString()} />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Changes Detected" value={SCAN_STATS.changesDetected.toString()} accent="text-amber-400" />
        <StatCard icon={<Camera className="w-4 h-4" />} label="Screenshots Captured" value={SCAN_STATS.screenshotsCaptured.toString()} />
      </div>

      {/* Competitor Grid */}
      <div className="space-y-6">
        {COMPETITORS.map((comp) => (
          <CompetitorCard key={comp.domain} competitor={comp} />
        ))}
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

function CompetitorCard({ competitor }: { competitor: typeof COMPETITORS[0] }) {
  const threatColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-green-500/10 text-green-400 border-green-500/20",
  };

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg overflow-hidden">
      {/* Competitor Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-white">
            {competitor.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{competitor.name}</h3>
              <span className={`text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${threatColors[competitor.threatLevel]}`}>
                {competitor.threatLevel} threat
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-zinc-500 font-mono">
              <span>{competitor.domain}</span>
              <span>•</span>
              <span>{competitor.pagesTracked} pages</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {competitor.lastScan}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            {competitor.changesThisWeek} changes this week
          </span>
          <button className="text-zinc-500 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Change Log */}
      <div className="divide-y divide-zinc-800/30">
        {competitor.recentChanges.map((change, i) => (
          <ChangeRow key={i} change={change} />
        ))}
      </div>
    </div>
  );
}

function ChangeRow({ change }: { change: { page: string; type: string; detail: string; time: string; severity: string } }) {
  const typeIcons: Record<string, React.ReactNode> = {
    pricing_change: <TrendingUp className="w-3.5 h-3.5 text-red-400" />,
    feature_launch: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />,
    messaging_shift: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  };

  const typeLabels: Record<string, string> = {
    pricing_change: "Pricing",
    feature_launch: "Feature",
    messaging_shift: "Messaging",
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
      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-400 hover:text-blue-300 shrink-0 mt-0.5 flex items-center gap-1">
        <Camera className="w-3 h-3" /> View Proof
      </button>
    </div>
  );
}