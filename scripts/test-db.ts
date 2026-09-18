/**
 * 통합 테스트 전용 Supabase 스택(bypp-p0-test) 관리.
 *
 *   node scripts/test-db.ts start   스택 시작 → 마이그레이션 적용 → 테스트 표식 설정 → .env.test.local 작성
 *   node scripts/test-db.ts types   테스트 스택 스키마로 src/types/database.ts 생성
 *   node scripts/test-db.ts stop    스택 정지 (데이터 볼륨 유지)
 *
 * reset 은 하지 않는다. 키·URL 은 출력하지 않고 무시되는 .env.test.local 에만 기록한다.
 * CLI 출력은 키를 포함할 수 있으므로 화면에 전달하지 않고, 실패 시 토큰 형태를 가린 stderr 만 보여준다.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import { TEST_STACK, assertPortOwnedByTestStack, validateTestDbConfig } from '../tests/support/test-db-guard.ts';

const CLI = ['node_modules/supabase/dist/supabase.js'];
const WORKDIR = 'supabase/test-stack';

function redact(text: string) {
  return text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<redacted-jwt>')
    .replace(/sb_(publishable|secret)_[\w-]+/g, '<redacted-key>')
    .replace(/postgres(ql)?:\/\/[^\s"']+/g, '<redacted-db-url>');
}

function supabase(args: string[]): string {
  try {
    return execFileSync(process.execPath, [...CLI, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const e = error as { stderr?: string; stdout?: string };
    throw new Error(`supabase ${args[0]} 실패:\n${redact(`${e.stderr ?? ''}\n${e.stdout ?? ''}`).slice(-4000)}`);
  }
}

/** 상태 JSON 은 메모리에서만 파싱하고 필요한 값만 꺼낸 뒤 설정 가드로 검증한다. */
function verifiedConfig() {
  const s = JSON.parse(supabase(['status', '--workdir', WORKDIR, '-o', 'json'])) as Record<string, string>;
  const env = {
    TEST_SUPABASE_URL: s.API_URL,
    TEST_SUPABASE_DB_URL: s.DB_URL,
    TEST_SUPABASE_ANON_KEY: s.ANON_KEY,
    TEST_SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY,
  };
  const config = validateTestDbConfig(env);
  assertPortOwnedByTestStack('kong', 8000, TEST_STACK.apiPort);
  assertPortOwnedByTestStack('db', 5432, TEST_STACK.dbPort);
  // 로컬 컨테이너 DB 는 TLS 를 제공하지 않는다. CLI 는 기본으로 TLS 를 시도하므로 명시한다.
  return { env, config, cliDbUrl: `${config.dbUrl}?sslmode=disable` };
}

async function start() {
  console.log(`[test-db] ${TEST_STACK.projectId} 스택 시작 (이미 실행 중이면 유지)`);
  supabase(['start', '--workdir', WORKDIR]);
  const { env, config, cliDbUrl } = verifiedConfig();

  console.log(`[test-db] 마이그레이션 적용 (${readdirSync('supabase/migrations').length}개 파일, 적용된 것은 건너뜀)`);
  supabase(['migration', 'up', '--db-url', cliDbUrl]);

  // 표식은 DB 재접속 후에도 남아야 하므로 ALTER DATABASE로 영구 설정해야 하는데,
  // 로컬 스택의 postgres 롤은 superuser가 아니라 이 작업엔 실제 superuser(supabase_admin)가 필요하다.
  const adminUrl = new URL(config.dbUrl);
  adminUrl.username = 'supabase_admin';
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    await client.query(`alter database postgres set ${TEST_STACK.markerSetting} = '${TEST_STACK.projectId}'`);
  } finally {
    await client.end();
  }

  writeFileSync(
    '.env.test.local',
    '# scripts/test-db.ts 가 생성. 통합 테스트 전용 로컬 스택 값. 커밋·출력 금지.\n' +
      Object.entries(env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') +
      '\n',
  );
  console.log('[test-db] 준비 완료. 값은 .env.test.local 에만 기록했다.');
}

function types() {
  const { cliDbUrl } = verifiedConfig();
  writeFileSync('src/types/database.ts', supabase(['gen', 'types', 'typescript', '--db-url', cliDbUrl, '--schema', 'public']));
  console.log('[test-db] src/types/database.ts 생성 완료');
}

const command = process.argv[2];
try {
  if (command === 'start') await start();
  else if (command === 'types') types();
  else if (command === 'stop') supabase(['stop', '--workdir', WORKDIR]);
  else throw new Error('사용법: node scripts/test-db.ts start|types|stop');
} catch (error) {
  console.error(redact(String(error instanceof Error ? error.message : error)));
  process.exit(1);
}
