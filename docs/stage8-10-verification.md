# 8·9단계 및 10단계 배포 준비 검증

검증일: 2026-09-19. 구현 코드는 수정하지 않았다.
기준: deployment.md, implementation-plan.md, features/teams.md 및 현재 소스.

## 판정

배포 준비 완료로 판정할 수 없다. 구현 파일은 존재하지만 새 코드에 컴파일
오류가 있고 프로덕션 빌드가 실패한다. 기존 테스트 통과는 새 API/UI의 완료를
증명하지 않는다. 앞서 기록된 “구현 완료, 미검증”은 파일 작성 상태를 뜻한다.

## 실행 결과

| 검사 | 결과 |
| --- | --- |
| npm.cmd run typecheck (첫 실행) | 실패: 신규 라우트 생성 타입 오류 및 소스 오류 |
| npm.cmd run test:unit | 통과: 7개 파일, 68개 테스트 |
| npm.cmd exec -- vitest run --project integration --no-file-parallelism --reporter dot | 통과: 6개 파일, 122개 테스트 |
| npm.cmd run build | 실패: activity.tsx의 비동기 함수가 아닌 콜백 안 await |
| tsc --noEmit --incremental false | 실패: 생성 라우트 타입 오류와 별개로 소스 오류 9개 잔존 |

빌드 시도 뒤 일반 incremental typecheck가 한 차례 통과했지만, 캐시를
사용하지 않은 검사에서 오류가 재현되어 통과 근거로 채택하지 않았다.
이미 실행 중이던 로컬 dev/test 스택을 사용했고 종료하지 않았다.

## 확인된 문제

1. **차단 — 컴파일 실패.** `src/components/me/activity.tsx:16` 및
   `team-manager.tsx:10`은 React 상태 updater의 동기 콜백 안에서 await를
   사용한다. JSON 응답을 먼저 await한 뒤 상태를 갱신해야 한다.
2. **차단 — 미정의 식별자.** `src/app/page.tsx:140`은 import 없이
   UnavailableNotice를 사용한다. `src/lib/teams/data.ts:70-73`은 조회 결과를
   data로 받지만 contact를 참조하여, 정상 팀원 연락 조회도 실행에 실패한다.
3. **차단 — DB 타입 불일치.** `src/lib/teams/data.ts:42`의 nullable view id,
   `src/lib/teams/mutations.ts:15,21`의 nullable RPC 인자와 생성 타입의
   불일치를 해결해야 타입 검사를 통과한다.
4. **기능 — 이번 주 필터/정렬과 페이지네이션.**
   `src/lib/opportunities/public-data.ts:81,111-116`은 DB 페이지를 자른 뒤
   이번 주 필터를 적용하며 total은 필터 이전 값이다. 마감 공고 포함 시에도
   페이지 안에서만 재정렬해 전체 마감 우선순위를 보장하지 못한다.
5. **기능 — 모집 종료 표시.** TeamSection은 공고 마감 시각을 전달받지 않고
   DB 팀 status만으로 모집 버튼을 표시한다. 마감된 공고의 open 팀도 요청
   가능하게 보인다. RPC 거부는 별개로 화면에서 마감 상태를 반영해야 한다.
6. **누락 — 모집 정보 수정 UI.** TeamManager의 edit는 소개와 연락 링크만
   수정한다. API가 지원하는 이름·역할·스킬 수정은 화면에서 제공하지 않는다.
   취소/거절 후 재요청 불가 안내와 일부 실패 후 재시도 UI도 미흡하다.
7. **배포 문서 — seed 실행 대상 불일치.** deployment.md는 운영 환경변수를
   설정하고 seed를 실행하도록 하지만 scripts/seed-content.ts:81-87은
   로컬 Supabase status의 DB_URL/API_URL/키를 사용한다. 현재 스크립트로
   문서의 운영 seed 절차를 수행할 수 없다.
8. **배포 문서 — 확인 메일 템플릿 설정 누락.** 가입은 앱 origin을
   emailRedirectTo로 보내고 로컬 템플릿이 token_hash 콜백 URL을 만든다.
   호스팅된 Supabase에도 이 템플릿을 설정하는 절차가 필요하다.

## 검증 범위와 남은 항목

- 기존 테스트는 스키마/RPC/인증/공고/후기에 집중되어 있다.
  새 팀 API 및 북마크·내 활동·프로필 HTTP 경계 전용 테스트는 없다.
- 소스상 새 변경 API는 requireUser와 Origin 검사를 사용하고 개인 응답에
  no-store를 적용한다. 공개 팀 목록은 공개 view를 통해 반환한다.
  이것만으로 사용자 간 실제 격리나 연락처 흐름을 검증했다고 판단하지 않는다.
- 컴파일 실패로 현재 소스의 프로덕션 앱을 실행할 수 없어 두 계정의
  팀 생성→요청→수락→연락 조회, 북마크·프로필 저장/재조회, 모바일 화면은
  검증 완료하지 못했다. 수정 후 실제 HTTP/화면 검증이 필요하다.
- 실제 공개 배포 URL, 운영 DB 마이그레이션, SMTP와 호스팅 비밀값은
  이번 검증 대상 상태에서 확인되지 않았다. 10단계 출시 완료가 아니다.

우선 컴파일 및 연락처 조회 오류를 수정하고, 새 HTTP 경계와 필터의
행동 테스트를 추가한 후 운영 배포 절차를 다시 확인해야 한다.

## 재검증 (2026-09-19, 배포 이후)

| 검사 | 결과 |
| --- | --- |
| `tsc --noEmit --incremental false` | 통과 |
| `npm run test:unit` | 통과: 8개 파일, 73개 |
| 통합 테스트(`--no-file-parallelism`) | 통과: 6개 파일, 123개 (이번 주 필터 경계 테스트 추가) |
| `npm run build` | 통과 |
| 로컬 HTTP E2E (계정 4개) | 40/41 통과. 실패 1건은 `next dev`의 페이지 Cache-Control 덮어쓰기(운영에서 `private, no-store` 확인) |
| 로컬 메일 가입·확인·로그아웃 | 통과 |
| 운영 조회·거부 요청 | 통과 |

위 "확인된 문제"의 현재 상태:

1~3. 해결됨 (컴파일·식별자·타입 오류 없음, 연락처 조회 E2E 통과).
4. 해결: 이번 주 필터를 SQL에서 페이지 전에 적용, total 일치.
5. 해결: 마감된 공고에서 팀 생성·참여 요청 버튼을 숨김(서버 RPC 거부는 E2E로 확인).
6. 해결: 팀 관리 수정 폼에서 이름·소개·역할·스킬·연락 링크 수정. 재요청 불가는 서버에서 거부 확인.
7. 해결: `SEED_DB_URL` 운영 seed 모드로 운영 seed 적용.
8. 부분: 무료 플랜 기본 메일러라 호스팅 템플릿 변경 불가. 기본 템플릿 링크로 이메일 인증 후 직접 로그인.
