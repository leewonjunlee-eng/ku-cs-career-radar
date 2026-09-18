# Local development and test database

The app and its integration tests use different local Supabase stacks. Never point
the integration-test variables at a development or deployed project.

For the implemented-stage summary and the latest verification evidence, see
[current progress](progress.md).

## App development

Start the development Supabase stack and the Next.js app in separate terminals:

```powershell
npm.cmd run db:dev:start
npm.cmd run dev
```

The canonical local app URL is `http://127.0.0.1:3000`; `http://localhost:3000`
is also explicitly allowed for browser mutation requests by the example local
configuration. Use one of these two configured origins, rather than an
arbitrary host or port. Local confirmation mail is
captured by Mailpit at `http://127.0.0.1:55324`; it is not delivered to Gmail or
other external inboxes. Stop the local stack with `npm.cmd run db:dev:stop`.

`db:dev:start` prints this stack's `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY`.
Copy them into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`) before running `npm.cmd run dev` —
without them, every page that reads from the database throws immediately.

To load real opportunities/subjects/demo reviews from `content/initial-content.json`
into this dev stack (idempotent, safe to re-run):

```powershell
npm.cmd run content:seed
```

## Isolated integration tests

The integration suite uses only the `bypp-p0-test` Supabase stack and refuses to
run unless its Docker container identity and database marker both match. Start it
and apply every migration with:

```powershell
npm.cmd run db:test:start
npm.cmd run db:test:types
npm.cmd exec -- vitest run --project integration
```

`db:test:types` regenerates `src/types/database.ts` from that isolated schema.
The test fixtures create and clean up their own Auth users and application rows.
No production or development database is reset by these commands. Stop the test
stack after verification with `npm.cmd run db:test:stop`.

## P0-5 team RPCs

`0005_team_functions.sql` exposes server-only `service_role` RPCs for team
creation, request creation, acceptance, rejection, cancellation, and close.
The Next.js team APIs validate the signed-in user before supplying the RPC actor
ID; browser/anon/authenticated PostgREST callers have no execute grant.

For the planned hosted deployment sequence and the checks not run during the
hackathon fast-track, see [production deployment](deployment.md).
