# Production deployment checklist

This project is deployed on Vercel (https://bypp-one.vercel.app) with a hosted
Supabase project. See [DEPLOYMENT_PROGRESS.md](../DEPLOYMENT_PROGRESS.md) for
the live configuration. No custom SMTP provider is configured yet.

## Current handoff status (2026-09-19)

Implementation through the planned Stage 9 and the Stage 10 deployment
preparation artifacts are present. The hackathon fast-track explicitly deferred
verification of the newly implemented P1-8/P2-9 features until after a hosted
deployment exists. Therefore this document is **not** a release approval and
does not claim a public deployment. See [implementation progress](progress.md)
for the exact implemented-versus-verified boundary.

## Before deployment

1. Create or select a hosted Supabase project and keep its service-role key
   secret. Never place that key in a `NEXT_PUBLIC_` variable or client code.
2. Apply every file in `supabase/migrations/` to that project, in filename
   order. With a linked Supabase CLI project this is normally `supabase db
   push`; use the provider's migration workflow if the project is managed
   elsewhere. Do not use `db reset` against production.
3. Seed only reviewed opportunity/subject/demo-review content. Set
   `SEED_DB_URL` (session pooler connection string), `NEXT_PUBLIC_SUPABASE_URL`
   and `SUPABASE_SERVICE_ROLE_KEY` for the hosted project, then run
   `node scripts/seed-content.ts`. Without `SEED_DB_URL` the script targets the
   local stack only. It is idempotent, but inspect the target project and the
   source-content evidence first.
4. In Supabase Auth, set Site URL to the final HTTPS origin and add the exact
   `https://YOUR_DOMAIN/auth/confirm` redirect path (and only deliberate
   preview origins) to Redirect URLs. Configure a real SMTP sender such as
   Resend/SES before enabling public signup; local Mailpit is development-only.

## Host environment variables

Use [.env.production.example](../.env.production.example) as the key list.

- `NEXT_PUBLIC_SUPABASE_URL`: hosted project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only secret. Mark it encrypted and do
  not expose it to preview builds unless the preview uses an isolated project.
- `NEXT_PUBLIC_SITE_URL`: the one canonical production HTTPS origin. It is
  used for auth redirects and mutation origin validation.
- `NEXT_PUBLIC_ALLOWED_ORIGINS`: optional exact additional origins only. An
  empty value is preferred for production.

For Vercel, import the Git repository, leave Framework Preset as Next.js, and
add the variables separately for Preview and Production. No `vercel.json` is
needed: the app uses the normal App Router build/start behavior.

## Deployment order

1. Configure production secrets and Auth/SMTP/domain settings.
2. Apply migrations and reviewed seed content to the same Supabase project.
3. Deploy the application with `NEXT_PUBLIC_SITE_URL` already set to its final
   domain. Add that domain to Supabase redirect URLs before inviting users.
4. Perform the post-deploy checks below before announcing the URL.

## Post-deploy verification (intentionally not executed yet)

- Run `npm.cmd run typecheck`, `npm.cmd run test:unit`, the isolated integration
  suite, and `npm.cmd run build` from a clean checkout before release.
- Visit the public opportunity list, category/tag/deadline filters, detail,
  public teams, and public reviews on the deployed domain.
- Sign up with a real inbox, confirm via `/auth/confirm`, then log out/in.
- Confirm origin protection rejects a mutation made from an unconfigured
  origin, while the canonical domain can create/edit/delete reviews, bookmarks,
  teams, and join requests.
- Verify a public team response does not reveal owner/member identity or
  contact links. Verify contact is available only to the leader and accepted
  members; verify unaccepted users receive no contact data.
- Exercise create/request/accept/reject/cancel/close paths and check duplicate,
  full-team, deadline, and authorization conflicts show safe errors.
- Confirm `/me` is `private, no-store` and one user's bookmarks, teams,
  requests, reviews, and display name are not visible to another user.
- Inspect Supabase logs for unexpected service-role use, failed auth redirects,
  and database errors. Keep a rollback plan (previous host deployment and a
  forward-only corrective migration).

## External blockers before a public launch

- A hosted Supabase project with the migrations applied.
- A verified production domain and matching Auth Site/Redirect URL settings.
- An SMTP/email provider with a verified sender domain.
- Production environment variables placed in the host's secret store.
- A person with authority to run the deferred test and post-deploy checklist.
