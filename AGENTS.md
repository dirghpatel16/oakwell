# AGENTS.md

## Project overview
Oakwell is a full-stack product with:
- a Python backend / AI engine at the repo root
- a production Next.js frontend in `/website-2`

This repository contains both product code and supporting agent/tooling code.
Always identify whether the task belongs to:
1. backend / agents / APIs
2. frontend / dashboard / UX
3. architecture / integration
before making changes.

## Repo map
- `/main.py` = primary FastAPI backend entrypoint
- `/agent.py` = agent workflow / orchestration logic
- `/tools.py` = shared tools and integrations
- `/app.py` = Streamlit or alternate app/demo surface
- `/Oakwell/` = YAML/config-style agent definitions and related backend assets
- `/outputs/` = generated outputs and local fallback memory/artifacts
- `/website-2/` = active production frontend app
- `/docs/` = architecture, handoffs, decisions, known issues

## Source of truth
- Product behavior: code + architecture docs
- Current engineering status: `docs/handoffs/current-state.md`
- Next immediate task: `docs/handoffs/next-session.md`
- Long-term project rules: this file
- Frontend-specific rules: `website-2/AGENTS.md`

## Required reading order for new sessions
1. Read `AGENTS.md`
2. Read `docs/handoffs/current-state.md`
3. If frontend task, read `website-2/AGENTS.md`
4. If architecture-sensitive task, read the relevant file in `docs/architecture/`
5. Inspect code before proposing changes

## Global working rules
- Prefer small, targeted changes over broad rewrites.
- Preserve existing architecture unless the task explicitly requires changing it.
- Do not create duplicate logic across backend and frontend.
- Do not introduce new abstractions unless the existing structure is clearly insufficient.
- Reuse existing hooks, providers, services, and utilities where possible.
- Explain current flow before changing complicated systems.
- If behavior changes, update docs/handoffs.
- If architecture changes, add or update a decision file in `docs/decisions/`.

## Coding rules
- Prefer readability over cleverness.
- Keep functions/components focused.
- Avoid hidden coupling between modules.
- Match existing style and naming patterns.
- Do not silently break API/data contracts.
- Keep temporary/demo logic clearly marked.

## Commands
- Frontend dev: `cd website-2 && npm run dev`
- Frontend lint: `cd website-2 && npm run lint`
- Frontend build: `cd website-2 && npm run build`
- Backend dev: `uvicorn main:app --reload`
- Streamlit/demo app: `streamlit run app.py`

## Task workflow
Before coding:
1. summarize the current implementation
2. identify relevant files
3. identify constraints
4. propose the smallest safe change

After coding:
1. summarize what changed
2. list files touched
3. note risks / follow-ups
4. update `docs/handoffs/current-state.md`
5. update `docs/handoffs/next-session.md` if more work remains

## Definition of done
A task is done when:
- code follows existing repo patterns
- no obvious duplication is introduced
- relevant checks/lint pass where applicable
- docs are updated if behavior or architecture changed
- next-session handoff is accurate