# Architecture Overview

## What Oakwell does
Explain the product in plain English.

## System split
Describe the major parts:
- backend / APIs / agent runtime
- frontend / dashboard app
- integrations / tools / memory
- deployment targets

## Major runtime surfaces
- API/backend
- dashboard frontend
- any demo/admin/internal surfaces

## High-level data flow
Describe how data moves through the system from ingestion to user-facing output.

## Major subsystems
- auth
- dashboard
- realtime/events
- analysis/agents
- persistence/memory
- reporting/output

## Important integration boundaries
Define where one subsystem ends and another begins.

## Architecture principles
- keep backend logic in backend
- keep UI state in frontend
- avoid duplicated business logic
- prefer explicit contracts between systems