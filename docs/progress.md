# Implementation progress

Last updated: 2026-09-19

This is an implementation status record. Deployment details live in
[DEPLOYMENT_PROGRESS.md](../DEPLOYMENT_PROGRESS.md). Public URL:
https://bypp-one.vercel.app (no custom SMTP provider yet).

| Stage | Status | Delivered scope |
| --- | --- | --- |
| P0-1 | Complete | Next.js App Router scaffold, navigation, base screens, local build tooling. |
| P0-2 | Complete for local development | Initial opportunity/subject/demo-review content and idempotent local seed script. |
| P0-3 | Complete | Core PostgreSQL schema, RLS, revoked direct Data API access, and public-safe views. |
| P0-4 | Complete | Email/password authentication boundary, confirmation callback, profile trigger, logout, server-only service-role client, origin and cache protections. |
| P0-5 | Complete | Server-only team transaction RPCs for create, request, accept, reject, cancel, and close. Browser team UI/API is P1-8 work. |
| P1-6 | Complete | Public opportunity list/detail data access, search/filter parsing, deadline helpers, and pages. |
| P1-7 | Implemented and locally verified | Public and personal review APIs, review pages/forms/cards, anonymized/demo handling, validation, ownership boundaries, and Stage 7 remediation. |
| P1-8 | Implemented and HTTP-verified locally | Team list/create/request/decision/cancel/close APIs and UI, private contact endpoint, and owner request management. |
| P2-9 | Implemented and HTTP-verified locally | Bookmarks, personal activity, profile display-name editing, recruitment-copy/contact editing API, and tag/category/deadline/expired filters. |
| 10: release/deploy | Deployed and verified (see DEPLOYMENT_PROGRESS.md) | Vercel production at https://bypp-one.vercel.app on hosted Supabase with migrations 0001-0010 and reviewed seed. User flows verified locally over HTTP; production checked with read-only and rejected requests. |

## Hackathon deployment snapshot

As of 2026-09-19, implementation through the planned Stage 9 is complete:

- P1-8 team recruitment APIs and UI are present, including server-validated
  mutations over the P0-5 RPCs and private contact access.
- P2-9 bookmarks, personal activity, display-name editing, team-management
  editing, and opportunity filters are present.
- Stage 10 deployment preparation is present in `.env.production.example` and
  [the deployment checklist](deployment.md).

These items are recorded as **implemented, unverified** because the hackathon
fast-track intentionally deferred all new test/build/browser verification until
after deployment. They must not be treated as a release approval. The app was
deployed on 2026-09-19; the post-deploy checklist in
[the deployment checklist](deployment.md) is the remaining verification step.

## P1-7 current state

Reviews support creation, edit, deletion, public listing, filters, related
reviews on an opportunity, and personal review management. The public data path
reads only the `public_reviews` view and never returns `author_id`. Normal users
cannot set `is_demo`; demo reviews are isolated behind the demo view/filter.

The current implementation additionally:

- accepts only explicit same-origin mutation requests,
- safely rejects invalid text/JSONB input before it reaches the database,
- prevents prototype-chain detail keys and invalid persisted details after a
  review-type change,
- preserves public cache headers without caching personal or cookie-refresh
  responses, and
- renders all documented review-card fields as plain text.

See [Stage 7 verification](stage7-verification.md) for exact commands and the
remaining release checks.

## Latest evidence

On 2026-09-19 the following completed successfully:

```text
npm.cmd run typecheck
npm.cmd run test:unit                 # 68 tests
npm.cmd exec -- vitest run --project integration tests/integration/reviews.test.ts --reporter verbose
                                      # 8 real-PostgreSQL review tests
npm.cmd run build
```

`GET /api/reviews` was also observed locally with
`Cache-Control: public, s-maxage=60, stale-while-revalidate=300` after the
proxy cache fix. A fresh local browser tab rendered `/reviews` at
`http://localhost:3000`.

Sol subsequently ran the complete suite serially on an idle isolated stack:

```text
vitest run --project integration --no-file-parallelism --reporter dot
                                      # 6 files, 122 tests
```

That P1-7 verification passed, but it does not validate the later P1-8/P2-9
fast-track implementation.

## Local workflow

Use [local development](local-development.md) for the development stack, local
Mailpit, and isolated integration-test commands. Do not point test variables at
a deployed or production Supabase project.
