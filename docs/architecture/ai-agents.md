# AI Agents Architecture

## Purpose
Oakwell's AI pipeline uses three specialist Gemini models running in sequence inside `run_oakwell_analysis` (a FastAPI background task). Each specialist has a focused role; this separation avoids monolithic prompt bloat and makes each output auditable independently.

## Major files and configs
- `main.py` — houses all three specialist functions and the orchestration pipeline.
- `tools.py` — Gemini SDK wrappers, Playwright scraping, market sentiment retrieval.
- `agent.py` / `Oakwell/` — ADK agent runtime (separate from the FastAPI specialist path).

## Workspace Context Injection

Before any specialist runs, `run_oakwell_analysis` loads the **Workspace Persona** for the current `owner_scope`:

```python
_workspace = _load_workspace(owner_scope)
_workspace_ctx = ""
if _workspace:
    _workspace_ctx = (
        f"WORKSPACE CONTEXT:\n"
        f"Company: {_workspace.get('company_name', '')} — {_workspace.get('value_prop', '')}\n"
        f"Rep Role: {_workspace.get('user_role', '')}\n"
        f"Target Buyers: {_workspace.get('target_audience', '')}\n\n"
    )
    if not your_product:
        your_product = _workspace.get("company_name") or your_product
```

`_workspace_ctx` is prepended to the prompt of **all three specialists**. When no workspace is configured the string is empty and prompts are unchanged — fully backward-compatible.

## Agent flow

### Stage overview
```
Transcript + Competitor URL + Workspace Persona
        ↓
  1. Claim extraction (classify transcript)
        ↓ (if concrete claims found)
  2. Playwright scrape + Vision AI verification   ← proof_verification mode
        ↓ (if no concrete claims)
     Fast strategic brief path                    ← strategy_only mode
        ↓
  3. Deep market sentiment (Reddit / G2 / social)
        ↓
  4. Specialist #1: Deal Scoring (Gemini Flash)
        ↓
  5. Specialist #2: Talk-Track Writer (Gemini Pro)
        ↓
  6. Specialist #3: Adversarial Critic (Gemini Pro)
        ↓ (if verdict = REJECTED)
  7. Specialist #2 re-run with hardening addendum
        ↓
  8. Persist to oakwell_deals + oakwell_analysis_runs
```

### Analysis modes
| Mode | Trigger | Skips |
|------|---------|-------|
| `proof_verification` | Concrete public claims found in transcript | Nothing |
| `strategy_only` | No concrete claims detected | Playwright, Vision AI, adversarial critique |

## Tooling

### `tools.py` functions used in pipeline
- `scrape_competitor_website(url)` — Playwright stealth scrape, returns markdown + screenshot path.
- `verify_claim_with_vision(claim, url, api_key)` — Screenshots page, asks Gemini Vision if claim is verified.
- `get_market_sentiment(competitor_name, api_key)` — Reddit/G2/X sentiment aggregation.
- `calculate_market_delta(current, historical)` — Detects pricing/feature drift vs prior memory.
- `require_genai_api_key()` / `create_genai_client(api_key)` — Deterministic server-side Gemini auth.
- `FAST_MODEL` — Configurable via `OAKWELL_FAST_MODEL` env var (default: `gemini-2.5-flash`).

## Specialist detail

### Specialist #1: Deal Scoring (`_specialist_score_deal`)
- **Model**: `tools.FAST_MODEL` (Gemini Flash — low latency)
- **Input**: transcript, clashes, visual proof results, competitor name, deal stage, deal value, winning patterns, history context, workspace context
- **Output JSON**: `deal_health_score` (0–100), `score_reasoning`, `risk_level`, `stage_adjustment`
- **Stage playbook**: aggression level (0.3–0.9) from `DEAL_STAGE_PLAYBOOKS[deal_stage]` is injected.

### Specialist #2: Talk-Track Writer (`_specialist_write_talk_track`)
- **Model**: `gemini-2.5-pro`
- **Input**: all Specialist #1 inputs + `your_product` (falls back to `workspace.company_name`), proof filenames, primary proof filename, win/loss patterns
- **Output JSON**: `talk_track`, `clashes_detected`, `key_pivot_points`, `stage_specific_actions`, `proof_artifact_path`
- **Two prompt paths**: `strategy_only` (fast brief) and `proof_verification` (full adversarial strategy with mandatory screenshot reference).
- **Hardening re-run**: If Specialist #3 rejects the strategy, this function runs a second time with the adversarial critique injected as a hardening addendum.

### Specialist #3: Adversarial Critic (`_run_adversarial_critique`)
- **Model**: `gemini-2.5-pro`
- **Input**: talk track, clashes, visual proof results, deep sentiment, competitor name, workspace context
- **Persona**: Simulates the competitor's CEO stress-testing Oakwell's strategy.
- **Output JSON**: `verdict`, `counter_attack_1`, `counter_attack_2`, `missed_ammunition`, `hardening_notes`, `kill_shot_proof`, `confidence`
- **Verdict meanings**: `APPROVED` → strategy is hardened; `REJECTED` → triggers Specialist #2 re-run.

## Stable assumptions
- Workspace context is always the first thing in every specialist prompt when configured.
- `your_product` falls back to `workspace.company_name` — do not hardcode a default in the pipeline.
- `_verification_semaphore` limits concurrent Playwright sessions to 1 to avoid 429 rate limits.
- All three specialists accept `workspace_context: str = ""` — empty string when no workspace is set means no behavioral change.
- Stage playbook aggression (0.3–0.9) is the primary dial for tone calibration per deal stage.

## Open questions / future evolution
- Multi-page proof capture: currently limited to one primary screenshot per competitor URL.
- Workspace-aware claim filtering: use `workspace.competitors` to pre-seed sentinel watchlist automatically.
- User-role-specific output: `user_role` is in the workspace context but specialists don't yet branch on it explicitly — the model is expected to infer tone from context.
- Compounding memory retrieval: currently loads only the latest rollup; richer retrieval of prior `analysis_runs` evidence items could further personalize prompts.
