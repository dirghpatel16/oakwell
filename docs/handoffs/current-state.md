# Current State

## Product status
Oakwell is an Autonomous Revenue Defense platform featuring a dual-dashboard architecture. 
- `/dashboard`: Real-time production dashboard for customers (Clerk auth, live FastAPI data).
- `/demo`: High-fidelity public demo dashboard for investors (no auth, rich mock data).
The platform uses multi-agent AI to cross-reference sales transcripts with live competitor web data (Vision AI).

## Current engineering focus
- Deploying backend port fixes to resolve production "Failed to fetch" errors.
- Transitioning from simulated realtime alerts to backend-driven events.
- Perfecting the Vercel-inspired minimal UI aesthetic.
- Expanding the AI agent pipeline (currently 10 stages).

## Recently completed
- **Dual Dashboard Architecture**: Created shared `DashboardShell` and separated `/demo` from `/dashboard`.
- **Demo Mode Engine**: Built `demo-data.ts` and updated hooks/context to support forced demo mode.
- **Backend Port Fix**: Modified `start.sh` to run FastAPI on port 8080 (GCP) and Streamlit on 8501 (internal).
- **UI Polish**: Switched to **Geist Sans/Mono** fonts and refined component borders/spacing.
- **API Billing (Model A)**: Removed `X-Google-API-Key` requirement; backend now uses server-side env vars.
- **Git Sync**: All local changes committed and pushed to GitHub (`main`).

## In progress
- Backend deployment to Google Cloud Run to activate `start.sh` changes.
- Integration of Server-Sent Events (SSE) for live agent status updates.
- Refinement of `websocket-context.tsx` to handle production alert streams.

## Pending decisions
- Model Choice: Transitioning from Gemini 2.0 Flash to Pro for complex strategic analysis.
- CRM Integration: Determining which CRM (Salesforce/HubSpot) to prioritize for first-party data.

## Known blockers
- **Backend Port Mismatch (Live)**: Production Cloud Run instance is still serving Streamlit on 8080. Requires redeploy.

## Important constraints
- `/demo` routes must remain public and never require Clerk authentication.
- Shared components in `website-2/src/components` must remain `basePath` aware.
- AI costs are absorbed (Model A); do not re-introduce BYOK headers in frontend.

## Files to inspect first
- `website-2/src/lib/demo-data.ts`: Source of truth for all mock investor data.
- `website-2/src/components/dashboard-shell.tsx`: Shared layout logic for both dashboards.
- `website-2/src/lib/demo-context.tsx`: Context provider that manages `forced` demo mode locking.
- `website-2/src/lib/hooks.ts`: Data fetching hooks that automatically switch between mock data and real API calls.
- `website-2/src/lib/websocket-context.tsx`: Core provider for real-time operations, currently simulating alerts in demo mode.
- `start.sh`: Backend entrypoint and port configuration.
- `main.py`: FastAPI backend entrypoint (Model A billing logic).

## Backend / frontend contract notes
- **Data Hooks**: All frontend hooks (`useQuery`, `useMemory`, etc.) in `hooks.ts` dynamically bypass the API fetch if `isDemo` is true (passing `demoData` instead).
- **WebSockets/SSE**: `websocket-context.tsx` uses a simulated `setInterval` to inject `DEMO_ALERTS` in demo mode. In production mode, it currently has no connection; it needs to be wired to the backend SSE endpoint.
- **API Auth**: The frontend no longer passes `X-Google-API-Key`. The backend `main.py` has been updated to use server-side environment variables directly (Model A).

## Technical debt to remember
- Page re-exports: Current pattern in `app/(demo)/demo/*` avoids code duplication but requires manual sync if new routes are added to `(dashboard)`.
- Global CSS: Some legacy utility classes from the early build remain; should be pruned.

## Recommended next tasks
1. Deploy the backend to Google Cloud Run using the latest `start.sh`.
2. Verify `/dashboard` connection to resolve "Failed to fetch" error.
3. Replace simulated intervals in `websocket-context.tsx` with real backend event listeners.

## Things future sessions must remember
- Geist font variables are defined in `globals.css` via `@theme inline`.
- The `forced` prop on `DemoModeProvider` is the primary toggle for route groups.
- Backend FastAPI must always run on port 8080 for GCP compatibility.
