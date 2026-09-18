import { existsSync } from 'node:fs';
import type { TestProject } from 'vitest/node';
import { type TestDbConfig, validateTestDbConfig, verifyTestStackIdentity } from '../support/test-db-guard';

declare module 'vitest' {
  export interface ProvidedContext {
    testDb: TestDbConfig;
  }
}

export default async function setup(project: TestProject) {
  // 이미 설정된 환경 변수는 덮어쓰지 않는다. .env.local 은 앱 대상과의 충돌 검사용으로 읽는다.
  for (const file of ['.env.test.local', '.env.local']) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const config = validateTestDbConfig(process.env);
  await verifyTestStackIdentity(config);
  // 키는 환경 변수 대신 vitest provide 로만 테스트 워커에 전달한다.
  project.provide('testDb', config);
}
