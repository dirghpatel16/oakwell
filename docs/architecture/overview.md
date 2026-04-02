# Architecture Overview

## What Oakwell does
Oakwell is an Autonomous Revenue Defense platform. Sales reps paste a call transcript and a competitor URL; Oakwell cross-references the buyer's claims against live competitor web data using Vision AI, generates a deal-specific talk track, and persists a compounding intelligence record so every future analysis is richer than the last.

## System split
- **Backend** (`main.py`, `tools.py`) — FastAPI on Google Cloud Run. Owns all AI orchestration, Firestore persistence, proof capture, and business logic.
- **Frontend** (`website-2/`) — Next.js 16 on Vercel. Dashboard UI, Clerk auth, same-origin proxy to FastAPI.
- **Streamlit surface** (`app.py`) — Internal demo/ops dashboard, separate from the customer-facing Next.js app.
- **Agent tooling** (`tools.py`, `agent.py`, `Oakwell/`) — Playwright scraping, Gemini SDK wrappers, market sentiment retrieval.

## Major runtime surfaces
- `/dashboard` — Clerk-authenticated production dashboard for customers.
- `/demo` — Public high-fidelity demo dashboard (mock data, no auth required).
- `/onboarding` — First-login wizard that collects the Workspace Persona and redirects to `/dashboard` on completion.
- `http://localhost:8080` (or Cloud Run) — FastAPI backend.
- `http://localhost:8501` — Streamlit internal surface.

## High-level data flow
1. User authenticates via Clerk → new users are intercepted by middleware and redirected to `/onboarding`.
2. Onboarding collects company identity, value prop, role, and competitors → saved to `oakwell_workspaces` Firestore collection via `POST /workspace`.
3. On Deal Desk, user pastes transcript + competitor URL → `POST /analyze-deal` enqueues a background job.
4. Backend loads the **Workspace Persona** for the scope and injects it into all three AI specialist prompts before running analysis.
5. Multi-agent pipeline runs: claim extraction → Playwright proof capture → deep sentiment → deal scoring → talk-track writing → adversarial critique → hardening.
6. Results are persisted to `oakwell_deals` (mutable rollup) and `oakwell_analysis_runs` (immutable audit record).
7. Frontend polls `/deal-status/{job_id}` until complete, then reloads `/memory` to confirm durable persistence.

## Major subsystems

### Auth
Clerk handles user identity, session management, and frontend route protection. The Next.js proxy (`/api/backend/[...path]`) forwards `X-Oakwell-User-Id` and `X-Oakwell-Org-Id` to FastAPI on every request. FastAPI derives an `owner_scope` (`org:<id>` or `user:<id>`) from those headers and uses it to isolate all Firestore records.

### Workspace Persona
Persistent per-scope profile stored in `oakwell_workspaces`. Contains: `company_name`, `value_prop`, `user_role`, `target_audience`, `competitors`. Loaded at the start of every analysis run and injected into AI specialist prompts. Also used to auto-populate `your_product` in Deal Desk. Managed via `GET/POST /workspace` and `GET /workspace-setup`.

### Dashboard
Next.js app with two parallel route groups: `/dashboard` (real data) and `/demo` (mock data). Shared UI lives in `website-2/src/components/dashboard-pages/`. All hooks are demo-aware via `useDemoMode()`.

### Realtime / Events
Currently based on frontend polling (`/deal-status/{job_id}` every 3 seconds). WebSocket context (`websocket-context.tsx`) derives health and alerts from backend data in production. True SSE/event streaming is a future step.

### Analysis / Agents
Three specialist AI functions running in sequence: `_specialist_score_deal` (Gemini Flash), `_specialist_write_talk_track` (Gemini Pro), `_run_adversarial_critique` (Gemini Pro). All three receive the workspace context block prepended to their prompts.

### Persistence / Memory
Two Firestore collections for deal data (`oakwell_deals` mutable rollup, `oakwell_analysis_runs` immutable audit). One collection for workspace config (`oakwell_workspaces`). One for win/loss outcomes (`oakwell_outcomes`). All collections fall back to local JSON files in `outputs/` when `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=1`.

### Reporting / Output
`/memory` returns the full competitor rollup. `/analysis-runs` returns immutable per-run history. `/winning-patterns` returns win/loss analytics. `/workspace` returns the Workspace Persona.

## Important integration boundaries
- The browser never calls FastAPI directly — all requests go through the Next.js proxy at `/api/backend/[...path]`.
- The Next.js proxy is the auth seam: Clerk session → proxy → FastAPI with forwarded identity headers.
- Workspace Persona is loaded server-side inside `run_oakwell_analysis`; the frontend does not need to pass it in the analysis request body.
- Firestore is the authoritative durable store; `outputs/*.json` fallbacks are dev-only.

## Architecture principles
- Keep backend logic (AI orchestration, persistence, proof capture) in `main.py` / `tools.py`.
- Keep UI state in the frontend; hooks are the contract boundary.
- Workspace Persona is loaded once per analysis run and injected into prompts — do not pass it as a request field.
- Avoid duplicated business logic between frontend and backend.
- Prefer explicit contracts between systems (typed interfaces in `api.ts`, Pydantic models in `main.py`).
