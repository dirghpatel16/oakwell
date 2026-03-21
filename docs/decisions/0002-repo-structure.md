# 0002 Memory Strategy

## Status
Accepted

## Context
Long chat threads are not reliable as the only memory mechanism for ongoing engineering work.

## Decision
Use repo-based memory with:
- `AGENTS.md` for stable instructions
- `docs/handoffs/current-state.md` for active context
- `docs/decisions/` for lasting reasoning
- `docs/known-issues.md` for repeated problems

## Consequences
- easier fresh-session recovery
- less dependence on long chat context
- more explicit project knowledge