"use client";
import React, { useState } from "react";
import { 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  MessageSquare, 
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  Bell,
  BellOff,
  ExternalLink,
  Filter
} from "lucide-react";

type AlertSeverity = "critical" | "high" | "medium" | "low";
type AlertType = "pricing_change" | "feature_launch" | "messaging_shift" | "competitive_mention" | "deal_risk";

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  competitor: string;
  timestamp: string;
  relatedDeals: string[];
  isRead: boolean;
  actionTaken: boolean;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: "a1",
    type: "pricing_change",
    severity: "critical",
    title: "Clari launched Enterprise Plus at $140/seat",
    description: "New pricing tier detected on clari.com/pricing. Includes bundled AI Copilot, unlimited API calls, and dedicated CSM. This directly undercuts our Enterprise tier by 12%. Screenshot captured and verified by Vision AI.",
    source: "Market Sentinel — Auto Scan",
    competitor: "Clari",
    timestamp: "Today, 9:15 AM",
    relatedDeals: ["Stripe Enterprise ($150K)", "Linear Pro ($45K)"],
    isRead: false,
    actionTaken: false,
  },
  {
    id: "a2",
    type: "competitive_mention",
    severity: "critical",
    title: "Competitor mentioned 4x on Stripe demo call",
    description: "During today's platform demo with Sarah Jenkins (VP Eng, Stripe), the prospect mentioned Clari 4 times and referenced their $140/seat pricing. Rep leaned on discount instead of value differentiation. Immediate coaching intervention recommended.",
    source: "Deal Intelligence — Transcript Analysis",
    competitor: "Clari",
    timestamp: "Today, 10:42 AM",
    relatedDeals: ["Stripe Enterprise ($150K)"],
    isRead: false,
    actionTaken: false,
  },
  {
    id: "a3",
    type: "feature_launch",
    severity: "high",
    title: "Gong shipped Revenue AI Copilot",
    description: "New product page detected at gong.io/product/copilot. Features include: real-time deal coaching, automated follow-ups, and pipeline forecasting. This overlaps with 3 of our core differentiators. Battlecard update recommended.",
    source: "Market Sentinel — Auto Scan",
    competitor: "Gong",
    timestamp: "Yesterday, 3:15 PM",
    relatedDeals: ["Vercel Expansion ($85K)", "Anthropic Core ($220K)"],
    isRead: true,
    actionTaken: false,
  },
  {
    id: "a4",
    type: "deal_risk",
    severity: "high",
    title: "Champion left Vercel — no exec alignment",
    description: "LinkedIn detected that Jake Morrison (our champion at Vercel) changed roles to 'VP Engineering at Figma'. Deal has no remaining executive alignment. Risk of deal slipping to next quarter unless new champion identified within 7 days.",
    source: "Deal Intelligence — Signal Detection",
    competitor: "-",
    timestamp: "Yesterday, 11:30 AM",
    relatedDeals: ["Vercel Expansion ($85K)"],
    isRead: true,
    actionTaken: true,
  },
  {
    id: "a5",
    type: "messaging_shift",
    severity: "medium",
    title: "Outreach Kaia now supports competitor alerts",
    description: "Outreach updated their Kaia AI product page to include real-time competitor mention alerts during calls. This is a direct response to our positioning. Feature appears to be basic keyword matching, not vision-verified like Oakwell.",
    source: "Market Sentinel — Auto Scan",
    competitor: "Outreach",
    timestamp: "2 days ago",
    relatedDeals: [],
    isRead: true,
    actionTaken: false,
  },
  {
    id: "a6",
    type: "pricing_change",
    severity: "medium",
    title: "Gong Enterprise tier up 19% ($130 → $155)",
    description: "Price increase detected on gong.io/pricing. Enterprise tier moved from $130/seat to $155/seat. Effective immediately for new contracts. Existing customers grandfathered for 6 months. This creates a window for competitive displacement.",
    source: "Market Sentinel — Auto Scan",
    competitor: "Gong",
    timestamp: "2 days ago",
    relatedDeals: ["Raycast Teams ($12K)"],
    isRead: true,
    actionTaken: true,
  },
  {
    id: "a7",
    type: "messaging_shift",
    severity: "low",
    title: "Chorus removed public pricing page",
    description: "chorus.ai/pricing now redirects to a 'Contact Sales' form. This typically indicates either a significant price increase or a shift to enterprise-only positioning. May signal ZoomInfo is deprioritizing SMB segment.",
    source: "Market Sentinel — Auto Scan",
    competitor: "Chorus",
    timestamp: "3 days ago",
    relatedDeals: [],
    isRead: true,
    actionTaken: false,
  },
];

export default function ThreatIntelPage() {
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");
  const unreadCount = MOCK_ALERTS.filter(a => !a.isRead).length;

  const filtered = filter === "all" ? MOCK_ALERTS : MOCK_ALERTS.filter(a => a.severity === filter);

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

      {/* Alert Feed */}
      <div className="space-y-3">
        {filtered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
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

  const typeIcons: Record<AlertType, React.ReactNode> = {
    pricing_change: <TrendingUp className="w-4 h-4 text-red-400" />,
    feature_launch: <Zap className="w-4 h-4 text-blue-400" />,
    messaging_shift: <MessageSquare className="w-4 h-4 text-amber-400" />,
    competitive_mention: <ShieldAlert className="w-4 h-4 text-red-400" />,
    deal_risk: <ShieldAlert className="w-4 h-4 text-orange-400" />,
  };

  return (
    <div 
      className={`border border-zinc-800 border-l-2 ${severityColors[alert.severity]} rounded-lg overflow-hidden transition-colors hover:border-zinc-700 cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="mt-0.5 shrink-0">{typeIcons[alert.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {!alert.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
            <h3 className={`text-sm font-medium ${alert.isRead ? "text-zinc-300" : "text-white"}`}>{alert.title}</h3>
            <span className={`text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${severityBadge[alert.severity]}`}>
              {alert.severity}
            </span>
            {alert.actionTaken && (
              <span className="text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Actioned
              </span>
            )}
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
          
          {alert.relatedDeals.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500">Affected Deals:</span>
              {alert.relatedDeals.map((deal, i) => (
                <span key={i} className="text-[10px] font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                  {deal}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button className="text-xs bg-white text-black hover:bg-zinc-200 transition-colors px-3 py-1.5 rounded font-medium">
              Generate Talk Track
            </button>
            <button className="text-xs bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors px-3 py-1.5 rounded font-medium border border-zinc-700">
              View Screenshot Proof
            </button>
            <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}