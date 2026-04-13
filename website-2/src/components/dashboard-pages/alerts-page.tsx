"use client";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  TrendingUp,
  Zap,
  MessageSquare,
  Clock,
  ChevronDown,
  BellOff,
  Filter,
  Loader2,
  Crosshair,
} from "lucide-react";
import { useMemory } from "@/lib/hooks";
import { useDashboardSurface } from "@/components/dashboard-shell";
import { DashboardEmptyState, DashboardErrorBanner, DashboardLoadingState } from "@/components/dashboard-state";
import { DEMO_ALERT_DETAILS, DEMO_COMPETITOR_PROFILES, DEMO_DEAL_WORKSPACE, DEMO_THREAT_INTEL_ALERTS } from "@/lib/demo-data";
import { LiveBadge, StatusChip } from "@/components/ui/live-indicators";
import { ActionListPanel, EvidenceListPanel, WorkflowBar } from "@/components/ui/demo-terminal-primitives";

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
  const [sourceFilter, setSourceFilter] = useState("all");
  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [requestedAlertId, setRequestedAlertId] = useState<string | null>(null);
  const [requestedCompetitor, setRequestedCompetitor] = useState<string | null>(null);
  const { data: memory, loading: memLoading, error: memError, refresh: refreshMemory } = useMemory();
  const { basePath, isDemoSurface } = useDashboardSurface();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedAlertId(params.get("alert"));
    setRequestedCompetitor(params.get("competitor"));
  }, []);

  const alerts: Alert[] = useMemo(() => {
    if (isDemoSurface) {
      return DEMO_THREAT_INTEL_ALERTS.map((alert) => ({
        id: alert.id,
        severity: alert.severity as AlertSeverity,
        title: `${alert.competitor} — ${alert.source}`,
        description: `${alert.summary}\n\nNext action: ${alert.action}`,
        source: alert.source,
        competitor: alert.competitor,
        timestamp: timeAgo(alert.timestamp),
        isRead: alert.severity === "low",
      }));
    }
    if (!memory) return [];
    const items: Alert[] = [];
    let id = 0;

    Object.entries(memory).forEach(([url, entry]) => {
      const name = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const score = entry.deal_health_score || 0;

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

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const availableSources = ["all", ...new Set(alerts.map((a) => a.source))];
  const availableCompetitors = ["all", ...new Set(alerts.map((a) => a.competitor))];
  const filtered = alerts.filter((alert) => {
    if (filter !== "all" && alert.severity !== filter) return false;
    if (sourceFilter !== "all" && alert.source !== sourceFilter) return false;
    if (competitorFilter !== "all" && alert.competitor !== competitorFilter) return false;
    return true;
  });

  useEffect(() => {
    if (!isDemoSurface) return;

    if (requestedCompetitor) {
      const profile = DEMO_COMPETITOR_PROFILES.find((item) =>
        item.id === requestedCompetitor.toLowerCase() ||
        item.name.toLowerCase().includes(requestedCompetitor.toLowerCase()) ||
        requestedCompetitor.toLowerCase().includes(item.name.toLowerCase())
      );
      if (profile) {
        const competitorName = profile.name.includes(" /") ? profile.name.split(" /")[0] : profile.name;
        if (competitorFilter !== competitorName) {
          setCompetitorFilter(competitorName);
        }
      }
    }

    if (requestedAlertId && requestedAlertId !== selectedAlertId) {
      const exists = DEMO_ALERT_DETAILS.some((item) => item.id === requestedAlertId);
      if (exists) {
        setSelectedAlertId(requestedAlertId);
      }
    }
  }, [competitorFilter, isDemoSurface, requestedAlertId, requestedCompetitor, selectedAlertId]);

  useEffect(() => {
    if (!isDemoSurface || selectedAlertId || filtered.length === 0) return;
    setSelectedAlertId(filtered[0].id);
  }, [filtered, isDemoSurface, selectedAlertId]);

  const selectedAlertDetail = DEMO_ALERT_DETAILS.find((item) => item.id === selectedAlertId) || null;
  const selectedProfile = selectedAlertDetail
    ? DEMO_COMPETITOR_PROFILES.find((profile) => profile.id === selectedAlertDetail.competitorId) || null
    : null;
  const selectedDeals = selectedAlertDetail
    ? DEMO_DEAL_WORKSPACE.filter((deal) => selectedAlertDetail.linkedDealIds.includes(deal.id))
    : [];
  const selectedEvidence = selectedProfile && selectedAlertDetail
    ? selectedProfile.evidence.filter((item) => selectedAlertDetail.evidenceIds.includes(item.id))
    : [];

  return (
    <div className="relative flex h-full">
      <div className={`flex-1 min-w-0 p-4 md:p-6 max-w-[1200px] mx-auto space-y-4 transition-all duration-300 ${selectedAlertDetail ? "xl:mr-[420px]" : ""}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">Threat Intelligence</h1>
            <LiveBadge count={filtered.length} label="" color="red" />
            {isDemoSurface && <StatusChip label="6 SOURCES" variant="wire" />}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
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

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectChip value={sourceFilter} onChange={setSourceFilter} options={availableSources} label="Source" />
          <SelectChip value={competitorFilter} onChange={setCompetitorFilter} options={availableCompetitors} label="Competitor" />
          <span className="text-[10px] text-zinc-600 font-mono ml-2">{filtered.length} alerts</span>
        </div>
      </div>

      {memError ? (
        <DashboardErrorBanner
          title="Threat feed could not load durable memory"
          message={`${memError}. Oakwell will only populate Threat Intelligence from confirmed backend memory.`}
          actionLabel="Retry"
          onAction={refreshMemory}
        />
      ) : null}

      {memLoading ? (
        <DashboardLoadingState
          icon={Loader2}
          title="Loading threat intelligence"
          message="Aggregating deal risk, recent clash history, and competitive evidence into a single command feed."
        />
      ) : null}

      {!memLoading && alerts.length === 0 ? (
        <DashboardEmptyState
          icon={ShieldAlert}
          eyebrow={isDemoSurface ? "Demo threat feed" : "Production threat feed"}
          title="Threat intelligence is ready, but no alerts have been generated yet"
          message="Once Oakwell analyzes a live competitive deal, disproven claims and critical score shifts will appear here for reps and leadership."
          ctaHref={`${basePath}/deals`}
          ctaLabel="Analyze a Deal"
        />
      ) : null}

      {!memLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} basePath={basePath} selected={selectedAlertId === alert.id} onSelect={() => setSelectedAlertId(alert.id)} />
          ))}
        </div>
      )}

      {isDemoSurface ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Priority Monitoring</h2>
              <p className="mt-1 text-[11px] text-zinc-500">Use filters as saved views instead of static dashboard cards.</p>
            </div>
            <StatusChip label="WATCHLIST" variant="wire" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Late-stage pricing</button>
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Message drift</button>
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Hiring spikes</button>
            <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300">Exec review</button>
          </div>
        </div>
      ) : null}
      </div>

      {selectedAlertDetail && selectedProfile ? (
        <aside className="hidden xl:flex fixed right-0 top-14 bottom-7 w-[420px] flex-col border-l border-zinc-800 bg-[#08090d] z-20 overflow-hidden">
          <div className="border-b border-zinc-800 bg-[#0d111a] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Alert Detail</p>
                <h2 className="mt-1 text-sm font-semibold text-white">{selectedAlertDetail.title}</h2>
                <p className="mt-1 text-[11px] text-zinc-500">{selectedProfile.name} · {selectedAlertDetail.source} · {timeAgo(selectedAlertDetail.timestamp)}</p>
              </div>
              <StatusChip label={selectedAlertDetail.severity.toUpperCase()} variant={selectedAlertDetail.severity === "critical" ? "critical" : selectedAlertDetail.severity === "high" ? "alert" : "info"} />
            </div>
            <div className="mt-4">
              <WorkflowBar
                actions={[
                  { label: "Open competitor profile", href: `${basePath}/targets?competitor=${encodeURIComponent(selectedProfile.id)}`, tone: "info" },
                  { label: "Open deals", href: `${basePath}/deals?deal=${encodeURIComponent(selectedDeals[0]?.id || "")}`, tone: "live" },
                  { label: "Mark for exec review", href: `${basePath}/executive?competitor=${encodeURIComponent(selectedProfile.id)}`, tone: "critical" },
                ]}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <EvidenceListPanel
              title="Evidence Before Opinion"
              subtitle={`${selectedEvidence.length} linked evidence items · ${selectedProfile.sourceCount} total sources`}
              items={selectedEvidence}
            />
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Why Oakwell believes this</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{selectedAlertDetail.whyOakwellBelieves}</p>
            </div>
            <ActionListPanel title="What to do next" subtitle="Truth in one pane, action in the next." items={[selectedAlertDetail.action, ...selectedDeals.map((deal) => `${deal.account}: ${deal.nextAction}`)]} />
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">Underlying Deals</h3>
              <div className="mt-4 space-y-2">
                {selectedDeals.map((deal) => (
                  <Link key={deal.id} href={`${basePath}/deals?deal=${encodeURIComponent(deal.id)}`} className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 transition-colors hover:border-zinc-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-zinc-200">{deal.account}</p>
                      <span className="text-[10px] font-mono text-zinc-500">{deal.stage}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">{deal.owner} · {deal.watchlist}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      ) : null}

      {selectedAlertDetail && selectedProfile ? (
        <div className="xl:hidden border-t border-zinc-800 bg-[#08090d] px-4 py-4">
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-[#0d111a] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Selected Alert</p>
                  <h2 className="mt-1 text-sm font-semibold text-white">{selectedAlertDetail.title}</h2>
                  <p className="mt-1 text-[11px] text-zinc-500">{selectedProfile.name} · {selectedAlertDetail.source}</p>
                </div>
                <StatusChip label={selectedAlertDetail.severity.toUpperCase()} variant={selectedAlertDetail.severity === "critical" ? "critical" : selectedAlertDetail.severity === "high" ? "alert" : "info"} />
              </div>
            </div>
            <EvidenceListPanel
              title="Evidence Before Opinion"
              subtitle={`${selectedEvidence.length} linked evidence items · ${selectedProfile.sourceCount} total sources`}
              items={selectedEvidence}
            />
            <ActionListPanel title="What to do next" subtitle="Truth in one pane, action in the next." items={[selectedAlertDetail.action, ...selectedDeals.map((deal) => `${deal.account}: ${deal.nextAction}`)]} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AlertCard({ alert, basePath, selected, onSelect }: { alert: Alert; basePath: string; selected?: boolean; onSelect?: () => void }) {
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
      className={`border border-zinc-800 border-l-2 ${severityColors[alert.severity]} rounded-lg overflow-hidden transition-colors hover:border-zinc-700 cursor-pointer ${selected ? "ring-1 ring-blue-500/40" : ""}`}
      onClick={() => {
        setExpanded(!expanded);
        onSelect?.();
      }}
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
            <Link href={`${basePath}/deals?competitor=${encodeURIComponent(alert.competitor)}`} className="text-xs bg-white text-black hover:bg-zinc-200 transition-colors px-3 py-1.5 rounded font-medium">
              Open Deal Desk
            </Link>
            <Link href={`${basePath}/targets?competitor=${encodeURIComponent(alert.competitor)}`} className="text-xs border border-zinc-700 bg-zinc-900 px-3 py-1.5 rounded font-medium text-zinc-300 hover:text-white hover:border-zinc-600">
              Open Sentinel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectChip({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-medium text-zinc-400">
      <Crosshair className="h-3 w-3 text-zinc-500" />
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-zinc-200 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-zinc-950 text-zinc-200">
            {option}
          </option>
        ))}
      </select>
    </label>
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
