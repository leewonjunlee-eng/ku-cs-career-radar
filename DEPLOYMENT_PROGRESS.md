# 배포 작업 기록

## 현재 상태 (2026-09-19, 배포 완료)

- **공개 URL**: https://bypp-one.vercel.app (Vercel 프로젝트 `wonjun1/bypp`, 고정 도메인)
- **Production 배포**: `dpl_Fhmr9yHiGjF572gUW8n8mrbyK4K9` (커밋 `859d6f2` 기준 CLI 배포, `vercel promote`로 승격)
- **운영 Supabase**: `czvmstrpzaikclvrrcnf` (ap-northeast-2)
  - 마이그레이션 0001~0010 적용 (`supabase db push --db-url <session pooler>`)
  - 운영 seed 적용: subjects 18, opportunities 19, 예시 후기 3
  - Auth Site URL `https://bypp-one.vercel.app`, Redirect URL `https://bypp-one.vercel.app/auth/confirm`
- **Vercel Production 환경변수**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://bypp-one.vercel.app`, `NEXT_PUBLIC_ALLOWED_ORIGINS=` (빈 값)

### 배포 후 확인한 것
- `/`, `/reviews`, `/login`, `/signup`, `/me`, 공고 상세 페이지 200, 홈에 운영 DB 공고 표시
- `/me` 응답 `Cache-Control: private, no-store`
- 배포별 URL(`bypp-*-wonjun1.vercel.app`)은 Vercel Deployment Protection으로 302 → 공개 주소는 `bypp-one.vercel.app`만 사용

### 배포 후 검증 (2026-09-19, 상세: docs/stage8-10-verification.md 재검증 절)
- 로컬 전체: `tsc --noEmit --incremental false`, 단위 71, 통합 123(실제 PostgreSQL), `next build` 통과
- 로컬 HTTP E2E(계정 4개, next dev + 로컬 Supabase): 팀 생성→요청→수락→연락처, 거절·취소·재요청 불가,
  정원 초과·종료·마감 공고 거부, 연락처/요청 목록 권한 격리, 공개 팀 응답에 연락처·식별자 없음,
  북마크·프로필 저장/재조회 및 사용자 간 격리, Origin 누락·외부 Origin 403 — 40/41 통과
  (나머지 1건은 dev 서버가 페이지 Cache-Control을 덮어쓰는 차이. 운영 `/me`는 `private, no-store` 확인)
- 로컬 메일 가입(Mailpit): 가입 → 확인 메일 → `/auth/confirm` → 세션 쿠키 → `/api/me` 200, 재사용·위조 토큰 거부,
  로그아웃 시 쿠키 삭제 및 기존 토큰 401, 외부 Origin 로그아웃 403
- 운영(조회·거부 요청만): 공개 페이지/API 200, 비로그인 개인 API 401, 외부 Origin 변경 요청 403, 위조 확인 링크 거부

### 검증 중 수정
- 이번 주 필터를 페이지네이션 전에 SQL로 적용(`kstWeekBounds`), total과 목록 일치. 경계 통합 테스트 추가
- 마감된 공고에서는 팀 만들기·참여 요청 버튼을 숨김
- 내 활동의 팀 관리에 수정 폼 추가: 이름·소개·역할·스킬·연락 링크(비우면 유지). 단위 테스트 + 로컬 HTTP로 저장·공개 반영 확인

### 남은 미검증·미구현·개선점
- 운영 실제 메일 가입: 무료 플랜 기본 메일러라 사람이 실제 받은편지함으로 확인 필요
- 모바일(390px): 홈·후기·로그인·가입·내 활동 가로 넘침 없음 확인. 단 상단 메뉴가 3줄(149px)로 접히는 고정 헤더라 개선 여지

### 알려진 제한
- 무료 플랜 + 기본 메일러라 확인 메일 템플릿 변경 불가(`supabase/templates/confirmation.html` 미적용).
  기본 템플릿 링크는 이메일 인증 후 사이트 홈으로 이동하며, 사용자는 이어서 직접 로그인한다.
  기본 메일러는 시간당 발송 한도가 매우 낮으므로 공개 데모 전 SMTP(Resend 등) 설정 권장.
- DB 비밀번호와 Supabase access token이 작업 중 대화에 노출됨 → 재설정/폐기 필요.

## 해결 경위

1. 이전 배포 실패 원인은 타입 오류가 아니라 Vercel에 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 누락(`/me` prerender에서 중단).
   `NEXT_PUBLIC_SITE_URL`이 일회성 배포 URL로, `SUPABASE_SERVICE_ROLE_KEY`가 잘못된 값으로 들어가 있던 것도 교정.
2. `.vercelignore` 추가: CLI 배포 시 `.env*` 비밀 파일이 업로드되지 않게 함.
3. `scripts/seed-content.ts`에 운영 대상 모드 추가 (`SEED_DB_URL` 설정 시 hosted DB 사용, 로컬 fallback 금지, 프로젝트 ref 불일치 시 중단).
4. Hobby 플랜 빌드 대기열에 걸린 배포 2건(Queued/Initializing)은 삭제하고 Ready 빌드를 승격.

## 재배포·운영 명령

```powershell
# 앱 재배포 (환경변수는 Vercel에 저장돼 있음)
npx vercel deploy --prod

# 신규 마이그레이션 적용 (Session pooler 연결 문자열)
npx supabase db push --db-url "<SESSION_POOLER_URL>"

# 운영 seed (재실행해도 중복 없음)
$env:SEED_DB_URL="<SESSION_POOLER_URL>"; $env:NEXT_PUBLIC_SUPABASE_URL="https://czvmstrpzaikclvrrcnf.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"; node scripts/seed-content.ts
```
