import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type AuthUser,
  connectDb,
  createAuthUser,
  deleteAuthUser,
  rest,
  testDb,
  truncateAppData,
} from './helpers';

type Fixture = { owner: AuthUser; alice: AuthUser; bob: AuthUser; outsider: AuthUser; contestId: string; hackathonId: string; expiredId: string; labId: string };
let db: pg.Client;
let fixture: Fixture;

const service = { apikey: testDb.serviceRoleKey };
const rpc = (name: string, body: Record<string, unknown>, options: { apikey?: string; bearer?: string } = service) =>
  rest(`rpc/${name}`, { ...options, method: 'POST', body });
const teamArgs = (actor: string, opportunity: string, overrides: Record<string, unknown> = {}) => ({
  p_actor_id: actor,
  p_opportunity_id: opportunity,
  p_name: 'Transaction team',
  p_introduction: 'A real DB transaction fixture',
  p_max_members: 3,
  p_roles: ['backend'],
  p_skills: ['TypeScript'],
  p_contact_link: 'https://example.test/contact',
  ...overrides,
});

async function makeOpportunity(category: string, deadlineType: 'fixed' | 'rolling' | 'tbd', deadline: Date | null) {
  const { rows } = await db.query(
    `with s as (insert into public.subjects (kind, name) values ('contest_series', $1) returning id)
     insert into public.opportunities (subject_id, title, organization, category, deadline, deadline_type, deadline_precision, source_name, source_url, last_checked_at)
     select id, $1, 'Test', $2::opp_category, $3, $4::opp_deadline_type,
       case when $4 = 'fixed' then 'time'::opp_deadline_precision else null end,
       'Test', $5, clock_timestamp() from s returning id`,
    [`P0-5 ${crypto.randomUUID()}`, category, deadline?.toISOString() ?? null, deadlineType, `https://example.test/${crypto.randomUUID()}`],
  );
  return rows[0].id as string;
}

async function createTeam(opportunity = fixture.contestId, actor = fixture.owner.id, overrides: Record<string, unknown> = {}) {
  const result = await rpc('create_team', teamArgs(actor, opportunity, overrides));
  expect(result.status).toBe(200);
  return result.body as string;
}

async function createRequest(teamId: string, actor: string, message = 'Please let me join') {
  const result = await rpc('create_team_request', { p_actor_id: actor, p_team_id: teamId, p_message: message });
  expect(result.status).toBe(200);
  return result.body as string;
}

async function serviceClient() {
  const client = await connectDb();
  await client.query('set role service_role');
  return client;
}

async function waitForLock(client: pg.Client, pid: number) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const { rows } = await client.query(`select wait_event_type from pg_stat_activity where pid = $1`, [pid]);
    if (rows[0]?.wait_event_type === 'Lock') return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('second connection never reached the expected row lock');
}

beforeAll(async () => {
  db = await connectDb();
});

beforeEach(async () => {
  await truncateAppData(db);
  const [owner, alice, bob, outsider] = await Promise.all([createAuthUser(), createAuthUser(), createAuthUser(), createAuthUser()]);
  fixture = {
    owner,
    alice,
    bob,
    outsider,
    contestId: await makeOpportunity('contest', 'fixed', new Date(Date.now() + 60_000)),
    hackathonId: await makeOpportunity('hackathon', 'rolling', null),
    expiredId: await makeOpportunity('contest', 'fixed', new Date(Date.now() - 60_000)),
    labId: await makeOpportunity('lab', 'rolling', null),
  };
});

afterEach(async () => {
  await truncateAppData(db);
  await Promise.all([fixture.owner, fixture.alice, fixture.bob, fixture.outsider].map((user) => deleteAuthUser(user.id)));
});

afterAll(async () => {
  await db.end();
});

describe('server-only team RPC contracts', () => {
  const publicCalls = [
    ['create_team', teamArgs('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')],
    ['create_team_request', { p_actor_id: '00000000-0000-0000-0000-000000000001', p_team_id: '00000000-0000-0000-0000-000000000002', p_message: null }],
    ['accept_team_request', { p_actor_id: '00000000-0000-0000-0000-000000000001', p_team_id: '00000000-0000-0000-0000-000000000002', p_request_id: '00000000-0000-0000-0000-000000000003' }],
    ['reject_team_request', { p_actor_id: '00000000-0000-0000-0000-000000000001', p_team_id: '00000000-0000-0000-0000-000000000002', p_request_id: '00000000-0000-0000-0000-000000000003' }],
    ['cancel_team_request', { p_actor_id: '00000000-0000-0000-0000-000000000001', p_team_id: '00000000-0000-0000-0000-000000000002', p_request_id: '00000000-0000-0000-0000-000000000003' }],
    ['close_team', { p_actor_id: '00000000-0000-0000-0000-000000000001', p_team_id: '00000000-0000-0000-0000-000000000002' }],
  ] as const;

  it.each(publicCalls)('%s is denied to anon and authenticated PostgREST callers', async (name, body) => {
    for (const options of [{}, { bearer: fixture.owner.accessToken }]) {
      const result = await rpc(name, body, options);
      expect([401, 403]).toContain(result.status);
    }
  });

  it('creates team, owner membership, and contact atomically and accepts rolling/tbd opportunities', async () => {
    const rolling = await createTeam(fixture.hackathonId);
    const tbd = await createTeam(await makeOpportunity('contest', 'tbd', null));
    const { rows } = await db.query(
      `select t.id, t.owner_id, t.max_members, m.role, c.contact_link
         from public.teams t join public.team_members m on m.team_id = t.id join public.team_contacts c on c.team_id = t.id
        where t.id in ($1, $2) order by t.id`,
      [rolling, tbd],
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.owner_id === fixture.owner.id && row.role === 'leader' && row.max_members === 3)).toBe(true);
  });

  it('rejects invalid, non-team, expired, null/forged actor input without creating partial data', async () => {
    const before = await db.query('select count(*)::int as n from public.teams');
    for (const args of [
      teamArgs(fixture.owner.id, fixture.labId),
      teamArgs(fixture.owner.id, fixture.expiredId),
      teamArgs('00000000-0000-0000-0000-000000000099', fixture.contestId),
      teamArgs(fixture.owner.id, fixture.contestId, { p_max_members: 1 }),
      teamArgs(fixture.owner.id, fixture.contestId, { p_contact_link: 'javascript:alert(1)' }),
      teamArgs(fixture.owner.id, fixture.contestId, { p_name: '   ' }),
    ]) expect([400, 401, 403]).toContain((await rpc('create_team', args)).status);
    const after = await db.query('select count(*)::int as n from public.teams');
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('rejects null and forged actor IDs even through the service-role RPC boundary', async () => {
    const team = await createTeam();
    for (const actor of [null, crypto.randomUUID()]) {
      const result = await rpc('create_team_request', { p_actor_id: actor, p_team_id: team, p_message: 'forged actor' });
      expect([400, 401, 403]).toContain(result.status);
    }
    const { rows } = await db.query(`select count(*)::int as n from public.team_requests where team_id = $1`, [team]);
    expect(rows[0].n).toBe(0);
  });

  it('rolls back a forced failure after team insertion', async () => {
    await db.query(`create function public.p0_5_force_failure() returns trigger language plpgsql as $$ begin raise exception 'forced'; end $$`);
    await db.query(`create trigger p0_5_force_failure after insert on public.teams for each row execute function public.p0_5_force_failure()`);
    try {
      expect((await rpc('create_team', teamArgs(fixture.owner.id, fixture.contestId))).status).toBe(400);
      const { rows } = await db.query('select count(*)::int as teams, (select count(*)::int from public.team_members) as members, (select count(*)::int from public.team_contacts) as contacts from public.teams');
      expect(rows[0]).toEqual({ teams: 0, members: 0, contacts: 0 });
    } finally {
      await db.query('drop trigger if exists p0_5_force_failure on public.teams');
      await db.query('drop function if exists public.p0_5_force_failure()');
    }
  });

  it('enforces request ownership, forever-unique requests, immutable team fields, and pending-only transitions', async () => {
    const team = await createTeam();
    expect([400, 401, 403]).toContain((await rpc('create_team_request', { p_actor_id: fixture.owner.id, p_team_id: team, p_message: null })).status);
    const request = await createRequest(team, fixture.alice.id);
    expect([400, 409]).toContain((await rpc('create_team_request', { p_actor_id: fixture.alice.id, p_team_id: team, p_message: null })).status);
    expect([401, 403]).toContain((await rpc('accept_team_request', { p_actor_id: fixture.outsider.id, p_team_id: team, p_request_id: request })).status);
    expect((await rpc('reject_team_request', { p_actor_id: fixture.owner.id, p_team_id: team, p_request_id: request })).status).toBe(204);
    expect([400, 409]).toContain((await rpc('create_team_request', { p_actor_id: fixture.alice.id, p_team_id: team, p_message: null })).status);
    expect([400, 409]).toContain((await rpc('cancel_team_request', { p_actor_id: fixture.alice.id, p_team_id: team, p_request_id: request })).status);
  });

  it('rejects a request action with the wrong team, non-owner rejection, and non-requester cancellation', async () => {
    const team = await createTeam();
    const otherTeam = await createTeam(fixture.hackathonId);
    const request = await createRequest(team, fixture.alice.id);
    expect([400, 404]).toContain((await rpc('accept_team_request', { p_actor_id: fixture.owner.id, p_team_id: otherTeam, p_request_id: request })).status);
    expect([401, 403]).toContain((await rpc('reject_team_request', { p_actor_id: fixture.outsider.id, p_team_id: team, p_request_id: request })).status);
    expect([401, 403]).toContain((await rpc('cancel_team_request', { p_actor_id: fixture.outsider.id, p_team_id: team, p_request_id: request })).status);
    const { rows } = await db.query(`select status from public.team_requests where id = $1`, [request]);
    expect(rows[0]).toEqual({ status: 'pending' });
  });

  it('only allows immutable-field writes to fail even for service-role execution', async () => {
    const team = await createTeam();
    await expect(db.query(`update public.teams set max_members = 9 where id = $1`, [team])).rejects.toMatchObject({ code: '22023' });
  });

  it('allows a pending request to be cancelled or rejected after the opportunity expires', async () => {
    const team = await createTeam();
    const cancel = await createRequest(team, fixture.alice.id);
    const reject = await createRequest(team, fixture.bob.id);
    await db.query(`update public.opportunities set deadline = clock_timestamp() - interval '1 second' where id = $1`, [fixture.contestId]);
    expect((await rpc('cancel_team_request', { p_actor_id: fixture.alice.id, p_team_id: team, p_request_id: cancel })).status).toBe(204);
    expect((await rpc('reject_team_request', { p_actor_id: fixture.owner.id, p_team_id: team, p_request_id: reject })).status).toBe(204);
  });

  it('rejects both a new request and acceptance when an existing team is recategorized to a non-team opportunity', async () => {
    const team = await createTeam();
    const pending = await createRequest(team, fixture.alice.id);
    await db.query(`update public.opportunities set category = 'lab' where id = $1`, [fixture.contestId]);
    expect([400, 409]).toContain((await rpc('create_team_request', { p_actor_id: fixture.bob.id, p_team_id: team, p_message: 'wrong category' })).status);
    expect([400, 409]).toContain((await rpc('accept_team_request', { p_actor_id: fixture.owner.id, p_team_id: team, p_request_id: pending })).status);
    const { rows } = await db.query(`select status from public.team_requests where id = $1`, [pending]);
    expect(rows[0]).toEqual({ status: 'pending' });
  });

  it('does not duplicate a member when acceptance is retried and closes a full team', async () => {
    const team = await createTeam(fixture.contestId, fixture.owner.id, { p_max_members: 2 });
    const request = await createRequest(team, fixture.alice.id);
    expect((await rpc('accept_team_request', { p_actor_id: fixture.owner.id, p_team_id: team, p_request_id: request })).status).toBe(204);
    expect([400, 409]).toContain((await rpc('accept_team_request', { p_actor_id: fixture.owner.id, p_team_id: team, p_request_id: request })).status);
    const { rows } = await db.query(`select status, (select count(*)::int from public.team_members where team_id = $1) as members from public.teams where id = $1`, [team]);
    expect(rows[0]).toEqual({ status: 'closed', members: 2 });
  });
});

describe('true multi-connection state transitions', () => {
  it('serializes simultaneous accepts for the last slot: exactly one succeeds and the team closes', async () => {
    const team = await createTeam(fixture.contestId, fixture.owner.id, { p_max_members: 2 });
    const aliceRequest = await createRequest(team, fixture.alice.id);
    const bobRequest = await createRequest(team, fixture.bob.id);
    const first = await serviceClient();
    const second = await serviceClient();
    try {
      await first.query('begin');
      await first.query('select public.accept_team_request($1, $2, $3)', [fixture.owner.id, team, aliceRequest]);
      await second.query('begin');
      const pending = second.query('select public.accept_team_request($1, $2, $3)', [fixture.owner.id, team, bobRequest]);
      await waitForLock(db, (second as unknown as { processID: number }).processID);
      await first.query('commit');
      const secondResult = await pending.then(() => 'ok', () => 'failed');
      await second.query('commit');
      expect(secondResult).toBe('failed');
      const { rows } = await db.query(`select status, (select count(*)::int from public.team_members where team_id = $1) as members from public.teams where id = $1`, [team]);
      expect(rows[0]).toEqual({ status: 'closed', members: 2 });
      const requests = await db.query(`select status from public.team_requests where team_id = $1 order by created_at`, [team]);
      expect(requests.rows.map((row) => row.status).sort()).toEqual(['accepted', 'pending']);
    } finally { await first.end(); await second.end(); }
  });

  it('serializes cancellation and closure against acceptance, retaining a consistent pending request', async () => {
    const team = await createTeam();
    const request = await createRequest(team, fixture.alice.id);
    const first = await serviceClient(); const second = await serviceClient();
    try {
      await first.query('begin');
      await first.query('select public.close_team($1, $2)', [fixture.owner.id, team]);
      await second.query('begin');
      const pending = second.query('select public.accept_team_request($1, $2, $3)', [fixture.owner.id, team, request]);
      await waitForLock(db, (second as unknown as { processID: number }).processID);
      await first.query('commit');
      expect(await pending.then(() => 'ok', () => 'failed')).toBe('failed');
      await second.query('commit');
      const { rows } = await db.query(`select t.status as team_status, r.status as request_status from public.teams t join public.team_requests r on r.team_id = t.id where t.id = $1`, [team]);
      expect(rows[0]).toEqual({ team_status: 'closed', request_status: 'pending' });
    } finally { await first.end(); await second.end(); }
  });

  it('serializes cancellation against acceptance so the accepted member is never inserted after cancellation wins', async () => {
    const team = await createTeam();
    const request = await createRequest(team, fixture.alice.id);
    const first = await serviceClient(); const second = await serviceClient();
    try {
      await first.query('begin');
      await first.query('select public.cancel_team_request($1, $2, $3)', [fixture.alice.id, team, request]);
      await second.query('begin');
      const pending = second.query('select public.accept_team_request($1, $2, $3)', [fixture.owner.id, team, request]);
      await waitForLock(db, (second as unknown as { processID: number }).processID);
      await first.query('commit');
      expect(await pending.then(() => 'ok', () => 'failed')).toBe('failed');
      await second.query('commit');
      const { rows } = await db.query(`select r.status, (select count(*)::int from public.team_members where team_id = $1 and user_id = $2) as member from public.team_requests r where r.id = $3`, [team, fixture.alice.id, request]);
      expect(rows[0]).toEqual({ status: 'cancelled', member: 0 });
    } finally { await first.end(); await second.end(); }
  });

  it('checks the current database deadline after waiting on a team lock rather than transaction start time', async () => {
    const soon = await makeOpportunity('contest', 'fixed', new Date(Date.now() + 60_000));
    const team = await createTeam(soon);
    const holder = await serviceClient(); const waiter = await serviceClient();
    try {
      await holder.query('begin');
      await holder.query('select id from public.teams where id = $1 for update', [team]);
      await waiter.query('begin');
      const blocked = waiter.query('select public.create_team_request($1, $2, $3)', [fixture.alice.id, team, 'late']);
      await waitForLock(db, (waiter as unknown as { processID: number }).processID);
      // The request transaction already began, but cannot examine the opportunity
      // until the observed team-row lock releases. Use DB time, not a client sleep,
      // to make the deadline stale before that re-check runs.
      await db.query(`update public.opportunities set deadline = clock_timestamp() - interval '1 second' where id = $1`, [soon]);
      await holder.query('commit');
      expect(await blocked.then(() => 'ok', () => 'expired')).toBe('expired');
      await waiter.query('commit');
    } finally { await holder.end(); await waiter.end(); }
  });
});
