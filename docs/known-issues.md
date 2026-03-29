# Known Issues

## Deployment
- **Status Update**: The live Google Cloud Run backend now responds correctly on `/health`, so the port mismatch path is no longer the active blocker.
- **Next Risk**: Cloud Run must be redeployed with the latest backend fast-model patch before the end-to-end analysis path can be considered current.
- **Proof Path Validation Pending**: The new `strategy_only` / `proof_verification` split is implemented locally, but it still needs live Cloud Run validation with real backend credentials.
- **Security Env Coupling**: The hardened auth path now depends on `OAKWELL_INTERNAL_API_SECRET` being set consistently in both Vercel and Cloud Run, and `OAKWELL_BACKEND_URL` being set in Vercel.
- **Impact**: If only one side is updated, authenticated dashboard API calls will fail even though `/demo` still works.
- **Workaround**: Deploy the frontend and backend secret changes together.
- **Header Hardening Gap**: Baseline security headers are now present in Next.js, but there is not yet a strict, tested Content Security Policy.
- **Impact**: The app is safer than before but not yet at maximum browser-side hardening.
- **Workaround**: Add a Clerk-compatible CSP after validating all auth and asset flows in staging.

## Realtime
- **Simulated Demo Alerts**: Real-time alerts in `websocket-context.tsx` are currently generated via `setInterval` using `DEMO_ALERTS` when in demo mode.
- **Production Status**: Production connection state and alert summaries are now derived from backend health/memory, but operation progress is still simulated until backend-driven event listeners are added.

## Frontend
- **API Contract Drift**: The frontend still assumes string fields in several places, but the backend returns structured data for fields like `clashes_detected`, `market_drift`, and `adversarial_critique`.
- **Impact**: Pages may render poorly or error once real production analysis data appears.
- **Workaround**: Normalize backend payloads at the API boundary in `website-2/src/lib/api.ts` before they reach dashboard pages.
- **Clerk Configuration Dependency**: The same-origin proxy route depends on Clerk auth for `/dashboard` API traffic.
- **Impact**: `/dashboard` now intentionally fails closed when Clerk is missing rather than rendering a faux local user state.
- **Workaround**: Use `/demo` for local/public unauthenticated walkthroughs and configure Clerk before relying on `/dashboard`.
- **Single-URL Evidence Model**: Deal Desk now explains evidence state more clearly, but the backend still anchors proof to one competitor URL and one primary screenshot path.
- **Impact**: Multi-page enterprise claims and head-to-head comparisons can still look thinner than the transcript warrants.
- **Workaround**: Next backend pass should retrieve and rank evidence across multiple relevant competitor pages instead of a single screenshot.
- **Route Ownership Rule**: `/demo` and `/dashboard` now share non-route page modules under `website-2/src/components/dashboard-pages`.
- **Impact**: Importing one route module from another can break Next App Router/Turbopack and caused the recent `/demo` internal server error.
- **Workaround**: Keep route files as thin wrappers that import shared page modules, not other route files.
- **Clerk Auth Redirect**: The `(dashboard)` layout expects Clerk auth, but the `(demo)` layout is public. Cross-linking between the two can cause unexpected auth states.
- **Impact**: Minor UX confusion if links cross `basePath`.
- **Workaround**: Use `DashboardShell` with explicit `basePath` prop for all sidebar links.

## Local validation
- **Missing Local AI Env**: This workspace does not currently expose `GOOGLE_API_KEY`, so local end-to-end backend analysis cannot be validated from here.
- **Impact**: Code-level fixes to the analysis path can be compiled and reviewed, but not fully proven locally.
- **Workaround**: Validate from Cloud Run after redeploy or from a local environment that has the required backend secrets.
- **Clerk-Owned Auth Policies**: Password hashing, email verification, session expiry, password reset token expiry, and login attempt throttling are delegated to Clerk rather than implemented in this codebase.
- **Impact**: Repo code can be hardened, but those user-account controls still require explicit configuration in the Clerk dashboard before production.
- **Workaround**: Turn on mandatory email verification, session lifetime limits, password reset expiry, bot protection, and rate limiting in Clerk before public launch.
- **Rate Limiter Scope**: The current abuse limiter is in-memory per process.
- **Impact**: It helps on a single instance, but distributed deployments can still be bursty across instances.
- **Workaround**: Move rate limiting to a shared store or edge gateway before scaling up.
- **Turbopack Sandbox Limitation**: `npm run build` can fail inside the sandbox with an `Operation not permitted` port-binding error even when the app is healthy.
- **Impact**: Build failures in this environment may be misleading.
- **Workaround**: Re-run the production build outside the sandbox when that specific Turbopack error appears.
