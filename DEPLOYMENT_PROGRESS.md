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

### 아직 확인하지 않은 것
- 실제 메일 가입 → 확인 → 로그인, 팀 생성·요청·수락·연락처 권한, 북마크/프로필 격리, Origin 거부 (docs/deployment.md 배포 후 체크리스트)

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
