import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEST_STACK, validateTestDbConfig } from '../support/test-db-guard';

// 설정 검사 분기만 다루는 단위 테스트다. 실제 DB 격리 증명은 통합 테스트 global-setup 의 docker/표식 검사가 맡는다.
const valid = {
  TEST_SUPABASE_URL: 'http://127.0.0.1:56321',
  TEST_SUPABASE_DB_URL: 'postgresql://postgres:postgres@127.0.0.1:56322/postgres',
  TEST_SUPABASE_ANON_KEY: 'anon-placeholder',
  TEST_SUPABASE_SERVICE_ROLE_KEY: 'service-placeholder',
};

describe('통합 테스트 DB 설정 가드', () => {
  it('설정이 비어 있으면 누락 항목 이름만 알리고 실패한다', () => {
    expect(() => validateTestDbConfig({})).toThrow(/TEST_SUPABASE_URL.*TEST_SUPABASE_DB_URL/);
  });

  it('공백만 있는 값도 누락으로 본다', () => {
    expect(() => validateTestDbConfig({ ...valid, TEST_SUPABASE_SERVICE_ROLE_KEY: '  ' })).toThrow(/누락/);
  });

  it.each([
    'https://abcd.supabase.co',
    'http://10.0.0.5:56321',
    'http://0.0.0.0:56321',
    'http://127.0.0.2:56321',
    'http://localhost.:56321',
    'http://127.0.0.1.nip.io:56321',
    'http://user@evil.example:56321',
  ])('원격·비 loopback API URL 을 거부한다: %s', (url) => {
    expect(() => validateTestDbConfig({ ...valid, TEST_SUPABASE_URL: url })).toThrow(/loopback/);
  });

  it('원격 DB URL 을 거부한다', () => {
    expect(() =>
      validateTestDbConfig({ ...valid, TEST_SUPABASE_DB_URL: 'postgresql://postgres:x@db.example.com:56322/postgres' }),
    ).toThrow(/loopback/);
  });

  it('TEST_DB_ISOLATED 같은 자기 선언이나 URL 문자열로는 통과시키지 않는다 (전용 포트만 허용)', () => {
    expect(() =>
      validateTestDbConfig({ ...valid, TEST_DB_ISOLATED: 'true', TEST_SUPABASE_URL: 'http://127.0.0.1:55321' }),
    ).toThrow(/56321/);
    expect(() =>
      validateTestDbConfig({ ...valid, TEST_SUPABASE_DB_URL: 'postgresql://postgres:x@127.0.0.1:5432/postgres' }),
    ).toThrow(/56322/);
    expect(() => validateTestDbConfig({ ...valid, TEST_SUPABASE_URL: 'http://127.0.0.1' })).toThrow(/56321/);
  });

  it('다른 DB 이름이나 프로토콜을 거부한다', () => {
    expect(() =>
      validateTestDbConfig({ ...valid, TEST_SUPABASE_DB_URL: 'postgresql://postgres:x@127.0.0.1:56322/app' }),
    ).toThrow(/postgres DB/);
    expect(() => validateTestDbConfig({ ...valid, TEST_SUPABASE_URL: 'ftp://127.0.0.1:56321' })).toThrow(/프로토콜/);
    expect(() => validateTestDbConfig({ ...valid, TEST_SUPABASE_URL: 'not a url' })).toThrow(/올바른 URL/);
  });

  it.each(['http://127.0.0.1:56321', 'http://localhost:56321/', 'http://[::1]:56321', 'http://LOCALHOST:56321'])(
    '앱 Supabase 가 테스트 스택과 같으면 별칭·슬래시와 무관하게 거부한다: %s',
    (appUrl) => {
      expect(() => validateTestDbConfig({ ...valid, NEXT_PUBLIC_SUPABASE_URL: appUrl })).toThrow(/별도 테스트 DB/);
    },
  );

  it('앱이 개발 스택(다른 포트)을 쓰면 허용한다', () => {
    expect(validateTestDbConfig({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321' }).apiUrl).toBe(
      'http://127.0.0.1:56321',
    );
  });

  it('오류 메시지에 키나 URL 값을 넣지 않는다', () => {
    const secret = 'super-secret-value';
    try {
      validateTestDbConfig({ ...valid, TEST_SUPABASE_URL: `https://${secret}.example.com`, TEST_SUPABASE_SERVICE_ROLE_KEY: secret });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it('가드 상수가 테스트 스택 config.toml 과 일치하고 개발 스택과 겹치지 않는다', () => {
    const testToml = readFileSync('supabase/test-stack/supabase/config.toml', 'utf8');
    const devToml = readFileSync('supabase/config.toml', 'utf8');
    expect(testToml).toMatch(new RegExp(`project_id = "${TEST_STACK.projectId}"`));
    expect(testToml).toMatch(new RegExp(`\\[api\\][^[]*port = ${TEST_STACK.apiPort}`));
    expect(testToml).toMatch(new RegExp(`\\[db\\][^[]*port = ${TEST_STACK.dbPort}`));
    expect(devToml).not.toMatch(/project_id = "bypp-p0-test"/);
    expect(devToml).not.toMatch(/port = 563\d\d/);
  });
});
