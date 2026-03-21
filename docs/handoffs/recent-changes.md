# Recent Changes

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
- **Follow-up**: Need to redeploy the backend to Google Cloud Run to activate the port fix.
- **Risk**: `websocket-context.tsx` uses simulated intervals in demo mode; must transition to backend-driven event streams for production.
- **Maintenance**: Adding new routes requires a re-export in the `(demo)` group to keep parity.
