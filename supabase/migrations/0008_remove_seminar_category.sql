-- 세미나 카테고리를 없앤다(사용 이력 없음). Postgres는 enum 값을 직접 지울 수
-- 없으므로, 값이 하나 빠진 새 타입으로 바꿔치기한다. 컬럼 기본값이 없어 데이터
-- 손실 없이 안전하다(seminar로 저장된 행이 없다는 전제).
alter table opportunities alter column category type text;
drop type opp_category;
create type opp_category as enum ('internship', 'hiring', 'hackathon', 'contest', 'lab', 'extracurricular');
alter table opportunities alter column category type opp_category using category::opp_category;
