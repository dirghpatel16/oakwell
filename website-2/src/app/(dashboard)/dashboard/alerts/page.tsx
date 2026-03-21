"use client";
import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  MessageSquare, 
  Clock,
  ChevronDown,
  BellOff,
  Filter,
  Loader2
} from "lucide-react";
import { useMemory } from "@/lib/hooks";

type AlertSeverity = "critical" | "high" | "medium" | "low";

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  competitor: string;
  timestamp: string;
  isRead: boolean;
}

export default function ThreatIntelPage() {
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");
  const { data: memory, loading: memLoading } = useMemory();

  // Derive alerts from the Neural Memory Bank
  const alerts: Alert[] = useMemo(() => {
    if (!memory) return [];
    const items: Alert[] = [];
    let id = 0;

    Object.entries(memory).forEach(([url, entry]) => {
      const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const score = entry.deal_health_score || 0;

      // Main clashes alert
      if (entry.clashes_detected) {
        const severity: AlertSeverity = score < 40 ? "critical" : score < 55 ? "high" : score < 70 ? "medium" : "low";
        items.push({
          id: `alert-${id++}`,
          severity,
          title: `${name} — Health Score ${score}/100`,
          description: entry.clashes_detected.slice(0, 300),
          source: "Deal Intelligence — Analysis Engine",
          competitor: name,
          timestamp: entry.last_analysis_ts ? timeAgo(entry.last_analysis_ts) : "Unknown",
          isRead: score >= 70,
        });
      }

      // Timeline-based alerts
      if (entry.timeline) {
        entry.timeline.slice(-3).reverse().forEach((t) => {
          if (t.top_clash) {
            const severity: AlertSeverity = t.score < 40 ? "critical" : t.score < 55 ? "high" : t.score < 70 ? "medium" : "low";
            items.push({
              id: `alert-${id++}`,
              severity,
              title: `${name}: ${t.top_clash.slice(0, 80)}`,
              description: `Score at this point: ${t.score}/100. ${t.top_clash}`,
              source: "Market Sentinel — Timeline",
              competitor: name,
              timestamp: t.ts ? timeAgo(t.ts) : "Unknown",
              isRead: true,
            });
          }
        });
      }
    });

    return items.sort((a, b) => {
      const order: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }, [memory]);

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Threat Intelligence</h1>
          <p className="text-sm text-zinc-500 mt-1">
            All competitive signals across deals, market scans, and agent reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="text-xs font-mono bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20">
              {unreadCount} unread
            </span>
          )}
          <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded">
            <BellOff className="w-3 h-3" /> Mark All Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-zinc-500" />
        {(["all", "critical", "high", "medium", "low"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded transition-colors ${
              filter === f
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-[10px] text-zinc-600 font-mono ml-2">{filtered.length} alerts</span>
      </div>

      {/* Loading State */}
      {memLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          <span className="text-sm text-zinc-500 font-mono">Loading threat intelligence...</span>
        </div>
      )}

      {/* Empty State */}
      {!memLoading && alerts.length === 0 && (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-lg">
          <ShieldAlert className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-1">No threat intelligence yet</p>
          <p className="text-xs text-zinc-600">Analyze a deal in the <a href="/dashboard/deals" className="text-white hover:underline">Deal Desk</a> to generate alerts.</p>
        </div>
      )}

      {/* Alert Feed */}
      {!memLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const [expanded, setExpanded] = useState(false);

  const severityColors: Record<AlertSeverity, string> = {
    critical: "border-l-red-500 bg-red-500/[0.02]",
    high: "border-l-orange-500 bg-orange-500/[0.02]",
    medium: "border-l-yellow-500",
    low: "border-l-zinc-600",
  };

  const severityBadge: Record<AlertSeverity, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  const severityIcons: Record<AlertSeverity, React.ReactNode> = {
    critical: <ShieldAlert className="w-4 h-4 text-red-400" />,
    high: <Zap className="w-4 h-4 text-orange-400" />,
    medium: <TrendingUp className="w-4 h-4 text-yellow-400" />,
    low: <MessageSquare className="w-4 h-4 text-zinc-400" />,
  };

  return (
    <div 
      className={`border border-zinc-800 border-l-2 ${severityColors[alert.severity]} rounded-lg overflow-hidden transition-colors hover:border-zinc-700 cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="mt-0.5 shrink-0">{severityIcons[alert.severity]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {!alert.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
            <h3 className={`text-sm font-medium ${alert.isRead ? "text-zinc-300" : "text-white"}`}>{alert.title}</h3>
            <span className={`text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${severityBadge[alert.severity]}`}>
              {alert.severity}
            </span>

          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
            <span>{alert.source}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {alert.timestamp}</span>
            {alert.competitor !== "-" && (
              <>
                <span>•</span>
                <span className="text-zinc-400">{alert.competitor}</span>
              </>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {expanded && (
        <div className="px-5 pb-4 pt-0 ml-8 border-t border-zinc-800/30 mt-0 pt-4 space-y-3">
          <p className="text-sm text-zinc-400 leading-relaxed">{alert.description}</p>
          
          <div className="flex items-center gap-2 pt-2">
            <a href="/dashboard/deals" className="text-xs bg-white text-black hover:bg-zinc-200 transition-colors px-3 py-1.5 rounded font-medium">
              Open Deal Desk
            </a>
            <a href="/dashboard/targets" className="text-xs bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors px-3 py-1.5 rounded font-medium border border-zinc-700">
              View Competitor
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}