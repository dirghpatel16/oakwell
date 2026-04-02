# Frontend Architecture

## Purpose
The Next.js frontend (`website-2/`) is the customer-facing dashboard, investor demo surface, and onboarding flow. It owns UI state, Clerk auth enforcement, and acts as a same-origin proxy to the FastAPI backend.

## App structure

### Route groups
```
app/
├── (auth)/
│   ├── sign-in/[[...sign-in]]/   # Clerk SignIn
│   └── sign-up/[[...sign-up]]/   # Clerk SignUp
├── (dashboard)/
│   └── dashboard/                # Protected — requires Clerk auth + workspace cookie
│       ├── page.tsx              # War Room
│       ├── deals/                # Deal Desk
│       ├── targets/              # Market Sentinel
│       ├── alerts/               # Threat Intel
│       ├── forecast/             # Forecast
│       ├── executive/            # Executive Portal
│       ├── sidekick/             # Live Sidekick
│       └── settings/             # Settings & Workspace
├── (demo)/
│   └── demo/                     # Public demo — no auth, forced mock data
├── onboarding/                   # First-login wizard (new user setup)
├── api/backend/[...path]/        # Authenticated server-side proxy to FastAPI
└── layout.tsx                    # Root layout with conditional ClerkProvider
```

### Shared dashboard UI
All dashboard page implementations live in `website-2/src/components/dashboard-pages/`. Both `/dashboard` and `/demo` import from there — route files are thin wrappers.

## Auth model

### Clerk authentication
- `ClerkProvider` is only rendered when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is present (allows local `/demo` without Clerk).
- `src/middleware.ts` protects `/dashboard(.*)` routes via `clerkMiddleware`.

### Onboarding redirect (new users)
After Clerk auth, middleware checks for the `oakwell_workspace_configured` cookie:
- **Cookie absent** → redirect to `/onboarding`.
- **Cookie present** → allow through to `/dashboard`.

The cookie is set by `document.cookie` at the end of the onboarding scan, before `router.push("/dashboard")`. It has a 1-year `max-age`.

### Backend proxy
All requests to FastAPI flow through `src/app/api/backend/[...path]/route.ts`:
- Extracts Clerk `userId` and `orgId` via `auth()`.
- Forwards `X-Oakwell-Internal-Secret`, `X-Oakwell-User-Id`, `X-Oakwell-Org-Id` to FastAPI.
- Allowed root paths: `analyze-deal`, `generate-email`, `live-snippet`, `deal-status`, `proof`, `health`, `sentinel-status`, `memory`, `competitor-trend`, `executive-summary`, `record-outcome`, `winning-patterns`, `workspace`, `workspace-setup`.

## Main frontend domains

### Onboarding (`/onboarding`)
5-step wizard: Company Details → CRM Integration → Competitors → Notifications → Initial Scan.

**Step 1 collects the Workspace Persona:**
- Company Name
- Value Proposition (textarea)
- Your Role (sdr / ae / manager / exec select)
- Industry
- Sales Team Size

**Step 5 (Initial Scan):**
- Runs `api.analyzeDeal()` for each competitor domain.
- On completion, calls `api.saveWorkspace(...)` to persist the persona.
- Sets `document.cookie = "oakwell_workspace_configured=true; path=/; max-age=31536000"`.
- Navigates to `/dashboard` via `router.push`.

### Dashboard
- **War Room** — real-time pulse from Neural Memory.
- **Deal Desk** — analysis submission, results, evidence ledger. `yourProduct` field auto-fills from workspace `company_name` via `useWorkspace()` hook.
- **Market Sentinel** — competitor tracking.
- **Threat Intel** — alerts.
- **Settings** — live workspace config (company name, value prop, role) with save button wired to `POST /workspace`.

### Demo (`/demo`)
Identical page structure, but `DemoModeProvider forced={true}` causes all hooks to return static mock data from `demo-data.ts`. No API calls are made.

## State model

### Server state (fetched from backend)
All server state is managed through hooks in `src/lib/hooks.ts`. Each hook wraps `useQuery` which:
- Returns `demoData` immediately if `isDemo` is true (no fetch).
- Otherwise fetches from the API via `src/lib/api.ts`.
- Supports optional `refreshInterval` for auto-polling.

| Hook | Endpoint | Notes |
|------|----------|-------|
| `useMemory` | `GET /memory` | Refreshes every 30s |
| `useSentinelStatus` | `GET /sentinel-status` | Refreshes every 60s |
| `useWinningPatterns` | `GET /winning-patterns` | On demand |
| `useCompetitorTrend` | `GET /competitor-trend` | On demand |
| `useAnalysisRuns` | `GET /analysis-runs` | Refreshes every 60s |
| `useHealth` | `GET /health` | Refreshes every 15s |
| `useWorkspace` | `GET /workspace` | On mount; no interval |
| `useDealAnalysis` | POST + polling | Manages job lifecycle |
| `useLiveSidekick` | `POST /live-snippet` | On demand |
| `useEmailGeneration` | `POST /generate-email` | On demand |

### Stable references
`DEMO_HEALTH_STATUS`, `EMPTY_RUNS`, and `DEMO_WORKSPACE` are module-level constants to prevent infinite re-render loops when passed as `demoData` to `useQuery`.

### Local component state
Form fields (transcript, competitor URL, deal stage, etc.), UI toggles, and transient job status are kept in component-local `useState`.

## Component rules
- Shared page implementations → `website-2/src/components/dashboard-pages/`
- Shared stateless UI → `website-2/src/components/`
- Data hooks → `website-2/src/lib/hooks.ts`
- API client functions and types → `website-2/src/lib/api.ts`
- Demo data → `website-2/src/lib/demo-data.ts`
- Providers → `website-2/src/lib/` (demo-context, websocket-context)

## Frontend constraints
- `/demo` routes must remain public; never add Clerk `protect()` to them.
- The browser must never call FastAPI directly; always go through the proxy.
- `yourProduct` state in Deal Desk starts empty and is populated from `useWorkspace` — do not hardcode a default value.
- Workspace Persona is fetched client-side and used for UI pre-fill only; the backend independently loads it server-side for prompt injection.
- Adding a new backend endpoint requires adding its root path to `ALLOWED_ROOTS` in `route.ts`.
- `demo-data.ts` is the investor demo source of truth; keep mock data realistic and production-representative.
