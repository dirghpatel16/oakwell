"use client";
import React, { useState, useEffect } from "react";
import { 
  Mic, 
  MicOff, 
  PhoneCall, 
  ShieldAlert, 
  MessageSquare, 
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Volume2,
  Pause,
  SkipForward
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";

// Simulated live coaching data
const LIVE_COACHING_CARDS = [
  {
    id: "c1",
    type: "competitor_alert" as const,
    priority: "critical" as const,
    title: "Competitor Mentioned: Clari",
    body: "Prospect just referenced Clari's $140/seat pricing. DO NOT lead with discounting.",
    suggestion: "Pivot to TCO: 'Clari's $140 doesn't include API access or Copilot — that's $170 all-in. We're $155 fully loaded.'",
    timestamp: "Now",
    dismissed: false,
  },
  {
    id: "c2",
    type: "objection_handler" as const,
    priority: "high" as const,
    title: "Pricing Objection Detected",
    body: "Prospect is pushing back on per-seat pricing model.",
    suggestion: "Ask: 'What's your total revenue intelligence spend today across tools?' Then show consolidation ROI.",
    timestamp: "2 min ago",
    dismissed: false,
  },
  {
    id: "c3",
    type: "talk_track" as const,
    priority: "medium" as const,
    title: "Value Prop Opportunity",
    body: "Prospect mentioned 'pipeline visibility' — this is your strongest differentiator.",
    suggestion: "Say: 'That's exactly what our War Room solves — real-time pipeline risk scoring, not just historical reports.'",
    timestamp: "5 min ago",
    dismissed: false,
  },
  {
    id: "c4",
    type: "champion_intel" as const,
    priority: "low" as const,
    title: "Champion Context",
    body: "Sarah Jenkins promoted to VP Eng 3 months ago. First enterprise purchase decision.",
    suggestion: "Frame ROI around making her look good to leadership. First-year impact metrics.",
    timestamp: "Pre-call",
    dismissed: false,
  },
];

const CALL_PARTICIPANTS = [
  { name: "You (Dirgh P.)", speaking: true, muted: false },
  { name: "Sarah Jenkins (Stripe)", speaking: false, muted: false },
  { name: "Mike Chen (Stripe Eng)", speaking: false, muted: true },
];

export default function LiveSidekickPage() {
  const { connected } = useWebSocket();
  const [isLive, setIsLive] = useState(false);
  const [cards, setCards] = useState(LIVE_COACHING_CARDS);
  const [expandedCard, setExpandedCard] = useState<string | null>("c1");
  const [callDuration, setCallDuration] = useState(0);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);

  // Simulate call timer
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  // Simulate keyword detection when live
  useEffect(() => {
    if (!isLive) return;
    const keywords = ["pricing", "competitor", "timeline", "budget", "security", "integration", "ROI", "discount"];
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const kw = keywords[Math.floor(Math.random() * keywords.length)];
        setDetectedKeywords(prev => [kw, ...prev.filter(k => k !== kw)].slice(0, 8));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const dismissCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] max-w-2xl mx-auto">
      
      {/* Call Control Bar */}
      <div className={`px-4 py-4 border-b border-zinc-800/50 ${isLive ? "bg-blue-600/5" : "bg-[#0a0a0a]"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isLive ? "bg-red-500/10 text-red-400" : "bg-zinc-900 text-zinc-500"}`}>
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Live Sidekick</h1>
              <p className="text-xs text-zinc-500">
                {isLive ? `In call — ${formatTime(callDuration)}` : "No active call"}
              </p>
            </div>
          </div>
          
          {isLive && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-red-400">LIVE</span>
            </div>
          )}
        </div>

        {/* Call Control Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isLive 
                ? "bg-red-600 hover:bg-red-500 text-white" 
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {isLive ? <><MicOff className="w-4 h-4" /> End Call</> : <><Mic className="w-4 h-4" /> Start Demo Call</>}
          </button>
          {isLive && (
            <>
              <button className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <Pause className="w-4 h-4" />
              </button>
              <button className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <Volume2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Participants */}
        {isLive && (
          <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {CALL_PARTICIPANTS.map((p, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-full px-3 py-1.5">
                <div className={`w-2 h-2 rounded-full ${p.speaking ? "bg-green-500 animate-pulse" : p.muted ? "bg-zinc-600" : "bg-zinc-500"}`} />
                <span className="text-[10px] text-zinc-300 whitespace-nowrap">{p.name}</span>
                {p.muted && <MicOff className="w-2.5 h-2.5 text-zinc-500" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyword Detection Stream */}
      {isLive && detectedKeywords.length > 0 && (
        <div className="px-4 py-2 border-b border-zinc-800/30 bg-[#0a0a0a]">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Detected Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {detectedKeywords.map((kw, i) => (
              <span 
                key={kw} 
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                  i === 0 
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-slide-in-right" 
                    : "bg-zinc-900 text-zinc-400 border-zinc-800"
                }`}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Coaching Cards */}
      <div className="flex-1 overflow-y-auto">
        {!isLive ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Zap className="w-7 h-7 text-zinc-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-400">Ready for Battle</h2>
            <p className="text-sm text-zinc-600 max-w-sm">
              Start a call to activate real-time AI coaching. Oakwell will listen, detect competitor mentions, 
              and feed you live talk tracks and objection handlers.
            </p>
            <div className="space-y-2 w-full max-w-xs">
              <FeatureRow icon={<ShieldAlert className="w-3.5 h-3.5" />} text="Competitor detection in real-time" />
              <FeatureRow icon={<MessageSquare className="w-3.5 h-3.5" />} text="Auto-generated talk tracks" />
              <FeatureRow icon={<AlertTriangle className="w-3.5 h-3.5" />} text="Objection handling suggestions" />
              <FeatureRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} text="Post-call action items" />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                AI Coaching ({cards.length} active)
              </p>
              <button className="text-[10px] text-zinc-500 hover:text-zinc-300">Clear All</button>
            </div>

            {cards.map((card) => {
              const isExpanded = expandedCard === card.id;
              const priorityStyles: Record<string, { border: string; bg: string; icon: React.ReactNode }> = {
                critical: { 
                  border: "border-l-red-500", 
                  bg: "bg-red-500/[0.03]",
                  icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
                },
                high: { 
                  border: "border-l-orange-500", 
                  bg: "bg-orange-500/[0.02]",
                  icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
                },
                medium: { 
                  border: "border-l-blue-500", 
                  bg: "",
                  icon: <MessageSquare className="w-4 h-4 text-blue-400" />,
                },
                low: { 
                  border: "border-l-zinc-600", 
                  bg: "",
                  icon: <Zap className="w-4 h-4 text-zinc-400" />,
                },
              };
              const style = priorityStyles[card.priority];

              return (
                <div 
                  key={card.id} 
                  className={`border border-zinc-800 border-l-2 ${style.border} ${style.bg} rounded-lg overflow-hidden transition-all animate-fade-up`}
                >
                  <div 
                    className="px-4 py-3 flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  >
                    <div className="mt-0.5 shrink-0">{style.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white">{card.title}</h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{card.body}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-zinc-600">{card.timestamp}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 ml-7 space-y-3 border-t border-zinc-800/30 mt-0 pt-3">
                      {/* The actual coaching suggestion */}
                      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-400 mb-1.5">💡 Suggested Response</p>
                        <p className="text-sm text-zinc-200 leading-relaxed italic">&ldquo;{card.suggestion}&rdquo;</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button className="text-xs bg-white text-black hover:bg-zinc-200 transition-colors px-3 py-1.5 rounded font-medium flex-1">
                          Use This
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); dismissCard(card.id); }}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded border border-zinc-800"
                        >
                          Dismiss
                        </button>
                        <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5">
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Transcript Preview */}
            <div className="mt-6 bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Live Transcript</p>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex gap-2">
                  <span className="text-zinc-600 shrink-0">32:10</span>
                  <span className="text-zinc-500">Sarah J.:</span>
                  <span className="text-zinc-300">...we&apos;re also talking to <span className="text-red-400 font-semibold">Clari</span> right now. They offered $140 a seat...</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-600 shrink-0">32:28</span>
                  <span className="text-blue-400">You:</span>
                  <span className="text-zinc-400 flex items-center gap-1">
                    <span className="w-1.5 h-4 bg-blue-500 animate-blink inline-block" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-left px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      <span className="text-zinc-500">{icon}</span>
      <span className="text-xs text-zinc-400">{text}</span>
    </div>
  );
}
