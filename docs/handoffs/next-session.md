# Next Session

## Read first
1. `AGENTS.md` (System overview)
2. `docs/handoffs/current-state.md` (Architecture state)
3. `start.sh` & `main.py` (Deployment & API contract)

## Start here
- `docs/handoffs/current-state.md` (To see the backend deployment status)
- `website-2/src/lib/api.ts` (To verify frontend normalization for live backend payloads)
- `main.py` (To confirm the actual FastAPI response shapes)

## Immediate task
1. Run the local dev server and confirm `/demo` is rendering again after the shared-page refactor.
2. Verify the remaining `/dashboard` pages can safely render live backend data now that Cloud Run is healthy and the API seam normalization has started.
3. Run a real production analysis so `/memory` is populated and the real dashboard can be validated end-to-end.
4. Once the data path is verified, wire up `websocket-context.tsx` to handle real Server-Sent Events (SSE) from the backend instead of simulated intervals.

## Watch out for
- **Route Prefixing**: Links in the sidebar/shell must use the `basePath` prop from `DashboardShell` to avoid crossing between `/dashboard` and `/demo`.
- **Shared Page Ownership**: Do not point `/demo` route files at `/dashboard` route files again; both route groups should import shared non-route modules from `src/components/dashboard-pages`.
- **Clerk Auth**: Ensure `/demo` routes remain public in `middleware.ts` if adding more sub-pages.
- **Local Auth Fallback**: `src/app/layout.tsx` now bypasses `ClerkProvider` when the publishable key is missing, and `src/middleware.ts` also bypasses Clerk when env vars are absent, so local `/demo` debugging still works.
- **API Models**: We are absorbing costs (Model A), so never re-introduce `X-Google-API-Key` headers in the frontend.

## Success condition
The session is successful if the live backend remains healthy, the `/dashboard` can render real analysis payloads without contract errors, at least one real production analysis appears in `/memory`, and the `/demo` remains fully functional with mock data.
