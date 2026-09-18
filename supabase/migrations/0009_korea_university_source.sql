-- 원문이 고려대 웹사이트(korea.ac.kr 및 하위 도메인)에 있는 공고인지 표시한다.
-- source_url에서 자동 계산되어 수동 입력·불일치가 없고, 목록에서 필터로 쓸 수 있다.
-- 호스트는 scheme 뒤 userinfo(`...@`)를 건너뛴 첫 구간이며, `korea.ac.kr.example.com`
-- 같은 위장 도메인은 내부로 보지 않는다.
alter table opportunities
  add column is_korea_university_source boolean not null generated always as (
    coalesce(
      lower(substring(source_url from '^https?://(?:[^/?#@]*@)?([^/:?#]+)')) ~ '(^|\.)korea\.ac\.kr$',
      false
    )
  ) stored;

create index opportunities_korea_university_source_idx on opportunities (is_korea_university_source);
