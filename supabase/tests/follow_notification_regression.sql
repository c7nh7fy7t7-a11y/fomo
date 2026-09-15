-- Run against a non-production database after applying the follow-notification
-- migration. Relationship and notification changes are rolled back.
begin;

do $test$
declare
  v_first uuid;
  v_second uuid;
  v_second_follow_before integer;
  v_first_friend_before integer;
  v_second_friend_before integer;
  v_count integer;
begin
  select first_profile.id, second_profile.id
  into v_first, v_second
  from public.profiles first_profile
  join public.profiles second_profile
    on second_profile.university_id = first_profile.university_id
   and second_profile.id <> first_profile.id
  where first_profile.account_status = 'active'
    and second_profile.account_status = 'active'
  order by first_profile.created_at, second_profile.created_at
  limit 1;

  if v_first is null or v_second is null then
    raise exception 'Follow notification regression requires two active same-campus test profiles.';
  end if;

  delete from public.follows
  where (follower_id = v_first and following_id = v_second)
     or (follower_id = v_second and following_id = v_first);

  select count(*) into v_second_follow_before
  from public.notifications
  where user_id = v_second and actor_id = v_first and type = 'follow';

  select count(*) into v_first_friend_before
  from public.notifications
  where user_id = v_first and actor_id = v_second and type = 'friend';

  select count(*) into v_second_friend_before
  from public.notifications
  where user_id = v_second and actor_id = v_first and type = 'friend';

  insert into public.follows(follower_id, following_id)
  values (v_first, v_second);

  select count(*) into v_count
  from public.notifications
  where user_id = v_second and actor_id = v_first and type = 'follow';

  if v_count <> v_second_follow_before + 1 then
    raise exception 'The initial follow did not notify the followed account exactly once.';
  end if;

  insert into public.follows(follower_id, following_id)
  values (v_second, v_first);

  select count(*) into v_count
  from public.notifications
  where user_id = v_first and actor_id = v_second and type = 'friend';

  if v_count <> v_first_friend_before + 1 then
    raise exception 'The followed-back account did not receive exactly one friendship notification.';
  end if;

  select count(*) into v_count
  from public.notifications
  where user_id = v_second and actor_id = v_first and type = 'friend';

  if v_count <> v_second_friend_before then
    raise exception 'The follow-back actor received an incorrect friendship notification.';
  end if;

  raise notice 'Follow notification direction regression checks passed.';
end;
$test$;

rollback;
