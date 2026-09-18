-- 핵심 테이블: profiles, subjects, opportunities, bookmarks, reviews, teams, team_contacts, team_members, team_requests
-- docs/architecture.md, docs/features/{opportunities,reviews,teams}.md 참조. 접근 제어(RLS/GRANT)는 0002에서 처리한다.
-- 고정 도메인 값은 CHECK IN 대신 네이티브 enum을 써서 잘못된 값이 22P02(invalid_text_representation)로
-- 실패하게 한다("등"으로 열려 있는 subjects.kind/opportunities.category 같은 확장 가능 필드는 제외).

create type opp_category as enum ('internship', 'hiring', 'hackathon', 'contest', 'lab', 'seminar');
create type opp_deadline_type as enum ('fixed', 'rolling', 'tbd');
create type opp_deadline_precision as enum ('time', 'date');
create type opp_ingestion_method as enum ('manual', 'script');
create type subject_kind as enum ('contest_series', 'company', 'lab', 'program');
create type review_kind as enum ('contest', 'research', 'internship', 'employment');
create type team_status as enum ('open', 'closed');
create type team_member_role as enum ('leader', 'member');
create type team_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');

-- 배열 필드의 크기·항목 검증 (CHECK 안에서 subquery를 못 쓰므로 함수로 뺀다). PUBLIC/anon/authenticated 실행 권한은 0002에서 회수한다.
create function valid_text_array(arr text[], max_items int, max_len int) returns boolean
language sql immutable as $$
  select array_length(arr, 1) is null or (
    array_length(arr, 1) <= max_items
    and not exists (
      select 1 from unnest(arr) as t(v)
      where v is null or v !~ '[^\s​﻿　]' or char_length(v) > max_len
    )
  )
$$;

-- 유니코드 공백류(일반 공백, 탭/개행, zero-width space, BOM, 표제 공백)만 있는 문자열을 거부하는 패턴.
-- 아래에서 `col ~ '[^\s​﻿　]'` 형태로 반복 사용한다.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) <= 50) check (display_name ~ '[^\s​﻿　]'),
  created_at timestamptz not null default now()
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  kind subject_kind not null,
  name text not null check (char_length(name) <= 100) check (name ~ '[^\s​﻿　]'),
  official_url text check (official_url is null or official_url ~ '^https?://\S+$'),
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects (id),
  title text not null check (char_length(title) <= 200) check (title ~ '[^\s​﻿　]'),
  organization text not null check (char_length(organization) <= 100) check (organization ~ '[^\s​﻿　]'),
  category opp_category not null,
  tags text[] not null default '{}' check (valid_text_array(tags, 10, 30)),
  deadline timestamptz,
  deadline_type opp_deadline_type not null,
  deadline_precision opp_deadline_precision,
  source_name text not null check (char_length(source_name) <= 100) check (source_name ~ '[^\s​﻿　]'),
  source_url text not null unique check (source_url ~ '^https?://\S+$'),
  ingestion_method opp_ingestion_method not null default 'manual',
  description text check (description is null or description ~ '[^\s​﻿　]'),
  created_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- reviews(opportunity_id, subject_id) 복합 외래 키가 같은 subject인지 검증할 수 있게 한다.
  unique (id, subject_id),
  check (
    (deadline_type = 'fixed' and deadline is not null and deadline_precision is not null)
    or (deadline_type in ('rolling', 'tbd') and deadline is null and deadline_precision is null)
  )
);

create index opportunities_deadline_idx on opportunities (deadline);

create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  opportunity_id uuid not null references opportunities (id),
  created_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  subject_id uuid not null references subjects (id),
  opportunity_id uuid references opportunities (id),
  review_type review_kind not null,
  title text not null check (char_length(title) <= 100) check (title ~ '[^\s​﻿　]'),
  body text not null check (char_length(body) <= 5000) check (body ~ '[^\s​﻿　]'),
  experience_year int not null check (experience_year between 2000 and 2100),
  period text check (period is null or period ~ '[^\s​﻿　]'),
  role text check (role is null or role ~ '[^\s​﻿　]'),
  result text check (result is null or result ~ '[^\s​﻿　]'),
  preparation text check (preparation is null or preparation ~ '[^\s​﻿　]'),
  pros text check (pros is null or pros ~ '[^\s​﻿　]'),
  challenges text check (challenges is null or challenges ~ '[^\s​﻿　]'),
  tips text check (tips is null or tips ~ '[^\s​﻿　]'),
  skills text[] not null default '{}' check (valid_text_array(skills, 20, 30)),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object')
    check (char_length(details::text) <= 2000),
  is_anonymous boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  -- opportunity_id가 있으면 반드시 같은 subject_id를 가리키게 한다. NULL이면 검사하지 않는다(MATCH SIMPLE 기본값).
  foreign key (opportunity_id, subject_id) references opportunities (id, subject_id)
);

create index reviews_subject_id_idx on reviews (subject_id);
create index reviews_author_id_idx on reviews (author_id);

create table teams (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id),
  owner_id uuid not null references profiles (id),
  name text not null check (char_length(name) <= 50) check (name ~ '[^\s​﻿　]'),
  introduction text check (introduction is null or introduction ~ '[^\s​﻿　]'),
  max_members int not null check (max_members between 2 and 10),
  roles text[] not null default '{}' check (valid_text_array(roles, 10, 30)),
  skills text[] not null default '{}' check (valid_text_array(skills, 20, 30)),
  status team_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_contacts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references teams (id) on delete cascade,
  contact_link text not null check (contact_link ~ '^https?://\S+$'),
  created_at timestamptz not null default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id),
  user_id uuid not null references profiles (id),
  role team_member_role not null,
  -- 가입 시각(docs상 joined_at)이지만 다른 앱 테이블과 같은 이름으로 통일한다.
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- 팀장은 팀마다 한 명만 존재해야 한다(docs/features/teams.md).
create unique index team_members_one_leader_idx on team_members (team_id) where role = 'leader';

create table team_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id),
  user_id uuid not null references profiles (id),
  message text check (message is null or (char_length(message) <= 500 and message ~ '[^\s​﻿　]')),
  status team_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  -- 거절·취소 후 같은 팀 재요청 금지를 이 유니크 제약으로 강제한다(docs/features/teams.md).
  unique (team_id, user_id)
);
