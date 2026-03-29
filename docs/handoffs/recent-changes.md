# Recent Changes

## 2026-03-26
### Summary
Hardened Oakwell for a public-repo / pre-production security posture. The browser no longer calls FastAPI directly; authenticated dashboard requests now flow through a same-origin Next.js proxy route, and the backend requires a shared internal secret plus forwarded authenticated user context. Persisted data, jobs, proof files, and win/loss analytics are now owner-scoped to prevent IDOR.

### Files touched
- `main.py`: Added internal request auth, owner-scoped memory/outcomes/jobs/proof access, rate limiting on abuse-prone endpoints, and removed direct unauthenticated global access to dashboard data.
- `website-2/src/app/api/backend/[...path]/route.ts`: Added server-side authenticated proxy from Next.js to FastAPI using Clerk auth + internal secret forwarding.
- `website-2/src/lib/api.ts`: Switched frontend API access to the same-origin proxy route.
- `website-2/src/middleware.ts`: Protected `/dashboard` even when Clerk is missing by failing closed instead of falling through.
- `website-2/src/app/(dashboard)/layout.tsx`: Removed the misleading unauthenticated “Local User” fallback from the protected dashboard shell.
- `website-2/next.config.ts`: Added baseline security headers and disabled `x-powered-by`.
- `app.py`: Switched the internal Streamlit surface to the new internal auth header model.
- `docs/handoffs/current-state.md`
- `docs/handoffs/next-session.md`
- `docs/known-issues.md`
- `docs/overview/product-and-architecture.md`
- `docs/decisions/0003-authenticated-backend-proxy.md`
- `docs/security/public-launch-checklist.md`
- `.github/workflows/security.yml`
- `.github/dependabot.yml`
- `.env.example`
- `website-2/.env.example`
- `SECURITY.md`

### Why
Clerk was protecting the frontend routes, but the FastAPI backend was still effectively a public data plane. That meant the repo was not ready to be public and the production path was vulnerable to unauthorized reads of memory, jobs, proofs, and analytics. The new proxy + internal-secret + owner-scope model closes the real exposure path.

### Risks / follow-ups
- **Follow-up**: Vercel and Cloud Run now both need `OAKWELL_INTERNAL_API_SECRET`, and Vercel also needs `OAKWELL_BACKEND_URL`.
- **Follow-up**: Clerk still owns password hashing, email verification, session duration, password reset token expiry, and login throttling; those settings must be enforced in the Clerk dashboard.
- **Follow-up**: The rate limiter is in-memory and good enough for first-line abuse reduction, but a distributed limiter should replace it before meaningful scale.
- **Follow-up**: Security headers are now baseline-only; a stricter Clerk-compatible CSP is still a future hardening step.

## 2026-03-26
### Summary
Added a credibility-focused analysis routing pass so Oakwell no longer forces slow, proof-heavy workflows onto qualitative transcripts. The backend now returns a fast `strategy_only` brief when there are no concrete public claims to verify, and the Deal Desk now shows explicit evidence state, live step-by-step progress, and inline proof previews when screenshots exist.

### Files touched
- `main.py`: Removed fabricated claim padding, capped verification claim count, added transcript classification for `proof_verification` vs `strategy_only`, skipped unnecessary stages on qualitative inputs, and persisted evidence-state metadata into job results/memory.
- `website-2/src/lib/api.ts`: Added normalization for `analysis_mode`, `evidence_status`, `evidence_summary`, `verification_reason`, `claim_count`, `verified_claim_count`, and `proof_available`.
- `website-2/src/components/dashboard-pages/deals-page.tsx`: Added live progress step cards, evidence-state rendering, and inline proof image previews for production results.
- `docs/handoffs/current-state.md`
- `docs/handoffs/next-session.md`
- `docs/known-issues.md`

### Why
The existing product flow was too slow and too easy to distrust: qualitative transcripts were being routed through screenshot verification anyway, scores looked overconfident, and users could finish an analysis without understanding whether Oakwell had actual proof or just a strategic read. These changes make the product faster, more honest, and more legible in founder demos, investor demos, and early customer conversations.

### Risks / follow-ups
- **Follow-up**: The new routing path still needs live validation on Cloud Run with `GOOGLE_API_KEY`.
- **Follow-up**: Oakwell still uses a single competitor URL and a single primary screenshot path, which is not enough for multi-page enterprise comparisons.
- **Follow-up**: Realtime operation progress is still simulated from frontend polling rather than true backend events.

## 2026-03-25
### Summary
Upgraded Oakwell from infrastructure cleanup toward a more credible working-model state. The production dashboard now has stronger route-safe shared surfaces, more premium empty/loading/error states, production-facing status + alert derivation from backend data, and a safer backend fast-model configuration for the real analysis path.

### Files touched
- `main.py`: Switched the active FastAPI fast-task model usage to `tools.FAST_MODEL`.
- `tools.py`: Added configurable `FAST_MODEL` defaulting to `gemini-2.5-flash` and replaced active `gemini-2.0-flash` task calls in the working path.
- `website-2/src/components/dashboard-shell.tsx`: Added route-surface context so shared pages can stay base-path aware.
- `website-2/src/components/dashboard-state.tsx`: Added shared premium empty/loading/error components.
- `website-2/src/components/live-activity.tsx`: Made status rendering more stable and less cosmetic.
- `website-2/src/lib/websocket-context.tsx`: Derived production connection status and alerts from backend-aware hooks instead of relying only on fake behavior.
- `website-2/src/components/dashboard-pages/war-room-page.tsx`
- `website-2/src/components/dashboard-pages/alerts-page.tsx`
- `website-2/src/components/dashboard-pages/targets-page.tsx`
- `website-2/src/components/dashboard-pages/deals-page.tsx`

### Why
The product needed to feel less like a polished mock and more like a working enterprise platform. These changes improve founder demo quality, investor confidence, and customer readiness by making the dashboard state more intentional, the route split more trustworthy, and the real analysis path less likely to fail because of deprecated model names.

### Risks / follow-ups
- **Follow-up**: Cloud Run still needs the latest backend deployment before the fast-model fix is live in production.
- **Follow-up**: A true end-to-end analysis run still needs an environment with `GOOGLE_API_KEY`; this workspace does not currently have it.
- **Follow-up**: `forecast`, `executive`, and `sidekick` still need the same level of live-payload auditing.
- **Follow-up**: Production connection/alerts are now backend-derived, but operation progress still uses simulated steps until SSE/backend events are wired.

## 2026-03-21
### Summary
Implemented a dual-dashboard architecture with a high-fidelity investor demo mode and a live customer production mode. Fixed backend port mismatch issues and polished the UI to a Vercel-like aesthetic.

### Files touched
- `main.py`: Updated `/analyze-deal`, `/generate-email`, and `/live-snippet` endpoints to drop `X-Google-API-Key` checks.
- `start.sh`: Swapped container entrypoint ports; FastAPI is now primary on 8080.
- `website-2/src/app/(demo)/demo/*`: Created 8 re-export routes.
- `website-2/src/components/dashboard-shell.tsx`: Created shared layout.
- `website-2/src/lib/demo-data.ts`: Created mock engine for investor demos.
- `website-2/src/lib/demo-context.tsx`: Updated with `forced` mode control.
- `website-2/src/lib/hooks.ts`: Updated all data hooks to be demo-aware.
- `website-2/src/lib/websocket-context.tsx`: Updated to use `DEMO_ALERTS`.
- `website-2/src/app/layout.tsx` & `globals.css`: Integrated **Geist Sans/Mono** fonts.

### Why
The user needed a way to showcase Oakwell to investors with rich sample data without exposing live customer data or seeing empty dashboards. The backend port fix was required to resolve production "Failed to fetch" errors.

### Risks / follow-ups
- **Historical note**: This entry predates the later route-module cleanup and fast-model patch.
