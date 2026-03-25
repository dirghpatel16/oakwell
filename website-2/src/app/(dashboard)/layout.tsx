"use client";
import { UserButton } from "@clerk/nextjs";
import { User } from "lucide-react";
import { DemoModeProvider } from "@/lib/demo-context";
import { WebSocketProvider } from "@/lib/websocket-context";
import DashboardShell from "@/components/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <DemoModeProvider forced={false}>
      <WebSocketProvider>
        <DashboardShell
          basePath="/dashboard"
          userSlot={
            hasClerk ? (
              <UserButton
                appearance={{
                  elements: {
                    userButtonBox: "flex-row-reverse",
                    userButtonOuterIdentifier: "text-xs font-medium text-white",
                  },
                }}
                showName
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <User size={14} className="text-zinc-400" />
                </div>
                <span className="text-xs font-medium text-white">Local User</span>
              </div>
            )
          }
        >
          {children}
        </DashboardShell>
      </WebSocketProvider>
    </DemoModeProvider>
  );
}
