# Next Session

## Read first
1. `AGENTS.md`
2. `docs/handoffs/current-state.md`
3. `website-2/AGENTS.md` (Frontend context)
4. `start.sh` (Backend port configuration)

## Start here
- `docs/handoffs/current-state.md` (To see the dual-dashboard status)
- `website-2/src/lib/demo-data.ts` (To understand the mock data engine)
- `website-2/src/lib/websocket-context.tsx` (To see the realtime alert simulation logic)
- `website-2/src/lib/demo-context.tsx` (To understand how the UI locks into demo/prod)

## Immediate task
1. Guide the user through the **deployment of the FastAPI backend to Google Cloud Run**. All local code changes (including the `start.sh` port fix) have already been pushed to GitHub. A redeploy will resolve the current "Failed to fetch" backend connection error on the `/dashboard` routes.
2. Wire up the production `websocket-context.tsx` to handle real Server-Sent Events (SSE) from the live backend, replacing the simulated `setInterval` logic.

## Watch out for
- **Route Prefixing**: Links in the sidebar/shell must use the `basePath` prop from `DashboardShell` to avoid crossing between `/dashboard` and `/demo`.
- **Clerk Auth**: Ensure `/demo` routes remain public in `middleware.ts` if adding more sub-pages.
- **API Models**: We are absorbing costs (Model A), so never re-introduce `X-Google-API-Key` headers in the frontend.

## Success condition
The session is successful if the backend is redeployed, the `/dashboard` can fetch real data from the API (heartbeat/health check passes), and the `/demo` remains fully functional with mock data.
