# OAKWELL — Product & Architecture Overview

> **⚠️ NOTE: High-Level Overview Only**
> This document provides a conceptual understanding of Oakwell for onboarding, product narrative, and investor context. It is **not** the operational source of truth. 
> 
> For active engineering, immediate next steps, and live configuration, refer to:
> 1. `AGENTS.md` (System Rules & Handoffs)
> 2. `docs/handoffs/current-state.md` (Current Engineering Status)
> 3. `docs/handoffs/next-session.md` (Immediate Tasks)

---

## Table of Contents

1. [What Is Oakwell?](#1-what-is-oakwell)
2. [The Problem We Solve](#2-the-problem-we-solve)
3. [How Oakwell Works (30-Second Summary)](#3-how-oakwell-works-30-second-summary)
4. [Architecture Overview](#4-architecture-overview)
5. [Tech Stack](#5-tech-stack)
6. [Repository Structure](#6-repository-structure)
7. [Backend Deep-Dive (FastAPI + AI Agents)](#7-backend-deep-dive)
8. [Frontend Deep-Dive (Next.js Dashboard)](#8-frontend-deep-dive)
9. [Agent System — The Brain](#9-agent-system--the-brain)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [API Reference](#11-api-reference)
12. [Data Flow: What Happens When a User Analyzes a Deal](#12-data-flow)
13. [Future Roadmap](#13-future-roadmap)
14. [Cost & Credits](#14-cost--credits)
15. [How a Real Company Would Use Oakwell](#15-how-a-real-company-would-use-oakwell)
16. [File-by-File Reference](#16-file-by-file-reference)

---

## 1. What Is Oakwell?

**Oakwell is an Autonomous Revenue Defense Platform** that helps B2B sales teams win competitive deals.

Think of it as a **war room for sales reps** — it:
- **Scrapes competitor websites** in real-time using stealth Playwright browsers
- **Verifies competitor claims** with Gemini Vision AI (screenshots as proof)
- **Generates adversarial talk-tracks** — exact scripts a rep should say on a call
- **Monitors competitor pricing/features 24/7** and alerts via Slack when something changes
- **Coaches reps live during calls** by detecting competitor mentions in real-time

**In one sentence:** Oakwell is the sales rep's unfair advantage — it knows what the competitor is doing before the competitor's own sales team does.

---

## 2. The Problem We Solve

| Problem | How Oakwell Fixes It |
|---------|---------------------|
| Sales reps go into competitive calls unprepared | Oakwell generates battle cards with **visual proof** (screenshots) |
| Competitors lie about pricing/features | Oakwell **screenshots their website** and uses Vision AI to fact-check |
| No one monitors competitor product changes | Oakwell's **Market Sentinel** auto-scans competitors hourly |
| Battle cards are outdated Word docs | Oakwell generates **live HTML battle cards** with AI |
| Reps don't know what to say when a competitor is mentioned | Oakwell's **Live Sidekick** feeds coaching cards during calls |
| Sales leaders have no visibility into competitive deals | Oakwell's **Executive Portal** shows ARR, win rates, and market share |

**Target Customers:** B2B SaaS companies ($5M-$500M ARR) with 10-500 sales reps selling against known competitors (Gong, Clari, HubSpot, Salesforce, etc.)

---

## 3. How Oakwell Works (30-Second Summary)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUTS                               │
│  1. Paste a sales call transcript                            │
│  2. Enter the competitor's website URL                       │
│  3. (Optional) Set deal stage, value, Slack webhook          │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│               OAKWELL AI PIPELINE (~2 min)                   │
│                                                              │
│  Step 1: Extract claims from transcript (Gemini Flash)       │
│  Step 2: Screenshot competitor website (Playwright stealth)  │
│  Step 3: Verify each claim against screenshot (Gemini Vision)│
│  Step 4: Deep search Reddit/G2/X for sentiment              │
│  Step 5: Score deal health (0-100)                           │
│  Step 6: Write adversarial talk-track (Gemini 2.5 Pro)       │
│  Step 7: War-game strategy as competitor CEO (Gemini 2.5 Pro)│
│  Step 8: Auto-harden if strategy rejected                    │
│  Step 9: Save to Firestore Neural Memory                     │
│  Step 10: Alert Slack if critical risk detected              │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│              OUTPUTS                                         │
│  • Deal Health Score (0-100) with risk level                 │
│  • Adversarial talk-track (exact words to say)               │
│  • Visual proof screenshots (downloadable PNGs)              │
│  • Clash report (buyer claims disproven by evidence)         │
│  • Market drift alerts (pricing/feature changes)             │
│  • Follow-up email draft                                     │
│  • Slack alert (if score < 50 or strategy rejected)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Architecture Overview

```
                                 ┌────────────────────┐
                                 │   oakwll.com        │
                                 │   (Vercel)          │
                                 │   Next.js 16 App    │
                                 │   + Clerk Auth      │
                                 └────────┬───────────┘
                                          │ HTTPS
                                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    GCP Cloud Run                              │
│                    (us-central1)                              │
│                                                               │
│  ┌──────────────────┐    ┌───────────────────────────────┐   │
│  │  Streamlit UI    │    │  FastAPI Backend               │   │
│  │  (Port 8501)     │    │  (Port 8080)                   │   │
│  │                  │◄──►│                                │   │
│  │  • War Room      │    │  POST /analyze-deal            │   │
│  │  • Sentinel      │    │  POST /live-snippet            │   │
│  │  • Live Sidekick │    │  POST /generate-email          │   │
│  │  • Deal Analysis │    │  GET  /deal-status/{id}        │   │
│  └──────────────────┘    │  GET  /memory                  │   │
│                          │  GET  /competitor-trend         │   │
│                          │  GET  /proof/{filename}         │   │
│                          │  POST /record-outcome           │   │
│                          │  GET  /winning-patterns          │   │
│                          │  GET  /sentinel-status           │   │
│                          └───────────┬───────────────────┘   │
│                                      │                        │
│  ┌───────────────────────────────────┼──────────────────────┐│
│  │           AI / External Services  │                      ││
│  │                                   │                      ││
│  │  ┌─────────────┐  ┌─────────────┐│  ┌─────────────────┐ ││
│  │  │ Gemini 2.0  │  │ Gemini 2.5  ││  │   Playwright    │ ││
│  │  │ Flash       │  │ Pro         ││  │   (Chromium)    │ ││
│  │  │ (fast tasks)│  │ (reasoning) ││  │   Stealth mode  │ ││
│  │  └─────────────┘  └─────────────┘│  └─────────────────┘ ││
│  │                                   │                      ││
│  │  ┌─────────────┐  ┌─────────────┐│  ┌─────────────────┐ ││
│  │  │ Google      │  │ Firestore   ││  │   Slack         │ ││
│  │  │ Search API  │  │ (Database)  ││  │   Webhooks      │ ││
│  │  └─────────────┘  └─────────────┘│  └─────────────────┘ ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**Two deployment targets:**
1. **Cloud Run (GCP)** — Runs both the FastAPI backend (port 8080) and the Streamlit demo UI (port 8501) in one container. This is the **AI brain**. (Note: Ports are actively being configured via `start.sh`; see `current-state.md` for live status.)
2. **Vercel** — Runs the production Next.js dashboard at `oakwll.com`. This is the **customer-facing product**.

---

## 5. Tech Stack

### Backend (AI Engine)

| Technology | Purpose | Why We Chose It |
|-----------|---------|-----------------|
| **Python 3.9** | Core language | AI/ML ecosystem, Google ADK support |
| **FastAPI** | REST API framework | Async-native, auto-docs, type-safe |
| **Google ADK (Agent Development Kit)** | Multi-agent orchestration | Native Gemini integration, SequentialAgent/ParallelAgent patterns |
| **Gemini 2.0 Flash** | Fast AI tasks (claim extraction, scoring, classification) | Sub-second latency, vision-capable |
| **Gemini 2.5 Pro** | Deep reasoning (talk-tracks, adversarial war-gaming, SWOT) | Highest reasoning quality for strategic synthesis |
| **Playwright** | Stealth web browser automation | Renders React/JS sites, bypasses bot detection |
| **Google Cloud Firestore** | NoSQL database for deal memory | Serverless, real-time, per-document pricing fits our data model |
| **Streamlit** | Internal demo UI | Fast prototyping, visual debugging of AI outputs |
| **markdownify** | HTML → Markdown conversion | Converts scraped web pages into LLM-friendly text |
| **Slack Incoming Webhooks** | Alert delivery | Zero-install integration for sales teams |

### Frontend (Production Dashboard)

| Technology | Purpose | Why We Chose It |
|-----------|---------|-----------------|
| **Next.js 16.1.6** | React framework with App Router | Server components, route groups, Turbopack builds |
| **TypeScript** | Type-safe JavaScript | Prevents bugs, better DX |
| **Tailwind CSS 4** | Utility-first CSS framework | Terminal-dark theme, rapid styling |
| **Clerk v5** | Authentication & user management | Google SSO, dark theme, org management, middleware protection |
| **Recharts** | Data visualization | Revenue charts, forecast graphs, market share donut |
| **Framer Motion** | Animations | Landing page scroll animations, route transitions |
| **Geist Sans/Mono** | Typography | Professional, terminal-inspired Vercel aesthetic |
| **Lucide React** | Icon library | Consistent iconography across all screens |

### Infrastructure

| Technology | Purpose | Cost |
|-----------|---------|------|
| **Google Cloud Run** | Container hosting for backend | ₹27,256 free credits (expires May 27, 2026) |
| **Google Cloud Build** | CI/CD — auto-builds from GitHub push | Included in free credits |
| **Vercel (Hobby)** | Frontend hosting + CDN | Free tier |
| **Hostinger** | Domain registrar for oakwll.com | Paid (DNS configured) |
| **GitHub** | Source control | Free (private repo) |

---

## 6. Repository Structure

```
oakwell/                          ← Root repository (GitHub: dirghpatel16/oakwell)
│
├── main.py                       ← FastAPI backend (1,969 lines) — THE CORE
├── agent.py                      ← Google ADK agent pipeline (670 lines)
├── tools.py                      ← AI tools: Playwright, Vision, search (1,757 lines)
├── app.py                        ← Streamlit demo dashboard (1,365 lines)
├── __init__.py                   ← Python package marker
│
├── Dockerfile                    ← Container config for Cloud Run
├── start.sh                      ← Entrypoint: runs FastAPI (8080) + Streamlit (8501)
├── requirements.txt              ← Python dependencies
│
├── Oakwell/                      ← Agent YAML configs (Google ADK Agent Builder format)
│   ├── root_agent.yaml           ← Root orchestrator (Gemini 2.5 Flash)
│   ├── SignalScanner.yaml        ← ParallelAgent → runs 3 scanners simultaneously
│   ├── PricingWatcher.yaml       ← Watches competitor pricing pages
│   ├── HiringSignalAgent.yaml    ← Detects hiring surges (churn indicator)
│   ├── MessagingShiftAgent.yaml  ← Detects ICP/positioning changes
│   ├── StrategicEngine.yaml      ← SequentialAgent → 4-step strategy pipeline
│   ├── AdversarialSimulator.yaml ← Simulates competitor's best counter-attack
│   ├── ActionAgent.yaml          ← Generates tactical next moves
│   ├── ConfidenceAgent.yaml      ← Validates intelligence quality (0-100)
│   ├── FinalSynthesizerAgent.yaml← Executive-ready synthesis
│   └── ImpactAgent.yaml          ← Assesses strategic implications (standalone)
│
├── outputs/                      ← Generated artifacts (screenshots, battle cards, reports)
│   └── memory.json               ← Local fallback for Firestore (deal history)
│
├── website-2/                    ← Next.js 16 production dashboard (Vercel: oakwll.com)
│   ├── package.json              ← Node.js dependencies
│   ├── next.config.ts            ← Next.js configuration
│   ├── tailwind.config.ts        ← Tailwind CSS config
│   ├── tsconfig.json             ← TypeScript configuration
│   ├── .env.local                ← Clerk API keys (NOT in git)
│   │
│   └── src/
│       ├── middleware.ts          ← Clerk auth middleware (protects /dashboard/*)
│       │
│       ├── app/
│       │   ├── layout.tsx         ← Root layout (ClerkProvider, fonts, metadata)
│       │   ├── page.tsx           ← Landing page (oakwll.com — marketing)
│       │   ├── globals.css        ← Terminal theme (20+ CSS vars, Geist font setup)
│       │   │
│       │   ├── (auth)/            ← Route group: authentication
│       │   │   ├── sign-in/       ← Clerk Sign In page
│       │   │   └── sign-up/       ← Clerk Sign Up page
│       │   │
│       │   ├── (dashboard)/       ← Route group: protected customer dashboard
│       │   │   ├── layout.tsx     ← Wraps DemoModeProvider (false) + Clerk UserButton
│       │   │   └── dashboard/     ← Production logic pages (deals, alerts, targets, etc.)
│       │   │
│       │   ├── (demo)/            ← Route group: public investor demo dashboard
│       │   │   ├── layout.tsx     ← Wraps DemoModeProvider (true) + Demo Banner
│       │   │   └── demo/          ← Page re-exports sharing identical UI with mock data
│       │   │
│       │   └── onboarding/
│       │       └── page.tsx       ← 5-step onboarding wizard
│       │
│       ├── lib/
│       │   ├── demo-data.ts       ← Rich mock data engine for 6 competitors
│       │   ├── demo-context.tsx   ← Provider managing the `forced` demo lock
│       │   ├── hooks.ts           ← Demo-aware data fetching hooks
│       │   ├── utils.ts           ← Utility functions (cn, formatCurrency, severityColors)
│       │   └── websocket-context.tsx ← Realtime/simulated alert provider
│       │
│       └── components/
│           ├── dashboard-shell.tsx ← Shared sidebar and header shell
│           └── live-activity.tsx   ← LiveActivityPanel, ConnectionStatus, NotificationBell
│
└── .env                           ← Google API keys (NOT in git)
```

---

## 7. Backend Deep-Dive

### `main.py` — FastAPI Backend (~2,000 lines)

This is the **brain of Oakwell**. It's a FastAPI app designed to run on port 8080 via Cloud Run.

**Key Concepts:**

#### 7.1 Deal Analysis Pipeline (`run_oakwell_analysis`)
The central async function that orchestrates the full analysis. Here's what happens step-by-step:

1. **Load Neural Memory** — Check Firestore for prior analysis of this competitor URL
2. **Smart Cache** — If last analysis was < 1 hour ago, skip Playwright (reuse screenshots)
3. **Extract Claims** — Use Gemini Flash to pull specific claims from the sales transcript (e.g., "They charge $50/seat", "Free trial is 14 days")
4. **Batch Screenshot** — Launch ONE stealth Playwright browser, capture a full-page screenshot of the competitor site
5. **Parallel Verification** — Verify each extracted claim against the screenshot using Gemini Vision (e.g., "Is it true that their starting price is $50/month?")
6. **Discrepancy Engine** — Cross-reference what the buyer *said* vs. what the screenshot *shows*. Any disproven claim becomes a "Critical Revenue Risk"
7. **Deep Market Search** — Search 6 sources (Reddit, G2, X, SEC filings, Glassdoor, Greenhouse) for unfiltered competitor intel
8. **Specialist #1: Deal Scorer** — Gemini Flash computes a deal health score (0-100) based on clashes, stage, historical patterns
9. **Specialist #2: Talk-Track Writer** — Gemini 2.5 Pro writes an adversarial talk-track (exact words to say)
10. **Adversarial Critic** — Gemini 2.5 Pro simulates the competitor's CEO stress-testing our strategy
11. **Auto-Harden** — If the critic REJECTS the strategy, re-run the talk-track writer with counter-attacks injected
12. **Save to Memory** — Persist everything to Firestore (score history, timeline, visual proof)
13. **Slack Alert** — If score < 50 or critic rejected, fire an alert to the configured Slack channel

#### 7.2 Deal Stage Playbooks
Oakwell adapts its strategy based on where the deal is:

| Stage | Aggression | Proof Usage | Tone |
|-------|-----------|-------------|------|
| **Discovery** | 0.3 | Light — mention proof, save for later | Consultative, pain-amplifying |
| **Technical Eval** | 0.5 | Heavy — show screenshots, run comparisons | Evidence-heavy, proof-centric |
| **Proposal** | 0.6 | Strategic — justify pricing, expose hidden costs | ROI-focused, value-anchoring |
| **Negotiation** | 0.8 | Nuclear — deploy everything as undeniable evidence | Firm, urgency-creating |
| **Closing** | 0.9 | Executive summary — boardroom-ready narrative | Decisive, risk-mitigating |

#### 7.3 Autonomous Market Watcher
On server startup, a background asyncio loop (`autonomous_market_watch`) runs indefinitely:
- Every hour (configurable via `WATCHER_INTERVAL` env var), it re-scans ALL tracked competitor URLs
- Compares current website state against historical memory
- If pricing changes, feature removals, or messaging shifts are detected → fires Slack alerts to all registered orgs

#### 7.4 Win/Loss Feedback Loop
After a deal closes, reps can record the outcome (`POST /record-outcome` — won/lost/stalled). Oakwell learns:
- Calculates win rate by competitor
- Identifies winning talk-track patterns vs. losing pitfalls
- Feeds this data back into future deal analyses for progressively smarter strategies

#### 7.5 Smart Caching
- If a competitor was analyzed within the last hour, Oakwell skips Playwright entirely
- Reuses the prior screenshot and visual proof
- Still re-generates the talk-track with fresh transcript context
- Saves ~60 seconds per analysis and reduces API costs

---

### `tools.py` — AI Tools (1,757 lines)

Every tool Oakwell's AI agents use lives here:

| Tool | What It Does | AI Model Used |
|------|-------------|---------------|
| `verify_claim_with_vision` | Opens stealth Playwright browser → screenshots competitor site → asks Gemini Vision "Is this claim true?" | Gemini 2.0 Flash (multimodal) |
| `capture_page_screenshot` | Stealth Playwright: user agent spoofing, webdriver hiding, scroll-to-load, random delays | None (browser automation) |
| `verify_claim_against_screenshot` | Takes pre-captured screenshot bytes + a claim → Gemini Vision analyzes | Gemini 2.0 Flash |
| `scrape_competitor_website` | Full-page scrape → converts HTML to clean Markdown using markdownify | None (browser + markdownify) |
| `calculate_market_delta` | Compares current vs. historical data → identifies pricing/feature changes | Gemini 2.0 Flash |
| `generate_battle_card_html` | Creates professional HTML battle card for sales teams | Gemini 2.0 Flash |
| `generate_comparison_chart` | Creates visual comparison infographic (attempts image generation) | Gemini 2.0 Flash |
| `generate_closing_email` | Writes a competitive follow-up email referencing proof | Gemini 2.0 Flash |
| `generate_pdf_report_content` | Produces a formatted text report for PDF export | None (text formatting) |
| `generate_executive_summary` | Markdown executive brief with deal health, trend, clashes, verdict | None (text formatting) |
| `deep_market_search` | Scrapes Reddit/G2/X/SEC/Glassdoor/Greenhouse → LLM extracts intel | Playwright + Gemini 2.0 Flash |
| `send_slack_alert` | Sends Block Kit Slack message via incoming webhook | None (HTTP POST) |
| `process_live_snippet` | Sub-second live-call classification (competitor mentions, pricing claims) | Gemini 2.0 Flash |

**Stealth Techniques (Playwright):**
- Realistic Chrome User-Agent string
- `navigator.webdriver = undefined` injection
- Google.com as referrer
- Random scroll patterns (scroll down, wait, scroll up)
- Random human-like delays (1-3 seconds between actions)
- HTTPS preference with `domcontentloaded` wait strategy

---

### `agent.py` — Google ADK Agent Pipeline (670 lines)

This file defines the **10-stage sequential pipeline** using Google's Agent Development Kit:

```
BattleCardPipeline (SequentialAgent)
│
├── Stage 1:  CompetitorResearchAgent      (Gemini 2.0 Flash + Google Search)
│             → Researches company overview, funding, pricing, news
│
├── Stage 2:  ProductFeatureAgent           (Gemini 2.0 Flash + Google Search)
│             → Deep-dives features, integrations, technical architecture
│
├── Stage 3:  PositioningAnalyzer           (Gemini 2.0 Flash + Google Search)
│             → Analyzes messaging, taglines, persona targeting, analyst coverage
│
├── Stage 4:  FactVerifier                  (Gemini 2.0 Flash + verify_claim_with_vision)
│             → Screenshots competitor site, verifies top 3 claims with Vision AI
│
├── Stage 5:  DeepMarketSearchAgent         (Gemini 2.0 Flash + deep_market_search)
│             → Scrapes Reddit/G2/X + SEC/Glassdoor/Greenhouse for unfiltered intel
│
├── Stage 6:  StrengthsWeaknessesAgent      (Gemini 2.5 Pro)
│             → Brutally honest SWOT analysis using all prior stages
│
├── Stage 7:  AdversarialCriticAgent        (Gemini 2.5 Pro)
│             → War-games the strategy as the competitor CEO
│
├── Stage 8:  ObjectionHandlerAgent         (Gemini 2.0 Flash)
│             → 10 objection scripts + killer questions + trap phrases
│
├── Stage 9:  BattleCardGenerator           (Gemini 2.0 Flash + generate_battle_card_html)
│             → Professional HTML battle card with all intelligence compiled
│
└── Stage 10: ComparisonChartAgent          (Gemini 2.0 Flash + generate_comparison_chart)
              → Visual comparison infographic
```

**Root Agent: OakwellStrategist** (Gemini 2.5 Pro) — Sits above the pipeline, orchestrates the flow, resolves contradictions between research and visual proof, and applies "AGI Strategic Overrides" when market truth conflicts with assumptions.

---

### `app.py` — Streamlit Demo UI (~1,300 lines)

The original prototype dashboard built with Streamlit. Runs internally on port 8501 inside the Cloud Run container.

**3 Tabs:**
1. **War Room: Deal Analysis** — Paste transcript, enter competitor URL, select deal stage, run full analysis. Shows live progress ticker, deal health score, adversarial talk-track, clashes, visual proof screenshots, market drift alerts, and email generation.
2. **Market Sentinel: Competitor Drift** — View the Autonomous Watcher status, browse all tracked competitors from Firestore, see pricing/feature change history.
3. **Live Meeting Sidekick** — Paste live-call snippets, get sub-second competitor/pricing detection with urgency scoring and optional auto-verification.

**Sidebar Features:**
- Google API Key input (passed to backend)
- Slack Sentinel configuration (webhook URL + test button)
- Backend health check
- Live War Room Pulse (real-time ticker from Firestore timeline data)

---

## 8. Frontend Deep-Dive

### `website-2/` — Next.js 16 Dashboard (Vercel: oakwll.com)

This is the **production customer-facing dashboard**. Currently running with mock data — designed to be wired to the Cloud Run backend.

#### 8.1 Authentication Flow
```
User visits oakwll.com
    ↓
Landing page (/) — marketing site with animations
    ↓
Clicks "Get Started" or "Sign In"
    ↓
Clerk auth (/sign-in or /sign-up) — Google SSO or email/password
    ↓
Middleware (src/middleware.ts) protects /dashboard/*
    ↓
Dashboard loads with sidebar, header, WebSocket connection
```

**Clerk Configuration:**
- Publishable key and secret key stored in `.env.local` (NOT pushed to git)
- Must be added to Vercel Environment Variables for production
- Dark theme with custom blue accent via `@clerk/themes`

#### 8.2 Dual Dashboard Architecture

The frontend is separated into two identical-looking route groups powered by `DashboardShell`:

**1. `/dashboard/*` (Production/Customer)**
- Fully protected by Clerk middleware.
- Connects to real FastAPI endpoints.
- Displays live pipeline, deal analysis, and actual alert feeds.

**2. `/demo/*` (Investor/Demo)**
- Publicly accessible.
- Uses `DemoModeProvider forced={true}` to intercept all hooks.
- Fully populated with `demo-data.ts` (6 competitors: Gong, Clari, Salesforce Einstein, etc.).
- Alerts and progress animations are elegantly simulated for a flawless pitch.

#### 8.3 WebSocket System (`websocket-context.tsx`)
Currently **simulated** — ready for real socket.io swap:
- `WebSocketProvider` wraps the dashboard layout
- Simulates connection after 1.2s, heartbeat every 5s
- `triggerScan()` — simulates a multi-step agent operation (connecting → scanning → extracting → verifying → generating strategy → complete)
- `triggerDealAnalysis()` — similar simulation for deal analysis
- Generates random alerts every ~15 seconds
- When wired to real backend: replace simulated setTimeout chains with socket.io event listeners

#### 8.4 Terminal Design System
The dashboard uses a distinct "military command center" aesthetic:
- **20+ CSS custom properties** for consistent dark theming (`--oak-bg-primary: #050505`, etc.)
- 6 custom animations: `shimmer` (progress bars), `pulse-ring` (live indicators), `blink` (terminal cursor), `slide-in-right`, `fade-up`, `scanline`
- Monospace fonts (JetBrains Mono) for data displays
- Green accent (`#00ff88`) for "system active" states
- Red accent for critical alerts
- Mobile-responsive: hamburger menu, collapsible sidebar

---

## 9. Agent System — The Brain

### 9.1 Dual Agent Architecture

Oakwell has **two agent systems** that serve different purposes:

#### System A: ADK Pipeline (`agent.py`) — Battle Card Generation
Used via Google ADK Agent Builder or the `OakwellStrategist` root agent.
- **10-stage sequential pipeline** for comprehensive battle card generation
- Takes 3-5 minutes for a full run
- Produces: HTML battle card, comparison chart, objection scripts
- Best for: Pre-call preparation, deep competitor research

#### System B: FastAPI Specialists (`main.py`) — Real-Time Deal Analysis
Used via `POST /analyze-deal` API endpoint.
- **Decomposed specialist architecture** for speed
- Parallel claim extraction + screenshot capture
- Two specialist models: Scorer (Flash) + Talk-Track Writer (Pro)
- Takes 1-3 minutes for a complete analysis
- Produces: Deal health score, talk-track, clash report, follow-up email
- Best for: During/after-call analysis, live deal intelligence

### 9.2 YAML Agent Configs (`Oakwell/` directory)
These define the **Agent Builder** version of the system — a second architecture optimized for the Google ADK Agent Builder UI:

```
Oakwell (root — LlmAgent, Gemini 2.5 Flash)
│
├── SignalScanner (ParallelAgent — runs 3 agents simultaneously)
│   ├── PricingWatcher        → Screenshots pricing pages, extracts hidden fees
│   ├── HiringSignalAgent     → Detects competitor hiring surges
│   └── MessagingShiftAgent   → Detects ICP/vertical repositioning
│
└── StrategicEngine (SequentialAgent — 4-step strategy pipeline)
    ├── AdversarialSimulator  → Role-plays as competitor's top sales exec
    ├── ActionAgent           → Generates tactical next moves (JSON)
    ├── ConfidenceAgent       → Validates intel quality (0-100 score)
    └── FinalSynthesizerAgent → Executive-ready synthesis
```

**Recursive Logic:** If ConfidenceAgent returns < 85, the root Oakwell agent autonomously re-runs the pipeline with "Deep Research" commands.

---

## 10. Infrastructure & Deployment

### 10.1 Cloud Run (Backend)

**Service URL:** `https://oakwell-570217803515.us-central1.run.app`
**Region:** us-central1
**Scaling:** Auto (min: 0, max: 3)
**Container:** Python 3.9 slim + Chromium (Playwright)

**Deployment Flow:**
```
Push to GitHub (main branch)
    ↓
Google Cloud Build trigger fires automatically
    ↓
Builds Docker image from Dockerfile
    ↓
Deploys to Cloud Run (blue-green deployment)
    ↓
Live at the service URL
```

**What the container runs (`start.sh`):**
```bash
streamlit run app.py --server.port 8501 --server.address 0.0.0.0 &  # Streamlit UI
uvicorn main:app --host 0.0.0.0 --port 8080                         # FastAPI backend
```

**Port 8080** is exposed to Google Cloud (the FastAPI app). Streamlit runs internally on 8501.

### 10.2 Vercel (Frontend)

**Production URL:** `oakwll.com`
**Vercel URLs:**
- `oakwell-git-main-dirgh8011patel-5219s-projects.vercel.app`
- `oakwell-dx1h7ap9p-dirgh8011patel-5219s-projects.vercel.app`

**Deployment Flow:**
```
Push to GitHub (main branch)
    ↓
Vercel auto-detects Next.js project in website-2/
    ↓
Builds with Turbopack (38s build time)
    ↓
Deploys to Vercel Edge Network
    ↓
Live at oakwll.com
```

**CRITICAL: Environment Variables**
These must be set in Vercel → Settings → Environment Variables (they're NOT in git):

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_bW92aW5nLXR1cnRsZS0xMi5jbGVyay5hY2NvdW50cy5kZXYk` | Clerk frontend auth |
| `CLERK_SECRET_KEY` | (from .env.local) | Clerk server-side auth |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Auth redirect |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Auth redirect |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` | Post-login redirect |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` | Post-signup redirect |

**Without these, the middleware throws `MIDDLEWARE_INVOCATION_FAILED` (500 error).**

### 10.3 Firestore (Database)

**Project:** `gen-lang-client-0830900967`
**Collections:**
- `oakwell_deals` — Stores all competitor analysis results (deal scores, talk-tracks, visual proof summaries, timelines)
- `oakwell_outcomes` — Stores win/loss feedback (outcome, deal value, stage, reason, associated score)

**Document ID:** Competitor URL with slashes replaced by `__` (e.g., `www.hubspot.com__pricing` → Firestore document ID)

**Schema per document (oakwell_deals):**
```json
{
  "competitor_url": "https://www.gong.io/pricing",
  "deal_health_score": 42,
  "talk_track": "...",
  "transcript": "...",
  "clashes_detected": [...],
  "visual_proof_summary": [...],
  "proof_filenames": ["proof_143822_4291.png"],
  "market_drift": null,
  "score_history": [65, 52, 42],
  "timeline": [
    {"ts": "2026-03-18T...", "score": 42, "top_clash": "Pricing is not $50/seat"}
  ],
  "analysis_count": 3,
  "last_analysis_ts": "2026-03-18T17:54:00+00:00"
}
```

---

## 11. API Reference

### Core Endpoints

#### `POST /analyze-deal`
**The main endpoint.** Starts a background deal analysis job.

```json
// Request
{
  "transcript": "Buyer says Gong charges $50/seat...",
  "competitor_url": "https://www.gong.io/pricing",
  "competitor_name": "Gong",
  "your_product": "Oakwell",
  "deal_stage": "negotiation",        // discovery | technical_eval | proposal | negotiation | closing
  "deal_value": 150000,
  "slack_webhook_url": "https://hooks.slack.com/services/T.../B.../...",
  "org_id": "acme-corp"
}

// Response (immediate — 200)
{
  "job_id": "a1b2c3d4-..."
}
```

#### `GET /deal-status/{job_id}`
Poll this to check analysis progress.

```json
// Response
{
  "job_id": "a1b2c3d4-...",
  "status": "running",              // pending | running | completed | failed
  "progress_message": "Verifying claim 3/10: Free trial is 14 days…",
  "result": null,                    // populated when status = completed
  "error": null
}
```

When completed, `result` contains:
```json
{
  "deal_health_score": 42,
  "risk_level": "high",
  "score_reasoning": "Multiple clashes...",
  "talk_track": "Exact script for the rep...",
  "clashes_detected": [...],
  "proof_artifact_path": "proof_143822_4291.png",
  "all_proof_filenames": ["proof_143822_4291.png"],
  "market_drift": null,
  "score_history": [65, 52, 42],
  "trend": "Declining 📉",
  "deep_sentiment": {...},
  "adversarial_critique": {...},
  "deal_stage": "negotiation",
  "deal_value": 150000,
  "key_pivot_points": [...],
  "stage_specific_actions": [...],
  "winning_patterns_summary": {...},
  "auto_hardened": false
}
```

#### `POST /live-snippet`
Sub-second live-call analysis.

```json
// Request
{
  "snippet": "The buyer just said they're looking at Gong and it's $50/seat",
  "competitor_url": "https://www.gong.io/pricing",
  "urgency_threshold": 0.5
}

// Response
{
  "status": "analysed",
  "competitor_mentioned": true,
  "competitors": ["Gong"],
  "claim_detected": "Gong pricing is $50/seat",
  "pricing_claims": [{"claim": "$50/seat", "competitor": "Gong", "confidence": 0.85}],
  "urgency": 0.5,
  "urgency_label": "high",
  "has_actionable_claim": true,
  "verification_triggered": true,
  "verification_results": [...]
}
```

#### Other Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check (returns `{"status": "ok"}`) |
| `/memory` | GET | Full Firestore memory bank |
| `/competitor-trend?url=...` | GET | Score history & trend for one competitor |
| `/proof/{filename}` | GET | Serve a proof screenshot PNG |
| `/generate-email` | POST | Generate follow-up email from job results |
| `/executive-summary/{job_id}` | GET | Markdown executive brief |
| `/record-outcome` | POST | Record deal won/lost/stalled for feedback loop |
| `/winning-patterns?url=...` | GET | Win rate & patterns from historical outcomes |
| `/sentinel-status` | GET | Show all watched URLs and watcher config |

---

## 12. Data Flow

### What Happens When a User Clicks "Run Scan" in the Dashboard

```
1. Dashboard calls POST /analyze-deal with transcript + competitor URL
2. Backend creates job_id, returns immediately
3. Dashboard polls GET /deal-status/{job_id} every 2 seconds

4. Backend (background task):
   a. Loads Firestore memory for this competitor
   b. Checks smart cache — skip Playwright if < 1 hour old
   c. Uses Gemini Flash to extract 10+ claims from transcript
   d. Launches ONE stealth Playwright browser → screenshots competitor site
   e. Verifies each claim against the screenshot (Gemini Vision)
   f. Runs discrepancy engine (transcript vs. visual proof)
   g. Scrapes Reddit/G2/X/SEC/Glassdoor/Greenhouse for deep intel
   h. Specialist #1 (Gemini Flash) scores the deal (0-100)
   i. Specialist #2 (Gemini 2.5 Pro) writes the adversarial talk-track
   j. Adversarial Critic (Gemini 2.5 Pro) war-games the strategy
   k. If critic REJECTS → auto-hardens with kill-shot evidence
   l. Saves everything to Firestore (score_history, timeline, proof)
   m. If critical risk → fires Slack alert via webhook

5. Dashboard receives completed result → renders:
   - Deal health gauge
   - Adversarial talk-track
   - Clash cards (expandable)
   - Visual proof screenshots (linked via /proof/{filename})
   - Market drift timeline
   - Follow-up email generator
```

---

## 13. Future Roadmap

### Phase 5: Wire Real Data (Next Sprint)
- [ ] Replace all mock data in Next.js dashboard with `fetch()` calls to Cloud Run backend
- [ ] Deal Desk → `POST /analyze-deal` with real transcript
- [ ] Market Sentinel → real competitor scan data from `/memory`
- [ ] Threat Intel → real alert feed from Firestore timeline

### Phase 6: Real WebSocket Connection
- [ ] Install socket.io on both backend (FastAPI) and frontend (Next.js)
- [ ] Replace simulated WebSocket context with real event listeners
- [ ] Stream live progress messages during analysis
- [ ] Push real-time alerts from Market Watcher to dashboard

### Phase 7: CRM Integrations
- [ ] HubSpot OAuth — sync deals, contacts, pipeline stages
- [ ] Salesforce OAuth — enterprise CRM connection
- [ ] Auto-import deal transcripts from Gong/Chorus
- [ ] Bi-directional sync: Oakwell scores → CRM custom fields

### Phase 8: Production Hardening
- [ ] Clerk production keys (swap from test to live)
- [ ] Rate limiting on all API endpoints
- [ ] Multi-tenant org isolation in Firestore
- [ ] Row-level security for deal data
- [ ] Proper error boundaries in Next.js
- [ ] Sentry monitoring on both backend and frontend

### Phase 9: Revenue Features
- [ ] Team management (invite reps, managers, executives)
- [ ] Deal assignment and notification routing
- [ ] Custom battle card templates per industry
- [ ] Chrome extension for in-browser competitor analysis
- [ ] Mobile app (React Native) for Live Sidekick during calls

---

## 14. Cost & Credits

### Current GCP Credits
- **Amount:** ₹27,256 (~$325 USD) in free credits
- **Expires:** May 27, 2026
- **Project:** `gen-lang-client-0830900967`

### What Burns Credits
| Service | Estimated Cost | Frequency |
|---------|---------------|-----------|
| Cloud Run (container running) | ~₹50/day when active, ₹0 when idle | Scales to 0 |
| Gemini API calls (2.0 Flash) | ~₹0.5 per analysis (10 vision calls) | Per deal analysis |
| Gemini API calls (2.5 Pro) | ~₹2-5 per analysis (talk-track + critic) | Per deal analysis |
| Firestore reads/writes | ~₹0.1 per analysis | Per deal analysis |
| Cloud Build (CI/CD) | ~₹5 per build | Per git push |
| Playwright (CPU for browser) | Included in Cloud Run CPU | Per screenshot |

**Estimated burn rate:** ~₹100-200/day during active development and testing.
**Budget runway:** ~135-270 days at current rate (well within the May 27 expiry).

### Vercel (Frontend)
- **Free tier (Hobby):** 100GB bandwidth, serverless functions included
- **No cost** unless we exceed hobby limits (unlikely for demo/early users)

---

## 15. How a Real Company Would Use Oakwell

### Onboarding Flow (5 minutes)

```
Step 1: Company Setup
   → Company name, industry, team size
   → This determines which competitive templates to pre-load

Step 2: CRM Connection
   → Connect HubSpot or Salesforce via OAuth
   → Oakwell imports all active deals with competitor tags
   → Also connect call recorder (Gong/Chorus/Google Meet)

Step 3: Competitors
   → Add up to 5 competitors (name + website URL)
   → e.g., Gong (gong.io), Clari (clari.com), Chorus (chorus.ai)
   → Oakwell immediately begins initial scans

Step 4: Slack Integration
   → Connect Slack workspace
   → Configure channel routing:
     - #oak-critical-alerts  → Deal score < 40 or strategy rejected
     - #oak-deal-intel       → Every completed analysis
     - #oak-market-intel     → Competitor pricing/feature changes
     - #oak-weekly-digest    → Weekly summary report

Step 5: Deploy Agents
   → Oakwell runs initial scans on all competitors
   → Screenshots pricing pages, scrapes features
   → Builds baseline intelligence in Neural Memory
   → War Room populates with first data
```

### Daily Usage

**Sales Rep (Morning):**
1. Opens Oakwell → War Room shows pipeline at risk, win rate, active deals
2. Sees a critical alert: "Gong dropped Enterprise pricing by 15%"
3. Clicks into the deal → reads the AI-generated talk-track
4. Downloads the visual proof screenshot to reference in the call

**Sales Rep (During Call):**
1. Opens Live Sidekick on their phone/second monitor
2. As buyer mentions "Gong charges $50/seat", Oakwell detects it in real-time
3. Coaching card pops up: "Actually, Gong's published pricing shows $65/seat — here's the screenshot proof"
4. Rep uses the coaching card to redirect the conversation

**Sales Manager (Weekly):**
1. Opens Executive Portal → sees ARR trends, deal velocity, competitive win/loss
2. Reviews the AI Executive Summary (auto-generated insights)
3. Exports PDF report for the board meeting

**RevOps (Ongoing):**
1. Market Sentinel auto-scans competitors every hour
2. When Clari removes a feature → Slack alert fires to #oak-market-intel
3. When Gong raises pricing → Slack alert fires to #oak-critical-alerts
4. Settings page shows all integrations, API health, and scan history

---

## 16. File-by-File Reference

### Backend Files

| File | Lines | Description |
|------|-------|-------------|
| `main.py` | 1,969 | FastAPI app: API endpoints, deal analysis pipeline, market watcher, memory management, Firestore integration |
| `tools.py` | 1,757 | AI tools: Playwright browser automation, Gemini Vision verification, deep market search (6 sources), battle card generation, Slack alerts, live snippet processing |
| `agent.py` | 670 | Google ADK agent definitions: 10-stage battle card pipeline, root strategist agent, sequential + parallel orchestration |
| `app.py` | 1,365 | Streamlit demo UI: War Room, Market Sentinel, Live Sidekick tabs; sidebar with Slack config and live pulse ticker |
| `Dockerfile` | 46 | Python 3.9 slim + Chromium browser dependencies for Playwright |
| `start.sh` | 4 | Container entrypoint: starts FastAPI (port 8000) and Streamlit (port 8080) |
| `requirements.txt` | 11 | Python deps: google-adk, google-genai, fastapi, playwright, markdownify, streamlit, firestore |

### Agent YAML Configs (Oakwell/ directory)

| File | Agent Type | Model | Purpose |
|------|-----------|-------|---------|
| `root_agent.yaml` | LlmAgent | gemini-2.5-flash | Root orchestrator — coordinates signal scanning + strategy |
| `SignalScanner.yaml` | ParallelAgent | — | Runs 3 intelligence scanners simultaneously |
| `PricingWatcher.yaml` | LlmAgent | gemini-2.5-flash | Screenshots and analyzes competitor pricing |
| `HiringSignalAgent.yaml` | LlmAgent | gemini-2.5-flash | Detects hiring surges (churn indicators) |
| `MessagingShiftAgent.yaml` | LlmAgent | gemini-2.5-flash | Detects ICP/positioning changes |
| `StrategicEngine.yaml` | SequentialAgent | — | 4-step strategy refinement pipeline |
| `AdversarialSimulator.yaml` | LlmAgent | gemini-2.5-flash | Role-plays as competitor's sales exec |
| `ActionAgent.yaml` | LlmAgent | gemini-2.5-flash | Generates tactical next moves (JSON) |
| `ConfidenceAgent.yaml` | LlmAgent | gemini-2.5-flash | Validates intelligence quality (0-100) |
| `FinalSynthesizerAgent.yaml` | LlmAgent | gemini-2.5-flash | Executive-ready output synthesis |
| `ImpactAgent.yaml` | LlmAgent | gemini-2.5-flash | Strategic implications assessment (standalone) |

### Frontend Files (website-2/)

| File | Lines | Description |
|------|-------|-------------|
| `src/middleware.ts` | 20 | Clerk auth middleware — protects all `/dashboard/*` routes |
| `src/app/layout.tsx` | 46 | Root layout: ClerkProvider, Inter + JetBrains Mono fonts |
| `src/app/page.tsx` | 577 | Landing page: 8 animated sections, framer-motion scroll effects |
| `src/app/globals.css` | 155 | Terminal theme: 20+ CSS vars, 6 keyframe animations, scrollbar, print styles |
| `src/app/(dashboard)/layout.tsx` | 135 | Dashboard shell: sidebar, header, WebSocket provider, mobile menu |
| `src/app/(dashboard)/dashboard/page.tsx` | 193 | War Room: KPIs, deal table, sentinel feed, live scan trigger |
| `src/app/(dashboard)/dashboard/deals/page.tsx` | 230 | Deal Desk: split-pane, transcript, AI coaching sidebar |
| `src/app/(dashboard)/dashboard/targets/page.tsx` | 213 | Market Sentinel: competitor cards, change logs, force scan |
| `src/app/(dashboard)/dashboard/alerts/page.tsx` | 230 | Threat Intel: filterable alerts with severity, expandable cards |
| `src/app/(dashboard)/dashboard/forecast/page.tsx` | 192 | Revenue Forecast: 4 Recharts (pipeline, win rate, comp, loss reasons) |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | 205 | Settings: profile, integrations, Slack channels, API config |
| `src/app/(dashboard)/dashboard/executive/page.tsx` | 238 | Executive Portal: ARR, deal velocity, market share, AI summary |
| `src/app/(dashboard)/dashboard/sidekick/page.tsx` | 257 | Live Sidekick: call coaching, keyword detection, coaching cards |
| `src/app/onboarding/page.tsx` | 539 | Onboarding Wizard: 5-step setup with terminal-style deploy animation |
| `src/lib/websocket-context.tsx` | 173 | WebSocket simulation: connection status, scan triggers, alert generation |
| `src/components/live-activity.tsx` | 172 | 3 components: LiveActivityPanel, ConnectionStatus, NotificationBell |
| `src/lib/utils.ts` | 54 | Utilities: cn(), formatCurrency(), timeAgo(), severityColors |
| `src/app/(auth)/sign-in/.../page.tsx` | 7 | Clerk Sign In component (dark theme) |
| `src/app/(auth)/sign-up/.../page.tsx` | 7 | Clerk Sign Up component (dark theme) |

---

## Summary

**Total codebase:** ~10,000+ lines across backend + frontend

**Backend:** 4,396 lines of Python (main.py + tools.py + agent.py) powering an autonomous AI system that can independently research competitors, screenshot their websites, verify claims with Vision AI, generate battle cards, war-game strategies, detect market drift, and alert sales teams via Slack — all running as a single container on Google Cloud Run.

**Frontend:** 3,000+ lines of TypeScript/React across 18 files building a production-quality dashboard with 13 routes, terminal-style dark theme, Clerk authentication, real-time WebSocket simulation, and data visualizations — deployed on Vercel at oakwll.com.

**Agent System:** 11 specialized AI agents (6 using Gemini 2.0 Flash for speed, 5 using Gemini 2.5 Pro/Flash for deep reasoning) orchestrated via Google ADK's SequentialAgent and ParallelAgent patterns.

**The moat:** Oakwell doesn't just research competitors — it **screenshots their website and uses Vision AI to prove it**. Every claim in a battle card comes with a downloadable PNG as evidence. No other tool does this.

---

*This document provides a static high-level overview. Active engineering notes should be retrieved from `docs/handoffs/current-state.md`.*
