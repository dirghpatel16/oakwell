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
