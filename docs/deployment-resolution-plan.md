# 배포 문제 해결 방법 및 실행 계획

작성일: 2026-09-19

## 1. 검토 범위와 결론

요청한 `deploymen.md`라는 파일은 저장소에서 발견되지 않아 [배포 체크리스트](deployment.md), [배포 진행 기록](../DEPLOYMENT_PROGRESS.md), [8~10단계 검증 기록](stage8-10-verification.md)을 함께 검토했다. 현재 소스와 설치된 Next.js 16.3.5 문서도 대조했다.

핵심 해결 순서는 **빌드 상태 확인 → Vercel 프로젝트·고정 도메인 확정 → 운영 Supabase 준비 → 운영 환경변수·인증 설정 → 배포 → 실제 사용자 흐름 검증**이다. 성공한 앱 배포가 있어야 모든 설정을 시작할 수 있는 것은 아니다. 프로젝트 연결과 사용할 도메인 확정을 앱 빌드 성공과 분리하면 진행 기록의 순환 문제를 해소할 수 있다.

이 문서는 실행 계획이다. 이번 작업에서 운영 계정 접속, 배포, DB 변경, SMTP 설정은 하지 않았다. 운영 장애 원인과 외부 설정 상태를 실제로 확인했다고 해석하면 안 된다.

## 2. 확인된 사실과 기록의 차이

| 항목 | 현재 확인 결과 | 조치 |
| --- | --- | --- |
| 잔존 타입 오류 2개 | 이번 `npm.cmd run typecheck`와 `node node_modules/typescript/bin/tsc --noEmit --incremental false`는 모두 통과 | 이전 실패를 현재 오류로 단정하지 않고 프로덕션 빌드를 별도 확인 |
| nullable RPC 인자 | `mutations.ts`에 `as string`, `as unknown as string`이 남아 있음 | 컴파일 통과와 실제 null 전달의 타당성을 구분해 계약 검증 |
| 연락처 변수 오류 | `data.ts`는 현재 `data.contact_link` 사용 | 과거 오류는 수정된 상태로 기록하고 권한별 HTTP 동작 확인 |
| 운영 seed | `seed-content.ts`는 환경변수 대신 로컬 `supabase status`의 DB_URL/API_URL/SERVICE_ROLE_KEY 사용 | 현재 명령을 운영 seed로 사용하지 말고 운영 대상 지정 기능부터 구현 |
| URL이 없어 배포 불가 | 앱은 설정된 origin 문자열을 사용. 성공한 배포 URL 조회를 빌드 전제로 하는 코드는 확인되지 않음 | 프로젝트에서 실제 사용할 고정 도메인을 먼저 확정 |
| Vercel 인증 | 진행 기록에 토큰 확보와 토큰 부족이 함께 기재됨 | 실제 CLI 로그인 상태와 프로젝트 권한을 재확인. 비밀 파일 내용은 이번에 열지 않음 |
| GitHub 빌드 실패 | 로컬 `.github` 디렉터리 없음. 원격 실패 로그 미확인 | GitHub Actions인지 Vercel Git 연동 빌드인지 구분하고 해당 로그 확보 |
| 공고 필터 | `public-data.ts`에서 페이지 조회 후 이번 주 필터·재정렬 수행 | 필터·전체 정렬·total을 DB 조회 단계에서 일치시킬 필요 |
| 운영 마이그레이션 | 저장소 SQL 0001~0010, 총 10개 확인 | 운영에 적용됐는지는 별도 조회 필요 |

`docs/progress.md`의 과거 68개 단위 테스트·122개 통합 테스트 통과는 이번 재실행 결과가 아니다. 이번에는 타입 검사만 실행했으며 빌드, 테스트, 브라우저 검증은 아래 실행 항목으로 남긴다.

## 3. 문제별 해결 방법

### A. CLI 인증과 URL 의존성 분리

1. Vercel 대시보드에서 저장소와 프로젝트를 생성·연결하거나 CLI에서 로그인 후 프로젝트를 연결한다. 기존 프로젝트가 있으면 재사용한다.
2. 수동 작업은 `vercel login`으로 인증할 수 있다. `.env.vercel`에 `VERCEL_TOKEN`이 없다는 사실만으로 배포 불가를 판정하지 않는다. 자동화용 토큰은 별도 자격증명으로 관리하고 `VERCEL_OIDC_TOKEN`을 임의로 대체 사용하지 않는다.
3. 프로젝트 설정에서 실제 할당된 고정 `*.vercel.app` 도메인 또는 소유한 사용자 도메인을 확인한다. 프로젝트명으로 도메인을 추측하지 않는다.
4. 해당 HTTPS origin을 환경변수와 Supabase Auth에 먼저 설정한 뒤 앱을 배포한다. 도메인 연결·DNS·인증서 상태는 첫 배포 후 다시 확인한다.
5. 임시 `test.html` 배포는 앱 인증·DB·서버 라우트 검증을 대체하지 못하므로 필수 단계에서 제외한다.

CLI를 사용할 경우의 절차 예시는 다음과 같다. CLI 설치와 계정 권한 확인 후 실행한다.

```powershell
vercel login
vercel whoami
vercel link
```

프로젝트 연결·환경 설정·배포를 구분하는 흐름은 [Vercel 공식 CLI 배포 가이드](https://vercel.com/docs/projects/deploy-from-cli)를 따른다. 로그인 사용법은 [CLI 문서](https://vercel.com/docs/cli)를 참고한다.

### B. 로컬·운영 환경변수 분리

| 변수 | 운영 설정 기준 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 운영 hosted Supabase URL. `localhost`·`127.0.0.1` 금지 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 운영 프로젝트의 publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 프로젝트의 서버 전용 키. 클라이언트 공개 금지 |
| `NEXT_PUBLIC_SITE_URL` | 확정된 HTTPS origin. 경로·마지막 슬래시 제외 |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | 기본은 빈 값. 필요한 정확한 origin만 추가 |

Vercel Production에 운영 값을 입력하고 Preview는 격리된 Supabase를 사용하도록 구성한다. `.env.local`의 개발 값을 운영에 복사하지 않는다. 로컬 CLI 인증정보가 앱 빌드 환경설정 역할까지 한다고 가정하지 않는다.

설치된 [Next.js 환경변수 가이드](../node_modules/next/dist/docs/01-app/02-guides/environment-variables.md)에 따르면 `NEXT_PUBLIC_` 값은 브라우저 번들에 빌드 시 반영된다. 운영 값을 변경했다면 새 빌드를 배포한다. 로컬 운영 빌드 확인 시에는 셸의 명시적 환경변수 또는 분리된 체크아웃을 사용해 `.env.local` 우선순위의 영향을 통제한다. 채워진 비밀 파일은 커밋하지 않는다.

### C. 운영 DB와 seed 불일치 해결

1. 운영 Supabase 프로젝트를 정하고 프로젝트 ref와 대상 DB를 확인한다.
2. CLI를 운영 프로젝트에 연결하고 적용 이력·대기 migration을 확인한다. 0001~0010을 순서대로 적용하되 이미 적용된 파일을 수동 재실행하지 않는다. 운영 `db reset`은 사용하지 않는다.
3. seed 스크립트에 명시적인 local/production 대상 선택을 추가한다. 운영 모드는 API URL·service-role key뿐 아니라 현재 SQL 구현에 필요한 DB 접속 문자열도 받아야 한다.
4. 운영 모드에서 필수 값 누락·프로젝트 불일치·로컬 주소가 발견되면 중단한다. 운영 모드가 로컬 `supabase status`로 fallback하지 않게 한다. DB 접속의 TLS는 공급자 설정에 맞춘다.
5. 입력 전체를 쓰기 전에 검증하고 SQL 작업의 트랜잭션 범위를 정한다. Auth 사용자 생성은 DB 트랜잭션 밖의 작업이므로 부분 실패와 재실행 복구도 설계한다.
6. 스테이징에서 두 번 실행해 공고·subject·예시 후기·예시 작성자 중복 여부를 확인한다. 기존 데이터 덮어쓰기 범위도 검토한다.
7. 공고 출처·마감일·확인 시각과 예시 후기 표시를 검토한 후 운영에 적용한다.

운영 seed 명령과 신규 환경변수명은 아직 구현되지 않았다. 현재 `npm.cmd run content:seed`에 운영 환경변수만 주입해도 운영에 적용된다는 기존 문서 안내를 먼저 정정해야 한다.

### D. 메일 인증 경로 완성

Supabase Site URL을 운영 origin으로 설정한다. 현재 가입 코드가 `emailRedirectTo`로 보내는 origin과 실제 콜백 `/auth/confirm`을 기준으로 Redirect URLs를 맞춘다. 로컬 설정이 hosted 프로젝트에도 자동 적용된다고 가정하지 않는다.

운영 이메일 템플릿에는 저장소의 [확인 메일 템플릿](../supabase/templates/confirmation.html)을 반영한다. 현재 템플릿은 `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/` 구조이므로 RedirectTo에 이미 `/auth/confirm`을 붙여 경로를 중복시키지 않는다. 실제 SMTP 발송 후 콜백과 세션 생성을 확인한다. 근거: [Supabase 이메일 템플릿](https://supabase.com/docs/guides/auth/auth-email-templates), [Next.js 인증 예제](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs).

### E. 타입·기능 검증 보완

- nullable view 필드는 필수 값 보장 여부를 SQL 정의와 대조하고 안전한 변환 경계를 둔다. null을 임의 빈 문자열로 바꾸거나 타입 단언만 추가하는 방식은 해결 완료 기준으로 삼지 않는다.
- nullable RPC 인자는 SQL의 실제 null 허용과 생성 타입을 대조한다. 재생성 결과에도 차이가 남으면 검증된 wrapper/타입 보정으로 범위를 한정하고 메시지 생략·null 전달을 통합 검증한다.
- 이번 주 필터는 KST 주 경계를 UTC로 변환한 조건을 페이지네이션 전에 적용한다. 전체 정렬이 필요한 경우 SQL view/RPC 등으로 정렬 후 페이지를 나누고 total에도 동일 조건을 적용한다.
- 기존 검증 기록에 남은 마감 팀 버튼, 모집 정보 수정 필드, 재요청 불가 안내·실패 재시도 UI를 현재 소스와 재대조해 수정한다.
- 팀·북마크·프로필 API에 비로그인/타 사용자/허용되지 않은 Origin 검증을 보강한다. 타입 검사 통과만으로 개인정보 격리를 승인하지 않는다.

## 4. 단계별 실행 계획과 완료 기준

| 순서 | 담당 | 작업 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 개발 담당 | 실패한 원격 빌드의 커밋·로그·환경 범위 확보, 현재 로컬 빌드 실행 | 실패 단계를 인증/설정/컴파일/DB/런타임으로 구분 |
| 2 | 개발 담당 | 실제 재현 오류와 seed 대상 지정 문제 수정, 기능 결함 보완 | 변경별 검증 결과 확보, 강제 타입 단언의 근거 정리 |
| 3 | 계정 관리자 | Vercel 프로젝트·도메인, hosted Supabase, SMTP 준비 | 대상 프로젝트·도메인·메일 발신 권한 확인 |
| 4 | 개발·운영 담당 | 스테이징 migration/seed 리허설 및 단위·통합·빌드 검증 | 모든 필수 검사 통과, 재실행 가능한 seed |
| 5 | 운영 담당 | 운영 환경변수·Auth 템플릿 설정, migration·검토된 seed 적용 | 같은 프로젝트의 키·DB·Auth 설정 일치 |
| 6 | 배포 담당 | 설정된 Production 대상으로 배포 | 빌드 Ready와 고정 HTTPS 도메인 접근 성공 |
| 7 | 검증 담당 | 아래 실제 사용자 검증 수행 | 개인정보·권한·인증·저장 흐름 모두 통과 |
| 8 | 배포 담당 | 출시 기록과 복구 수단 정리 후 URL 공유 | 커밋·배포 ID·검증 시각·남은 제한 기록 |

1~2단계와 3단계 준비는 서로 독립적으로 진행할 수 있다. 5단계 이후는 검증 결과와 외부 설정이 준비된 뒤 순서대로 수행한다. 공개 배포가 있어야만 로컬 테스트를 시작한다는 조건은 두지 않는다.

로컬 검증 명령은 아래 순서로 각각 실행하고 실패하면 다음 단계 전에 해결한다. 통합 테스트에는 Docker와 격리된 테스트 스택이 필요하다.

```powershell
npm.cmd run typecheck
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm.cmd run test:unit
npm.cmd run db:test:start
npm.cmd exec -- vitest run --project integration --no-file-parallelism --reporter dot
npm.cmd run build
```

`db:test:types`는 타입 변경이 필요한 경우에만 실행하고 생성 diff를 검토한다. 테스트 변수에 운영 DB를 넣지 않는다. 원격 실패와 비교할 때는 같은 커밋·lockfile·Node 버전을 기록한다.

## 5. 배포 후 필수 검증

- [ ] 홈·공고 목록·상세·후기·공개 팀 조회가 실제 DB 데이터로 표시된다.
- [ ] 이번 주·마감 포함·태그 필터가 페이지 경계와 total까지 일관된다.
- [ ] 실제 이메일 가입 → 확인 링크 → 로그인 → 로그아웃이 작동한다.
- [ ] 계정 A의 팀 생성 → B의 요청 → A의 수락 → B의 연락처 조회가 작동한다.
- [ ] 비로그인·미수락 사용자·다른 팀 사용자는 연락처를 얻지 못한다.
- [ ] 공개 팀 응답에 소유자·구성원 식별자와 연락처가 없다.
- [ ] 거절·취소·종료·정원 초과·중복·마감 요청이 정해진 안전한 오류로 처리된다.
- [ ] 북마크·프로필·후기 변경이 재조회 후 유지되고 A의 개인 데이터가 B에게 보이지 않는다.
- [ ] `/me`와 개인 API는 `private, no-store`이며 인증 쿠키 갱신 응답이 공개 캐시에 남지 않는다.
- [ ] 허용되지 않은 Origin의 변경 요청은 거부하고 운영 origin의 요청은 성공한다.
- [ ] 모바일 화면과 실패 후 재시도가 동작하며 호스트·Supabase 로그에 반복 오류가 없다.

## 6. 실패 시 대응과 기록 정리

빌드 실패는 첫 실패 명령과 로그를 기준으로 수정한다. 인증·Origin 오류는 고정 도메인, Site URL, Redirect URLs, 템플릿, 빌드 시 환경변수를 함께 대조한다. DB 오류는 대상 프로젝트와 migration 이력부터 확인한다.

후속 배포 장애는 이전 정상 호스트 배포로 복구한다. 최초 배포에는 이전 정상 버전이 없으므로 공개 안내·가입을 보류하고 수정 배포한다. DB는 앱 복구와 별개이며, 기존 스키마와의 호환성을 확인하고 전진 수정 migration을 사용한다. 운영 DB 파괴적 초기화로 되돌리지 않는다.

완료 후 `DEPLOYMENT_PROGRESS.md`, `docs/progress.md`, `docs/deployment.md`에 실제 배포 URL·커밋·검증 결과를 반영한다. 과거 실패 기록은 날짜를 유지하고 해결 여부를 덧붙인다. 현재 문서의 순환 문제, 잔존 오류 수, 운영 seed 안내를 확인된 상태로 갱신한다.
