"use client";
import React, { useMemo } from "react";
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
import { useMemory, useSentinelStatus } from "@/lib/hooks";
import { getProofUrl } from "@/lib/api";

export default function MarketSentinelPage() {
  const { triggerScan, liveOperations } = useWebSocket();
  const { data: memory, loading: memLoading } = useMemory();
  const { data: sentinel } = useSentinelStatus();
  const isScanning = liveOperations.some(o => o.type === "scan");

  // Derive competitor data from memory bank
  const competitors = useMemo(() => {
    if (!memory) return [];
    return Object.entries(memory).map(([url, entry]) => {
      const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const score = entry.deal_health_score || 0;
      const threatLevel = score < 40 ? "critical" : score < 55 ? "high" : score < 70 ? "medium" : "low";
      
      // Build recent changes from timeline
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
    }).sort((a, b) => a.score - b.score); // Most risky first
  }, [memory]);

  const scanStats = useMemo(() => ({
    totalCompetitors: competitors.length,
    watchedUrls: sentinel?.watched_urls || 0,
    totalAnalyses: competitors.reduce((s, c) => s + c.analysisCount, 0),
    proofsCaptured: competitors.reduce((s, c) => s + c.proofFiles.length, 0),
  }), [competitors, sentinel]);

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

      {/* Scan Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Globe className="w-4 h-4" />} label="Competitors Tracked" value={scanStats.totalCompetitors.toString()} />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Watched URLs" value={scanStats.watchedUrls.toString()} />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Total Analyses" value={scanStats.totalAnalyses.toString()} accent="text-amber-400" />
        <StatCard icon={<Camera className="w-4 h-4" />} label="Proofs Captured" value={scanStats.proofsCaptured.toString()} />
      </div>

      {/* Loading State */}
      {memLoading && competitors.length === 0 && (
        <div className="flex items-center justify-center py-12 gap-3 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading competitor intelligence...</span>
        </div>
      )}

      {/* Empty State */}
      {!memLoading && competitors.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Globe className="w-8 h-8 text-zinc-700 mx-auto" />
          <p className="text-sm text-zinc-500">No competitors tracked yet. Run a deal analysis to start monitoring.</p>
          <a href="/dashboard/deals" className="text-xs text-blue-400 underline">Go to Deal Desk →</a>
        </div>
      )}

      {/* Competitor Grid */}
      <div className="space-y-6">
        {competitors.map((comp) => (
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

function CompetitorCard({ competitor }: { competitor: { name: string; domain: string; lastScan: string; analysisCount: number; changesThisWeek: number; threatLevel: string; score: number; proofFiles: string[]; clashes: string; recentChanges: { page: string; type: string; detail: string; time: string; severity: string; score: number }[] } }) {
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

      {/* Clashes summary */}
      {competitor.clashes && (
        <div className="px-5 py-3 border-b border-zinc-800/30 bg-zinc-900/20">
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{competitor.clashes}</p>
        </div>
      )}

      {/* Timeline Log */}
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

function ChangeRow({ change }: { change: { page: string; type: string; detail: string; time: string; severity: string; score: number } }) {
  const typeIcons: Record<string, React.ReactNode> = {
    pricing_change: <TrendingUp className="w-3.5 h-3.5 text-red-400" />,
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
        {change.score > 0 && (
          <span className={`text-[9px] font-mono mt-0.5 ${
            change.score >= 70 ? "text-green-500" : change.score >= 40 ? "text-yellow-500" : "text-red-500"
          }`}>Score: {change.score}</span>
        )}
      </div>
      <div className="text-[10px] font-mono text-zinc-600 shrink-0 mt-0.5">{change.time}</div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}