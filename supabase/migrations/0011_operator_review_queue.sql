-- 운영자 검수 전에는 공고가 공개 목록에 노출되지 않도록 상태와 운영자 역할을 둔다.
create type profile_role as enum ('member', 'operator');
create type opportunity_review_status as enum ('pending', 'approved', 'rejected');

alter table profiles
  add column role profile_role not null default 'member';

alter table opportunities
  add column review_status opportunity_review_status not null default 'pending',
  add column reviewed_by uuid references profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text check (review_note is null or char_length(review_note) <= 500);

create index opportunities_review_status_idx on opportunities (review_status, created_at desc);

-- 롤백 시 원래 공개 상태를 명확히 되살릴 수 있도록 전환 대상을 보관한다.
create table operator_review_queue_rollback (
  opportunity_id uuid primary key references opportunities (id) on delete cascade,
  source_url text not null,
  backed_up_at timestamptz not null default now()
);
alter table operator_review_queue_rollback enable row level security;
revoke all on operator_review_queue_rollback from public, anon, authenticated;

-- 이미 공개 중인 기존 데이터는 그대로 유지하고, 운영자가 처음 검수할 예비 공고 여섯 건만 대기열로 옮긴다.
update opportunities set review_status = 'approved';

insert into operator_review_queue_rollback (opportunity_id, source_url)
select id, source_url
from opportunities
where source_url in (
  'https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=824515',
  'https://ku-ai.korea.ac.kr/swuniv/community/event.do?mode=view&articleNo=1583784',
  'https://linkareer.com/activity/351294',
  'https://linkareer.com/activity/351263',
  'https://linkareer.com/activity/350422',
  'https://linkareer.com/activity/350800'
);

update opportunities
set review_status = 'pending', reviewed_by = null, reviewed_at = null, review_note = null
where source_url in (
  'https://info.korea.ac.kr/info/board/course_competition.do?mode=view&articleNo=824515',
  'https://ku-ai.korea.ac.kr/swuniv/community/event.do?mode=view&articleNo=1583784',
  'https://linkareer.com/activity/351294',
  'https://linkareer.com/activity/351263',
  'https://linkareer.com/activity/350422',
  'https://linkareer.com/activity/350800'
);
