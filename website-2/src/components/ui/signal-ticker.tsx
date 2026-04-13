"use client";
import React, { useEffect, useRef } from "react";

interface TickerItem {
  label: string;
  value: string;
  change?: string;
  dir?: "up" | "down" | "flat";
}

const DEMO_TICKER_ITEMS: TickerItem[] = [
  { label: "GONG", value: "72/100", change: "+4", dir: "up" },
  { label: "CLARI", value: "58/100", change: "-3", dir: "down" },
  { label: "CHORUS.AI", value: "38/100", change: "-11", dir: "down" },
  { label: "SALESLOFT", value: "65/100", change: "+2", dir: "up" },
  { label: "OUTREACH", value: "81/100", change: "+7", dir: "up" },
  { label: "MINDTICKLE", value: "44/100", change: "-6", dir: "down" },
  { label: "GONG · PRICING", value: "↓ 12%", change: "new tier", dir: "down" },
  { label: "CLARI · LAUNCH", value: "RevAI v2", change: "product update", dir: "flat" },
  { label: "SALESLOFT · HIRE", value: "+14 AE roles", change: "market push", dir: "up" },
  { label: "ARR DEFENDED", value: "$3.8M", change: "↑ 14%", dir: "up" },
  { label: "PIPELINE RISK", value: "$1.24M", change: "5 deals", dir: "down" },
  { label: "PROOF ARTIFACTS", value: "31", change: "field-ready", dir: "up" },
  { label: "ACTIVE SCANS", value: "3", change: "running", dir: "flat" },
  { label: "WIN RATE", value: "68%", change: "+3pp QTD", dir: "up" },
  { label: "NEXT SCAN", value: "4m 12s", change: "all urls", dir: "flat" },
];

function TickerSeparator() {
  return <span className="mx-4 text-zinc-700 select-none">◆</span>;
}

function TickerEntry({ item }: { item: TickerItem }) {
  const color = item.dir === "up" ? "text-green-400" : item.dir === "down" ? "text-red-400" : "text-amber-400";
  const arrow = item.dir === "up" ? "▲" : item.dir === "down" ? "▼" : "—";

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-zinc-500 font-mono text-[10px] tracking-widest">{item.label}</span>
      <span className={`font-mono text-[11px] font-semibold ${color}`}>{item.value}</span>
      {item.change && (
        <span className={`font-mono text-[9px] ${color}`}>
          {arrow} {item.change}
        </span>
      )}
    </span>
  );
}

export function SignalTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  // Pause on hover
  const pause = () => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
  };
  const resume = () => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "running";
  };

  // Duplicate items for seamless loop
  const items = [...DEMO_TICKER_ITEMS, ...DEMO_TICKER_ITEMS];

  return (
    <div
      className="h-7 bg-[#050505] border-t border-zinc-800/60 overflow-hidden flex items-center shrink-0 select-none cursor-default"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {/* Bloomberg-style left label */}
      <div className="flex items-center px-3 border-r border-zinc-800 h-full shrink-0 gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
        </span>
        <span className="text-[9px] font-mono font-semibold text-green-500 tracking-widest uppercase">Live</span>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div
          ref={trackRef}
          className="flex items-center animate-ticker"
          style={{ willChange: "transform" }}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              <TickerEntry item={item} />
              <TickerSeparator />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
