# 0001 Repo Structure

## Status
Accepted

## Context
Oakwell contains both backend/agent code and the production frontend in the same repository.

## Decision
Use root-level docs and AGENTS.md for repo-wide guidance.
Use `website-2/AGENTS.md` for frontend-only guidance.

## Alternatives considered
- single giant AGENTS.md only
- frontend-only instructions
- keeping memory only in chat threads

## Consequences
- new chats can recover context faster
- frontend work gets more specific guidance
- project memory moves into the repo instead of chat history