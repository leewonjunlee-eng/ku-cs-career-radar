# 배포 준비 작업 기록 (2026-09-19)

## 진행 상황 요약

### 1. Vercel 인증 및 연결
- `VERCEL_TOKEN` 발급 및 `.env.local`에 저장 완료
- Vercel CLI 인증 확인: `leewonjunlee-6464` 계정
- `.vercel` 폴더 및 프로젝트 연결 없음 (신규 배포)

### 2. 빌드 오류 수정 (타입스크립트)

#### 수정된 파일:
- **src/components/me/activity.tsx**: `await`가 동기 콜백 내부에서 사용되던 문제 수정 (response.json() 분리)
- **src/components/me/team-manager.tsx**: 동일하게 `await` 문제 수정
- **src/app/page.tsx**: `UnavailableNotice` import 누락 추가
- **src/lib/teams/data.ts**: 
  - `contact` 변수명 오류 → `data`로 수정
  - `team_id` nullable 처리 추가
- **src/lib/teams/mutations.ts**:
  - RPC 파라미터에 `?? null` 및 `as string` 캐스트 추가로 nullable 처리

#### 잔존 타입 오류 (2개):
1. `src/lib/teams/data.ts:43` - `row.id` (public_teams view의 nullable id)
2. `src/lib/teams/mutations.ts:21` - `create_team_request`의 `p_message` 파라미터

### 3. 환경변수 정리
- `.env.local` 복원 완료 (로컬 Supabase 설정 + VERCEL_TOKEN)
- `.env.production.example` 템플릿 확인됨

### 4. 배포 시도 결과
- `vercel deploy --prod` 실행했으나 타입스크립트 오류로 빌드 실패
- 오류 3개 중 1개는 수정 완료, 2개 잔존

### 5. 남은 작업
1. 잔존 타입 오류 2개 완전 해결
2. `vercel deploy` 재시도 → 공개 URL 확보
3. 확보된 URL로 `.env.production` 작성 및 Vercel 환경변수 설정
4. 호스팅된 Supabase 프로젝트 생성 및 마이그레이션 적용 (10개 SQL 파일)
5. Supabase Auth 설정 (Site URL, Redirect URLs, SMTP)
6. 시드 데이터 적용
7. 배포 후 검증

## 실행 명령어 참고
```bash
# 타입 체크
npm run typecheck

# 빌드 테스트
npm run build

# Vercel 배포 (토큰 설정 후)
export VERCEL_TOKEN='...'
npx vercel deploy --prod

# 로컬 개발 DB 시작
npm run db:dev:start

# 마이그레이션 적용 (운영 DB 연결 후)
supabase db push
```

## 참고 문서
- `docs/deployment.md` - 배포 체크리스트
- `docs/stage8-10-verification.md` - 검증 현황 (컴파일 실패 기록)
- `supabase/migrations/` - 10개 마이그레이션 파일