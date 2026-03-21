# Known Issues

## Deployment
- **Backend Port Mismatch (Live)**: The live Google Cloud Run instance is still serving the Streamlit app on port 8080.
- **Current Hypothesis**: FastAPI is currently running on port 8000 inside the container, but GCP expects it on 8080.
- **Affected Files**: `start.sh`, `main.py`
- **Workaround**: Guided the user to modify `start.sh` to swap ports (FastAPI on 8080, Streamlit on 8501). A redeploy is required to apply the fix.

## Realtime
- **Simulated Demo Alerts**: Real-time alerts in `websocket-context.tsx` are currently generated via `setInterval` using `DEMO_ALERTS` when in demo mode.
- **Production Status**: Production mode currently has no real-time alert stream until backend-driven event listeners are added.

## Frontend
- **Clerk Auth Redirect**: The `(dashboard)` layout expects Clerk auth, but the `(demo)` layout is public. Cross-linking between the two can cause unexpected auth states.
- **Impact**: Minor UX confusion if links cross `basePath`.
- **Workaround**: Use `DashboardShell` with explicit `basePath` prop for all sidebar links.
