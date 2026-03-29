"use client";
import Link from "next/link";
import React from "react";
import { ArrowRight, Loader2, LucideIcon } from "lucide-react";

export function DashboardLoadingState({
  icon: Icon,
  title,
  message,
}: {
  icon?: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/70">
        {Icon ? <Icon className="h-5 w-5 animate-pulse text-blue-400" /> : <Loader2 className="h-5 w-5 animate-spin text-blue-400" />}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{message}</p>
    </div>
  );
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  message,
  ctaHref,
  ctaLabel,
  eyebrow,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
  eyebrow?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_50%),#0a0a0a] px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/70">
        <Icon className="h-5 w-5 text-zinc-500" />
      </div>
      {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{eyebrow}</p> : null}
      <h3 className="mt-2 text-base font-semibold tracking-tight text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">{message}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function DashboardErrorBanner({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-red-200">{title}</p>
          <p className="mt-1 text-red-300/80">{message}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="shrink-0 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 transition-colors hover:border-red-300/30 hover:bg-red-500/20"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
