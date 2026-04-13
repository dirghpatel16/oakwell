"use client";
import React, { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// AnimatedCounter — numbers that count up when they enter the viewport
// ---------------------------------------------------------------------------
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1200,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LiveBadge — pulsing indicator with optional count
// ---------------------------------------------------------------------------
export function LiveBadge({
  count,
  label = "LIVE",
  color = "green",
  className = "",
}: {
  count?: number;
  label?: string;
  color?: "green" | "red" | "blue" | "amber" | "orange";
  className?: string;
}) {
  const dotColors = {
    green: "bg-green-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
  };
  const pingColors = {
    green: "bg-green-400",
    red: "bg-red-400",
    blue: "bg-blue-400",
    amber: "bg-amber-400",
    orange: "bg-orange-400",
  };
  const textColors = {
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    orange: "text-orange-400",
  };
  const bgColors = {
    green: "bg-green-500/10 border-green-500/20",
    red: "bg-red-500/10 border-red-500/20",
    blue: "bg-blue-500/10 border-blue-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
    orange: "bg-orange-500/10 border-orange-500/20",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-medium ${bgColors[color]} ${textColors[color]} ${className}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColors[color]} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColors[color]}`} />
      </span>
      {label}
      {count !== undefined && (
        <span className="font-semibold">{count}</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MiniSparkline — tiny SVG inline chart for tables / cards
// ---------------------------------------------------------------------------
export function MiniSparkline({
  data,
  width = 64,
  height = 20,
  color = "#3b82f6",
  className = "",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const endColor = last >= prev ? "#22c55e" : "#ef4444";

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
        opacity={0.5}
      />
      {/* Highlight last segment */}
      {data.length >= 2 && (
        <line
          x1={parseFloat(points[points.length - 2].split(",")[0])}
          y1={parseFloat(points[points.length - 2].split(",")[1])}
          x2={parseFloat(points[points.length - 1].split(",")[0])}
          y2={parseFloat(points[points.length - 1].split(",")[1])}
          stroke={endColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      {/* End dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={2}
        fill={endColor}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// StatusChip — compact colored status badge (ALERT, WIRE, CRITICAL, etc.)
// ---------------------------------------------------------------------------
export function StatusChip({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "critical" | "alert" | "live" | "wire" | "info" | "default";
}) {
  const styles = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    alert: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    live: "bg-green-500/20 text-green-400 border-green-500/30",
    wire: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    info: "bg-zinc-700/40 text-zinc-300 border-zinc-600/30",
    default: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${styles[variant]}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TickingClock — shows a live-updating time for "last updated" feel
// ---------------------------------------------------------------------------
export function TickingClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className={className} suppressHydrationWarning>{time}</span>;
}
