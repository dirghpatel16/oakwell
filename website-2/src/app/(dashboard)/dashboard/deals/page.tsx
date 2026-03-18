import React from "react";
import { 
  PhoneCall, 
  MessageSquare, 
  Mail, 
  Search, 
  Filter, 
  ShieldAlert, 
  ChevronRight,
  TrendingDown,
  Play,
  Activity,
  ChevronLeft
} from "lucide-react";

export default function DealDeskPage() {
  return (
    <div className="flex h-full w-full bg-[#050505] overflow-hidden">
      
      {/* LEFT PANE: The Deal List (High Density) — Hidden on mobile, shown on lg+ */}
      <div className="w-full lg:w-[380px] border-r border-zinc-800/50 bg-[#0a0a0a] flex flex-col lg:flex shrink-0">
        
        {/* Deal Controls */}
        <div className="p-4 border-b border-zinc-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-tight">Active Deals</h2>
            <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">14 Open</span>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Filter by account..." 
                className="w-full h-8 bg-zinc-900/50 border border-zinc-800 rounded pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
            <button className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Deal List */}
        <div className="flex-1 overflow-y-auto">
          {/* Active/Selected Deal */}
          <div className="p-3 border-l-2 border-blue-500 bg-zinc-900/80 cursor-pointer relative group">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-sm font-medium text-white truncate">Stripe Enterprise</h3>
              <span className="text-xs font-mono text-zinc-400">$150K</span>
            </div>
            <p className="text-[10px] text-zinc-500 mb-2 truncate">Last contact: 2 hours ago (Demo Call)</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex text-[9px] font-medium bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wider">High Risk</span>
              <span className="inline-flex text-[9px] font-medium bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 uppercase tracking-wider">Commit</span>
            </div>
          </div>

          {/* Inactive Deals */}
          <DealListItem account="Vercel Expansion" amount="$85K" lastContact="Yesterday" risk="medium" stage="Best Case" />
          <DealListItem account="Anthropic Core" amount="$220K" lastContact="3 days ago" risk="low" stage="Negotiation" />
          <DealListItem account="Linear Pro" amount="$45K" lastContact="1 week ago" risk="high" stage="Discovery" />
          <DealListItem account="Raycast Teams" amount="$12K" lastContact="4 hours ago" risk="low" stage="Commit" />
        </div>
      </div>

      {/* RIGHT PANE: The Deal War Room — Hidden on mobile (shows deal list instead) */}
      <div className="flex-1 flex-col min-w-0 bg-[#050505] hidden lg:flex">
        
        {/* Deal Header */}
        <div className="h-[120px] border-b border-zinc-800/50 bg-[#0a0a0a] p-6 flex flex-col justify-between shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-semibold text-white tracking-tight">Stripe Enterprise</h1>
                <span className="text-[10px] uppercase tracking-wider font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">New Logo</span>
              </div>
              <p className="text-sm text-zinc-400">Buying Committee: 4 identified • Primary: Sarah Jenkins (VP Eng)</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono text-white tracking-tight">$150,000</div>
              <div className="text-xs text-zinc-500 mt-1">Expected Close: Mar 31</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <button className="text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 pb-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Overview
            </button>
            <button className="text-white border-b-2 border-blue-500 pb-1 font-medium flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Transcripts
            </button>
            <button className="text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 pb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Emails
            </button>
          </div>
        </div>

        {/* Content Area: Transcript Analysis */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Transcript Flow */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Call Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-500">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Platform Demo & Architecture Review</h3>
                  <p className="text-xs text-zinc-500">Today • 45 mins • Zoom</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Competitor Mentioned
                </span>
                <span className="inline-flex text-[10px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded border border-orange-500/20 items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Pricing Pushback
                </span>
              </div>
            </div>

            {/* AI Summary Block */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Oakwell AI Summary</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Call went well until minute 32. Sarah (VP Eng) brought up Clari's new API limits and asked if we could match their enterprise tier pricing ($140/seat). Rep failed to handle the objection correctly and leaned on discount rather than value. 
              </p>
            </div>

            {/* Transcript Timeline */}
            <div className="space-y-4">
              <TranscriptBubble 
                speaker="Dirgh P. (Oakwell)" 
                time="31:45" 
                text="So as you can see, our integration takes about 5 minutes to set up. Does that align with what your eng team is looking for?" 
                isRep={true} 
              />
              <TranscriptBubble 
                speaker="Sarah J. (Stripe)" 
                time="32:10" 
                text="The integration is fine, but frankly, we're also talking to Clari right now. They just offered us their Enterprise Plus tier for $140 a seat, and they have the new Copilot feature. Can you guys match that pricing?" 
                isRep={false} 
                highlight="Clari"
                highlightType="competitor"
              />
              <TranscriptBubble 
                speaker="Dirgh P. (Oakwell)" 
                time="32:30" 
                text="Uh, yeah I mean we can definitely look at some discounting if we sign by end of quarter. Let me talk to my VP about getting closer to that $140 number." 
                isRep={true} 
                highlight="discounting"
                highlightType="risk"
              />
            </div>

          </div>

          {/* Right AI Sidebar (The Sidekick) */}
          <div className="w-[300px] border-l border-zinc-800/50 bg-[#0a0a0a] flex flex-col hidden xl:flex shrink-0">
            <div className="p-4 border-b border-zinc-800/50 bg-blue-500/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Live Coach Intervention
              </h3>
              <p className="text-xs text-zinc-400">Missed opportunity detected. Rep dropped value and went straight to discount.</p>
            </div>

            <div className="p-4 space-y-4">
              
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Competitor Threat: Clari</h4>
                <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs">
                  <p className="text-zinc-300 font-medium mb-1">How to handle the $140 objection:</p>
                  <ul className="text-zinc-400 space-y-1.5 list-disc pl-4">
                    <li>Clari's $140 tier caps API calls at 10k/month.</li>
                    <li>Their Copilot feature is an extra $30/seat add-on.</li>
                    <li>Pivot to TCO (Total Cost of Ownership), not per-seat price.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Action Items</h4>
                <button className="w-full bg-white text-black hover:bg-zinc-200 transition-colors py-1.5 rounded text-xs font-medium border border-zinc-300 shadow-sm">
                  Generate Battlecard Email
                </button>
                <button className="w-full bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors py-1.5 rounded text-xs font-medium border border-zinc-700">
                  Flag to Deal Desk Review
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Micro-components
function DealListItem({ account, amount, lastContact, risk, stage }: any) {
  const isHighRisk = risk === 'high';
  return (
    <div className="p-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer group transition-colors">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">{account}</h3>
        <span className="text-xs font-mono text-zinc-500">{amount}</span>
      </div>
      <p className="text-[10px] text-zinc-600 mb-2 truncate">Last contact: {lastContact}</p>
      <div className="flex items-center gap-2">
        {isHighRisk && <span className="inline-flex text-[9px] font-medium bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wider">High Risk</span>}
        {!isHighRisk && <span className="inline-flex text-[9px] font-medium bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 uppercase tracking-wider">{stage}</span>}
      </div>
    </div>
  );
}

function TranscriptBubble({ speaker, time, text, isRep, highlight, highlightType }: any) {
  return (
    <div className={`flex gap-3 ${isRep ? '' : 'flex-row-reverse text-right'}`}>
      <div className="w-8 h-8 rounded shrink-0 bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-medium">
        {speaker.charAt(0)}
      </div>
      <div className={`flex flex-col ${isRep ? 'items-start' : 'items-end'} max-w-[80%]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-zinc-400">{speaker}</span>
          <span className="text-[10px] font-mono text-zinc-600">{time}</span>
        </div>
        <div className={`p-3 rounded-lg text-sm ${
          isRep ? 'bg-zinc-900 border border-zinc-800 text-zinc-300' 
                : 'bg-blue-900/20 border border-blue-900/30 text-zinc-300'
        }`}>
          {/* Highlight rendering logic could go here, for now simple display */}
          {text}
        </div>
        
        {highlight && (
          <div className="mt-1 flex items-center gap-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold ${
              highlightType === 'competitor' ? 'text-red-400' : 'text-orange-400'
            }`}>
              Detected: {highlight}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}