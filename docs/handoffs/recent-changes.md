# Recent Changes

## 2026-04-02
### Summary
Implemented Workspace Personas & Context-Aware Intelligence. Oakwell now persists a per-user/org profile (company name, value proposition, user role, target buyers, competitors) and injects it into every AI specialist prompt on each analysis run — making the platform context-aware without the user needing to re-enter their identity on every request. Added a first-login onboarding redirect, live Settings persistence, and auto-fill of the "Your Product" field in Deal Desk.

### Files touched
- `main.py`: Added `FIRESTORE_WORKSPACES_COLLECTION`, `WORKSPACE_FILE`, `WorkspacePersona` Pydantic model, `_load_workspace` / `_save_workspace` helpers, `GET /workspace`, `GET /workspace-setup`, `POST /workspace` endpoints, workspace context injection into `_specialist_score_deal`, `_specialist_write_talk_track`, `_run_adversarial_critique`, and `run_oakwell_analysis`. Fixed `_require_durable_memory` and `_require_scope_memory_query_ready` to respect `ALLOW_EPHEMERAL_MEMORY_FALLBACK`.
- `website-2/src/app/api/backend/[...path]/route.ts`: Added `workspace` and `workspace-setup` to `ALLOWED_ROOTS`.
- `website-2/src/lib/api.ts`: Added `WorkspacePersona`, `WorkspaceResponse` types and `getWorkspace`, `getWorkspaceSetupStatus`, `saveWorkspace` API functions.
- `website-2/src/middleware.ts`: Added cookie-based onboarding redirect — new Clerk users are sent to `/onboarding` until `oakwell_workspace_configured=true` is set.
- `website-2/src/app/onboarding/page.tsx`: Added `valueProp` and `userRole` fields to Step 1; calls `api.saveWorkspace()` and sets `oakwell_workspace_configured` cookie on scan completion; converted "Enter Your War Room" link to `router.push`.
- `website-2/src/lib/hooks.ts`: Added `useWorkspace()` hook with demo mode support (`DEMO_WORKSPACE` stable reference).
- `website-2/src/components/dashboard-pages/deals-page.tsx`: Imported `useWorkspace`; `yourProduct` state starts empty and auto-fills from `workspace.company_name` via `useEffect`.
- `website-2/src/components/dashboard-pages/settings-page.tsx`: Converted from static UI to live data — loads workspace on mount, editable fields for company name/value prop/role, save button wired to `api.saveWorkspace()`.
- `.gitignore`: Added `outputs/workspaces.json` and `outputs/analysis_runs.json` to prevent committing runtime data.
- `docs/architecture/overview.md`, `docs/architecture/backend.md`, `docs/architecture/frontend.md`, `docs/architecture/ai-agents.md`: Fully rewritten to reflect actual implementation state.

### Why
Oakwell was stateless — the AI had no knowledge of who it was working for. Every analysis produced generic output because `your_product` was typed manually each time and the prompts had zero company or role context. Workspace Personas transform Oakwell into a context-aware orchestrator: the AI now knows the company's value proposition, the rep's role, and who the buyers are — making every analysis feel purpose-built rather than generic.

### Risks / follow-ups
- **Follow-up**: `oakwell_workspaces` Firestore collection must be created in production (it is auto-created on first write, but ensure Firestore rules allow it).
- **Follow-up**: Cloud Run must be redeployed with the updated `main.py` for workspace endpoints and prompt injection to be live.
- **Follow-up**: Vercel must be redeployed so the updated `middleware.ts` onboarding redirect and `workspace`/`workspace-setup` proxy routes are active.
- **Follow-up**: The `oakwell_workspace_configured` cookie is client-set; consider moving to a server-set HttpOnly cookie for stronger security before public launch.
- **Follow-up**: `user_role` is in the workspace context string but specialists don't branch on it explicitly — the model infers tone from context. A future pass could add role-specific output sections.



## 2026-04-01
### Summary
Fixed Oakwell’s “memory disappears after a day” production trust gap. The backend now treats Firestore as the required durable memory backend for production instead of silently falling back to `outputs/memory.json`, and the dashboard now refuses to present transient job results as if they were durably saved analyses.

### Files touched
- `main.py`: Added a persistence status layer, exposed persistence readiness on `/health`, blocked production analysis when durable memory is unavailable, and restricted JSON fallback to explicit local/dev opt-in via `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=1`.
- `.env.example`: Added `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=0` as the documented default.
- `website-2/src/lib/api.ts`: Improved error parsing so dashboard failures show clean backend details instead of raw JSON strings.
- `website-2/src/components/dashboard-pages/deals-page.tsx`: Added durable-memory confirmation after analysis completion and a clear persistence failure state instead of treating transient job results as saved truth.
- `website-2/src/components/dashboard-pages/war-room-page.tsx`
- `website-2/src/components/dashboard-pages/alerts-page.tsx`
- `website-2/src/components/dashboard-pages/forecast-page.tsx`
- `website-2/src/components/dashboard-pages/executive-page.tsx`
- `docs/handoffs/current-state.md`
- `docs/handoffs/next-session.md`
- `docs/known-issues.md`

### Why
Oakwell’s backend could silently degrade from Firestore into instance-local JSON on Cloud Run. That made the product look persistent in-session but lose analyses across restarts or the next day. The UI also masked this by rendering transient completed-job state even if the memory bank never reloaded the saved record. That combination made Oakwell feel untrustworthy.

### Risks / follow-ups
- **Follow-up**: Cloud Run must be redeployed with the new persistence gate, and production should keep `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=0`.
- **Follow-up**: The next trust upgrade should add immutable `analysis_runs` plus structured `evidence_items` / `claims` storage so Oakwell’s moat is evidence quality, not just transcript summarization.
- **Follow-up**: The current watcher still depends on Firestore-backed memory being healthy; once persistence is verified in production, the next step is broadening evidence retrieval without reintroducing silent fallbacks.

## 2026-04-01
### Summary
Upgraded Oakwell from a latest-result dashboard into a more auditable evidence system. Every completed analysis now writes an immutable `analysis_runs` snapshot with normalized `evidence_items` and `source_coverage`, and Deal Desk can surface those records as a source ledger plus recent-run history.

### Files touched
- `main.py`: Added immutable analysis-run persistence, normalized evidence item generation, source-coverage summaries, and a new authenticated `/analysis-runs` endpoint.
- `website-2/src/lib/api.ts`: Added normalization for `analysis_run_id`, `analysis_completed_at`, `evidence_items`, `source_coverage`, and immutable analysis-run payloads.
- `website-2/src/lib/hooks.ts`: Added `useAnalysisRuns` and aligned `useHealth` with the richer health contract.
- `website-2/src/components/dashboard-pages/deals-page.tsx`: Added source coverage rendering, expandable evidence ledger cards, and immutable run history cards.
- `docs/handoffs/current-state.md`
- `docs/handoffs/next-session.md`

### Why
The persistence fix made Oakwell honest, but it still needed to feel like a system with memory and provenance. These changes make the product easier to trust because users can now inspect what sources informed an analysis and see that prior analyses exist as durable records instead of only the latest rollup state.

### Risks / follow-ups
- **Follow-up**: Cloud Run and Vercel must be redeployed before the live product can use the new `analysis_runs` / evidence contract.
- **Follow-up**: The current evidence ledger is still built from a single-URL proof path plus market-search findings; the next moat step is multi-page retrieval and claim-to-evidence linkage.
- **Follow-up**: The immutable run store is now in place, but the broader dashboard still primarily consumes the latest rollup. Additional pages should start reading run/evidence data intentionally.

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
