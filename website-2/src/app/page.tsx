"use client";
import { useScroll, useTransform, motion, useInView } from "framer-motion";
import React, { useRef } from "react";
import { GoogleGeminiEffect } from "@/components/ui/google-gemini-effect";

/* ─── REVEAL WRAPPER ─── */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── LOGO SVG ─── */
function OakwellLogo({ size = 28, fill = "white" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" fill={fill} />
      <path d="M50 20C33.4 20 20 33.4 20 50s13.4 30 30 30 30-13.4 30-30S66.6 20 50 20zm0 52c-12.1 0-22-9.9-22-22s9.9-22 22-22c4.6 0 8.8 1.4 12.3 3.8C56.5 35.2 50 43.8 50 50c0 8.3 5.2 15.3 12.5 18.1C58.9 70.7 54.6 72 50 72z" fill="#030712" />
      <path d="M62 30c-3-2-7-3-10-3 5 3 9 9 9 16 0 7-4 13-9 16 3-1 7-3 10-5 5-5 8-11 8-18-2-3-5-5-8-6z" fill="#030712" opacity="0.6" />
    </svg>
  );
}

/* ─── NAVBAR ─── */
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-6 lg:px-10 backdrop-blur-xl bg-black/60 border-b border-white/[0.04]">
      <div className="flex items-center gap-2.5">
        <OakwellLogo size={24} />
        <span className="text-sm font-semibold tracking-tight text-white">Oakwell</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-[13px] text-neutral-500">
        <a href="#intelligence" className="hover:text-white transition-colors duration-200">Intelligence</a>
        <a href="#stealth" className="hover:text-white transition-colors duration-200">Stealth</a>
        <a href="#strategy" className="hover:text-white transition-colors duration-200">Strategy</a>
        <a href="#sentinel" className="hover:text-white transition-colors duration-200">Sentinel</a>
      </div>
      <a href="mailto:dirgh@oakwell.ai" className="px-5 py-2 text-xs font-medium text-black bg-white rounded-full hover:bg-neutral-200 transition-all duration-200">
        Request Access
      </a>
    </nav>
  );
}

/* ─── HERO WITH GEMINI EFFECT ─── */
function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.2, 1.2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0.15, 1.2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.1, 1.2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0.05, 1.2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);
  return (
    <div className="h-[300vh] bg-black w-full relative pt-20 overflow-clip" ref={ref}>
      <GoogleGeminiEffect
        title="Autonomous Revenue Defense"
        pathLengths={[pathLengthFirst, pathLengthSecond, pathLengthThird, pathLengthFourth, pathLengthFifth]}
      />
    </div>
  );
}

/* ─── SECTION NUMBER LABEL ─── */
function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span className="text-[13px] font-mono text-neutral-600">[{number}]</span>
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500">{label}</span>
    </div>
  );
}

/* ─── PRODUCT MOCK: TERMINAL ─── */
function TerminalMock({ lines }: { lines: { text: string; color: string; delay: number }[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-neutral-950/80 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <span className="text-[10px] font-mono text-neutral-600 ml-2">oakwell</span>
      </div>
      <div className="p-6 space-y-2.5 font-mono text-[13px] leading-relaxed">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: line.delay }}
            className={line.color}
          >
            {line.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── [01] REAL-TIME INTELLIGENCE ─── */
function IntelligenceSection() {
  return (
    <section id="intelligence" className="relative z-10 bg-black py-32 md:py-44 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel number="01" label="Real-Time Intelligence" />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Copy */}
          <div>
            <Reveal delay={0.1}>
              <h2 className="text-4xl md:text-[3.25rem] font-semibold leading-[1.1] tracking-tight text-white">
                Every claim verified.<br />Every lie exposed.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 text-lg text-neutral-400 leading-relaxed max-w-lg">
                Oakwell autonomously extracts competitor claims from sales calls, verifies each one against live web data, and delivers vision-verified proof — in under 10 seconds.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10 space-y-5">
                {[
                  { label: "Claim Extraction", desc: "NLP pipeline identifies every competitive assertion" },
                  { label: "Visual Verification", desc: "Screenshots, not scrapes — Vision AI reads the proof" },
                  { label: "Instant Output", desc: "Disproven claims flagged with evidence in seconds" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-1 rounded-full bg-emerald-500/40 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: Product mock */}
          <Reveal delay={0.2}>
            <TerminalMock
              lines={[
                { text: "$ oakwell analyze --call sales_047.txt", color: "text-white", delay: 0.3 },
                { text: "  Extracting 12 competitor claims...", color: "text-neutral-500", delay: 0.6 },
                { text: "  Verifying against live sources...", color: "text-neutral-500", delay: 0.9 },
                { text: "", color: "text-neutral-500", delay: 1.0 },
                { text: '  ✗ DISPROVEN  "Starter plan $20/mo"', color: "text-red-400", delay: 1.2 },
                { text: "    → Screenshot: $30/mo (Professional tier)", color: "text-neutral-600", delay: 1.4 },
                { text: '  ✗ DISPROVEN  "Free CRM includes reporting"', color: "text-red-400", delay: 1.6 },
                { text: "    → Gated behind paid plan", color: "text-neutral-600", delay: 1.8 },
                { text: '  ✓ VERIFIED   "14-day free trial"', color: "text-emerald-400", delay: 2.0 },
                { text: "", color: "text-neutral-500", delay: 2.1 },
                { text: "  3 claims verified · 2 disproven · 9.4s", color: "text-emerald-400/70", delay: 2.3 },
              ]}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── [02] STEALTH OPERATIONS ─── */
function StealthSection() {
  return (
    <section id="stealth" className="relative z-10 bg-black py-32 md:py-44 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel number="02" label="Stealth Operations" />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Product mock — browser capture visualization */}
          <Reveal delay={0.1} className="order-2 lg:order-1">
            <div className="rounded-2xl border border-white/[0.06] bg-neutral-950/80 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <span className="text-[10px] font-mono text-neutral-600 ml-2">stealth-browser — live capture</span>
              </div>
              <div className="p-6 relative">
                {/* Blurred competitor page mock */}
                <div className="space-y-3 opacity-30">
                  <div className="h-5 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="h-20 bg-neutral-800 rounded" />
                    <div className="h-20 bg-neutral-800 rounded" />
                    <div className="h-20 bg-neutral-800 rounded" />
                  </div>
                  <div className="h-3 bg-neutral-800 rounded w-2/3 mt-3" />
                  <div className="h-3 bg-neutral-800 rounded w-1/3" />
                </div>

                {/* Capture overlay */}
                <motion.div
                  className="absolute inset-6 border border-cyan-500/40 rounded-lg"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono text-cyan-400 rounded">
                    CAPTURING
                  </div>
                  <motion.div
                    className="absolute bottom-3 right-3 text-[10px] font-mono text-cyan-400/60"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.3 }}
                  >
                    proof_1709412847.png saved
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </Reveal>

          {/* Right: Copy */}
          <div className="order-1 lg:order-2">
            <Reveal delay={0.1}>
              <h2 className="text-4xl md:text-[3.25rem] font-semibold leading-[1.1] tracking-tight text-white">
                See what they<br />don&apos;t want you to see
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 text-lg text-neutral-400 leading-relaxed max-w-lg">
                A Playwright-powered stealth browser navigates competitor sites with full anti-detection — capturing pricing pages, feature tables, and SLA terms as visual screenshots.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10 space-y-5">
                {[
                  { label: "Anti-Detection Engine", desc: "Fingerprint rotation, residential proxies, human-like behavior" },
                  { label: "Visual Capture", desc: "Full-page screenshots with timestamp watermarks" },
                  { label: "Vision AI Analysis", desc: "Gemini reads screenshots — no DOM parsing required" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-1 rounded-full bg-cyan-500/40 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── [03] STRATEGIC DEFENSE ─── */
function StrategySection() {
  return (
    <section id="strategy" className="relative z-10 bg-black py-32 md:py-44 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel number="03" label="Strategic Defense" />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Copy */}
          <div>
            <Reveal delay={0.1}>
              <h2 className="text-4xl md:text-[3.25rem] font-semibold leading-[1.1] tracking-tight text-white">
                War-gamed before<br />your rep speaks
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 text-lg text-neutral-400 leading-relaxed max-w-lg">
                An adversarial AI simulates your competitor&apos;s best counter-move. If your strategy breaks under pressure, the system auto-hardens it with kill-shot evidence before delivery.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10 space-y-5">
                {[
                  { label: "Adversarial Simulation", desc: "AI plays your competitor's CEO attacking your pitch" },
                  { label: "Auto-Hardening", desc: "Weak points patched with evidence-backed counters" },
                  { label: "Stage-Calibrated", desc: "Discovery → Demo → Negotiation → Closing" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-1 rounded-full bg-red-500/40 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: Product mock — war-game output */}
          <Reveal delay={0.2}>
            <TerminalMock
              lines={[
                { text: "$ oakwell war-game --strategy talk_track_v3", color: "text-white", delay: 0.3 },
                { text: "", color: "text-neutral-500", delay: 0.4 },
                { text: "  ⚔ Adversarial simulation initiated", color: "text-amber-400", delay: 0.6 },
                { text: '  Playing as: Competitor CEO (Gong)', color: "text-neutral-500", delay: 0.9 },
                { text: "", color: "text-neutral-500", delay: 1.0 },
                { text: '  Attack #1: "Our NLP is more accurate"', color: "text-red-400", delay: 1.2 },
                { text: "  → Counter injected: vision-verified proof", color: "text-emerald-400", delay: 1.5 },
                { text: '  Attack #2: "We integrate with Salesforce"', color: "text-red-400", delay: 1.8 },
                { text: "  → Counter injected: deeper API coverage", color: "text-emerald-400", delay: 2.1 },
                { text: "", color: "text-neutral-500", delay: 2.2 },
                { text: "  ✓ Talk-track hardened · Confidence: 94%", color: "text-emerald-400", delay: 2.4 },
              ]}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── [04] SENTINEL ─── */
function SentinelSection() {
  return (
    <section id="sentinel" className="relative z-10 bg-black py-32 md:py-44 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel number="04" label="Market Sentinel" />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Product mock — monitoring dashboard */}
          <Reveal delay={0.1} className="order-2 lg:order-1">
            <div className="rounded-2xl border border-white/[0.06] bg-neutral-950/80 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-neutral-500">sentinel — monitoring</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-600">847 pages tracked</span>
              </div>
              {/* Mini chart */}
              <div className="px-6 pt-6 pb-3">
                <div className="h-32 relative border border-white/[0.04] rounded-lg overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sentGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M0,100 C30,95 60,90 100,75 C140,60 160,65 200,45 C240,25 260,30 300,28 C340,26 370,22 400,18"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                    <path
                      d="M0,100 C30,95 60,90 100,75 C140,60 160,65 200,45 C240,25 260,30 300,28 C340,26 370,22 400,18 L400,120 L0,120 Z"
                      fill="url(#sentGrad)"
                      opacity="0.5"
                    />
                  </svg>
                </div>
                <p className="text-[10px] font-mono text-neutral-600 mt-2">Truth Decay Index — 30 day trend</p>
              </div>
              {/* Log entries */}
              <div className="px-6 pb-6 space-y-2">
                {[
                  { time: "14:32", msg: "HubSpot — 5-seat minimum added", dot: "bg-red-400" },
                  { time: "14:28", msg: "Salesforce — API rate limit removed", dot: "bg-amber-400" },
                  { time: "14:15", msg: "Gong — No changes detected", dot: "bg-emerald-400" },
                ].map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.5 + i * 0.15 }}
                    className="flex items-center gap-3 text-[11px] font-mono"
                  >
                    <span className="text-neutral-600 w-10 shrink-0">{log.time}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${log.dot}`} />
                    <span className="text-neutral-400">{log.msg}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Right: Copy */}
          <div className="order-1 lg:order-2">
            <Reveal delay={0.1}>
              <h2 className="text-4xl md:text-[3.25rem] font-semibold leading-[1.1] tracking-tight text-white">
                Know before<br />they announce
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 text-lg text-neutral-400 leading-relaxed max-w-lg">
                24/7 autonomous monitoring detects pricing changes, feature removals, and messaging shifts across your competitive landscape — and fires Slack alerts before your reps even know.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10 space-y-5">
                {[
                  { label: "Truth Decay Index", desc: "Tracks how competitor claims drift from reality over time" },
                  { label: "Proactive Alerts", desc: "Slack notifications when competitors change positioning" },
                  { label: "Temporal Memory", desc: "Full history of every pricing and feature change" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-1 rounded-full bg-amber-500/40 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── TRUST CARDS ─── */
function TrustSection() {
  const cards = [
    { title: "Vision-Verified", desc: "Every claim backed by a timestamped screenshot — no hallucinations, no scraping artifacts." },
    { title: "Zero Hallucination", desc: "Gemini 2.5 Pro cross-references every assertion against visual proof before output." },
    { title: "Stealth by Default", desc: "Anti-detection browser with fingerprint rotation. Competitors never know you looked." },
    { title: "Enterprise Ready", desc: "Built on Google ADK with 10 autonomous agents. SOC 2 architecture from day one." },
  ];

  return (
    <section className="relative z-10 bg-black py-32 md:py-44 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-4">Built for trust</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Intelligence you can verify
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="p-6 rounded-2xl border border-white/[0.06] bg-neutral-950/60 hover:border-white/[0.1] transition-colors duration-300 h-full">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <h3 className="text-[15px] font-medium text-white mb-2">{card.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <section className="relative z-10 bg-black py-32 md:py-44 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white leading-[1.1]">
            Stop losing deals to<br />misinformation
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-lg text-neutral-400 max-w-lg mx-auto">
            Oakwell verifies competitor claims with visual proof and generates war-tested strategies — autonomously, in 90 seconds.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:dirgh@oakwell.ai"
              className="px-8 py-3.5 bg-white text-black text-sm font-medium rounded-full hover:bg-neutral-200 transition-all duration-200"
            >
              Request Early Access
            </a>
            <a
              href="https://github.com/dirghpatel16/oakwell"
              className="px-8 py-3.5 border border-white/[0.1] text-white text-sm font-medium rounded-full hover:bg-white/[0.04] transition-all duration-200"
            >
              View on GitHub
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="flex items-center justify-center gap-5 mt-12 text-[11px] font-mono text-neutral-600">
            <span>Google ADK</span>
            <span className="w-0.5 h-0.5 rounded-full bg-neutral-700" />
            <span>Gemini 2.5 Pro</span>
            <span className="w-0.5 h-0.5 rounded-full bg-neutral-700" />
            <span>10 Autonomous Agents</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="relative z-10 bg-black border-t border-white/[0.04] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <OakwellLogo size={18} />
          <span className="text-sm font-medium text-white">Oakwell</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-neutral-500">
          <a href="https://github.com/dirghpatel16/oakwell" className="hover:text-white transition-colors duration-200">GitHub</a>
          <a href="mailto:dirgh@oakwell.ai" className="hover:text-white transition-colors duration-200">dirgh@oakwell.ai</a>
        </div>
        <p className="text-[11px] text-neutral-600 font-mono">&copy; 2025 Oakwell</p>
      </div>
    </footer>
  );
}

/* ─── PAGE ─── */
export default function Home() {
  return (
    <main className="bg-black min-h-screen">
      <Navbar />
      <HeroSection />
      <IntelligenceSection />
      <StealthSection />
      <StrategySection />
      <SentinelSection />
      <TrustSection />
      <CTASection />
      <Footer />
    </main>
  );
}
