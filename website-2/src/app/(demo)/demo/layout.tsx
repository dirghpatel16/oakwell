"use client";
import { DemoModeProvider } from "@/lib/demo-context";
import { WebSocketProvider } from "@/lib/websocket-context";
import DashboardShell from "@/components/dashboard-shell";
import { User } from "lucide-react";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoModeProvider forced={true}>
      <WebSocketProvider>
        <DashboardShell
          basePath="/demo"
          showDemoBanner
          userSlot={
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <User size={14} className="text-zinc-400" />
              </div>
              <span className="text-xs font-medium text-white">Demo User</span>
            </div>
          }
        >
          {children}
        </DashboardShell>
      </WebSocketProvider>
    </DemoModeProvider>
  );
}
