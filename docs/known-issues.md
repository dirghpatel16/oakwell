# Known Issues

## Deployment
- **Status Update**: The live Google Cloud Run backend now responds correctly on `/health`, so the port mismatch path is no longer the active blocker.
- **Next Risk**: Verify the production frontend against real API payloads, not just an empty/healthy backend.

## Realtime
- **Simulated Demo Alerts**: Real-time alerts in `websocket-context.tsx` are currently generated via `setInterval` using `DEMO_ALERTS` when in demo mode.
- **Production Status**: Production mode currently has no real-time alert stream until backend-driven event listeners are added.

## Frontend
- **API Contract Drift**: The frontend still assumes string fields in several places, but the backend returns structured data for fields like `clashes_detected`, `market_drift`, and `adversarial_critique`.
- **Impact**: Pages may render poorly or error once real production analysis data appears.
- **Workaround**: Normalize backend payloads at the API boundary in `website-2/src/lib/api.ts` before they reach dashboard pages.
- **Route Ownership Rule**: `/demo` and `/dashboard` now share non-route page modules under `website-2/src/components/dashboard-pages`.
- **Impact**: Importing one route module from another can break Next App Router/Turbopack and caused the recent `/demo` internal server error.
- **Workaround**: Keep route files as thin wrappers that import shared page modules, not other route files.
- **Clerk Auth Redirect**: The `(dashboard)` layout expects Clerk auth, but the `(demo)` layout is public. Cross-linking between the two can cause unexpected auth states.
- **Impact**: Minor UX confusion if links cross `basePath`.
- **Workaround**: Use `DashboardShell` with explicit `basePath` prop for all sidebar links.
