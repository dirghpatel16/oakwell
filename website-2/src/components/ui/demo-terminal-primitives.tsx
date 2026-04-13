"use client";
import Link from "next/link";
import React from "react";
import { ArrowUpRight, Clock3, Network, ShieldCheck, Sparkles } from "lucide-react";

type Tone = "critical" | "high" | "medium" | "low" | "alert" | "info" | "live";

function toneClasses(tone: Tone) {
  if (tone === "critical") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (tone === "high" || tone === "alert") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (tone === "medium" || tone === "info") return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  if (tone === "live") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return "border-zinc-800 bg-zinc-900 text-zinc-300";
}

export function WorkflowBar({
  actions,
}: {
  actions: { label: string; href?: string; tone?: Tone }[];
}) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const classes = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${toneClasses(action.tone || "low")}`;
        if (action.href) {
          return (
            <Link key={`${action.label}-${action.href}`} href={action.href} className={classes}>
              {action.label}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          );
        }
        return (
          <button key={action.label} className={classes} type="button">
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

export function EvidenceListPanel({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: { id: string; label: string; source: string; freshness: string; confidence: string; summary: string; proof?: string }[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">{title}</h3>
          {subtitle ? <p className="mt-1 text-[11px] text-zinc-500">{subtitle}</p> : null}
        </div>
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">{item.label}</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500">{item.source}</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500">{item.confidence}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">{item.summary}</p>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-mono text-zinc-500">
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {item.freshness}</span>
              {item.proof ? <span>{item.proof}</span> : <span>Source only</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActionListPanel({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">{title}</h3>
          {subtitle ? <p className="mt-1 text-[11px] text-zinc-500">{subtitle}</p> : null}
        </div>
        <Sparkles className="h-4 w-4 text-blue-400" />
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EntityGraphPanel({
  title,
  subtitle,
  centerId,
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  centerId: string;
  nodes: { id: string; label: string; type: string; tone: Tone }[];
  edges: { from: string; to: string; label: string }[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const center = nodes.find((node) => node.id === centerId) || nodes[0];
  const related = nodes.filter((node) => node.id !== center.id).slice(0, 6);
  const positions = [
    "left-[6%] top-[14%]",
    "right-[8%] top-[12%]",
    "left-[0%] bottom-[18%]",
    "right-[6%] bottom-[16%]",
    "left-[30%] bottom-[2%]",
    "right-[28%] top-[2%]",
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200">{title}</h3>
          {subtitle ? <p className="mt-1 text-[11px] text-zinc-500">{subtitle}</p> : null}
        </div>
        <Network className="h-4 w-4 text-blue-400" />
      </div>
      <div className="relative mt-4 h-[300px] overflow-hidden rounded-2xl border border-zinc-800 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.16),_transparent_40%),linear-gradient(180deg,#0a0a0a,#060606)]">
        {related.map((node, index) => (
          <React.Fragment key={node.id}>
            <div className={`absolute left-1/2 top-1/2 h-px origin-left bg-zinc-800 ${index % 2 === 0 ? "w-[32%] rotate-[150deg]" : "w-[30%] rotate-[25deg]"}`} />
            <button
              type="button"
              onClick={() => onSelect?.(node.id)}
              className={`absolute ${positions[index]} rounded-xl border px-3 py-2 text-left transition-colors ${selectedId === node.id ? "border-amber-400 bg-amber-500/10 text-amber-200" : toneClasses(node.tone)}`}
            >
              <span className="block text-[9px] uppercase tracking-[0.18em] text-zinc-500">{node.type}</span>
              <span className="mt-1 block text-xs font-medium">{node.label}</span>
              <span className="mt-1 block text-[10px] text-zinc-500">{edges.find((edge) => edge.to === node.id || edge.from === node.id)?.label || "Linked"}</span>
            </button>
          </React.Fragment>
        ))}

        <button
          type="button"
          onClick={() => onSelect?.(center.id)}
          className={`absolute left-1/2 top-1/2 w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-4 text-center shadow-[0_0_50px_rgba(37,99,235,0.15)] ${selectedId === center.id ? "border-amber-400 bg-amber-500/10 text-amber-100" : toneClasses(center.tone)}`}
        >
          <span className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500">center node</span>
          <span className="mt-2 block text-base font-semibold">{center.label}</span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.18em]">show me everything around this company</span>
        </button>
      </div>
    </div>
  );
}