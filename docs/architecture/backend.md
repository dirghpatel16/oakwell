# Backend Architecture

## Purpose
`main.py` is the FastAPI backend and the sole source of truth for all business logic: AI orchestration, Firestore persistence, proof capture, owner-scoped data access, and workspace persona management.

## Main backend entrypoints
- `main.py` — FastAPI application, all routes and background pipeline.
- `tools.py` — Gemini SDK wrappers, Playwright scraping helpers, market sentiment retrieval.
- `agent.py` / `Oakwell/` — ADK agent runtime (separate from the FastAPI path).

## Responsibilities by file

### `main.py`
- FastAPI app with CORS, auth middleware, and rate limiting.
- All API endpoints (see API surface below).
- Background pipeline function `run_oakwell_analysis`.
- Three AI specialist functions: `_specialist_score_deal`, `_specialist_write_talk_track`, `_run_adversarial_critique`.
- Persistence helpers for all four Firestore collections.
- Workspace Persona load/save helpers (`_load_workspace`, `_save_workspace`).
- `AuthContext` extraction and `owner_scope` derivation from forwarded Clerk headers.

### `tools.py`
- `scrape_competitor_website()` — Playwright stealth scraper.
- `verify_claim_with_vision()` — Screenshot capture + Gemini Vision claim verification.
- `get_market_sentiment()` — Reddit/G2/social sentiment retrieval.
- `calculate_market_delta()` — Market drift detection against prior proof state.
- `require_genai_api_key()` / `create_genai_client()` — Deterministic server-side Gemini auth.
- `FAST_MODEL` — Configurable via `OAKWELL_FAST_MODEL` env var (default: `gemini-2.5-flash`).

## API surface

### Auth-required endpoints (all require `X-Oakwell-Internal-Secret` + `X-Oakwell-User-Id`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Persistence status + API liveness |
| POST | `/analyze-deal` | Enqueue deal analysis background job |
| GET | `/deal-status/{job_id}` | Poll analysis job status |
| GET | `/memory` | Full competitor memory bank for scope |
| GET | `/workspace` | Load workspace persona for scope |
| POST | `/workspace` | Save/update workspace persona |
| GET | `/workspace-setup` | Lightweight: is workspace configured? |
| GET | `/analysis-runs` | Immutable analysis run history |
| GET | `/competitor-trend` | Score/timeline trend for a competitor URL |
| GET | `/winning-patterns` | Win/loss analytics from recorded outcomes |
| POST | `/record-outcome` | Record deal won/lost/stalled |
| POST | `/generate-email` | Generate follow-up email from deal results |
| POST | `/live-snippet` | Real-time meeting snippet analysis |
| GET | `/proof/{filename}` | Serve proof screenshot artifact |
| GET | `/sentinel-status` | Autonomous watcher registry |
| GET | `/executive-summary/{job_id}` | Markdown executive summary for a job |

### Local-dev only (when `OAKWELL_ALLOW_INSECURE_LOCAL_AUTH=1`)
Auth is bypassed; `user_id` defaults to `"local-dev"`.

## Agent/runtime flow

### `run_oakwell_analysis` pipeline (background task)
1. Load Workspace Persona via `_load_workspace(owner_scope)` — build `_workspace_ctx` string.
2. Auto-populate `your_product` from workspace `company_name` if not provided in request.
3. Load prior Neural Memory for the competitor URL via `_load_memory_for_url`.
4. Extract verifiable claims from transcript.
5. If claims found → `proof_verification` mode: Playwright scrape + Vision AI claim verification.
6. If no claims → `strategy_only` mode: skip screenshot capture, return fast strategic brief.
7. Run deep market sentiment (Reddit/G2/social).
8. **Specialist #1**: `_specialist_score_deal` — produces `deal_health_score` (0–100) using Gemini Flash.
9. **Specialist #2**: `_specialist_write_talk_track` — produces talk track using Gemini Pro.
10. **Specialist #3**: `_run_adversarial_critique` — simulates competitor CEO stress-testing the strategy.
11. If critique verdict is REJECTED → re-run Specialist #2 with hardening addendum.
12. Persist to `oakwell_deals` (mutable rollup via `_update_memory`) and `oakwell_analysis_runs` (immutable snapshot).
13. Trigger Slack sentinel alerts if registered.

All three specialist functions receive `workspace_context=_workspace_ctx` prepended to their prompts.

## Persistence and memory

### Firestore collections
| Collection | Purpose | Document ID |
|------------|---------|-------------|
| `oakwell_deals` | Mutable competitor rollup (score history, talk track, timeline) | `{scope_token}__{url_token}` |
| `oakwell_analysis_runs` | Immutable per-run audit snapshots | UUID (`analysis_run_id`) |
| `oakwell_outcomes` | Win/loss/stalled deal outcomes | Auto-generated |
| `oakwell_workspaces` | Workspace Persona per scope | `{scope_token}` |

### Ephemeral JSON fallback (dev only)
When `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=1`, all four persistence layers fall back to local files:
- `outputs/memory.json` — deal rollup
- `outputs/analysis_runs.json` — run history
- `outputs/workspaces.json` — workspace personas
- `outputs/outcomes.json` — win/loss outcomes

**Production must run with `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=0`.**

### Scope isolation
All Firestore document IDs are prefixed with `_scope_token(owner_scope)`, where `owner_scope` is `org:<org_id>` if an org is present, otherwise `user:<user_id>`. This prevents cross-user/cross-org data access.

## Integration rules
- The frontend calls FastAPI exclusively through the Next.js proxy. Never expose FastAPI URLs directly to the browser.
- `your_product` in `AnalyzeDealRequest` is optional — the backend falls back to `workspace.company_name`.
- Workspace Persona is loaded inside the pipeline; the frontend does not need to pass it in the request body.
- All four Firestore collections follow the same Firestore-then-JSON fallback pattern for local dev compatibility.

## Backend constraints
- One `_verification_semaphore` ensures only one Playwright session runs at a time (rate limit protection).
- Rate limiting is in-memory per `scope_id + IP`. Replace with distributed limiter before meaningful scale.
- Cloud Run must have `GOOGLE_API_KEY`, `OAKWELL_INTERNAL_API_SECRET`, and `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=0` set in production.
- FastAPI must run on port 8080 for GCP Cloud Run compatibility.
