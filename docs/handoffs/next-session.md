# Next Session

## Read first
1. `AGENTS.md` (System overview)
2. `docs/handoffs/current-state.md` (Architecture state)
3. `start.sh` & `main.py` (Deployment & API contract)

## Start here
- `docs/handoffs/current-state.md` (To see the backend deployment status)
- `website-2/src/lib/api.ts` (To verify frontend normalization for live backend payloads)
- `main.py` and `tools.py` (To confirm the active fast-model path)

## Immediate task
1. Configure the Clerk-side security controls from `docs/security/public-launch-checklist.md`:
   - mandatory email verification
   - session lifetime / inactivity expiry
   - password reset expiry
   - login throttling / bot protection
2. Deploy the new secure request path end-to-end:
   - Vercel: `OAKWELL_BACKEND_URL`, `OAKWELL_INTERNAL_API_SECRET`, Clerk envs
   - Cloud Run: `OAKWELL_INTERNAL_API_SECRET`, `GOOGLE_API_KEY`, `OAKWELL_FIRESTORE_PROJECT` (or `FIRESTORE_PROJECT` / `GOOGLE_CLOUD_PROJECT`), Clerk-related app envs as needed
3. Redeploy Cloud Run with the latest `main.py` / `tools.py` fast-model update (`gemini-2.5-flash` default via `OAKWELL_FAST_MODEL`) so the live analysis path no longer depends on deprecated `gemini-2.0-flash`.
4. Confirm the explicit GenAI auth patch is live in Cloud Run:
   - `tools.py` now resolves `GOOGLE_API_KEY` / `GEMINI_API_KEY` explicitly instead of relying on SDK auto-discovery
   - `/analyze-deal` should now fail fast with a clean 503 if backend AI credentials are missing
5. Run two real production analyses so `/memory` is populated and the updated `/dashboard` flow can be validated end-to-end:
   - one proof-backed transcript with concrete public claims
   - one qualitative transcript that should route to `strategy_only`
6. Audit the remaining `/dashboard` screens (`forecast`, `executive`, `sidekick`) against real backend payloads.
7. Once the data path is verified, wire up `websocket-context.tsx` to handle true Server-Sent Events (SSE) or backend event flow instead of simulated operation progress.
8. Start an architecture pass on the durable backend moat: multi-page evidence retrieval, stronger competitive memory/RAG, and agent orchestration that is materially more defensible than a thin wrapper over frontier chat models.

## Watch out for
- **Route Prefixing**: Links in the sidebar/shell must use the `basePath` prop from `DashboardShell` to avoid crossing between `/dashboard` and `/demo`.
- **Shared Page Ownership**: Do not point `/demo` route files at `/dashboard` route files again; both route groups should import shared non-route modules from `src/components/dashboard-pages`.
- **Local Env Limitation**: This workspace currently lacks `GOOGLE_API_KEY`, so local end-to-end analysis cannot prove the new backend model path without external env setup.
- **Cloud Run Validation**: A deploy can still look healthy while model auth is broken. Validate the explicit-key patch by running a real `/analyze-deal` request after redeploy, not just `/health`.
- **Storage Validation**: Use `/storage-status` (through `/api/backend/storage-status`) during onboarding validation to confirm `firestore_available=true` before expecting production War Room memory to populate.
- **Evidence State Contract**: Deal results now expose `analysis_mode`, `evidence_status`, `evidence_summary`, `verification_reason`, `claim_count`, and `verified_claim_count`. Preserve those fields at the API seam and in new dashboard surfaces.
- **Security Boundary**: The frontend should use the same-origin proxy route (`/api/backend/*`), not direct browser calls to Cloud Run. FastAPI now expects `X-Oakwell-Internal-Secret` and forwarded user/org headers from that proxy.
- **Ownership Checks**: Job polling, proof downloads, memory reads, trend queries, executive summaries, and win/loss analytics are all scoped to `owner_scope`. Do not reintroduce unscoped global reads.
- **Security Automation**: `.github/workflows/security.yml` and `.github/dependabot.yml` now exist. Keep them green and extend them instead of replacing them with ad hoc manual checks.
- **Env Templates**: `.env.example` and `website-2/.env.example` are now the safe templates for required secrets. Do not document real values in code or docs.
- **Clerk Auth**: Ensure `/demo` routes remain public in `middleware.ts` if adding more sub-pages.
- **Local Auth Fallback**: `src/app/layout.tsx` still bypasses `ClerkProvider` when the publishable key is missing so `/demo` can render locally, but `src/middleware.ts` now blocks `/dashboard` when Clerk is not configured.
- **API Models**: We are absorbing costs (Model A), so never re-introduce `X-Google-API-Key` headers in the frontend.

## Success condition
The session is successful if the secure proxy + backend secret path is deployed, the live backend is redeployed with the fast-model fix, at least one real production analysis appears in scoped `/memory`, the `/dashboard` renders it without contract errors, and `/demo` remains fully functional with deterministic sample data.
