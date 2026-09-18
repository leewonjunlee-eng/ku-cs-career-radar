-- P0-5: server-only transactional team recruitment RPCs.
-- These functions intentionally receive a server-validated actor UUID because
-- service_role calls do not carry an end-user JWT identity.

create function public.create_team(
  p_actor_id uuid,
  p_opportunity_id uuid,
  p_name text,
  p_introduction text,
  p_max_members integer,
  p_roles text[],
  p_skills text[],
  p_contact_link text
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_opportunity public.opportunities%rowtype;
  v_team_id uuid;
begin
  if p_actor_id is null or not exists (select 1 from public.profiles where id = p_actor_id) then
    raise exception 'A valid actor is required' using errcode = '42501';
  end if;

  select * into v_opportunity
    from public.opportunities
   where id = p_opportunity_id
   for share;

  if not found then
    raise exception 'Opportunity not found' using errcode = '22023';
  end if;
  if v_opportunity.category not in ('contest', 'hackathon') then
    raise exception 'Teams are only available for contests and hackathons' using errcode = '22023';
  end if;
  if v_opportunity.deadline_type = 'fixed' and v_opportunity.deadline <= clock_timestamp() then
    raise exception 'Opportunity deadline has passed' using errcode = '22023';
  end if;
  if p_name is null or char_length(p_name) > 50 or p_name !~ '[^\s\u200b\ufeff\u00a0]' then
    raise exception 'Invalid team name' using errcode = '22023';
  end if;
  if p_introduction is not null and (char_length(p_introduction) > 5000 or p_introduction !~ '[^\s\u200b\ufeff\u00a0]') then
    raise exception 'Invalid team introduction' using errcode = '22023';
  end if;
  if p_max_members is null or p_max_members < 2 or p_max_members > 10 then
    raise exception 'Invalid maximum member count' using errcode = '22023';
  end if;
  if p_roles is null or not public.valid_text_array(p_roles, 10, 30)
     or p_skills is null or not public.valid_text_array(p_skills, 20, 30) then
    raise exception 'Invalid roles or skills' using errcode = '22023';
  end if;
  if p_contact_link is null or p_contact_link !~ '^https?://\S+$' then
    raise exception 'Invalid contact link' using errcode = '22023';
  end if;

  insert into public.teams (opportunity_id, owner_id, name, introduction, max_members, roles, skills)
  values (p_opportunity_id, p_actor_id, p_name, p_introduction, p_max_members, p_roles, p_skills)
  returning id into v_team_id;
  insert into public.team_members (team_id, user_id, role) values (v_team_id, p_actor_id, 'leader');
  insert into public.team_contacts (team_id, contact_link) values (v_team_id, p_contact_link);
  return v_team_id;
end;
$$;

create function public.create_team_request(
  p_actor_id uuid,
  p_team_id uuid,
  p_message text
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_team public.teams%rowtype;
  v_category public.opp_category;
  v_deadline_type public.opp_deadline_type;
  v_deadline timestamptz;
  v_member_count integer;
  v_request_id uuid;
begin
  if p_actor_id is null or not exists (select 1 from public.profiles where id = p_actor_id) then
    raise exception 'A valid actor is required' using errcode = '42501';
  end if;
  if p_message is not null and (char_length(p_message) > 500 or p_message !~ '[^\s\u200b\ufeff\u00a0]') then
    raise exception 'Invalid request message' using errcode = '22023';
  end if;

  -- Every operation that touches both resources locks the team before a request.
  select * into v_team from public.teams where id = p_team_id for update;
  if not found then raise exception 'Team not found' using errcode = '22023'; end if;
  select category, deadline_type, deadline into v_category, v_deadline_type, v_deadline
    from public.opportunities where id = v_team.opportunity_id for share;
  select count(*) into v_member_count from public.team_members where team_id = v_team.id;
  if v_category not in ('contest', 'hackathon') or v_team.status <> 'open'
     or (v_deadline_type = 'fixed' and v_deadline <= clock_timestamp()) then
    raise exception 'Team is not accepting requests' using errcode = '22023';
  end if;
  if v_member_count >= v_team.max_members then
    raise exception 'Team is full' using errcode = '22023';
  end if;
  if v_team.owner_id = p_actor_id or exists (select 1 from public.team_members where team_id = v_team.id and user_id = p_actor_id) then
    raise exception 'Team members cannot request to join' using errcode = '42501';
  end if;
  insert into public.team_requests (team_id, user_id, message) values (v_team.id, p_actor_id, p_message) returning id into v_request_id;
  return v_request_id;
end;
$$;

create function public.accept_team_request(
  p_actor_id uuid,
  p_team_id uuid,
  p_request_id uuid
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_team public.teams%rowtype;
  v_request public.team_requests%rowtype;
  v_category public.opp_category;
  v_deadline_type public.opp_deadline_type;
  v_deadline timestamptz;
  v_member_count integer;
begin
  if p_actor_id is null or not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'A valid actor is required' using errcode = '42501'; end if;
  select * into v_team from public.teams where id = p_team_id for update;
  if not found then raise exception 'Team not found' using errcode = '22023'; end if;
  select * into v_request from public.team_requests where id = p_request_id and team_id = v_team.id for update;
  if not found then raise exception 'Request not found for team' using errcode = '22023'; end if;
  if v_team.owner_id <> p_actor_id then raise exception 'Only the team owner can accept requests' using errcode = '42501'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending' using errcode = '23505'; end if;
  select category, deadline_type, deadline into v_category, v_deadline_type, v_deadline
    from public.opportunities where id = v_team.opportunity_id for share;
  select count(*) into v_member_count from public.team_members where team_id = v_team.id;
  if v_category not in ('contest', 'hackathon') or v_team.status <> 'open'
     or (v_deadline_type = 'fixed' and v_deadline <= clock_timestamp()) then raise exception 'Team is not accepting requests' using errcode = '22023'; end if;
  if v_member_count >= v_team.max_members then raise exception 'Team is full' using errcode = '22023'; end if;
  if exists (select 1 from public.team_members where team_id = v_team.id and user_id = v_request.user_id) then raise exception 'Requester is already a member' using errcode = '23505'; end if;
  update public.team_requests set status = 'accepted' where id = v_request.id;
  insert into public.team_members (team_id, user_id, role) values (v_team.id, v_request.user_id, 'member');
  if v_member_count + 1 >= v_team.max_members then update public.teams set status = 'closed', updated_at = clock_timestamp() where id = v_team.id; end if;
end;
$$;

create function public.reject_team_request(p_actor_id uuid, p_team_id uuid, p_request_id uuid) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_team public.teams%rowtype; v_request public.team_requests%rowtype;
begin
  if p_actor_id is null or not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'A valid actor is required' using errcode = '42501'; end if;
  select * into v_team from public.teams where id = p_team_id for update;
  if not found then raise exception 'Team not found' using errcode = '22023'; end if;
  select * into v_request from public.team_requests where id = p_request_id and team_id = v_team.id for update;
  if not found then raise exception 'Request not found for team' using errcode = '22023'; end if;
  if v_team.owner_id <> p_actor_id then raise exception 'Only the team owner can reject requests' using errcode = '42501'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending' using errcode = '23505'; end if;
  update public.team_requests set status = 'rejected' where id = v_request.id;
end;
$$;

create function public.cancel_team_request(p_actor_id uuid, p_team_id uuid, p_request_id uuid) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_team public.teams%rowtype; v_request public.team_requests%rowtype;
begin
  if p_actor_id is null or not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'A valid actor is required' using errcode = '42501'; end if;
  select * into v_team from public.teams where id = p_team_id for update;
  if not found then raise exception 'Team not found' using errcode = '22023'; end if;
  select * into v_request from public.team_requests where id = p_request_id and team_id = v_team.id for update;
  if not found then raise exception 'Request not found for team' using errcode = '22023'; end if;
  if v_request.user_id <> p_actor_id then raise exception 'Only the requester can cancel a request' using errcode = '42501'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending' using errcode = '23505'; end if;
  update public.team_requests set status = 'cancelled' where id = v_request.id;
end;
$$;

create function public.close_team(p_actor_id uuid, p_team_id uuid) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_team public.teams%rowtype;
begin
  if p_actor_id is null or not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'A valid actor is required' using errcode = '42501'; end if;
  select * into v_team from public.teams where id = p_team_id for update;
  if not found then raise exception 'Team not found' using errcode = '22023'; end if;
  if v_team.owner_id <> p_actor_id then raise exception 'Only the team owner can close a team' using errcode = '42501'; end if;
  if v_team.status <> 'open' then raise exception 'Team is already closed' using errcode = '23505'; end if;
  update public.teams set status = 'closed', updated_at = clock_timestamp() where id = v_team.id;
end;
$$;

-- P1 may edit recruitment copy, but the relationship and capacity established
-- by creation are never editable.  This also protects future server code from
-- accidentally turning an edit path into an ownership/capacity escalation.
create function public.reject_immutable_team_fields() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.opportunity_id is distinct from old.opportunity_id
     or new.max_members is distinct from old.max_members then
    raise exception 'Team owner, opportunity, and capacity are immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger teams_immutable_fields
before update on public.teams
for each row execute function public.reject_immutable_team_fields();

-- Data API callers must never invoke these directly. The server calls using
-- service_role after validating the session identity and passes that identity in.
revoke all on function public.create_team(uuid, uuid, text, text, integer, text[], text[], text) from public, anon, authenticated;
revoke all on function public.create_team_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.accept_team_request(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_team_request(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_team_request(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.close_team(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_immutable_team_fields() from public, anon, authenticated;
grant execute on function public.create_team(uuid, uuid, text, text, integer, text[], text[], text) to service_role;
grant execute on function public.create_team_request(uuid, uuid, text) to service_role;
grant execute on function public.accept_team_request(uuid, uuid, uuid) to service_role;
grant execute on function public.reject_team_request(uuid, uuid, uuid) to service_role;
grant execute on function public.cancel_team_request(uuid, uuid, uuid) to service_role;
grant execute on function public.close_team(uuid, uuid) to service_role;
grant execute on function public.reject_immutable_team_fields() to service_role;
