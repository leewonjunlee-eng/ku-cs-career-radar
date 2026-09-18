-- 접근 제어: 공개 뷰, RLS 기본 거부, Data API 직접 권한 회수, service_role 명시적 부여.
-- docs/architecture.md "공개 조회와 비공개 데이터 분리" 절 참조.

create view public_reviews with (security_invoker = true) as
select
  r.id,
  r.subject_id,
  r.opportunity_id,
  r.review_type,
  r.title,
  r.body,
  r.experience_year,
  r.period,
  r.role,
  r.result,
  r.preparation,
  r.pros,
  r.challenges,
  r.tips,
  r.skills,
  r.details,
  r.is_anonymous,
  r.is_demo,
  r.created_at,
  case
    when r.is_demo then '예시 작성자'
    when r.is_anonymous then '익명'
    else p.display_name
  end as author_display_name
from reviews r
join profiles p on p.id = r.author_id;

create view public_teams with (security_invoker = true) as
select
  t.id,
  t.opportunity_id,
  t.name,
  t.introduction,
  t.max_members,
  t.roles,
  t.skills,
  t.status,
  t.created_at,
  t.updated_at,
  (select count(*) from team_members m where m.team_id = t.id) as member_count
from teams t;

-- RLS 활성화. 정책을 만들지 않아 anon/authenticated는 기본 거부되고, service_role은 RLS를 우회한다.
alter table profiles enable row level security;
alter table subjects enable row level security;
alter table opportunities enable row level security;
alter table bookmarks enable row level security;
alter table reviews enable row level security;
alter table teams enable row level security;
alter table team_contacts enable row level security;
alter table team_members enable row level security;
alter table team_requests enable row level security;

-- 모든 앱 데이터는 Next.js API(service_role)를 거친다. Data API 직접 권한을 전부 회수한다.
revoke all on
  profiles, subjects, opportunities, bookmarks, reviews,
  teams, team_contacts, team_members, team_requests,
  public_reviews, public_teams
from public, anon, authenticated;

grant select, insert, update, delete on
  profiles, subjects, opportunities, bookmarks, reviews,
  teams, team_contacts, team_members, team_requests
to service_role;

grant select on public_reviews, public_teams to service_role;

-- 검증 함수도 PUBLIC 실행 권한을 회수하고 서버 역할에만 부여한다.
revoke execute on function valid_text_array(text[], int, int) from public;
grant execute on function valid_text_array(text[], int, int) to service_role;

-- Postgres는 함수 생성 시 기본적으로 PUBLIC에 EXECUTE를 부여한다(테이블과 다른 기본 동작).
-- 로컬 Supabase 스택은 public 스키마에 한정된 기본 권한을 계속 되살리므로, 스키마를 지정하지 않는
-- 전역 기본 권한으로 되돌려야 이 역할(postgres)이 만드는 함수가 자동으로 노출되지 않는다.
alter default privileges revoke execute on functions from public;
