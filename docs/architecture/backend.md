# Backend Architecture

## Purpose
Describe what the backend is responsible for.

## Main backend entrypoints
- `main.py`
- `agent.py`
- `tools.py`
- other important files

## Responsibilities by file
For each important backend file, briefly define its role.

## API surface
Document:
- main routes/endpoints
- expected request/response shapes
- where route logic should live

## Agent/runtime flow
Describe how the backend agent system operates.

## Persistence and memory
Document:
- Firestore / DB / files / outputs
- what counts as durable memory
- fallback storage behavior
- what backend state is authoritative

## Integration rules
- what frontend can rely on
- what is still mocked/simulated
- what contracts are stable vs evolving

## Backend constraints
- performance constraints
- deployment constraints
- external service constraints