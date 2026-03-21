# Next Session

## Read first
1. `AGENTS.md` (System overview)
2. `docs/handoffs/current-state.md` (Architecture state)
3. `start.sh` & `main.py` (Deployment & API contract)

## Start here
- `docs/handoffs/current-state.md` (To see the backend deployment status)
- `main.py` (To see the updated API endpoints missing `X-Google-API-Key`)
- `start.sh` (To confirm the 8080/8501 port swap for Cloud Run)

## Immediate task
1. Guide the user through the **deployment of the FastAPI backend to Google Cloud Run**. The container entrypoint (`start.sh`) now exposes FastAPI on `8080` (expected by GCP) instead of Streamlit. Redeploying will resolve the "Failed to fetch" error on the `/dashboard`.
2. Ensure the Cloud Run environment has a valid `GOOGLE_API_KEY` set as an environment variable, since we shifted to Model A billing (absorbing costs) and removed BYOK headers.
3. Once the API is live, wire up `websocket-context.tsx` to handle real Server-Sent Events (SSE) from the backend instead of simulated intervals.

## Watch out for
- **Route Prefixing**: Links in the sidebar/shell must use the `basePath` prop from `DashboardShell` to avoid crossing between `/dashboard` and `/demo`.
- **Clerk Auth**: Ensure `/demo` routes remain public in `middleware.ts` if adding more sub-pages.
- **API Models**: We are absorbing costs (Model A), so never re-introduce `X-Google-API-Key` headers in the frontend.

## Success condition
The session is successful if the backend is redeployed, the `/dashboard` can fetch real data from the API (heartbeat/health check passes), and the `/demo` remains fully functional with mock data.
