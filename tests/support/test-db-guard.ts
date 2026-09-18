/**
 * 통합 테스트 대상 DB 가드. tests/integration/global-setup.ts 가 모든 통합 테스트 전에 강제로 실행한다.
 *
 * 1) validateTestDbConfig: 설정값만 검사 (단위 테스트 대상)
 *    - URL 을 파싱해 정규화된 호스트·포트로 판단한다. 부분 문자열 추측을 쓰지 않는다.
 *    - loopback 이 아닌 호스트는 전부 거부한다 (원격 DB 허용 옵션 없음).
 *    - 전용 테스트 스택 포트(TEST_STACK)만 허용하고, 앱이 쓰는 Supabase 와 같은 포트면 거부한다.
 * 2) verifyTestStackIdentity: 실제 대상 확인 (파괴적 테스트 전)
 *    - 해당 호스트 포트를 점유한 컨테이너가 bypp-p0-test 프로젝트의 것인지 docker 로 확인한다.
 *    - DB 에 테스트 스택 표식(bypp.stack_id)이 있는지 확인한다. 표식은 scripts/test-db.ts 만 설정한다.
 * 오류 메시지에 URL·키 값을 넣지 않는다.
 */
import { execFileSync } from 'node:child_process';
import pg from 'pg';

export const TEST_STACK = {
  projectId: 'bypp-p0-test',
  apiPort: 56321,
  dbPort: 56322,
  markerSetting: 'bypp.stack_id',
} as const;

export type TestDbConfig = {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

type Env = Record<string, string | undefined>;

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function parseUrl(name: string, raw: string, protocols: string[]): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} 가 올바른 URL 이 아니다.`);
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`${name} 가 loopback 호스트가 아니다. 원격 DB 는 통합 테스트 대상이 될 수 없다.`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} 의 프로토콜이 허용되지 않는다. 허용: ${protocols.join(', ')}`);
  }
  return url;
}

export function validateTestDbConfig(env: Env): TestDbConfig {
  const read = (key: string) => env[key]?.trim() ?? '';
  const required = [
    'TEST_SUPABASE_URL',
    'TEST_SUPABASE_DB_URL',
    'TEST_SUPABASE_ANON_KEY',
    'TEST_SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter((key) => !read(key));
  if (missing.length > 0) {
    throw new Error(
      `통합 테스트 DB 설정 누락: ${missing.join(', ')}. ` +
        '`npm run db:test:start` 로 전용 테스트 스택을 시작하면 .env.test.local 이 생성된다.',
    );
  }

  const api = parseUrl('TEST_SUPABASE_URL', read('TEST_SUPABASE_URL'), ['http:']);
  if (Number(api.port) !== TEST_STACK.apiPort || (api.pathname !== '/' && api.pathname !== '')) {
    throw new Error(`TEST_SUPABASE_URL 은 전용 테스트 스택 API 포트 ${TEST_STACK.apiPort} 의 루트여야 한다.`);
  }
  const db = parseUrl('TEST_SUPABASE_DB_URL', read('TEST_SUPABASE_DB_URL'), ['postgres:', 'postgresql:']);
  if (Number(db.port) !== TEST_STACK.dbPort || db.pathname !== '/postgres') {
    throw new Error(`TEST_SUPABASE_DB_URL 은 전용 테스트 스택 DB 포트 ${TEST_STACK.dbPort} 의 postgres DB 여야 한다.`);
  }

  // 앱이 같은 스택을 가리키면 거부한다. 앱 URL 이 원격이면 포트가 겹쳐도 다른 대상이다.
  const appRaw = read('NEXT_PUBLIC_SUPABASE_URL');
  if (appRaw) {
    let app: URL | null = null;
    try {
      app = new URL(appRaw);
    } catch {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL 을 해석할 수 없어 앱/테스트 분리를 확인할 수 없다.');
    }
    const appPort = Number(app.port || (app.protocol === 'https:' ? 443 : 80));
    if (
      LOOPBACK_HOSTS.has(app.hostname) &&
      (appPort === TEST_STACK.apiPort || appPort === TEST_STACK.dbPort)
    ) {
      throw new Error('앱이 사용하는 Supabase 가 통합 테스트 스택과 같다. 별도 테스트 DB 를 사용한다.');
    }
  }

  return {
    apiUrl: `http://127.0.0.1:${TEST_STACK.apiPort}`,
    dbUrl: read('TEST_SUPABASE_DB_URL'),
    anonKey: read('TEST_SUPABASE_ANON_KEY'),
    serviceRoleKey: read('TEST_SUPABASE_SERVICE_ROLE_KEY'),
  };
}

/** 호스트 포트를 점유한 컨테이너가 전용 테스트 프로젝트 소유인지 확인한다. */
export function assertPortOwnedByTestStack(service: 'kong' | 'db', containerPort: number, hostPort: number) {
  const container = `supabase_${service}_${TEST_STACK.projectId}`;
  let out: string;
  try {
    out = execFileSync('docker', ['port', container, `${containerPort}/tcp`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(`전용 테스트 컨테이너 ${container} 를 찾을 수 없다. \`npm run db:test:start\` 를 먼저 실행한다.`);
  }
  const ports = out
    .split(/\r?\n/)
    .map((line) => Number(line.trim().split(':').pop()))
    .filter(Boolean);
  if (!ports.includes(hostPort)) {
    throw new Error(`호스트 포트 ${hostPort} 가 ${container} 에 연결되어 있지 않다.`);
  }
}

export async function readStackMarker(dbUrl: string): Promise<string | null> {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ marker: string | null }>(
      'select current_setting($1, true) as marker',
      [TEST_STACK.markerSetting],
    );
    return rows[0]?.marker ?? null;
  } finally {
    await client.end();
  }
}

export async function verifyTestStackIdentity(config: TestDbConfig) {
  assertPortOwnedByTestStack('kong', 8000, TEST_STACK.apiPort);
  assertPortOwnedByTestStack('db', 5432, TEST_STACK.dbPort);
  if ((await readStackMarker(config.dbUrl)) !== TEST_STACK.projectId) {
    throw new Error('대상 DB 에 통합 테스트 스택 표식이 없다. 파괴적 테스트를 중단한다.');
  }
}
