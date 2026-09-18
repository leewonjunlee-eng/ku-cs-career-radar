# P1-7 review verification

Verified locally on 2026-09-19. This document records observed commands and
results; it does not represent an external deployment.

## Remediation completed

- F1: `.env.local` now permits the explicit `http://localhost:3000` development
  origin in addition to the canonical `http://127.0.0.1:3000` site origin.
  Origin validation still requires the request URL and `Origin` header to be
  identical and to appear in the configured allow-list.
- F2: review text validation rejects NUL, lone UTF-16 surrogates, and disallowed
  control characters before PostgreSQL. Details length is measured in the same
  shallow JSONB text form enforced by the database. Known user-input driver and
  constraint errors are safe 400 responses; unexpected 5xx responses always use
  `INTERNAL_ERROR` rather than exposing a database or PostgREST code.
- F3: type-specific `details` uses own-property allow-list checks, closing
  prototype-chain keys such as `constructor` and `toString`.
- F4: the Supabase proxy applies `private, no-store` only when it refreshes an
  auth cookie. Public review, subject, and opportunity route headers therefore
  retain their deliberate shared-cache policy; personal routes still set their
  own no-store response headers.
- F5: the global footer no longer says reviews are unimplemented.
- F6: review cards now render period, role, result, type-specific details,
  preparation, strengths, challenges, tips, and skills as text-only content.
- F7: a PATCH that changes review type without supplying `details` validates the
  persisted details against the target type. It cannot create a record whose
  stored details violate the new type allow-list.
- F8: optional inputs are trimmed before being sent, changing subject clears a
  prefilled opportunity ID, skills have stable unique React keys, edit has a
  cancel path, and deletion failures leave the existing list visible.

## Checks run

```text
npm.cmd run typecheck
PASS

npm.cmd run test:unit
PASS — 7 files, 68 tests

npm.cmd run db:test:start
npm.cmd run db:test:types
npm.cmd exec -- vitest run --project integration tests/integration/reviews.test.ts --reporter verbose
PASS — 1 file, 8 real-PostgreSQL review tests

npm.cmd run build
PASS — Next.js production build
```

The normal full integration command was also started. A concurrent earlier test
process caused two unrelated P0-5 team-race cases to observe 403 instead of 200;
the review-only suite above was run after that process and passed. Subsequent
full-suite serial runs exceeded the local command-observation window, so this
document deliberately does **not** claim a new full-suite pass. Re-run the full
suite from an idle test stack before release:

```powershell
npm.cmd exec -- vitest run --project integration --no-file-parallelism
```

## Browser and HTTP observation

- Started the isolated local development Supabase stack with `npm.cmd run
  db:dev:start` and ran `npm.cmd run dev`.
- Loaded `http://localhost:3000/reviews` in a fresh local QA browser tab. The
  public reviews page and its filters rendered; the signed-out review authoring
  prompt rendered as expected.
- `GET http://localhost:3000/api/reviews` returned `200` with
  `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- No browser create/edit/delete mutation was submitted in this verification,
  because the fresh QA tab was not authenticated and no user account or local
  data was altered through the browser UI. The real-DB mutation suite above
  covers create, update, delete, ownership, public visibility, and demo rules.

## Remaining release limitations

- There is no external deployment, configured production SMTP, or production
  Supabase project verification.
- Before release, repeat the browser create/edit/delete flow with a disposable
  local account and an idle test/development stack, then run the full serial
  integration suite.
