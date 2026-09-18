import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 빈 스위트를 통과로 처리하지 않는다.
    passWithNoTests: false,
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.{ts,tsx}'], environment: 'jsdom' },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          // 모든 통합 테스트 파일에 강제되는 대상 DB 가드. 실패하면 어떤 테스트도 실행되지 않는다.
          globalSetup: ['tests/integration/global-setup.ts'],
          // 파일들이 같은 테스트 DB 를 정리·재사용하므로 순차 실행한다.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
