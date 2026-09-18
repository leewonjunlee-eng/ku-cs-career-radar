-- Supabase Auth 사용자 생성 시 앱 프로필을 함께 만든다.
--
-- 이 함수는 auth.users INSERT 트리거에서 호출되므로 SECURITY DEFINER로 실행한다.
-- search_path를 비우고 모든 객체를 스키마로 한정해, 호출자가 search_path를
-- 조작해 다른 객체를 실행시키는 일을 막는다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  -- 개인정보를 닉네임으로 사용하지 않는다. raw metadata의 name/display_name이
  -- 이메일 모양이거나 Auth 계정 이메일과 같으면 기본 닉네임을 쓴다. 먼저 길이를
  -- 자른 뒤 trim/공백 검사를 수행해, 잘린 결과가 공백이면 기본 닉네임을 쓴다.
  requested_name := left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name', ''), 50);
  requested_name := btrim(requested_name);
  if requested_name !~ '[^\s​﻿　]'
    or requested_name ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (new.email is not null and lower(requested_name) = lower(new.email)) then
    requested_name := '사용자';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, requested_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 마이그레이션이 기존 Auth 사용자가 있는 프로젝트에 적용되는 경우에도
-- 누락된 프로필을 보충한다. ON CONFLICT로 이미 작성한 닉네임은 보존한다.
insert into public.profiles (id, display_name)
select
  u.id,
  case
    when btrim(c.candidate) ~ '[^\s​﻿　]'
      and btrim(c.candidate) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and (u.email is null or lower(btrim(c.candidate)) <> lower(u.email))
    then btrim(c.candidate)
    else '사용자'
  end
from auth.users as u
cross join lateral (
  select coalesce(
    left(coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'name', ''), 50),
    ''
  ) as candidate
) as c
on conflict (id) do nothing;
