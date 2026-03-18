"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { 
  Home, 
  Target, 
  ShieldAlert, 
  FolderOpen, 
  BarChart4, 
  Settings,
  Search,
  Briefcase,
  Smartphone,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { WebSocketProvider } from "@/lib/websocket-context";
import { LiveActivityPanel, ConnectionStatus, NotificationBell } from "@/components/live-activity";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <WebSocketProvider>
      <div className="flex h-screen w-full bg-[#0a0a0a] text-zinc-300 font-sans overflow-hidden">
        
        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* SIDEBAR */}
        <aside className={`
          w-64 border-r border-zinc-800/50 bg-[#0a0a0a] flex flex-col shrink-0
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          md:relative md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-sm bg-white flex items-center justify-center">
                <span className="text-black text-xs font-bold leading-none select-none">O</span>
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">Oakwell Sentinel</span>
            </Link>
            <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">Command Center</p>
              <NavItem href="/dashboard" icon={<Home size={16} />} label="War Room" active={pathname === "/dashboard"} />
              <NavItem href="/dashboard/deals" icon={<FolderOpen size={16} />} label="Deal Desk" active={pathname === "/dashboard/deals"} />
              <NavItem href="/dashboard/targets" icon={<Target size={16} />} label="Market Sentinel" active={pathname === "/dashboard/targets"} />
              <NavItem href="/dashboard/alerts" icon={<ShieldAlert size={16} />} label="Threat Intel" active={pathname === "/dashboard/alerts"} />
            </div>

            <div className="mt-8 space-y-1">
              <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">Analytics</p>
              <NavItem href="/dashboard/forecast" icon={<BarChart4 size={16} />} label="Forecast" active={pathname === "/dashboard/forecast"} />
            </div>

            <div className="mt-8 space-y-1">
              <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">Executive</p>
              <NavItem href="/dashboard/executive" icon={<Briefcase size={16} />} label="Executive Portal" active={pathname === "/dashboard/executive"} />
              <NavItem href="/dashboard/sidekick" icon={<Smartphone size={16} />} label="Live Sidekick" active={pathname === "/dashboard/sidekick"} />
            </div>
          </div>

          <div className="p-3 border-t border-zinc-800/50">
            <NavItem href="/dashboard/settings" icon={<Settings size={16} />} label="Settings" active={pathname === "/dashboard/settings"} />
            <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 transition-colors">
              <UserButton appearance={{
                elements: {
                  userButtonBox: "flex-row-reverse",
                  userButtonOuterIdentifier: "text-xs font-medium text-white",
                }
              }} showName />
            </div>
          </div>

          {/* Live Activity Panel at bottom of sidebar */}
          <LiveActivityPanel />
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0">
          
          {/* TOP COMMAND BAR */}
          <header className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-4 md:px-6 bg-[#0a0a0a]/80 backdrop-blur-sm z-10">
            
            {/* Mobile menu button */}
            <button className="md:hidden text-zinc-400 hover:text-white mr-3" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>

            {/* Fast Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-hover:text-zinc-300 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search deals, transcripts, or competitors (Cmd + K)" 
                  className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-md pl-10 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:bg-zinc-900 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 ml-4">
              <div className="hidden lg:block">
                <ConnectionStatus />
              </div>
              <NotificationBell />
            </div>
          </header>

          {/* SCROLLABLE VIEWPORT */}
          <div className="flex-1 overflow-y-auto bg-[#050505]">
            {children}
          </div>
        </main>
      </div>
    </WebSocketProvider>
  );
}

// Minimal Navigation Item Component
function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active 
          ? 'bg-zinc-900 text-white font-medium shadow-sm border border-zinc-800/50' 
          : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
      }`}
    >
      <span className={active ? "text-zinc-300" : "text-zinc-500"}>{icon}</span>
      {label}
    </Link>
  );
}
