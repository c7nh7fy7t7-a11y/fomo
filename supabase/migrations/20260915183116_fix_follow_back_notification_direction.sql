-- A reciprocal follow completes a friendship, but only the person being
-- followed back should receive the new friendship notification. The actor
-- already received the original follow notification when the first edge was
-- created.
create or replace function private.notify_follow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reciprocal boolean;
begin
  select exists(
    select 1
    from public.follows f
    where f.follower_id = new.following_id
      and f.following_id = new.follower_id
  ) into reciprocal;

  if reciprocal then
    insert into public.notifications(user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'friend');
  else
    insert into public.notifications(user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;

  return new;
end;
$$;

revoke all on function private.notify_follow_change() from public;
