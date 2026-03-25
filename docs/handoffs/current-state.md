# Current State

## Product status
Oakwell is an Autonomous Revenue Defense platform featuring a dual-dashboard architecture. 
- `/dashboard`: Real-time production dashboard for customers (Clerk auth, live FastAPI data).
- `/demo`: High-fidelity public demo dashboard for investors (no auth, rich mock data).
The platform uses multi-agent AI to cross-reference sales transcripts with live competitor web data (Vision AI).

## Current engineering focus
- Hardening the frontend/backend contract so the production dashboard can safely render real API payloads.
- Transitioning from simulated realtime alerts to backend-driven events.
- Perfecting the Vercel-inspired minimal UI aesthetic.
- Expanding the AI agent pipeline (currently 10 stages).

## Recently completed
- **Dual Dashboard Architecture**: Created shared `DashboardShell` and separated `/demo` from `/dashboard`.
- **Demo Mode Engine**: Built `demo-data.ts` and updated hooks/context to support forced demo mode.
- **Shared Dashboard Page Modules**: Moved dashboard page implementations into `website-2/src/components/dashboard-pages` so `/dashboard` and `/demo` now share UI through non-route modules instead of route-to-route imports.
- **Local Demo Auth Fallback**: The app root now skips `ClerkProvider` when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is unavailable, and `src/middleware.ts` becomes a no-op when Clerk env vars are missing, so `/demo` can still render during local development.
- **Backend Port Fix**: Modified `start.sh` to run FastAPI on port 8080 (GCP) and Streamlit on 8501 (internal).
- **Backend Deployment Verification**: Live Cloud Run now responds correctly on `/health` with FastAPI, and `/memory` / `/sentinel-status` are reachable.
- **UI Polish**: Switched to **Geist Sans/Mono** fonts and refined component borders/spacing.
- **API Billing (Model A)**: Removed `X-Google-API-Key` requirement; backend now uses server-side env vars.
- **Git Sync**: All local changes committed and pushed to GitHub (`main`).

## In progress
- Frontend normalization of structured backend payloads (`clashes_detected`, `market_drift`, `adversarial_critique`) so `/dashboard` can safely render real analysis data.
- Integration of Server-Sent Events (SSE) for live agent status updates.
- Refinement of `websocket-context.tsx` to handle production alert streams.

## Pending decisions
- Model Choice: Transitioning from Gemini 2.0 Flash to Pro for complex strategic analysis.
- CRM Integration: Determining which CRM (Salesforce/HubSpot) to prioritize for first-party data.

## Known blockers
- **Frontend/Backend Contract Drift**: The FastAPI backend returns structured objects/arrays for fields like `clashes_detected`, `market_drift`, and `adversarial_critique`, while several dashboard pages still assume plain strings.

## Important constraints
- `/demo` routes must remain public and never require Clerk authentication.
- `/demo` and `/dashboard` can share page UI, but they must keep separate route ownership via their own layouts/providers.
- Shared components in `website-2/src/components` must remain `basePath` aware.
- Local development should still render `/demo` even if Clerk keys are absent or intentionally unset.
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

## Backend / frontend contract notes
- **Data Hooks**: All frontend hooks (`useQuery`, `useMemory`, etc.) in `hooks.ts` dynamically bypass the API fetch if `isDemo` is true (passing `demoData` instead).
- **Production API Status**: Live Cloud Run is healthy at `/health`, but production data is currently empty (`/memory` returns `{}` and `/sentinel-status` shows zero watched URLs).
- **Normalization Requirement**: Frontend consumers should not assume backend fields are plain strings; normalize at the API seam before rendering.
- **WebSockets/SSE**: `websocket-context.tsx` uses a simulated `setInterval` to inject `DEMO_ALERTS` in demo mode. In production mode, it currently has no connection; it needs to be wired to the backend SSE endpoint.
- **API Auth**: The frontend no longer passes `X-Google-API-Key`. The backend `main.py` has been updated to use server-side environment variables directly (Model A).

## Technical debt to remember
- Shared page sync: When adding a new dashboard surface, add the implementation under `website-2/src/components/dashboard-pages` and keep both route groups as thin wrappers.
- Global CSS: Some legacy utility classes from the early build remain; should be pruned.

## Recommended next tasks
1. Finish auditing and normalizing any remaining structured backend fields used by `/dashboard` pages.
2. Run a real analysis against production so `/memory` is populated and the dashboard can be verified with live data.
3. Replace simulated intervals in `websocket-context.tsx` with real backend event listeners.

## Things future sessions must remember
- Geist font variables are defined in `globals.css` via `@theme inline`.
- The `forced` prop on `DemoModeProvider` is the primary toggle for route groups.
- Backend FastAPI must always run on port 8080 for GCP compatibility.
- The old Cloud Run port mismatch is no longer the primary blocker; the next production risk is frontend rendering against real structured API payloads.
