"use client";
import React from "react";
import { useWebSocket, type LiveOperation } from "@/lib/websocket-context";
import { Activity, Loader2, CheckCircle2, X, Zap, Eye, Shield } from "lucide-react";

// Live Activity Panel — shows real-time agent operations  
export function LiveActivityPanel() {
  const { liveOperations, connected, connectionStatus } = useWebSocket();

  if (liveOperations.length === 0) return null;

  return (
    <div className="border-t border-zinc-800/50 bg-[#0a0a0a]">
      <div className="px-4 py-2 flex items-center gap-2 border-b border-zinc-800/30">
        <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
          Live Operations ({liveOperations.length})
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-[9px] font-mono text-zinc-500">{connectionStatus}</span>
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto divide-y divide-zinc-800/30">
        {liveOperations.map(op => (
          <OperationRow key={op.id} operation={op} />
        ))}
      </div>
    </div>
  );
}

function OperationRow({ operation }: { operation: LiveOperation }) {
  const { clearOperation } = useWebSocket();
  const isComplete = operation.step === "complete";
  const lastMessage = operation.messages[operation.messages.length - 1] || "Initializing...";

  const agentIcons: Record<string, React.ReactNode> = {
    "Market Sentinel": <Eye className="w-3 h-3" />,
    "Deal Intelligence": <Zap className="w-3 h-3" />,
  };

  return (
    <div className="px-4 py-3 space-y-2 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`${isComplete ? "text-green-400" : "text-blue-400"}`}>
            {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          </span>
          <span className="text-xs font-medium text-zinc-200">{operation.agent}</span>
          <span className="text-[10px] font-mono text-zinc-500">→ {operation.target}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">{operation.progress}%</span>
          {isComplete && (
            <button onClick={() => clearOperation(operation.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      {/* Progress bar with gradient animation */}
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            isComplete ? "bg-green-500" : "bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 animate-shimmer"
          }`}
          style={{ width: `${operation.progress}%` }}
        />
      </div>
      
      <p className="text-[10px] text-zinc-500 font-mono truncate">{lastMessage}</p>
    </div>
  );
}

// Compact status bar for the header
export function ConnectionStatus() {
  const { connected, connectionStatus, lastSync } = useWebSocket();

  const timeSince = lastSync
    ? Math.floor((Date.now() - lastSync.getTime()) / 1000)
    : null;

  return (
    <div className="flex items-center gap-3 text-xs font-mono bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800">
      <div className={`flex items-center gap-2 ${connected ? "text-green-500" : "text-red-500"}`}>
        <span className="relative flex h-2 w-2">
          {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-green-500" : "bg-red-500"}`} />
        </span>
        {connected ? "LIVE" : connectionStatus.toUpperCase()}
      </div>
      <span className="text-zinc-600">|</span>
      <span className="text-zinc-400">
        {timeSince !== null ? `SYNC: ${timeSince}s AGO` : "SYNCING..."}
      </span>
    </div>
  );
}

// Notification Bell with Badge
export function NotificationBell() {
  const { unreadAlertCount, realtimeAlerts, markAlertRead, markAllAlertsRead } = useWebSocket();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="relative text-zinc-400 hover:text-white transition-colors"
      >
        <Shield size={18} />
        {unreadAlertCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 border-2 border-[#0a0a0a]">
            {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[360px] bg-[#0c0c0c] border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Alerts</span>
              {unreadAlertCount > 0 && (
                <button onClick={markAllAlertsRead} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-800/30">
              {realtimeAlerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-500">No alerts yet. Sentinel is watching.</div>
              ) : (
                realtimeAlerts.slice(0, 15).map(alert => {
                  const severityColor: Record<string, string> = {
                    critical: "bg-red-500",
                    high: "bg-orange-500",
                    medium: "bg-yellow-500",
                    low: "bg-zinc-500",
                  };
                  const elapsed = Math.floor((Date.now() - alert.timestamp.getTime()) / 1000);
                  const timeStr = elapsed < 60 ? `${elapsed}s ago` : elapsed < 3600 ? `${Math.floor(elapsed / 60)}m ago` : `${Math.floor(elapsed / 3600)}h ago`;
                  
                  return (
                    <div 
                      key={alert.id} 
                      className={`px-4 py-3 hover:bg-zinc-900/50 cursor-pointer flex items-start gap-3 ${!alert.read ? "bg-blue-500/[0.03]" : ""}`}
                      onClick={() => markAlertRead(alert.id)}
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityColor[alert.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs truncate ${alert.read ? "text-zinc-400" : "text-zinc-200 font-medium"}`}>{alert.title}</p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{timeStr}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
