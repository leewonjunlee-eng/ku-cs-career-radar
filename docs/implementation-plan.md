# 구현 순서와 우선순위

[프로젝트 소개](../README.md) · [공통 설계](architecture.md) · [공고](features/opportunities.md) · [후기](features/reviews.md) · [팀](features/teams.md)

> 구현 전 실행 계획이다. 아래 파일은 예정 산출물이며 현재 코드·테스트·배포 완료를 의미하지 않는다. 기능 명세는 링크된 문서에서 관리하고 여기에는 순서·의존성·산출물·완료 게이트만 둔다.

## 범위와 원칙

- 기능 축소 제안은 확정되지 않았다. 유형별 후기 입력, 태그 필터, 마감 공고 포함, 닉네임 변경, 수동 모집 종료를 유지한다.
- 1인 개발을 기준으로 같은 공개 URL에 기능을 순차적으로 추가한다. 일정·발표일·실제 출처 목록은 미정이며 소요 시간을 확정한 계획이 아니다.
- P0는 기반 위험 해소, P1은 핵심 흐름, P2는 필수 마무리다. **P0~P2와 출시 게이트가 모두 완료되어야 필수 MVP 완료다.**
- P3는 수집기·사용성 고도화·추가 출처, P4는 계절별 준비 안내·추천·알림 등 후속 제품 확장이다.
- 보안·검증·기본 모바일 사용성은 매 단계에 포함한다. 시간이 부족하면 수집기·추가 디자인부터 미루며 필수 범위 변경은 별도 합의한다.
- 작업 인계가 필요하면 Hermes가 조율하고 Claude가 계획/리뷰, Codex가 구현, Hermes/Codex가 검증을 맡는다. 파일과 검증 결과를 명시적으로 전달한다.

## 실행 순서

배포 골격 → 콘텐츠 확인 → DB/권한 → 인증 → 팀 DB 위험 검증 → 공고 → 후기 → 팀 화면 → 내 활동·필수 세부 기능 → 출시 검증

팀 화면보다 DB 경쟁 조건 검증을 먼저 수행하여 후반 재설계를 방지한다. 단계 번호는 실행 순서이며 마지막 출시 게이트의 중요도가 낮다는 뜻이 아니다.

### 1단계 · P0: 프로젝트 골격과 첫 배포

- 기준: [기술 스택·배포](architecture.md).
- 순서: Git/원격 저장소·Vercel 대상과 사용 권한 확인 → Next.js/TypeScript/Tailwind 및 최소 테스트 환경 생성 → 홈·상세·로그인·내 활동의 이동 구조 → 로컬 빌드 → 첫 공개 URL 확보. 의존성 버전·lockfile과 테스트 스크립트를 고정한다.
- 완료 게이트: 빌드 성공, 공개 URL 접근, 모바일 골격 확인. DB 미연결 기능을 동작 중이라고 표시하지 않는다.
- 예정 파일: `package.json`, `package-lock.json`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `.env.example`, `vitest.config.ts`.

### 2단계 · P0: 초기 콘텐츠 확보

- 기준: [실제 데이터·초기 콘텐츠](features/opportunities.md).
- 순서: 공식 출처 확인 → 원문·대상·마감·확인 시각 정리 → 과거 후기/예시 데이터 준비. 아직 수집기는 만들지 않는다. 출처 목록과 확인 메모는 공고 문서에서 관리한다.
- 완료 게이트: 원문 확인된 데이터와 데모 공고 후보가 준비된다. 과거 원문이 없을 때의 후기 연결·예시 폴백은 후기 명세를 따른다. 발표일 미정이면 직전 재확인을 예약 항목으로 남긴다.
- 예정 파일: `supabase/seed.sql`, `scripts/seed-content.ts`.

### 3단계 · P0: DB 스키마·무결성·접근 차단

- 기준: [접근 제어·무결성](architecture.md).
- 순서: 공고·후기·팀 기능 문서의 모델과 공통 profiles 모델 → 제약 실패 테스트 → 마이그레이션·공개 뷰·기본 접근 차단 → 빈 테스트 DB에 적용 → 초기 콘텐츠 입력.
- 완료 게이트: 잘못된 FK·중복·마감 값 거부, 익명/로그인 직접 Data API 차단, 서버 역할의 의도한 조회 성공. 사용자 데이터가 있는 DB는 reset하지 않는다.
- 예정 파일: `supabase/migrations/0001_core_schema.sql`, `supabase/migrations/0002_access_controls.sql`, `src/types/database.ts`, `tests/integration/schema.test.ts`, `tests/integration/data-access.test.ts`.

### 4단계 · P0: 인증·프로필·공통 API 경계

- 기준: [로그인·권한·API 안전 규칙](architecture.md).
- 순서: 세션 위조·교차 출처 실패 테스트 → 사용자용/관리자용 클라이언트 분리 → 공통 사용자 검증·인가·오류 처리 → 프로필 트리거 → 가입/확인/로그인/로그아웃 → 버전에 맞는 세션 갱신.
- 완료 게이트: 가입→프로필→확인→로그인, 새로고침·세션 갱신 성공. 위조 ID 거부·계정 간 캐시 혼입 방지. 발표 계정과 별도 동시성 테스트 계정을 준비한다.
- 예정 파일: `supabase/migrations/0003_profile_trigger.sql`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/auth/require-user.ts`, `src/lib/http/security.ts`, `src/lib/validation/common.ts`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/auth/confirm/route.ts`, `tests/unit/api-security.test.ts`, `tests/integration/auth.test.ts`.

### 5단계 · P0: 팀 DB 함수 선검증

- 기준: [트랜잭션·완료 기준](features/teams.md).
- 순서: 실패·경쟁 테스트 작성 → 생성 및 상태 변경 RPC → 권한·잠금·상태 검사 → 실제 별도 DB에서 실행. 화면 연결은 아직 하지 않는다.
- 완료 게이트: 동시 수락·수락과 취소/종료 경쟁·중복 수락·팀 생성 부분 실패·직접 RPC 차단을 팀 명세 기준으로 통과한다.
- 구현 파일: `supabase/migrations/0005_team_functions.sql`, `tests/integration/team-transactions.test.ts`.

### 6단계 · P1: 공고 탐색·상세

- 기준: [화면·마감·검색](features/opportunities.md).
- 순서: 마감/검색 테스트 → 조회 API → 목록·상세 → 기본 검색·카테고리·마감순 → 로딩·빈 결과·실패 상태.
- 완료 게이트: 실제 DB 공고의 비로그인 조회, 직접 상세 URL, 원문 이동, 마감 표시 성공. 남은 세부 필터는 9단계에서 반드시 완성한다.
- 예정 파일: `src/app/api/opportunities/route.ts`, `src/app/api/opportunities/[id]/route.ts`, `src/app/opportunities/[id]/page.tsx`, `src/components/opportunity-card.tsx`, `src/lib/opportunities/query.ts`, `src/lib/opportunities/deadline.ts`, `tests/unit/deadline.test.ts`, `tests/integration/opportunities.test.ts`.

### 7단계 · P1: 누적 후기

- 기준: [화면·모델·완료 기준](features/reviews.md).
- 순서: 권한/대상/익명/예시 테스트 → subject별 누적 조회 → 공통 필수 작성·저장·재조회 → 수정/삭제·탐색 → 유형별 선택 입력·검증 → 양쪽 화면의 예시 보기.
- 완료 게이트: 공고 미연결 과거 후기도 조회되며 저장·수정·삭제가 유지된다. 익명·예시·대상 무결성의 후기 완료 기준을 통과한다.
- 예정 파일: `src/app/api/subjects/route.ts`, `src/app/api/reviews/route.ts`, `src/app/api/reviews/[id]/route.ts`, `src/app/api/me/reviews/route.ts`, `src/app/reviews/page.tsx`, `src/components/reviews/review-form.tsx`, `src/lib/validation/review.ts`, `tests/integration/reviews.test.ts`, `tests/unit/review-validation.test.ts`.

### 8단계 · P1: 팀 모집 화면

- 기준: [사용자 흐름·권한](features/teams.md).
- 순서: API 계층 위조/비회원 접근 테스트 → 목록·생성 폼 → 요청·수락·거절·취소 → 자동/수동 종료 → 연락 조회·상태 충돌·재요청 제한 안내.
- 완료 게이트: 두 브라우저 계정으로 공고→팀 생성→요청→수락→팀원 등록→연락 조회가 공개 URL에서 동작하고 새로고침 후 유지된다.
- 예정 파일: `src/app/api/teams/route.ts`, `src/app/api/teams/[id]/route.ts`, `src/app/api/teams/[id]/requests/route.ts`, `src/app/api/team-requests/[id]/route.ts`, `src/app/api/teams/[id]/contact/route.ts`, `src/app/api/teams/[id]/close/route.ts`, `src/components/teams/team-form.tsx`, `src/components/teams/team-panel.tsx`, `tests/integration/team-api.test.ts`.

### 9단계 · P2: 내 활동·남은 필수 기능

- 기준: [내 활동 및 기능별 완료 기준](architecture.md).
- 순서: 북마크 중복/격리 테스트 → 저장·팀·요청·후기의 내 활동 통합 → 닉네임/모집 정보/연락 수정 → 태그·마감 임박·이번 주·지난 공고 필터 → 모바일·재시도·중복 제출·문의 경로.
- 완료 게이트: 공고·후기·팀의 필수 명세 누락이 없어야 한다. 생성 후 변경 불가한 팀 필드는 그대로 제한한다.
- 예정 파일: `src/app/me/page.tsx`, `src/app/api/me/bookmarks/route.ts`, `src/app/api/me/teams/route.ts`, `src/app/api/me/team-requests/route.ts`, `src/app/api/me/profile/route.ts`, `src/components/opportunity-filters.tsx`, `tests/integration/my-activity.test.ts`, `tests/unit/opportunity-filters.test.ts`.

### 10단계 · 출시 게이트: 배포 검증·발표 리허설

- 기준: [공통 출시 검증·배포](architecture.md).
- 순서: 타입 검사·테스트·빌드 → 배포 DB 마이그레이션/권한 확인 → 직접 API 권한 검사 → 응답/번들/로그 민감정보 점검 → 공개 URL 모바일·인증 확인 → 두 계정 리허설.
- 완료 게이트: 공통 및 기능별 완료 기준에 실행 방법·관찰 결과를 기록한다. 실패·미검증을 통과로 표시하지 않는다. 파괴적 테스트는 테스트 DB에서만 실행한다.
- 기록 위치: `docs/architecture.md`의 공통 검증 항목과 각 기능 문서의 완료 기준에 결과를 기록한다. 구현 후 실행 안내가 필요하면 README에는 해당 문서 링크를 제공한다.

## 필수 완료 후

1. **P3: 단일 출처 수집기** — `scripts/collect-source.ts`, `tests/integration/collector.test.ts`를 후보로 한다. 공개 수집 조건→파싱→정규화→upsert 순서로 구현하고 [수집기 완료 기준](features/opportunities.md)을 확인한다. 개발자 수동 실행부터 시작한다.
2. **P3: 사용성 고도화·추가 출처** — 실제 사용 중 불편과 데이터 신선도를 먼저 개선한다. 기본 모바일 사용성은 이 단계로 미루지 않는다.
3. **P4: 방학·학기별 프로그램 준비 안내** — [확장 아이디어](../README.md#확장-아이디어)의 과거 이력/공식 확정 구분을 따른다.
4. **P4: 나머지 확장** — 개인화 마감 알림과 축적 데이터 기반 추천/분류를 우선 검토한다. 팀원 매칭·일정·학교 인증·후기 검증·로드맵은 요구 확인 후 진행한다.

## 실행과 검증 방법

각 단계는 실패 테스트→실패 확인→최소 구현→통과→회귀 검증→diff 리뷰로 나눈다. 공통 명령·실제 DB 테스트·커밋 및 배포 안전 규칙은 [공통 설계](architecture.md)에만 정의한다. 상세 제품 규칙을 이 문서에 복사하지 않는다.
