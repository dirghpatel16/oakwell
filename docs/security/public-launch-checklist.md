# Public Launch Security Checklist

Use this before making Oakwell public or exposing the production dashboard to real users.

## Clerk
- Enable mandatory email verification for all email/password sign-ups.
- Enforce strong password policy in Clerk.
- Set session lifetime and inactivity timeout in Clerk.
- Ensure password reset tokens expire promptly in Clerk.
- Enable bot protection / login rate limiting in Clerk.
- Disable unused auth methods in Clerk.
- Review production redirect URLs and allowed origins.
- Rotate any test keys and use production Clerk keys only in production.

## Vercel / Next.js
- Set `OAKWELL_BACKEND_URL`.
- Set `OAKWELL_INTERNAL_API_SECRET`.
- Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Set `CLERK_SECRET_KEY`.
- Confirm `/dashboard` is only accessible with Clerk configured.
- Confirm `/demo` remains public and does not call protected backend routes.

## Cloud Run / FastAPI
- Set `OAKWELL_INTERNAL_API_SECRET` to the same value used by Vercel.
- Set `GOOGLE_API_KEY` or `GEMINI_API_KEY` server-side only.
- Set `OAKWELL_FIRESTORE_PROJECT` to the exact GCP/Firebase project that already has a Firestore database.
- Keep `OAKWELL_ALLOW_EPHEMERAL_MEMORY_FALLBACK=0` in production.
- Restrict `OAKWELL_ALLOWED_ORIGINS` to the actual frontend origins.
- Confirm the Cloud Run service account has `Cloud Datastore User` / Firestore access and `Secret Manager Secret Accessor`.
- Confirm the target GCP project already has a Firestore / Datastore database provisioned.
- Confirm no endpoint serving customer data is reachable without the internal secret.
- Confirm rate limiting is active on `analyze-deal`, `live-snippet`, `generate-email`, and `record-outcome`.

## Data Ownership
- Verify that data written by one Clerk user/org is not visible to another.
- Verify `deal-status/{job_id}` rejects access across users/orgs.
- Verify `/proof/{filename}` rejects access across users/orgs.
- Verify `/memory`, `/winning-patterns`, `/competitor-trend`, and `/executive-summary/{job_id}` only return scoped data.

## Repo Hygiene
- Confirm `.env*` files are not committed.
- Confirm service keys, database credentials, webhook secrets, and internal tokens are not present in tracked files.
- Keep only placeholder values in docs.

## Monitoring
- Enable Cloud Run request/error logging.
- Alert on repeated 401/403/429 responses.
- Alert on backend proxy misconfiguration (missing `OAKWELL_INTERNAL_API_SECRET` or `OAKWELL_BACKEND_URL`).
