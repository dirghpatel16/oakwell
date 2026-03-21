"use client";
import React, { useState, useEffect, useRef } from "react";
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
  Send,
  Loader2,
  Trash2
} from "lucide-react";
import { useLiveSidekick } from "@/lib/hooks";
import type { LiveSnippetResponse } from "@/lib/api";

export default function LiveSidekickPage() {
  const { send, history, loading, error } = useLiveSidekick();
  const [isLive, setIsLive] = useState(false);
  const [snippet, setSnippet] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Call timer
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSend = async () => {
    const text = snippet.trim();
    if (!text || loading) return;
    setSnippet("");
    const res = await send(text, competitorUrl || undefined);
    if (res) setExpandedIdx(0); // auto-expand latest
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startSession = () => {
    setIsLive(true);
    setCallDuration(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const endSession = () => {
    setIsLive(false);
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
                {isLive ? `In session — ${formatTime(callDuration)}` : "No active session"}
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

        {/* Session Control Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => isLive ? endSession() : startSession()}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isLive 
                ? "bg-red-600 hover:bg-red-500 text-white" 
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {isLive ? <><MicOff className="w-4 h-4" /> End Session</> : <><Mic className="w-4 h-4" /> Start Coaching Session</>}
          </button>
        </div>

        {/* Competitor URL input */}
        {isLive && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Competitor URL (optional, e.g. https://gong.io)"
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              className="w-full text-xs font-mono bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        )}
      </div>

      {/* AI Coaching Cards */}
      <div className="flex-1 overflow-y-auto">
        {!isLive ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Zap className="w-7 h-7 text-zinc-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-400">Ready for Battle</h2>
            <p className="text-sm text-zinc-600 max-w-sm">
              Start a session to activate real-time AI coaching. Paste conversation snippets and 
              Oakwell will analyze claims, detect competitors, and give you live ammunition.
            </p>
            <div className="space-y-2 w-full max-w-xs">
              <FeatureRow icon={<ShieldAlert className="w-3.5 h-3.5" />} text="Competitor detection & verification" />
              <FeatureRow icon={<MessageSquare className="w-3.5 h-3.5" />} text="Pricing claim analysis" />
              <FeatureRow icon={<AlertTriangle className="w-3.5 h-3.5" />} text="Urgency scoring (low → critical)" />
              <FeatureRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} text="Real-time actionable coaching" />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                AI Coaching ({history.length} responses)
              </p>
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-900/30">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-xs text-zinc-400 font-mono">Analyzing snippet...</span>
              </div>
            )}

            {history.map((res, idx) => (
              <ResponseCard
                key={idx}
                response={res}
                index={idx}
                expanded={expandedIdx === idx}
                onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              />
            ))}

            {history.length === 0 && !loading && (
              <div className="text-center py-12 text-zinc-600">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Paste a conversation snippet below to get AI coaching</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar — only when live */}
      {isLive && (
        <div className="border-t border-zinc-800 bg-[#0a0a0a] px-4 py-3">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste conversation snippet... (e.g. 'They said Gong just dropped their price to $99/seat')"
              rows={2}
              className="flex-1 text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={handleSend}
              disabled={!snippet.trim() || loading}
              className="px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white transition-colors flex items-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[9px] text-zinc-600 mt-1.5 font-mono">Enter to send · Shift+Enter for newline · Snippets are analyzed by Oakwell AI in real-time</p>
        </div>
      )}
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

function ResponseCard({ response, index, expanded, onToggle }: {
  response: LiveSnippetResponse;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const urgencyStyles: Record<string, { border: string; bg: string; icon: React.ReactNode }> = {
    critical: { border: "border-l-red-500", bg: "bg-red-500/[0.03]", icon: <ShieldAlert className="w-4 h-4 text-red-400" /> },
    high: { border: "border-l-orange-500", bg: "bg-orange-500/[0.02]", icon: <AlertTriangle className="w-4 h-4 text-orange-400" /> },
    medium: { border: "border-l-blue-500", bg: "", icon: <MessageSquare className="w-4 h-4 text-blue-400" /> },
    low: { border: "border-l-zinc-600", bg: "", icon: <Zap className="w-4 h-4 text-zinc-400" /> },
  };

  const style = urgencyStyles[response.urgency_label] || urgencyStyles.low;
  const title = response.competitor_mentioned
    ? `Competitor Detected: ${response.competitors.join(", ")}`
    : response.has_actionable_claim
    ? "Actionable Claim Detected"
    : response.status === "skipped"
    ? "Snippet Skipped"
    : "Analysis Complete";

  const urgencyBadge: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    low: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <div className={`border border-zinc-800 border-l-2 ${style.border} ${style.bg} rounded-lg overflow-hidden transition-all`}>
      <div className="px-4 py-3 flex items-start gap-3 cursor-pointer" onClick={onToggle}>
        <div className="mt-0.5 shrink-0">{style.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-medium text-white">{title}</h3>
            <span className={`text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${urgencyBadge[response.urgency_label]}`}>
              {response.urgency_label}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500">{response.snippet_length} chars analyzed · Urgency {response.urgency}/10</p>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 ml-7 space-y-3 border-t border-zinc-800/30 pt-3">
          {response.claim_detected && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-400 mb-1">Claim Detected</p>
              <p className="text-sm text-zinc-200 leading-relaxed">{response.claim_detected}</p>
            </div>
          )}

          {response.pricing_claims.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Pricing Claims</p>
              {response.pricing_claims.map((pc, i) => (
                <div key={i} className="text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 mb-1">
                  {pc.claim} {pc.source && <span className="text-zinc-600">— {pc.source}</span>}
                </div>
              ))}
            </div>
          )}

          {response.verification_triggered && (
            <div className="text-[10px] text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> Vision verification triggered — screenshots captured
            </div>
          )}

          {response.reason && (
            <p className="text-xs text-zinc-500 italic">{response.reason}</p>
          )}

          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
            <span>Status: {response.status}</span>
            <span>·</span>
            <span>Competitors: {response.competitors.length > 0 ? response.competitors.join(", ") : "none"}</span>
            <span>·</span>
            <span>Verification: {response.verification_triggered ? "yes" : "no"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
