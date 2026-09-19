drop trigger if exists on_review_created_award_points on reviews;
drop function if exists public.award_review_points();
drop function if exists public.purchase_review_access(uuid, text);
drop table if exists review_point_events;
alter table profiles drop column if exists review_access_until;
