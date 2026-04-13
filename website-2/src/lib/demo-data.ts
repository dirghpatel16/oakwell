// =============================================================================
// Oakwell Demo Data — Realistic mock data for investor demos
// Every page gets rich, believable data so the product feels alive
// =============================================================================

import type {
  MemoryBank,
  SentinelStatus,
  WinningPatterns,
  DealResult,
  DealStatusResponse,
  LiveSnippetResponse,
  CompetitorTrend,
} from "./api";

// ---------------------------------------------------------------------------
// Timestamps — create realistic recent dates
// ---------------------------------------------------------------------------
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400_000).toISOString();
}

// ---------------------------------------------------------------------------
// MEMORY BANK — 6 competitors, each with realistic deal data
// ---------------------------------------------------------------------------
export const DEMO_MEMORY: MemoryBank = {
  "https://gong.io": {
    deal_health_score: 72,
    talk_track:
      "Gong's conversation intelligence is solid, but Oakwell's autonomous defense layer goes beyond call recording. While Gong charges $1,200/seat/yr with a 12-month lock-in, highlight our flexible per-analysis pricing. Gong lacks real-time competitive verification — they record calls but don't fact-check competitor claims live. Emphasize our screenshot-backed proof artifacts that Gong simply cannot provide.",
    clashes_detected:
      "Gong claims 95% forecast accuracy but independent studies show 68-74% range. Their 'AI recommendations' are retroactive summaries, not real-time coaching. Pricing page shows $100/user/month but actual enterprise contracts include mandatory platform fees of $15K+.",
    visual_proof_summary:
      "Captured 4 screenshots of pricing discrepancies on gong.io/pricing. Feature comparison gap identified on gong.io/product — no mention of competitive intelligence capabilities.",
    proof_filenames: ["gong_pricing_proof_001.png", "gong_features_proof_002.png", "gong_enterprise_hidden_fees.png", "gong_accuracy_claim.png"],
    score_history: [45, 52, 58, 63, 55, 60, 67, 72],
    timeline: [
      { ts: daysAgo(14), score: 45, top_clash: "Initial scan — Gong claiming AI-first platform" },
      { ts: daysAgo(10), score: 52, top_clash: "Pricing page update detected — new Enterprise tier" },
      { ts: daysAgo(7), score: 58, top_clash: "Gong launched 'Engage' product — overlaps with our sidekick" },
      { ts: daysAgo(5), score: 63, top_clash: "Customer review on G2 contradicts Gong's accuracy claims" },
      { ts: daysAgo(3), score: 55, top_clash: "Gong sales rep undercut pricing in Acme deal" },
      { ts: daysAgo(2), score: 60, top_clash: "New blog post making unverified ROI claims" },
      { ts: daysAgo(1), score: 67, top_clash: "Detected feature parity gap — no live verification" },
      { ts: hoursAgo(4), score: 72, top_clash: "Proof artifacts generated — strong counter-position" },
    ],
    analysis_count: 12,
    last_analysis_ts: hoursAgo(4),
    deep_sentiment: { confidence: 0.78, aggression: "moderate", key_weakness: "no real-time verification" },
  },

  "https://clari.com": {
    deal_health_score: 58,
    talk_track:
      "Clari positions as a revenue platform but their core is forecast roll-ups, not competitive intelligence. In technical evaluation, stress that Clari's AI is regression-based forecasting — it predicts pipeline, not competitive dynamics. Our perception engine detects when Clari reps make false claims about feature parity. Show the proof screenshots.",
    clashes_detected:
      "Clari's 'RevAI' marketing claims autonomous intelligence but product is largely manual pipeline management with ML overlays. They added a 'competitive' tab in Q1 2026 but it's just a CRM field, not autonomous scanning. Enterprise pricing starts at $85K/yr — 3x their website suggests.",
    visual_proof_summary:
      "3 screenshots captured: Clari pricing page vs actual contract terms, RevAI feature page exaggerations, and competitive tab limited functionality.",
    proof_filenames: ["clari_pricing_vs_contract.png", "clari_revai_claims.png", "clari_competitive_tab.png"],
    score_history: [35, 42, 48, 53, 50, 45, 52, 58],
    timeline: [
      { ts: daysAgo(12), score: 35, top_clash: "Clari rep told Stripe we have 'no AI capabilities'" },
      { ts: daysAgo(9), score: 42, top_clash: "RevAI v2 launch — marketing claims don't match product" },
      { ts: daysAgo(6), score: 48, top_clash: "Hidden implementation fees discovered in contract terms" },
      { ts: daysAgo(4), score: 53, top_clash: "Clari competitive battlecard leaked via G2 review" },
      { ts: daysAgo(3), score: 50, top_clash: "Lost deal at Linear — Clari undercut by 40%" },
      { ts: daysAgo(2), score: 45, top_clash: "Clari added 'autonomous' keyword to landing page" },
      { ts: daysAgo(1), score: 52, top_clash: "Independent analyst report questions Clari's AI depth" },
      { ts: hoursAgo(6), score: 58, top_clash: "Counter-strategy deployed — proof ready for Vercel deal" },
    ],
    analysis_count: 9,
    last_analysis_ts: hoursAgo(6),
    deep_sentiment: { confidence: 0.65, aggression: "high", key_weakness: "forecast-only, no competitive intel" },
  },

  "https://outreach.io": {
    deal_health_score: 81,
    talk_track:
      "Outreach is a sales engagement platform — completely different category than Oakwell. When prospects compare us, reframe: Outreach automates email sequences, Oakwell defends revenue from competitor misinformation. They overlap zero. If a prospect uses both, position Oakwell as the intelligence layer that makes Outreach sequences smarter by injecting verified competitive data.",
    clashes_detected:
      "Outreach ran a 20% discount campaign targeting our pipeline accounts. Their new 'Kaia' AI feature records calls but doesn't verify claims. Pricing: $100/user/month with 2-year commitment.",
    visual_proof_summary:
      "2 screenshots: Outreach discount campaign targeting our accounts, Kaia feature limitations vs our live sidekick.",
    proof_filenames: ["outreach_discount_campaign.png", "outreach_kaia_limitations.png"],
    score_history: [70, 72, 75, 78, 76, 79, 80, 81],
    timeline: [
      { ts: daysAgo(10), score: 70, top_clash: "Outreach running 20% enterprise discount" },
      { ts: daysAgo(7), score: 72, top_clash: "Kaia AI update — still lacks verification" },
      { ts: daysAgo(5), score: 78, top_clash: "Outreach sales targeting our Anthropic lead" },
      { ts: hoursAgo(12), score: 81, top_clash: "Market position stable — complementary positioning working" },
    ],
    analysis_count: 6,
    last_analysis_ts: hoursAgo(12),
    deep_sentiment: { confidence: 0.82, aggression: "low", key_weakness: "different category entirely" },
  },

  "https://chorus.ai": {
    deal_health_score: 44,
    talk_track:
      "Chorus was acquired by ZoomInfo in 2021 and has been deprioritized. Their conversation intelligence is now a feature inside ZoomInfo, not a standalone product. In competitive deals, emphasize: Chorus hasn't shipped a major feature update in 18 months. Their team is being absorbed. Oakwell is purpose-built for competitive defense, not bolted onto a data platform.",
    clashes_detected:
      "Chorus/ZoomInfo bundle pricing makes it appear cheap, but total cost with ZoomInfo platform is $40K+/yr. Feature development has stalled — last release was Q3 2025. API endpoints deprecated without notice.",
    visual_proof_summary:
      "5 screenshots documenting feature stagnation, deprecated APIs, pricing bundle manipulation.",
    proof_filenames: ["chorus_zi_bundle.png", "chorus_stale_features.png", "chorus_deprecated_api.png", "chorus_no_updates.png", "chorus_review_decline.png"],
    score_history: [60, 55, 50, 48, 52, 46, 43, 44],
    timeline: [
      { ts: daysAgo(20), score: 60, top_clash: "ZoomInfo bundle pricing detected" },
      { ts: daysAgo(14), score: 55, top_clash: "Chorus API deprecation — customers migrating" },
      { ts: daysAgo(8), score: 48, top_clash: "G2 reviews dropping — satisfaction declining" },
      { ts: daysAgo(3), score: 43, top_clash: "No product updates in 6 months confirmed" },
      { ts: hoursAgo(18), score: 44, top_clash: "Chorus weak — focus resources on Gong & Clari" },
    ],
    analysis_count: 8,
    last_analysis_ts: hoursAgo(18),
    deep_sentiment: { confidence: 0.88, aggression: "low", key_weakness: "acquired & deprioritized" },
  },

  "https://salesforce.com/einstein": {
    deal_health_score: 65,
    talk_track:
      "Salesforce Einstein is a data science layer, not competitive intelligence. It predicts lead scores and opportunity amounts — it doesn't scan competitor websites or verify sales claims. When enterprise buyers say 'we already have AI in Salesforce,' counter: Einstein tells you WHAT might close. Oakwell tells you WHY you're losing and gives you the ammunition to win.",
    clashes_detected:
      "Salesforce positioning Einstein as 'all the AI you need' — misleading in competitive contexts. Einstein GPT requires Salesforce Data Cloud ($$$). Actual AI capabilities limited without premium add-ons.",
    visual_proof_summary:
      "3 screenshots: Einstein pricing tiers confusion, feature limitations without Data Cloud, competitive gap analysis.",
    proof_filenames: ["sf_einstein_pricing.png", "sf_data_cloud_required.png", "sf_ai_limitations.png"],
    score_history: [50, 55, 58, 62, 60, 63, 64, 65],
    timeline: [
      { ts: daysAgo(16), score: 50, top_clash: "Salesforce claiming 'all AI built in' at Dreamforce" },
      { ts: daysAgo(10), score: 55, top_clash: "Einstein GPT pricing revealed — $75/user/month add-on" },
      { ts: daysAgo(5), score: 62, top_clash: "Enterprise customer confirms Einstein lacks comp intel" },
      { ts: hoursAgo(8), score: 65, top_clash: "Position clear: complementary, not competitive" },
    ],
    analysis_count: 5,
    last_analysis_ts: hoursAgo(8),
    deep_sentiment: { confidence: 0.72, aggression: "low", key_weakness: "generic AI, not competitive-specific" },
  },

  "https://crayon.co": {
    deal_health_score: 38,
    talk_track:
      "Crayon is the closest direct competitor. They do competitive intelligence but through manual curation + basic web scraping. Key differentiators: Oakwell uses vision AI to screenshot-verify claims (Crayon doesn't), we provide real-time call coaching (Crayon is async), and our deal health scoring is autonomous vs Crayon's manual battlecard updates. In head-to-head, always demo the live verification — that's our kill shot.",
    clashes_detected:
      "Crayon claims 'AI-powered competitive intelligence' but their AI is keyword matching, not vision verification. They charge $25K-$60K/yr and require a dedicated analyst to manage. Crayon's data is 24-48 hours stale vs our real-time scanning.",
    visual_proof_summary:
      "6 screenshots: Crayon manual workflow, stale data examples, pricing vs feature depth, no real-time capabilities.",
    proof_filenames: ["crayon_manual_flow.png", "crayon_stale_data.png", "crayon_pricing.png", "crayon_no_realtime.png", "crayon_vs_oakwell_matrix.png", "crayon_g2_weaknesses.png"],
    score_history: [30, 28, 33, 35, 32, 36, 40, 38],
    timeline: [
      { ts: daysAgo(18), score: 30, top_clash: "Crayon head-to-head at Stripe — critical battle" },
      { ts: daysAgo(12), score: 33, top_clash: "Crayon sales deck leaked — targeting our features" },
      { ts: daysAgo(8), score: 35, top_clash: "Crayon raised Series C — increasing marketing spend" },
      { ts: daysAgo(5), score: 32, top_clash: "Lost Anthropic POC to Crayon — manual curation won" },
      { ts: daysAgo(2), score: 40, top_clash: "New proof artifacts demolish Crayon's 'AI' claim" },
      { ts: hoursAgo(3), score: 38, top_clash: "Active battle — need to win Vercel & Linear deals" },
    ],
    analysis_count: 15,
    last_analysis_ts: hoursAgo(3),
    deep_sentiment: { confidence: 0.45, aggression: "very_high", key_weakness: "manual curation, no vision AI" },
  },
};

// ---------------------------------------------------------------------------
// SENTINEL STATUS — watching 6 competitors with 14 URLs
// ---------------------------------------------------------------------------
export const DEMO_SENTINEL: SentinelStatus = {
  watched_urls: 14,
  interval_seconds: 3600,
  registry: {
    "https://gong.io": ["pricing", "product", "blog", "customers"],
    "https://clari.com": ["pricing", "product", "revai"],
    "https://outreach.io": ["pricing", "product"],
    "https://chorus.ai": ["product", "integrations"],
    "https://salesforce.com/einstein": ["product", "pricing"],
    "https://crayon.co": ["pricing", "product", "blog"],
  },
};

// ---------------------------------------------------------------------------
// WINNING PATTERNS — aggregate competitive performance
// ---------------------------------------------------------------------------
export const DEMO_PATTERNS: WinningPatterns = {
  win_rate: 0.68,
  avg_winning_score: 76,
  avg_losing_score: 38,
  winning_strategies: [
    "Lead with live verification demo — 85% win rate when shown",
    "Expose competitor pricing discrepancies with screenshots",
    "Position as 'defense layer' not 'replacement' for existing tools",
    "Use deal health score trend to create urgency",
    "Show proof artifacts in executive briefing — kills objections",
  ],
  losing_pitfalls: [
    "Engaging in feature-by-feature comparison (we lose on breadth)",
    "Letting competitor set the narrative on 'AI capabilities'",
    "Failing to demo real-time sidekick during evaluation",
    "Pricing conversations before showing value proof",
  ],
  total_outcomes: 47,
  deal_value_won: 892000,
  deal_value_lost: 340000,
};

// ---------------------------------------------------------------------------
// DEMO DEAL RESULT — what a completed analysis looks like
// ---------------------------------------------------------------------------
export const DEMO_DEAL_RESULT: DealResult = {
  deal_health_score: 72,
  clashes_detected:
    "Gong claims 95% forecast accuracy — independent verification shows 68-74%. Their 'AI recommendations' are retroactive call summaries, not real-time competitive defense. Enterprise pricing omits mandatory $15K platform fee.",
  talk_track:
    "Opening: 'I know you're evaluating Gong — they're great at call recording. But here's what they can't do...'\n\n1. PROOF POINT: Show screenshot of Gong's pricing page vs actual contract. Ask: 'Were you quoted the platform fee?'\n\n2. DIFFERENTIATION: 'While Gong records what happened, Oakwell detects what your competitor is doing RIGHT NOW and arms your reps in real-time.'\n\n3. CLOSE: 'Let me show you a live demo. Paste any competitor claim and watch our engine verify it in under 30 seconds.'",
  proof_artifact_path: "outputs/gong_proof.png",
  all_proof_filenames: ["gong_pricing_proof_001.png", "gong_features_proof_002.png", "gong_enterprise_hidden_fees.png"],
  competitor_url: "https://gong.io",
  market_drift: "Gong expanding into coaching territory — increasing overlap with our sidekick feature. Monitor closely.",
  score_history: [45, 52, 58, 63, 55, 60, 67, 72],
  timeline: [
    { ts: daysAgo(7), score: 58, top_clash: "Initial deep scan completed" },
    { ts: daysAgo(3), score: 67, top_clash: "Pricing proof captured" },
    { ts: hoursAgo(4), score: 72, top_clash: "Full analysis complete" },
  ],
  trend: "improving",
  cached: false,
  adversarial_critique:
    "Your talk track over-indexes on pricing. 40% of lost deals cite 'feature depth' not pricing as the reason. Recommend adding a technical demo section that showcases vision verification, not just cost comparison.",
  deal_stage: "technical_eval",
  deal_value: 45000,
  score_reasoning:
    "Score 72/100: Strong proof artifacts (+15), good talk track (+12), but Gong's brand recognition is a headwind (-8). Recent pricing undercut in Acme deal is concerning (-5).",
  risk_level: "medium",
  stage_adjustment: "+5 for technical_eval stage — proof artifacts particularly impactful here",
  key_pivot_points: [
    "If they ask about call recording: 'We integrate with your existing recorder — Gong, Chorus, Zoom. We're the intelligence layer on top.'",
    "If they cite Gong's customer base: 'Gong has scale in recording. We have depth in competitive defense. Different problems.'",
    "If they push on pricing: 'Calculate the revenue lost to competitor misinformation last quarter. That's our ROI.'",
  ],
  stage_specific_actions: [
    "Schedule live demo with their sales team — let them use the sidekick",
    "Prepare competitor-specific proof deck for their top 3 competitors",
    "Get champion to share a recent lost deal — analyze it live",
  ],
  winning_patterns_summary:
    "Teams who see a live verification demo convert at 85%. Prioritize getting hands-on-keyboard time.",
  auto_hardened: true,
};

// ---------------------------------------------------------------------------
// DEMO DEAL STATUS — job completed state
// ---------------------------------------------------------------------------
export const DEMO_JOB_STATUS: DealStatusResponse = {
  job_id: "demo-job-001",
  status: "completed",
  progress_message: "Analysis complete — 4 proof artifacts generated",
  result: DEMO_DEAL_RESULT,
};

// ---------------------------------------------------------------------------
// LIVE SNIPPET RESPONSES — realistic sidekick coaching responses
// ---------------------------------------------------------------------------
export const DEMO_SNIPPET_RESPONSES: LiveSnippetResponse[] = [
  {
    status: "analysed",
    competitor_mentioned: true,
    competitors: ["gong.io"],
    claim_detected: "Gong claims 95% forecast accuracy in their pitch",
    pricing_claims: [
      { claim: "Gong Enterprise at $100/user/month", source: "gong.io/pricing" },
      { claim: "Hidden platform fee of $15K not mentioned", source: "contract analysis" },
    ],
    urgency: 0.85,
    urgency_label: "high",
    has_actionable_claim: true,
    verification_triggered: true,
    verification_results: [
      { claim: "95% forecast accuracy", verified: false, evidence: "Independent studies show 68-74% range" },
    ],
    snippet_length: 142,
  },
  {
    status: "analysed",
    competitor_mentioned: true,
    competitors: ["clari.com"],
    claim_detected: "Prospect says Clari offered autonomous revenue intelligence",
    pricing_claims: [
      { claim: "Clari at $85K/year enterprise", source: "clari.com/pricing" },
    ],
    urgency: 0.72,
    urgency_label: "high",
    has_actionable_claim: true,
    verification_triggered: true,
    verification_results: [
      { claim: "Autonomous intelligence", verified: false, evidence: "Clari RevAI is ML-based forecasting, not autonomous scanning" },
    ],
    snippet_length: 98,
  },
  {
    status: "analysed",
    competitor_mentioned: false,
    competitors: [],
    claim_detected: undefined,
    pricing_claims: [],
    urgency: 0.2,
    urgency_label: "low",
    has_actionable_claim: false,
    verification_triggered: false,
    verification_results: [],
    snippet_length: 45,
    reason: "No competitive claims detected — general product discussion",
  },
];

// ---------------------------------------------------------------------------
// COMPETITOR TRENDS — per-competitor view
// ---------------------------------------------------------------------------
export const DEMO_TRENDS: Record<string, CompetitorTrend> = {
  "https://gong.io": {
    url: "https://gong.io",
    trend: "improving",
    timeline: DEMO_MEMORY["https://gong.io"].timeline,
    score_history: DEMO_MEMORY["https://gong.io"].score_history,
    analysis_count: 12,
    last_analysis_ts: hoursAgo(4),
  },
  "https://clari.com": {
    url: "https://clari.com",
    trend: "volatile",
    timeline: DEMO_MEMORY["https://clari.com"].timeline,
    score_history: DEMO_MEMORY["https://clari.com"].score_history,
    analysis_count: 9,
    last_analysis_ts: hoursAgo(6),
  },
  "https://crayon.co": {
    url: "https://crayon.co",
    trend: "declining",
    timeline: DEMO_MEMORY["https://crayon.co"].timeline,
    score_history: DEMO_MEMORY["https://crayon.co"].score_history,
    analysis_count: 15,
    last_analysis_ts: hoursAgo(3),
  },
};

// ---------------------------------------------------------------------------
// DEMO ALERTS — realistic event stream for the notification bell
// ---------------------------------------------------------------------------
export interface DemoAlert {
  id: string;
  type: "pricing" | "feature" | "mention" | "risk" | "champion_change";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  timestamp: Date;
  read: boolean;
}

export const DEMO_ALERTS: DemoAlert[] = [
  { id: "da-1", type: "pricing", severity: "critical", title: "Gong slashed Enterprise pricing 25% for Q1 pipeline", timestamp: new Date(Date.now() - 120_000), read: false },
  { id: "da-2", type: "champion_change", severity: "high", title: "VP Sales at Stripe (your champion) moved to Datadog", timestamp: new Date(Date.now() - 300_000), read: false },
  { id: "da-3", type: "feature", severity: "high", title: "Clari shipped RevAI v2.1 — claims real-time scoring", timestamp: new Date(Date.now() - 900_000), read: false },
  { id: "da-4", type: "risk", severity: "medium", title: "Deal velocity slowing on Anthropic — 12 days no activity", timestamp: new Date(Date.now() - 1800_000), read: false },
  { id: "da-5", type: "mention", severity: "medium", title: "Oakwell mentioned in Vercel internal Slack (via champion)", timestamp: new Date(Date.now() - 3600_000), read: true },
  { id: "da-6", type: "pricing", severity: "high", title: "Crayon launched startup program — free tier for < 50 employees", timestamp: new Date(Date.now() - 7200_000), read: true },
  { id: "da-7", type: "feature", severity: "low", title: "Outreach updated Kaia AI — still no live verification", timestamp: new Date(Date.now() - 14400_000), read: true },
  { id: "da-8", type: "champion_change", severity: "medium", title: "New CRO at Linear — unknown relationship with competitors", timestamp: new Date(Date.now() - 28800_000), read: true },
  { id: "da-9", type: "risk", severity: "high", title: "Chorus/ZoomInfo bundle offered to 3 of your pipeline accounts", timestamp: new Date(Date.now() - 43200_000), read: true },
  { id: "da-10", type: "mention", severity: "low", title: "Gong blog post references 'pseudo-AI startups' — possible indirect hit", timestamp: new Date(Date.now() - 86400_000), read: true },
];

// ---------------------------------------------------------------------------
// DEMO EMAIL — generated follow-up email
// ---------------------------------------------------------------------------
export const DEMO_EMAIL = `Subject: Following Up — Competitive Intelligence Deep Dive

Hi Sarah,

Great conversation yesterday. As promised, I've compiled the competitive analysis you requested.

Key findings from our Oakwell analysis of Gong vs your current evaluation:

1. **Pricing Transparency**: We identified a $15K platform fee in Gong's enterprise contract that isn't reflected on their pricing page. Happy to share the documentation.

2. **Accuracy Claims**: Gong's "95% forecast accuracy" claim doesn't hold up under scrutiny. Independent analyses suggest 68-74%. We have the proof artifacts ready for your review.

3. **Real-Time Gap**: While Gong records and analyzes past calls, Oakwell operates in real-time during live conversations — detecting competitor mentions and providing instant coaching.

I've attached our proof deck with screenshots and verification data. Would love to schedule a 20-minute live demo where your team can test the sidekick feature with real scenarios.

How does Thursday at 2pm work?

Best,
Oakwell Team`;

// ---------------------------------------------------------------------------
// DEMO WAR ROOM / COMMAND CENTER DATA
// ---------------------------------------------------------------------------

export const DEMO_MOVEMENT_TICKER = [
  { competitor: "Gong", signal: "Enterprise pricing exception spotted in 3 active deals", tone: "critical" },
  { competitor: "Clari", signal: "RevAI 2.1 launch messaging overstates real-time intelligence", tone: "high" },
  { competitor: "Crayon", signal: "Startup program launched targeting sub-50 headcount accounts", tone: "high" },
  { competitor: "Salesforce", signal: "Einstein bundle expanded, but Data Cloud still required", tone: "medium" },
  { competitor: "Outreach", signal: "Kaia refresh shipped without live verification workflow", tone: "low" },
  { competitor: "Chorus", signal: "ZoomInfo bundle resurfacing in dormant enterprise pipeline", tone: "medium" },
];

export const DEMO_ACTIVE_SCANS = [
  {
    id: "scan-1",
    label: "Gong pricing watch",
    status: "live",
    owner: "Sentinel agent",
    progress: "Capturing enterprise pricing and discount exceptions",
    eta: "2m",
  },
  {
    id: "scan-2",
    label: "Crayon head-to-head pack",
    status: "queued",
    owner: "Deal Desk",
    progress: "Refreshing battlecard ahead of Vercel committee review",
    eta: "6m",
  },
  {
    id: "scan-3",
    label: "Clari launch verification",
    status: "briefing",
    owner: "Exec watchtower",
    progress: "Summarizing RevAI claims for board brief",
    eta: "1m",
  },
];

export const DEMO_WHY_IT_MATTERS = [
  {
    title: "ARR exposed this week",
    value: "$1.24M",
    detail: "3 late-stage accounts have fresh competitor pressure tied to pricing opacity and AI-positioning drift.",
    href: "/deals",
  },
  {
    title: "Most urgent response gap",
    value: "Gong",
    detail: "Reps have proof artifacts ready, but two champions still need an executive-ready narrative before committee review.",
    href: "/alerts",
  },
  {
    title: "Window to strike",
    value: "36h",
    detail: "Crayon and Clari both shipped messaging changes in the last day. Oakwell can exploit the inconsistency while it is fresh.",
    href: "/targets",
  },
];

export const DEMO_WAR_ROOM_FEED = [
  {
    id: "feed-1",
    time: "00:47",
    title: "Gong enterprise pricing proof landed",
    desc: "Field team can now rebut hidden platform fee claims in the Vercel and Ramp evaluations.",
    severity: "critical" as const,
    href: "/deals",
  },
  {
    id: "feed-2",
    time: "04:12",
    title: "Clari RevAI message drift detected",
    desc: "Marketing page says autonomous guidance; docs still describe forecast regression overlays.",
    severity: "high" as const,
    href: "/targets",
  },
  {
    id: "feed-3",
    time: "07:05",
    title: "Crayon startup bundle entered active pipeline",
    desc: "Three sub-50 employee opportunities flagged; cost objection likely to surface in next calls.",
    severity: "high" as const,
    href: "/alerts",
  },
  {
    id: "feed-4",
    time: "11:19",
    title: "Salesforce Einstein positioned as ‘all AI in one’",
    desc: "Board brief updated with Data Cloud dependency and implementation complexity proof points.",
    severity: "medium" as const,
    href: "/executive",
  },
];

// ---------------------------------------------------------------------------
// DEMO THREAT / SENTINEL DATA
// ---------------------------------------------------------------------------

export const DEMO_THREAT_INTEL_ALERTS = [
  {
    id: "threat-1",
    severity: "critical",
    source: "Pricing Watch",
    competitor: "Gong",
    summary: "Gong approved a 25% pricing exception plus waived platform fee in two Fortune 500 renewals.",
    action: "Trigger executive escalation and deploy proof-backed pricing narrative.",
    timestamp: hoursAgo(1),
  },
  {
    id: "threat-2",
    severity: "high",
    source: "Product Marketing",
    competitor: "Clari",
    summary: "RevAI 2.1 page now claims live revenue intelligence, but help center still documents batch forecast scoring.",
    action: "Push launch rebuttal pack to field and update sidekick snippets.",
    timestamp: hoursAgo(3),
  },
  {
    id: "threat-3",
    severity: "high",
    source: "Hiring Signal",
    competitor: "Crayon",
    summary: "Crayon opened 8 roles across enablement and analyst operations, signaling expansion into enterprise services motion.",
    action: "Flag enterprise services objection handling in strategic brief.",
    timestamp: hoursAgo(6),
  },
  {
    id: "threat-4",
    severity: "medium",
    source: "Review Site",
    competitor: "Chorus",
    summary: "Multiple G2 reviews mention deprecated API workflows and ZoomInfo bundle confusion.",
    action: "Use in competitive proof appendix for legacy conversation-intelligence deals.",
    timestamp: hoursAgo(10),
  },
  {
    id: "threat-5",
    severity: "medium",
    source: "Security / Trust",
    competitor: "Salesforce",
    summary: "Einstein trust-center update still routes advanced AI use cases through Data Cloud and premium governance controls.",
    action: "Position Oakwell as lightweight intelligence layer on top of existing CRM.",
    timestamp: hoursAgo(12),
  },
  {
    id: "threat-6",
    severity: "low",
    source: "Community",
    competitor: "Outreach",
    summary: "Community forum response confirms Kaia summaries remain post-call only, not in-call.",
    action: "Keep as lightweight rebuttal for sidekick differentiation.",
    timestamp: hoursAgo(18),
  },
];

export const DEMO_SENTINEL_COMPETITORS = [
  {
    url: "https://gong.io",
    competitor: "Gong",
    category: "Conversation intelligence",
    confidence: "verified",
    freshness: "11m ago",
    pricingSignal: "Enterprise discount exceptions detected",
    messagingShift: "Positioning around ‘predictable revenue AI’ intensified",
    hiringSignal: "2 enterprise strategy roles opened in NYC",
    productSignal: "Forecast accuracy proof still unsupported",
    recommendedAction: "Prioritize pricing-proof pack in late-stage deals",
  },
  {
    url: "https://clari.com",
    competitor: "Clari",
    category: "Revenue platform",
    confidence: "mixed",
    freshness: "24m ago",
    pricingSignal: "Website still omits implementation fee band",
    messagingShift: "RevAI now framed as autonomous",
    hiringSignal: "RevOps architect hiring in EMEA",
    productSignal: "Launch page outruns docs/support evidence",
    recommendedAction: "Use doc-vs-marketing contradiction in exec brief",
  },
  {
    url: "https://crayon.co",
    competitor: "Crayon",
    category: "Competitive intelligence",
    confidence: "verified",
    freshness: "38m ago",
    pricingSignal: "Startup bundle undercuts list pricing",
    messagingShift: "AI language expanded without workflow depth",
    hiringSignal: "Services-heavy analyst hiring spike",
    productSignal: "Still no real-time coaching or screenshot verification",
    recommendedAction: "Lead with live sidekick + proof workflow demo",
  },
  {
    url: "https://salesforce.com/einstein",
    competitor: "Salesforce Einstein",
    category: "CRM AI",
    confidence: "verified",
    freshness: "52m ago",
    pricingSignal: "Data Cloud dependency still hidden in top-level messaging",
    messagingShift: "‘All AI in one’ language broadening",
    hiringSignal: "AI governance PM roles expanding",
    productSignal: "Still no competitive verification layer",
    recommendedAction: "Position Oakwell as complementary intelligence layer",
  },
  {
    url: "https://outreach.io",
    competitor: "Outreach",
    category: "Sales engagement",
    confidence: "directional",
    freshness: "1h ago",
    pricingSignal: "Discounting active in SMB pipeline",
    messagingShift: "Kaia framed as coaching co-pilot",
    hiringSignal: "Moderate AE hiring on west coast",
    productSignal: "Still asynchronous coaching only",
    recommendedAction: "Reframe as adjacent, not direct replacement",
  },
  {
    url: "https://chorus.ai",
    competitor: "Chorus / ZoomInfo",
    category: "Legacy conversation intelligence",
    confidence: "verified",
    freshness: "2h ago",
    pricingSignal: "Bundle economics masking true platform cost",
    messagingShift: "Minimal new messaging",
    hiringSignal: "No material hiring momentum",
    productSignal: "Feature velocity remains weak",
    recommendedAction: "Treat as cleanup motion, not primary threat",
  },
];

// ---------------------------------------------------------------------------
// DEMO FORECAST / EXECUTIVE DATA
// ---------------------------------------------------------------------------

export const DEMO_FORECAST_SERIES = [
  { label: "W-6", winRate: 54, atRisk: 420000, velocity: 31, forecastDelta: -4 },
  { label: "W-5", winRate: 58, atRisk: 510000, velocity: 29, forecastDelta: -3 },
  { label: "W-4", winRate: 61, atRisk: 650000, velocity: 27, forecastDelta: -7 },
  { label: "W-3", winRate: 63, atRisk: 710000, velocity: 26, forecastDelta: -8 },
  { label: "W-2", winRate: 66, atRisk: 890000, velocity: 24, forecastDelta: -9 },
  { label: "W-1", winRate: 68, atRisk: 1240000, velocity: 22, forecastDelta: -11 },
];

export const DEMO_FORECAST_CALLOUTS = [
  {
    title: "Pipeline at risk",
    value: "$1.24M",
    note: "Competitive pressure is concentrated in 5 active enterprise opportunities.",
  },
  {
    title: "Forecast delta",
    value: "-11 pts",
    note: "Forecast confidence fell after Gong and Crayon introduced pricing pressure in late-stage accounts.",
  },
  {
    title: "Deal velocity",
    value: "22 days",
    note: "Median cycle time has slowed 9 days where competitor proof is missing.",
  },
  {
    title: "Risk concentration",
    value: "61%",
    note: "Most at-risk ARR is clustered in Gong + Clari influenced accounts.",
  },
];

export const DEMO_PIPELINE_RISK = [
  { competitor: "Gong", arr: 420000, accounts: 2, stage: "Technical Eval", trend: "up" },
  { competitor: "Clari", arr: 310000, accounts: 1, stage: "Proposal", trend: "up" },
  { competitor: "Crayon", arr: 260000, accounts: 2, stage: "Discovery", trend: "flat" },
  { competitor: "Salesforce", arr: 140000, accounts: 1, stage: "Proposal", trend: "down" },
  { competitor: "Outreach", arr: 110000, accounts: 2, stage: "Discovery", trend: "flat" },
];

export const DEMO_EXECUTIVE_BRIEF = {
  headline: "Oakwell is protecting $3.8M in active pipeline with the highest risk concentrated in Gong and Clari-influenced enterprise deals.",
  outlook: "Quarter outlook remains recoverable, but only if Oakwell’s proof artifacts are deployed consistently in the next 7 days.",
  threats: [
    "Gong pricing exceptions are compressing value perception in two late-stage evaluations.",
    "Clari’s autonomous messaging is gaining mindshare faster than their product reality supports.",
    "Crayon is winning early-stage narrative control when reps do not demo Oakwell live.",
  ],
  recommendations: [
    "Mandate live proof demo in all technical evaluation calls.",
    "Route Gong + Clari opportunities through executive counter-positioning pack within 24 hours.",
    "Use Sidekick escalation mode for any deal over $100K with competitor urgency above 7/10.",
  ],
};

// ---------------------------------------------------------------------------
// DEMO SIDEKICK / SETTINGS DATA
// ---------------------------------------------------------------------------

export const DEMO_SIDEKICK_QUEUE = [
  {
    speaker: "Prospect",
    time: "00:41",
    text: "Gong told us their forecast accuracy is basically best-in-class and that your team overlaps with call recording anyway.",
  },
  {
    speaker: "Oakwell",
    time: "00:43",
    text: "High urgency. Reframe immediately: Gong records calls, Oakwell verifies competitor claims live. Use pricing proof artifact next.",
  },
  {
    speaker: "Prospect",
    time: "01:12",
    text: "Clari also says they have autonomous revenue intelligence now. Why wouldn’t we just standardize there?",
  },
  {
    speaker: "Oakwell",
    time: "01:15",
    text: "Use docs-vs-marketing contradiction. Clari’s launch page outpaces their support and implementation reality.",
  },
];

export const DEMO_SIDEKICK_QUICK_SNIPPETS = [
  "They said Gong dropped pricing to $99 per seat and can match anything Oakwell does.",
  "Our RevOps lead thinks Clari’s RevAI makes Oakwell redundant in forecasting-heavy deals.",
  "Crayon promised a fully managed competitive intelligence analyst team in the bundle.",
];

export const DEMO_INTEGRATIONS = [
  { name: "Salesforce", category: "CRM", status: "connected", detail: "Syncing 184 open opportunities", sync: "2m ago" },
  { name: "HubSpot", category: "CRM", status: "standby", detail: "Secondary pipeline sandbox", sync: "disabled" },
  { name: "Slack", category: "Comms", status: "connected", detail: "Alerts routed to #oak-critical-alerts", sync: "live" },
  { name: "Google Calendar", category: "Calendar", status: "connected", detail: "Meeting context flowing into Sidekick", sync: "6m ago" },
  { name: "Gong", category: "Conversation", status: "reconnect", detail: "Token expires in 2 days", sync: "34m ago" },
  { name: "Zoom", category: "Conversation", status: "pending", detail: "Awaiting admin approval for transcript ingest", sync: "pending" },
  { name: "Notion", category: "Knowledge", status: "connected", detail: "Battlecards and enablement docs indexed", sync: "9m ago" },
  { name: "Google Drive", category: "Knowledge", status: "connected", detail: "Proof decks and field notes synced", sync: "14m ago" },
];

export const DEMO_SIGNAL_CATEGORIES = [
  { label: "Pricing", count: 8 },
  { label: "Messaging", count: 11 },
  { label: "Hiring", count: 5 },
  { label: "Product", count: 9 },
  { label: "Reviews", count: 4 },
];

// ---------------------------------------------------------------------------
// DEMO INTELLIGENCE SYSTEM MODEL
// Shared cross-route entities so the demo feels like one connected product.
// ---------------------------------------------------------------------------

export type DemoEvidenceItem = {
  id: string;
  label: string;
  source: string;
  freshness: string;
  confidence: string;
  summary: string;
  proof?: string;
};

export type DemoCompetitorProfile = {
  id: string;
  name: string;
  domain: string;
  segmentOverlap: string[];
  pricingPosition: string;
  messagingShift: string;
  hiringSignal: string;
  reviewThemes: string[];
  strategicRisks: string[];
  linkedDeals: string[];
  sourceCount: number;
  freshness: string;
  confidence: string;
  sentiment: string;
  directCompetitors: string[];
  evidence: DemoEvidenceItem[];
  recommendedAction: string;
};

export type DemoDealWorkspaceRecord = {
  id: string;
  account: string;
  competitorId: string;
  competitor: string;
  stage: string;
  arr: number;
  owner: string;
  urgency: number;
  watchlist: string;
  nextAction: string;
  truthSummary: string;
  actionPlan: string[];
  evidenceCount: number;
  sourceCoverage: number;
  freshness: string;
};

export type DemoAlertDetail = {
  id: string;
  competitorId: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  source: string;
  timestamp: string;
  summary: string;
  whyOakwellBelieves: string;
  action: string;
  linkedDealIds: string[];
  evidenceIds: string[];
};

export const DEMO_COMPETITOR_PROFILES: DemoCompetitorProfile[] = [
  {
    id: "gong",
    name: "Gong",
    domain: "https://gong.io",
    segmentOverlap: ["Enterprise sales", "Revenue ops", "Conversation intelligence"],
    pricingPosition: "Aggressive late-stage discounting below list with platform fee waivers.",
    messagingShift: "Doubling down on predictable revenue AI and forecast certainty language.",
    hiringSignal: "Opening enterprise strategy and post-sales advisory roles in NYC and London.",
    reviewThemes: ["Strong capture", "Weak verification", "Complex pricing"],
    strategicRisks: ["Compresses category to call recording", "Late-stage discount pressure", "Forecast accuracy claim drift"],
    linkedDeals: ["acme-bank", "northstar-health", "delta-freight"],
    sourceCount: 14,
    freshness: "11m ago",
    confidence: "verified",
    sentiment: "Mixed-positive with pricing skepticism",
    directCompetitors: ["clari", "outreach", "chorus"],
    evidence: [
      { id: "gong-price-exception", label: "Pricing exception", source: "Pricing Watch", freshness: "11m ago", confidence: "96%", summary: "Two renewal motions show 25% exception plus waived platform fee.", proof: "gong_enterprise_hidden_fees.png" },
      { id: "gong-claim-gap", label: "Claim verification gap", source: "Product page", freshness: "4h ago", confidence: "92%", summary: "Marketing claims forecast accuracy leadership without linked methodology or benchmark proof.", proof: "gong_accuracy_claim.png" },
      { id: "gong-g2", label: "Review theme", source: "G2", freshness: "1d ago", confidence: "83%", summary: "Reviewers praise capture quality but question strategic guidance depth." },
    ],
    recommendedAction: "Use proof-backed pricing narrative and live verification positioning in committee calls.",
  },
  {
    id: "clari",
    name: "Clari",
    domain: "https://clari.com",
    segmentOverlap: ["Forecasting", "Revenue platform", "Enterprise RevOps"],
    pricingPosition: "Website omits total implementation cost and services band.",
    messagingShift: "RevAI positioned as autonomous intelligence despite batch-oriented documentation.",
    hiringSignal: "EMEA RevOps architect and solutions roles expanding.",
    reviewThemes: ["Implementation heavy", "Good dashboards", "Less field-ready coaching"],
    strategicRisks: ["Steals exec mindshare", "Confuses forecast buyers", "Long implementation myth"],
    linkedDeals: ["solstice-cloud", "northstar-health"],
    sourceCount: 11,
    freshness: "24m ago",
    confidence: "mixed",
    sentiment: "Executive-friendly but field skepticism persists",
    directCompetitors: ["gong", "salesforce-einstein"],
    evidence: [
      { id: "clari-doc-gap", label: "Docs mismatch", source: "Help Center", freshness: "24m ago", confidence: "91%", summary: "Launch page says autonomous, but support docs still describe forecast scoring workflows." },
      { id: "clari-cost-band", label: "Services band", source: "Field notes", freshness: "2d ago", confidence: "78%", summary: "Three enterprise notes show services cost well above list assumptions." },
    ],
    recommendedAction: "Use docs-vs-marketing contradiction and position Oakwell as operationally live.",
  },
  {
    id: "crayon",
    name: "Crayon",
    domain: "https://crayon.co",
    segmentOverlap: ["Competitive intelligence", "Analyst workflows", "Enablement"],
    pricingPosition: "Startup bundle undercuts top-of-funnel motions but lacks workflow depth.",
    messagingShift: "AI language expanded faster than product workflow substance.",
    hiringSignal: "Services-heavy analyst hiring indicates managed-service expansion.",
    reviewThemes: ["Useful monitoring", "Manual synthesis", "Analyst-heavy"],
    strategicRisks: ["Wins narrative in discovery", "Dilutes category definition", "Analyst bundle pressure"],
    linkedDeals: ["atlas-security", "meridian-fintech"],
    sourceCount: 9,
    freshness: "38m ago",
    confidence: "verified",
    sentiment: "Positive for monitoring, weaker for live actionability",
    directCompetitors: ["gong", "clari"],
    evidence: [
      { id: "crayon-bundle", label: "Bundle pressure", source: "Packaging scan", freshness: "38m ago", confidence: "89%", summary: "Startup bundle price sits below expected analyst-assisted alternative for SMB funnel." },
      { id: "crayon-hiring", label: "Services expansion", source: "Talent watch", freshness: "6h ago", confidence: "84%", summary: "Hiring leans toward analyst operations and services delivery, not in-product automation." },
    ],
    recommendedAction: "Lead with live sidekick and screenshot verification, not generic CI claims.",
  },
  {
    id: "salesforce-einstein",
    name: "Salesforce Einstein",
    domain: "https://salesforce.com/einstein",
    segmentOverlap: ["CRM AI", "Executive reporting", "Data Cloud buyers"],
    pricingPosition: "Value depends on adjacent platform purchases and governance add-ons.",
    messagingShift: "Broader all-AI platform narrative.",
    hiringSignal: "AI governance and platform PM hiring rising.",
    reviewThemes: ["Trusted vendor", "Complex rollout", "Stack dependency"],
    strategicRisks: ["Procurement gravity", "Bundling pressure", "Platform lock-in story"],
    linkedDeals: ["solstice-cloud"],
    sourceCount: 7,
    freshness: "52m ago",
    confidence: "verified",
    sentiment: "Trusted but heavy",
    directCompetitors: ["clari", "outreach"],
    evidence: [
      { id: "einstein-datacloud", label: "Dependency gap", source: "Trust Center", freshness: "52m ago", confidence: "87%", summary: "Advanced AI workflows still route through Data Cloud and premium governance layers." },
    ],
    recommendedAction: "Position Oakwell as the lightweight intelligence layer on top of CRM.",
  },
  {
    id: "outreach",
    name: "Outreach",
    domain: "https://outreach.io",
    segmentOverlap: ["Sales engagement", "Coaching", "Pipeline management"],
    pricingPosition: "Discounting in SMB while protecting enterprise packaging.",
    messagingShift: "Kaia framed as coaching co-pilot.",
    hiringSignal: "Moderate AE hiring on west coast.",
    reviewThemes: ["Execution tool", "Not a verification system", "Coaching remains async"],
    strategicRisks: ["Adjacent confusion", "Bundle debates", "Async coaching misconception"],
    linkedDeals: ["delta-freight"],
    sourceCount: 8,
    freshness: "1h ago",
    confidence: "directional",
    sentiment: "Positive for engagement, limited for live intelligence",
    directCompetitors: ["gong", "salesforce-einstein"],
    evidence: [
      { id: "outreach-kaia", label: "Kaia limitation", source: "Community", freshness: "18h ago", confidence: "81%", summary: "Community confirms coaching remains post-call, not in-call verification." },
    ],
    recommendedAction: "Frame as adjacent workflow software, not a head-to-head intelligence platform.",
  },
  {
    id: "chorus",
    name: "Chorus / ZoomInfo",
    domain: "https://chorus.ai",
    segmentOverlap: ["Legacy conversation intelligence", "ZoomInfo bundle"],
    pricingPosition: "Bundle economics mask true platform cost.",
    messagingShift: "Minimal new messaging momentum.",
    hiringSignal: "No material hiring momentum.",
    reviewThemes: ["Legacy value", "Bundle confusion", "Weak feature velocity"],
    strategicRisks: ["Legacy displacement", "Bundle confusion", "Stalled roadmap"],
    linkedDeals: ["meridian-fintech"],
    sourceCount: 6,
    freshness: "2h ago",
    confidence: "verified",
    sentiment: "Declining confidence in roadmap",
    directCompetitors: ["gong", "outreach"],
    evidence: [
      { id: "chorus-review", label: "Review drift", source: "Review Site", freshness: "10h ago", confidence: "79%", summary: "Reviews mention deprecated API workflows and bundle confusion." },
    ],
    recommendedAction: "Treat as cleanup motion and use proof appendix, not primary threat posture.",
  },
];

export const DEMO_DEAL_WORKSPACE: DemoDealWorkspaceRecord[] = [
  {
    id: "acme-bank",
    account: "Acme Bank",
    competitorId: "gong",
    competitor: "Gong",
    stage: "Technical Eval",
    arr: 420000,
    owner: "Maya Chen",
    urgency: 9,
    watchlist: "Exec review",
    nextAction: "Open pricing proof pack and schedule CRO escalation.",
    truthSummary: "Gong is using a pricing exception plus unverified forecast claims in procurement.",
    actionPlan: ["Send proof appendix to committee", "Coach rep on live verification language", "Mark for exec review"],
    evidenceCount: 7,
    sourceCoverage: 5,
    freshness: "11m ago",
  },
  {
    id: "northstar-health",
    account: "Northstar Health",
    competitorId: "clari",
    competitor: "Clari",
    stage: "Proposal",
    arr: 310000,
    owner: "Daniel Ruiz",
    urgency: 8,
    watchlist: "Board risk",
    nextAction: "Open docs-vs-marketing contradiction brief before committee Q&A.",
    truthSummary: "Clari messaging says autonomous, but docs still show batch workflows and services overhead.",
    actionPlan: ["Open competitor profile", "Share brief to Slack", "Assign exec backup"],
    evidenceCount: 5,
    sourceCoverage: 4,
    freshness: "24m ago",
  },
  {
    id: "atlas-security",
    account: "Atlas Security",
    competitorId: "crayon",
    competitor: "Crayon",
    stage: "Discovery",
    arr: 180000,
    owner: "Olivia Brooks",
    urgency: 6,
    watchlist: "Watchlist",
    nextAction: "Use sidekick differentiation and live evidence workflow in next call.",
    truthSummary: "Crayon is framing analyst services as a substitute for operational intelligence software.",
    actionPlan: ["Open talk track", "Save view", "Add to watchlist"],
    evidenceCount: 4,
    sourceCoverage: 3,
    freshness: "38m ago",
  },
  {
    id: "solstice-cloud",
    account: "Solstice Cloud",
    competitorId: "salesforce-einstein",
    competitor: "Salesforce Einstein",
    stage: "Proposal",
    arr: 140000,
    owner: "Grace Patel",
    urgency: 5,
    watchlist: "Platform risk",
    nextAction: "Position Oakwell as complementary intelligence layer to CRM stack.",
    truthSummary: "Buyer assumes Einstein covers intelligence, but Data Cloud dependencies remain hidden.",
    actionPlan: ["Export brief", "Open competitor profile", "Push to Slack"],
    evidenceCount: 3,
    sourceCoverage: 2,
    freshness: "52m ago",
  },
  {
    id: "delta-freight",
    account: "Delta Freight",
    competitorId: "outreach",
    competitor: "Outreach",
    stage: "Discovery",
    arr: 110000,
    owner: "Samir Gupta",
    urgency: 4,
    watchlist: "Monitor",
    nextAction: "Reframe Outreach as async coaching, not live competitive verification.",
    truthSummary: "Outreach is being treated as a category substitute even though coaching remains asynchronous.",
    actionPlan: ["Open evidence", "Share brief", "Assign follow-up"],
    evidenceCount: 3,
    sourceCoverage: 2,
    freshness: "1h ago",
  },
  {
    id: "meridian-fintech",
    account: "Meridian Fintech",
    competitorId: "chorus",
    competitor: "Chorus / ZoomInfo",
    stage: "Discovery",
    arr: 80000,
    owner: "Alicia Moore",
    urgency: 3,
    watchlist: "Cleanup",
    nextAction: "Use review-site proof and legacy roadmap framing.",
    truthSummary: "Legacy bundle confusion is slowing the deal, but product risk is manageable.",
    actionPlan: ["Open source ledger", "Save view", "Add proof appendix"],
    evidenceCount: 2,
    sourceCoverage: 2,
    freshness: "2h ago",
  },
];

export const DEMO_ALERT_DETAILS: DemoAlertDetail[] = [
  {
    id: "threat-1",
    competitorId: "gong",
    severity: "critical",
    title: "Gong pricing pressure on Acme Bank and Northstar Health",
    source: "Pricing Watch",
    timestamp: hoursAgo(1),
    summary: "Pricing exception plus waived platform fee detected in two active enterprise cycles.",
    whyOakwellBelieves: "Oakwell matched field notes against the pricing snapshot and a recent pricing artifact captured from Gong’s enterprise path.",
    action: "Trigger executive escalation, open pricing proof pack, and update Sidekick response cards.",
    linkedDealIds: ["acme-bank", "northstar-health"],
    evidenceIds: ["gong-price-exception", "gong-claim-gap"],
  },
  {
    id: "threat-2",
    competitorId: "clari",
    severity: "high",
    title: "Clari autonomous narrative outrunning product reality",
    source: "Product Marketing",
    timestamp: hoursAgo(3),
    summary: "RevAI 2.1 marketing language is ahead of support and implementation documentation.",
    whyOakwellBelieves: "Launch pages, help-center docs, and services notes disagree on what is live versus roadmap.",
    action: "Route contradiction brief to active Clari deals and mark for exec review.",
    linkedDealIds: ["northstar-health", "solstice-cloud"],
    evidenceIds: ["clari-doc-gap", "clari-cost-band"],
  },
  {
    id: "threat-3",
    competitorId: "crayon",
    severity: "high",
    title: "Crayon services expansion increasing enterprise narrative pressure",
    source: "Hiring Signal",
    timestamp: hoursAgo(6),
    summary: "Enablement and analyst operations hiring suggests a bigger managed-service motion.",
    whyOakwellBelieves: "Hiring mix and packaging copy both point to service-led differentiation rather than product automation.",
    action: "Lead with live workflow differentiation and route discovery deals into Sidekick-guided playbook.",
    linkedDealIds: ["atlas-security", "meridian-fintech"],
    evidenceIds: ["crayon-bundle", "crayon-hiring"],
  },
];

export const DEMO_WATCHLIST_SUMMARY = {
  trackedCompetitors: 6,
  trackedSegments: 5,
  dealsAtRisk: 5,
  changes24h: 9,
  changes7d: 27,
  executiveRisks: 3,
};

export const DEMO_COMMAND_CENTER_CHANGES = [
  { title: "Pricing pressure escalated", detail: "Gong discount exception now touches $730K across two committee motions.", href: "/alerts" },
  { title: "Narrative drift detected", detail: "Clari autonomous claim expanded while support docs remain batch-oriented.", href: "/targets" },
  { title: "Evidence coverage improved", detail: "31 proof artifacts now cover top 6 competitors with fresh timestamps.", href: "/deals" },
  { title: "Executive risk tightened", detail: "61% of at-risk ARR is concentrated in Gong and Clari influenced accounts.", href: "/executive" },
];

export const DEMO_ENTITY_GRAPH = {
  center: "gong",
  nodes: [
    { id: "gong", label: "Gong", type: "competitor", tone: "critical" },
    { id: "acme-bank", label: "Acme Bank", type: "deal", tone: "critical" },
    { id: "northstar-health", label: "Northstar Health", type: "deal", tone: "high" },
    { id: "enterprise-sales", label: "Enterprise Sales", type: "segment", tone: "info" },
    { id: "pricing-watch", label: "Pricing Watch", type: "source", tone: "live" },
    { id: "forecast-claim", label: "Forecast Claim", type: "theme", tone: "alert" },
    { id: "clari", label: "Clari", type: "competitor", tone: "info" },
  ],
  edges: [
    { from: "gong", to: "acme-bank", label: "$420K exposed" },
    { from: "gong", to: "northstar-health", label: "$310K adjacent" },
    { from: "gong", to: "enterprise-sales", label: "Shared segment" },
    { from: "gong", to: "pricing-watch", label: "14 sources" },
    { from: "gong", to: "forecast-claim", label: "Claim drift" },
    { from: "gong", to: "clari", label: "Exec overlap" },
  ],
};
