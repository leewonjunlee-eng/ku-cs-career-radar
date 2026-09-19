-- 후기 작성 보상과 후기 열람권 구매 이력을 별도로 기록한다.
alter table profiles
  add column review_access_until timestamptz;

create table review_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  review_id uuid unique references reviews (id) on delete cascade,
  amount integer not null check (amount <> 0 and amount between -1000 and 1000),
  reason text not null check (reason in ('review_created', 'review_access_30', 'review_access_90', 'review_access_180')),
  created_at timestamptz not null default now(),
  check (
    (reason = 'review_created' and review_id is not null and amount = 15)
    or (reason = 'review_access_30' and review_id is null and amount = -35)
    or (reason = 'review_access_90' and review_id is null and amount = -55)
    or (reason = 'review_access_180' and review_id is null and amount = -75)
  )
);

create index review_point_events_user_created_idx on review_point_events (user_id, created_at desc);
alter table review_point_events enable row level security;
revoke all on review_point_events from public, anon, authenticated;
grant select, insert, update, delete on review_point_events to service_role;

-- 일반 사용자가 새로 작성한 후기 한 건당 15P를 부여한다. 리뷰 저장과 보상 기록은 같은 트랜잭션에서 끝난다.
create function public.award_review_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_demo then
    insert into public.review_point_events (user_id, review_id, amount, reason)
    values (new.author_id, new.id, 15, 'review_created');
  end if;
  return new;
end;
$$;

revoke all on function public.award_review_points() from public, anon, authenticated;
grant execute on function public.award_review_points() to service_role;

create trigger on_review_created_award_points
  after insert on reviews
  for each row execute function public.award_review_points();

-- 기존 일반 후기에도 같은 보상을 한 번만 반영한다.
insert into review_point_events (user_id, review_id, amount, reason)
select author_id, id, 15, 'review_created'
from reviews
where not is_demo
on conflict (review_id) do nothing;

create function public.purchase_review_access(p_actor_id uuid, p_product text)
returns table (points integer, review_access_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days integer;
  v_cost integer;
  v_reason text;
  v_points integer;
  v_start timestamptz;
  v_until timestamptz;
begin
  if p_product = 'review_access_30' then
    v_days := 30; v_cost := 35; v_reason := 'review_access_30';
  elsif p_product = 'review_access_90' then
    v_days := 90; v_cost := 55; v_reason := 'review_access_90';
  elsif p_product = 'review_access_180' then
    v_days := 180; v_cost := 75; v_reason := 'review_access_180';
  else
    raise exception 'Invalid review access product' using errcode = '22023';
  end if;

  select review_access_until into v_until from public.profiles where id = p_actor_id for update;
  if not found then raise exception 'A valid actor is required' using errcode = '22023'; end if;
  select coalesce(sum(amount), 0)::integer into v_points from public.review_point_events where user_id = p_actor_id;
  if v_points < v_cost then raise exception 'Not enough points' using errcode = '22023'; end if;

  v_start := greatest(coalesce(v_until, now()), now());
  v_until := v_start + make_interval(days => v_days);
  insert into public.review_point_events (user_id, amount, reason) values (p_actor_id, -v_cost, v_reason);
  update public.profiles set review_access_until = v_until where id = p_actor_id;

  return query select v_points - v_cost, v_until;
end;
$$;

revoke all on function public.purchase_review_access(uuid, text) from public, anon, authenticated;
grant execute on function public.purchase_review_access(uuid, text) to service_role;
