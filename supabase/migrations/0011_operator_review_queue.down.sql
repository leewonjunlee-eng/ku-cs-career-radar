-- 0011_operator_review_queue.sql 롤백용. 실행 전 현재 검수 이력을 별도 백업해 둘 수 있다.
-- 검수 워크플로를 제거하고, 이전 버전처럼 모든 공고를 공개한다.
update opportunities set review_status = 'approved';

drop table if exists operator_review_queue_rollback;
drop index if exists opportunities_review_status_idx;
alter table opportunities
  drop column if exists review_note,
  drop column if exists reviewed_at,
  drop column if exists reviewed_by,
  drop column if exists review_status;
alter table profiles drop column if exists role;
drop type if exists opportunity_review_status;
drop type if exists profile_role;
