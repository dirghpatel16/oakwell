# AGENTS.md

## Scope
This file applies only to the frontend app in `/website-2`.

## Frontend overview
This is the active production frontend for Oakwell.
It contains:
- marketing/public surfaces
- onboarding flow
- protected dashboard/product routes
- provider/state logic for dashboard behavior
- current simulated realtime/websocket integration layer

## Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- Clerk auth
- shared UI/components
- dashboard visualizations and operational views

## Route guidance
- Treat `/dashboard/*` as protected product space.
- Preserve route structure unless explicitly changing product architecture.
- Avoid moving route ownership casually.
- Do not mix public marketing logic into dashboard routes.

## Component guidance
- Prefer small, composable components.
- Reuse shared UI before creating new variants.
- Avoid deeply nested prop chains if an existing provider solves it.
- Keep page-level orchestration in pages/layouts, not low-level leaf components.

## State management guidance
- Reuse existing providers/hooks before adding new global state.
- Avoid multiple competing sources of truth for the same data.
- Keep derived UI state close to where it is used unless it is truly shared.
- Be careful when changing provider contracts.

## Realtime/websocket guidance
- Treat `websocket-context.tsx` as the current realtime integration seam.
- Trace data flow end-to-end before editing:
  event/source -> provider state -> hook usage -> dashboard UI
- Do not patch UI symptoms before checking upstream provider logic.
- Preserve stable data contracts unless intentionally refactoring.
- If migrating from simulated to real backend events, document the contract in `docs/architecture/realtime.md`.

## UI / UX guidance
- Preserve current dashboard visual language.
- Avoid demo-only shortcuts that create fragile production behavior.
- Prefer predictable UX over flashy behavior.
- Avoid regressions in operational dashboards.

## Frontend done criteria
- no unnecessary new provider/global state
- existing routes still behave correctly
- no obvious visual regression introduced
- affected flow documented in handoff if behavior changed