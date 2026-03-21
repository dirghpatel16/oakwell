"use client";
import { UserButton } from "@clerk/nextjs";
import { DemoModeProvider } from "@/lib/demo-context";
import { WebSocketProvider } from "@/lib/websocket-context";
import DashboardShell from "@/components/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoModeProvider forced={false}>
      <WebSocketProvider>
        <DashboardShell
          basePath="/dashboard"
          userSlot={
            <UserButton
              appearance={{
                elements: {
                  userButtonBox: "flex-row-reverse",
                  userButtonOuterIdentifier: "text-xs font-medium text-white",
                },
              }}
              showName
            />
          }
        >
          {children}
        </DashboardShell>
      </WebSocketProvider>
    </DemoModeProvider>
  );
}
