-- SEC-03: revoke protected FOMO access when the caller's current profile is
-- suspended or banned, including for JWTs issued before the status change.

create or replace function private.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'
  );
$function$;

revoke all on function private.is_active_account() from public, anon;
grant execute on function private.is_active_account() to authenticated;

create or replace function private.require_active_account()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using
      errcode = '42501',
      message = 'FOMO_AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user
      and p.account_status = 'active'
  ) then
    raise exception using
      errcode = '42501',
      message = 'FOMO_ACCOUNT_INACTIVE';
  end if;

  return v_user;
end;
$function$;

revoke all on function private.require_active_account() from public, anon, authenticated;

-- Existing permissive policies continue to define which active users may access
-- each row. This restrictive policy adds the current account-status requirement
-- without broadening any existing authorization rule.
do $migration$
declare
  v_table text;
  v_relation regclass;
begin
  foreach v_table in array array[
    'universities',
    'university_domains',
    'profiles',
    'events',
    'event_locations',
    'event_attendees',
    'friendships',
    'event_photos',
    'feed_posts',
    'feed_post_media',
    'feed_post_tags',
    'feed_reactions',
    'feed_comments',
    'feed_post_views',
    'profile_views',
    'conversations',
    'conversation_members',
    'messages',
    'follows',
    'saved_events',
    'event_cohosts',
    'message_event_shares',
    'notifications',
    'profile_verifications',
    'user_push_tokens',
    'notification_preferences',
    'user_interests',
    'user_blocks',
    'reports',
    'organizer_profiles',
    'event_social_invites'
  ]
  loop
    v_relation := to_regclass(format('%I.%I', 'public', v_table));

    if v_relation is null then
      if v_table = 'profile_verifications' then
        continue;
      end if;

      raise exception using
        errcode = '42P01',
        message = format('SEC-03 required table public.%I does not exist', v_table);
    end if;

    execute format(
      'alter table public.%I enable row level security',
      v_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      'active accounts only',
      v_table
    );
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select private.is_active_account())) with check ((select private.is_active_account()))',
      'active accounts only',
      v_table
    );
  end loop;
end;
$migration$;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  ) then
    raise exception using
      errcode = '42501',
      message = 'SEC-03 requires RLS to already be enabled on managed table storage.objects';
  end if;
end;
$migration$;

drop policy if exists "active accounts only" on storage.objects;
create policy "active accounts only"
on storage.objects
as restrictive
for all
to authenticated
using ((select private.is_active_account()))
with check ((select private.is_active_account()));

-- Prove that RLS is active on every SEC-03 target that exists. The optional
-- profile_verifications table is included automatically when present.
do $migration$
declare
  v_rls_disabled text[];
begin
  select array_agg(format('%I.%I', targets.schema_name, targets.table_name) order by targets.schema_name, targets.table_name)
  into v_rls_disabled
  from (
    values
      ('public', 'universities'),
      ('public', 'university_domains'),
      ('public', 'profiles'),
      ('public', 'events'),
      ('public', 'event_locations'),
      ('public', 'event_attendees'),
      ('public', 'friendships'),
      ('public', 'event_photos'),
      ('public', 'feed_posts'),
      ('public', 'feed_post_media'),
      ('public', 'feed_post_tags'),
      ('public', 'feed_reactions'),
      ('public', 'feed_comments'),
      ('public', 'feed_post_views'),
      ('public', 'profile_views'),
      ('public', 'conversations'),
      ('public', 'conversation_members'),
      ('public', 'messages'),
      ('public', 'follows'),
      ('public', 'saved_events'),
      ('public', 'event_cohosts'),
      ('public', 'message_event_shares'),
      ('public', 'notifications'),
      ('public', 'profile_verifications'),
      ('public', 'user_push_tokens'),
      ('public', 'notification_preferences'),
      ('public', 'user_interests'),
      ('public', 'user_blocks'),
      ('public', 'reports'),
      ('public', 'organizer_profiles'),
      ('public', 'event_social_invites'),
      ('storage', 'objects')
  ) as targets(schema_name, table_name)
  join pg_catalog.pg_namespace n
    on n.nspname = targets.schema_name
  join pg_catalog.pg_class c
    on c.relnamespace = n.oid
   and c.relname = targets.table_name
   and c.relkind in ('r', 'p')
  where not c.relrowsecurity;

  if v_rls_disabled is not null then
    raise exception using
      errcode = '42501',
      message = format(
        'SEC-03 RLS assertion failed; RLS is disabled on: %s',
        array_to_string(v_rls_disabled, ', ')
      );
  end if;
end;
$migration$;

-- Postgres Changes cannot apply RLS to DELETE events. Disable DELETE at the
-- publication boundary so a stale JWT cannot receive protected row keys.
do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication p
    where p.pubname = 'supabase_realtime'
  ) then
    raise exception using
      errcode = '42704',
      message = 'SEC-03 requires the supabase_realtime publication';
  end if;
end;
$migration$;

alter publication supabase_realtime
set (publish = 'insert, update, truncate');

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication p
    where p.pubname = 'supabase_realtime'
      and p.pubinsert
      and p.pubupdate
      and not p.pubdelete
      and p.pubtruncate
  ) then
    raise exception using
      errcode = '42501',
      message = 'SEC-03 Realtime assertion failed; INSERT and UPDATE must remain enabled while DELETE is disabled';
  end if;
end;
$migration$;

-- Profile bootstrap remains available only when the caller has no profile yet.
-- An existing suspended or banned profile is never recreated or reactivated.
create or replace function public.ensure_fomo_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_username text;
  v_university uuid := '11111111-1111-1111-1111-111111111111';
  v_status text;
begin
  if v_user is null then
    raise exception using
      errcode = '42501',
      message = 'FOMO_AUTH_REQUIRED';
  end if;

  select p.account_status
  into v_status
  from public.profiles p
  where p.id = v_user;

  if found then
    if v_status is distinct from 'active' then
      raise exception using
        errcode = '42501',
        message = 'FOMO_ACCOUNT_INACTIVE';
    end if;
    return v_user;
  end if;

  select u.email
  into v_email
  from auth.users u
  where u.id = v_user;

  if v_email is null then
    raise exception 'FOMO_PROFILE_MISSING: Could not recover your account profile.';
  end if;

  v_username := 'student_' || left(replace(v_user::text, '-', ''), 12);

  insert into public.profiles (
    id, university_id, email_domain, full_name, username,
    graduation_year, program, account_status, onboarding_completed
  ) values (
    v_user,
    v_university,
    lower(split_part(v_email, '@', 2)),
    'New student',
    v_username,
    null,
    null,
    'active',
    false
  )
  on conflict (id) do nothing;

  if not private.is_active_account() then
    raise exception using
      errcode = '42501',
      message = 'FOMO_ACCOUNT_INACTIVE';
  end if;

  return v_user;
end;
$function$;

create or replace function public.fomo_create_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_active_account();
begin
  return jsonb_build_object(
    'auth_user_id', v_user,
    'profile_exists', true,
    'profile_id', v_user,
    'university_id', (select p.university_id from public.profiles p where p.id = v_user),
    'account_status', 'active',
    'username', (select p.username from public.profiles p where p.id = v_user)
  );
end;
$function$;

create or replace function public.get_feed_post_view_counts(p_post_ids uuid[])
returns table(post_id uuid, view_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  return query
  select v.post_id, count(*)::bigint
  from public.feed_post_views v
  where v.post_id = any(p_post_ids)
    and private.can_view_feed_post(v.post_id)
  group by v.post_id;
end;
$function$;

create or replace function public.get_my_blocked_profiles()
returns table(id uuid, full_name text, username text, avatar_url text)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  return query
  select p.id, p.full_name, p.username, p.avatar_url
  from public.user_blocks ub
  join public.profiles p on p.id = ub.blocked_id
  where ub.blocker_id = auth.uid()
  order by ub.created_at desc;
end;
$function$;

create or replace function public.get_my_profile_view_count()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  return (
    select count(*)::bigint
    from public.profile_views
    where profile_id = auth.uid()
  );
end;
$function$;

create or replace function public.get_or_create_direct_conversation(p_peer uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_me uuid := private.require_active_account();
  v_conversation uuid;
begin
  if p_peer is null or p_peer = v_me then raise exception 'FOMO_INVALID_PEER'; end if;
  if private.is_blocked_between(v_me, p_peer) then raise exception 'FOMO_UNAVAILABLE'; end if;
  if not private.same_campus_profile(p_peer) then raise exception 'FOMO_INVALID_PEER'; end if;
  perform pg_advisory_xact_lock(hashtext(least(v_me::text, p_peer::text) || ':' || greatest(v_me::text, p_peer::text)));
  select cm.conversation_id into v_conversation
  from public.conversation_members cm
  where cm.user_id = v_me
    and exists (
      select 1 from public.conversation_members peer
      where peer.conversation_id = cm.conversation_id and peer.user_id = p_peer
    )
    and 2 = (
      select count(*) from public.conversation_members allm
      where allm.conversation_id = cm.conversation_id
    )
  limit 1;
  if v_conversation is null then
    insert into public.conversations default values returning id into v_conversation;
    insert into public.conversation_members(conversation_id, user_id)
    values (v_conversation, v_me), (v_conversation, p_peer);
  end if;
  return v_conversation;
end;
$function$;

create or replace function public.get_profile_social_stats(p_profile uuid)
returns table(follower_count bigint, following_count bigint, friend_count bigint, mutual_friend_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  if not private.same_campus_profile(p_profile) then
    return;
  end if;

  return query
  select
    (select count(*) from public.follows f where f.following_id = p_profile),
    (select count(*) from public.follows f where f.follower_id = p_profile),
    (select count(*) from public.follows f
      where f.follower_id = p_profile
        and exists (
          select 1 from public.follows r
          where r.follower_id = f.following_id and r.following_id = p_profile
        )),
    (select count(*) from public.follows mine
      where mine.follower_id = auth.uid()
        and exists (
          select 1 from public.follows mine_back
          where mine_back.follower_id = mine.following_id and mine_back.following_id = auth.uid()
        )
        and exists (
          select 1 from public.follows theirs
          where theirs.follower_id = p_profile and theirs.following_id = mine.following_id
        )
        and exists (
          select 1 from public.follows theirs_back
          where theirs_back.follower_id = mine.following_id and theirs_back.following_id = p_profile
        ));
end;
$function$;

create or replace function public.invite_people_to_private_event(p_event_id uuid, p_recipient_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_me uuid := private.require_active_account();
  v_recipient uuid;
  v_count integer := 0;
begin
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.status = 'active'
      and e.privacy = 'private'
      and (
        e.host_id = v_me
        or exists (
          select 1 from public.event_cohosts ec
          where ec.event_id = e.id and ec.user_id = v_me
        )
      )
  ) then
    raise exception 'FOMO_NOT_EVENT_MANAGER';
  end if;

  foreach v_recipient in array coalesce(p_recipient_ids, array[]::uuid[])
  loop
    if v_recipient <> v_me
       and private.same_campus_profile(v_recipient)
       and not private.is_blocked_between(v_me, v_recipient) then
      insert into public.event_attendees(event_id, user_id, status)
      values (p_event_id, v_recipient, 'invited')
      on conflict (event_id, user_id)
      do update set status = 'invited', updated_at = now();
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$function$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid() and read_at is null;
end;
$function$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = auth.uid();
end;
$function$;

create or replace function public.record_feed_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  if not private.can_view_feed_post(p_post_id) then
    return;
  end if;
  insert into public.feed_post_views(post_id, user_id, last_viewed_at)
  values (p_post_id, auth.uid(), now())
  on conflict (post_id, user_id)
  do update set last_viewed_at = excluded.last_viewed_at;
end;
$function$;

create or replace function public.record_profile_view(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_active_account();
  if p_profile_id is null or p_profile_id = auth.uid() then return; end if;
  if not private.same_campus_profile(p_profile_id) then return; end if;

  insert into public.profile_views(profile_id, viewer_id, last_viewed_at)
  values (p_profile_id, auth.uid(), now())
  on conflict (profile_id, viewer_id)
  do update set last_viewed_at = excluded.last_viewed_at;
end;
$function$;

revoke all on function public.ensure_fomo_profile() from public, anon;
revoke all on function public.fomo_create_context() from public, anon;
revoke all on function public.get_feed_post_view_counts(uuid[]) from public, anon;
revoke all on function public.get_my_blocked_profiles() from public, anon;
revoke all on function public.get_my_profile_view_count() from public, anon;
revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
revoke all on function public.get_profile_social_stats(uuid) from public, anon;
revoke all on function public.invite_people_to_private_event(uuid, uuid[]) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.record_feed_post_view(uuid) from public, anon;
revoke all on function public.record_profile_view(uuid) from public, anon;

grant execute on function public.ensure_fomo_profile() to authenticated;
grant execute on function public.fomo_create_context() to authenticated;
grant execute on function public.get_feed_post_view_counts(uuid[]) to authenticated;
grant execute on function public.get_my_blocked_profiles() to authenticated;
grant execute on function public.get_my_profile_view_count() to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.get_profile_social_stats(uuid) to authenticated;
grant execute on function public.invite_people_to_private_event(uuid, uuid[]) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.record_feed_post_view(uuid) to authenticated;
grant execute on function public.record_profile_view(uuid) to authenticated;
