# 0003 - Authenticated Backend Proxy

## Status
Accepted

## Context
Oakwell used Clerk to protect `/dashboard` in Next.js, but the browser was still calling the FastAPI backend directly. That meant:

- backend endpoints could be reached outside the Clerk-protected UI
- memory, job status, proof files, and analytics were effectively global
- ownership checks were missing, creating IDOR risk
- frontend builds still exposed the backend base URL as a public client concern

For a public repo and a production dashboard, UI auth alone was not enough.

## Decision
Adopt a server-side proxy and internal auth boundary:

- The browser now calls same-origin Next.js route handlers under `/api/backend/*`
- The Next.js proxy uses Clerk server auth to identify the user/org
- The proxy forwards requests to FastAPI with:
  - `X-Oakwell-Internal-Secret`
  - `X-Oakwell-User-Id`
  - `X-Oakwell-Org-Id` when available
- FastAPI rejects protected requests unless the internal secret is valid
- FastAPI scopes persisted data and job access by `owner_scope`
  - `org:<id>` when an org is present
  - `user:<id>` otherwise

## Consequences

### Positive
- Backend endpoints are no longer public browser-facing surfaces
- Memory, proofs, job polling, and outcome analytics now have ownership checks
- The frontend no longer needs a public backend URL to operate
- Demo mode remains public because it uses deterministic local demo data rather than protected backend fetches

### Trade-offs
- Deployment now requires coordinated secrets on both Vercel and Cloud Run
- Local `/dashboard` development without Clerk is intentionally harder; `/demo` remains the unauthenticated local surface
- The current rate limiter is in-memory and should be replaced with a distributed limiter before scale

## Required Environment Variables

### Vercel / Next.js
- `OAKWELL_BACKEND_URL`
- `OAKWELL_INTERNAL_API_SECRET`
- Clerk env vars

### Cloud Run / FastAPI
- `OAKWELL_INTERNAL_API_SECRET`
- `GOOGLE_API_KEY`

## Follow-up
- Replace in-memory rate limiting with a shared/distributed limiter
- Consider moving more backend calls behind typed BFF routes if product complexity grows
- Keep all future protected dashboard data behind the proxy/auth boundary
