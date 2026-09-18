-- Existing deployments may already have run 0003, so repeat the hardened
-- definition in a new migration rather than relying on an edited migration.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
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

-- Backfill follows the same privacy rule without overwriting an existing choice.
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
