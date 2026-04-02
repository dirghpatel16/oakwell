# Current State

## Product status
Oakwell is an Autonomous Revenue Defense platform featuring a dual-dashboard architecture. 
- `/dashboard`: Real-time production dashboard for customers (Clerk auth, live FastAPI data).
- `/demo`: High-fidelity public demo dashboard for investors (no auth, rich mock data).
The platform uses multi-agent AI to cross-reference sales transcripts with live competitor web data (Vision AI).

## Current engineering focus
- Hardening the real analysis path so the production dashboard can safely render real API payloads end-to-end.
- Transitioning production status/alert behavior from cosmetic simulation to backend-derived system state.
- Perfecting the Vercel-inspired minimal UI aesthetic.
- Expanding the AI agent pipeline (currently 10 stages).

## Recently completed
- **Workspace Personas & Context-Aware Intelligence**: Oakwell now persists a per-scope `WorkspacePersona` (company name, value prop, user role, target audience, competitors) in a new `oakwell_workspaces` Firestore collection. The persona is loaded at the start of every analysis run and injected into all three AI specialist prompts. `your_product` auto-falls back to `workspace.company_name`. New endpoints: `GET/POST /workspace`, `GET /workspace-setup`. New middleware: redirects new Clerk users to `/onboarding` until `oakwell_workspace_configured` cookie is set. Settings page upgraded from static UI to live load/save. Deal Desk "Your Product" field auto-fills from workspace. Ephemeral JSON fallback at `outputs/workspaces.json` for local dev.


- **Dual Dashboard Architecture**: Created shared `DashboardShell` and separated `/demo` from `/dashboard`.
- **Demo Mode Engine**: Built `demo-data.ts` and updated hooks/context to support forced demo mode.
- **Shared Dashboard Page Modules**: Moved dashboard page implementations into `website-2/src/components/dashboard-pages` so `/dashboard` and `/demo` now share UI through non-route modules instead of route-to-route imports.
- **Working Model Credibility Pass**: Added route-aware dashboard surface context, premium shared empty/loading/error states, proof artifact presentation in Deal Desk, and production-facing status/alert derivation in `websocket-context.tsx`.
- **Fast Strategy-Only Path**: The backend now classifies transcripts before running proof verification. Qualitative transcripts with no concrete public claims now skip screenshot verification, deep market search, and adversarial critique, returning a faster strategic brief instead of a misleading proof-backed result.
- **Deal Desk Evidence UX**: The production Deal Desk now shows live analysis step cards while a job is running, explicit evidence-state messaging after completion, and inline proof screenshot previews when artifacts exist.
- **Security Hardening Pass**: The frontend now talks to the backend through a same-origin Next.js proxy route (`/api/backend/*`) instead of calling Cloud Run directly from the browser. FastAPI now requires an internal shared secret plus forwarded authenticated user context, and persisted data/jobs/proofs/outcomes are scoped to the owning user/org to prevent IDOR.
- **Public Repo Guardrails**: Added security headers in `website-2/next.config.ts`, stricter request validation in `main.py` and the proxy route, `.env.example` files for both app layers, a GitHub Actions security workflow, Dependabot config, `SECURITY.md`, and a public launch checklist under `docs/security/`.
- **Fast Model Upgrade Path**: Replaced active backend fast-model calls in `main.py` and `tools.py` with configurable `OAKWELL_FAST_MODEL` defaults (`gemini-2.5-flash`) so the live analysis path is no longer anchored to deprecated `gemini-2.0-flash`.
- **Deterministic GenAI Auth Path**: The backend no longer relies on `google.genai` auto-discovering credentials from the runtime environment. `tools.py` now explicitly resolves `GOOGLE_API_KEY` / `GEMINI_API_KEY`, passes the key into every GenAI client, and returns a clean configuration error if the backend is misconfigured.
- **Persistence Truth Pass**: Oakwell now treats Firestore as the required durable memory backend for production. `main.py` no longer silently falls back to `outputs/memory.json` unless `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=1`, and the dashboard now surfaces memory failures instead of presenting empty-state resets as if no data existed.
- **Evidence Ledger + Run History**: Oakwell now persists immutable `analysis_runs` records alongside the competitor memory rollup. Each run stores normalized `evidence_items`, `source_coverage`, timestamps, proof filenames, and analysis metadata so the dashboard can explain why it knows something instead of only showing a score and talk track.
- **Local Demo Auth Fallback**: The app root now skips `ClerkProvider` when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is unavailable, and `src/middleware.ts` becomes a no-op when Clerk env vars are missing, so `/demo` can still render during local development.
- **Deal Desk TypeScript Guardrail**: `website-2/src/components/dashboard-pages/deals-page.tsx` now derives a `completedResult` object only when the job status is `"completed"` and uses that null-safe reference throughout the completed-analysis render path, preventing strict TypeScript nullability failures during production builds.
- **Backend Port Fix**: Modified `start.sh` to run FastAPI on port 8080 (GCP) and Streamlit on 8501 (internal).
- **Backend Deployment Verification**: Live Cloud Run now responds correctly on `/health` with FastAPI, and `/memory` / `/sentinel-status` are reachable.
- **UI Polish**: Switched to **Geist Sans/Mono** fonts and refined component borders/spacing.
- **API Billing (Model A)**: Removed `X-Google-API-Key` requirement; backend now uses server-side env vars.
- **Git Sync**: All local changes committed and pushed to GitHub (`main`).

## In progress
- Cloud Run + Vercel redeploy needed to activate Workspace Personas in production.
- Validation of a true end-to-end analysis run that writes usable data into `/memory`.
- Validating the new loud-failure persistence path in Cloud Run after redeploy so Firestore issues appear as explicit 503s instead of transient “saved for today, gone tomorrow” behavior.
- Validating the new `/analysis-runs` path in production so the dashboard can show immutable run history and evidence ledger cards from real Firestore data after reload/day-two return visits.
- Integration of Server-Sent Events (SSE) for live agent status updates.
- Auditing the remaining dashboard surfaces (`forecast`, `executive`, `sidekick`) against real backend payloads.
- Defining the next backend moat beyond wrapper behavior: multi-source evidence retrieval, richer memory, and stronger retrieval/agent strategy for enterprise-grade competitive intelligence.

## Pending decisions
- Model Choice: Transitioning from Gemini 2.0 Flash to Pro for complex strategic analysis.
- CRM Integration: Determining which CRM (Salesforce/HubSpot) to prioritize for first-party data.

## Known blockers
- **Workspace Personas Deploy Pending**: Cloud Run and Vercel must be redeployed with the latest `main.py` / `middleware.ts` / frontend changes for workspace endpoints, prompt injection, and the onboarding redirect to be live in production.
- **End-to-End Analysis Proof Pending**: `GOOGLE_API_KEY` is available locally but Cloud Run must be redeployed to exercise the full workspace-aware pipeline in production.
- **Deployment Validation Pending**: Cloud Run must be redeployed with the latest `main.py` / `tools.py` fast-model patch before the live backend can be trusted as the working-model source of truth.
- **Post-Fix Redeploy Needed**: Cloud Run must be redeployed with the explicit GenAI API-key resolution patch before production analysis can be trusted; otherwise `/analyze-deal` may still fail with SDK auth-discovery errors even when `GOOGLE_API_KEY` is present in Cloud Run.
- **Persistence Deploy Needed**: Cloud Run must be redeployed with the new persistence gate. Until then, production may still silently use instance-local JSON fallback and appear to “forget” analyses across days or instance restarts.
- **Evidence/Run Deploy Needed**: Cloud Run and Vercel must be redeployed with the immutable run + evidence ledger changes before the dashboard can show source coverage and recent analysis history from live data.
- **Security Env Pending**: Production now needs `OAKWELL_BACKEND_URL` and `OAKWELL_INTERNAL_API_SECRET` on the Next side, plus `OAKWELL_INTERNAL_API_SECRET` on the FastAPI side. Until those are configured and deployed together, the new secure proxy path will not work in production.
- **Clerk Dashboard Policy Pending**: Password hashing/session/reset/email-verification/login-throttling are handled by Clerk, so production security still depends on those controls being explicitly enabled in Clerk settings.

## Important constraints
- `/demo` routes must remain public and never require Clerk authentication.
- `/demo` and `/dashboard` can share page UI, but they must keep separate route ownership via their own layouts/providers.
- Shared components in `website-2/src/components` must remain `basePath` aware.
- Local development should still render `/demo` even if Clerk keys are absent or intentionally unset.
- Protected `/dashboard` data is no longer meant to be fetched directly from the browser; requests should flow through the Next server proxy.
- AI costs are absorbed (Model A); do not re-introduce BYOK headers in frontend.

## Files to inspect first
- `website-2/src/lib/demo-data.ts`: Source of truth for all mock investor data.
- `website-2/src/components/dashboard-shell.tsx`: Shared layout logic for both dashboards.
- `website-2/src/lib/demo-context.tsx`: Context provider that manages `forced` demo mode locking.
- `website-2/src/lib/hooks.ts`: Data fetching hooks that automatically switch between mock data and real API calls.
- `website-2/src/lib/websocket-context.tsx`: Core provider for real-time operations, currently simulating alerts in demo mode.
- `start.sh`: Backend entrypoint and port configuration.
- `main.py`: FastAPI backend entrypoint (Model A billing logic).
- `website-2/src/lib/api.ts`: Frontend API boundary and normalization layer for backend responses.
- `website-2/src/app/api/backend/[...path]/route.ts`: Authenticated server-side proxy from Next.js to FastAPI.
- `website-2/next.config.ts`: Security headers for the public-facing Next.js app.
- `docs/security/public-launch-checklist.md`: Operational checklist for making the repo/app public safely.

## Backend / frontend contract notes
- **Workspace Persona Contract**: `GET /workspace` returns `{ configured: bool, workspace: WorkspacePersona | null }`. `GET /workspace-setup` returns `{ configured: bool }` (lightweight, for middleware). `POST /workspace` accepts `WorkspacePersona` fields (all optional). Workspace is loaded server-side in `run_oakwell_analysis` — frontend does NOT pass it in `AnalyzeDealRequest`.
- **Onboarding Cookie**: `oakwell_workspace_configured=true; path=/; max-age=31536000` is set client-side by `onboarding/page.tsx` after workspace is saved. Middleware reads this cookie to gate the onboarding redirect. Deleting the cookie forces re-onboarding on next dashboard visit.
- **`your_product` fallback**: If `AnalyzeDealRequest.your_product` is `None`, the backend falls back to `workspace.company_name`. The Deal Desk pre-fills the field from workspace data so users rarely need to type it manually.


- **Data Hooks**: All frontend hooks (`useQuery`, `useMemory`, etc.) in `hooks.ts` dynamically bypass the API fetch if `isDemo` is true (passing `demoData` instead).
- **Production API Status**: Live Cloud Run is healthy at `/health`, but production data is currently empty (`/memory` returns `{}` and `/sentinel-status` shows zero watched URLs).
- **Persistence Health Contract**: `/health` now exposes `persistence_ready`, `persistence_backend`, and `persistence_reason` so production can distinguish “healthy API” from “durable memory actually available.”
- **Normalization Requirement**: Frontend consumers should not assume backend fields are plain strings; normalize at the API seam before rendering.
- **Analysis Routing**: `main.py` now distinguishes between `proof_verification` and `strategy_only` modes. The frontend should use `analysis_mode`, `evidence_status`, `evidence_summary`, `verification_reason`, `claim_count`, and `verified_claim_count` from `website-2/src/lib/api.ts` rather than inferring proof state from score alone.
- **Auth Model**: Clerk protects `/dashboard` in Next.js, but the browser no longer talks to FastAPI directly. Next route handlers now proxy authenticated requests to FastAPI with `X-Oakwell-Internal-Secret`, `X-Oakwell-User-Id`, and optional `X-Oakwell-Org-Id`.
- **Ownership Model**: Firestore/local fallback records, job polling, proof artifacts, and outcome analytics are now scoped by `owner_scope` (`org:<id>` when present, otherwise `user:<id>`).
- **Completed Analysis Source of Truth**: `jobs` remain transient runtime state, but completed dashboard analyses should now be trusted only once the corresponding memory record is reloaded from `/memory`.
- **Evidence Contract**: `/memory` and `/deal-status/{job_id}` now carry `analysis_run_id`, `analysis_completed_at`, `evidence_items`, and `source_coverage`. `/analysis-runs?url=...` returns immutable per-run snapshots for a competitor.
- **Repo Guardrails**: `.github/workflows/security.yml` now runs secret scanning plus basic compile/build checks, and `.github/dependabot.yml` enables dependency update automation.
- **Realtime Layer**: `websocket-context.tsx` is now backend-aware for health + memory-derived alerts in production, while demo mode remains deterministic. True SSE/event streaming still remains to be wired.
- **API Auth**: The frontend no longer passes `X-Google-API-Key`. The backend `main.py` has been updated to use server-side environment variables directly (Model A).
- **Backend AI Auth**: FastAPI endpoints now call `tools.require_genai_api_key()` before kicking off model-backed work, and all GenAI clients are created through `tools.create_genai_client(api_key)` for deterministic server-side auth.
- **Fast Model Config**: `tools.py` now exposes `FAST_MODEL = os.environ.get("OAKWELL_FAST_MODEL", "gemini-2.5-flash")`, and the active FastAPI pipeline in `main.py` consumes that for fast tasks.

## Technical debt to remember
- Shared page sync: When adding a new dashboard surface, add the implementation under `website-2/src/components/dashboard-pages` and keep both route groups as thin wrappers.
- Realtime operations are still simulated for user-triggered scans/analyses; only connection state and alerts are now backend-derived.
- The backend still operates on a single competitor URL + one primary screenshot path, which is insufficient for high-confidence multi-page or head-to-head enterprise comparisons.
- Clerk still owns password hashing, session expiry, email verification, password reset token expiry, and login throttling. Those settings must be enforced in the Clerk dashboard and are not custom-coded in this repo.
- Security headers are now present, but CSP is not yet tuned; adding a strict policy will require Clerk-compatible testing.
- Global CSS: Some legacy utility classes from the early build remain; should be pruned.

## Recommended next tasks
1. Configure Clerk production policies from `docs/security/public-launch-checklist.md`:
   email verification, session lifetime, password reset expiry, bot/login protection, and allowed origins.
2. Deploy the new proxy/auth stack end-to-end by setting `OAKWELL_BACKEND_URL` and `OAKWELL_INTERNAL_API_SECRET` in Vercel and `OAKWELL_INTERNAL_API_SECRET` in Cloud Run.
3. Redeploy Cloud Run with `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=0` so production fails loud instead of silently persisting to instance-local JSON.
4. Run a real analysis in an environment with `GOOGLE_API_KEY` so `/memory` is populated and the updated `/dashboard` flow can be validated end-to-end, including both `proof_verification` and `strategy_only` transcripts.
5. Validate that `/analysis-runs` returns durable history after reload/day-two return visits and that Deal Desk shows source coverage + evidence ledger from persisted data, not only the transient job response.
6. Finish auditing `forecast`, `executive`, and `sidekick` against live structured payloads under the new scoped auth model.
7. Replace simulated operation progress in `websocket-context.tsx` with true backend event listeners or SSE.
8. Design the next backend moat: evidence retrieval across multiple competitor pages/sources, reusable competitive memory, and agent orchestration that is meaningfully harder to replicate with a single general-purpose chat model.

## Things future sessions must remember
- Geist font variables are defined in `globals.css` via `@theme inline`.
- The `forced` prop on `DemoModeProvider` is the primary toggle for route groups.
- Backend FastAPI must always run on port 8080 for GCP compatibility.
- The old Cloud Run port mismatch is no longer the primary blocker; the next production risk is frontend rendering against real structured API payloads.
- Local validation of the latest backend analysis path requires `GOOGLE_API_KEY`; without it, only compile/build-level verification is possible from this workspace.
