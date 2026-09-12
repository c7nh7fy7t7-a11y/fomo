-- Launch-readiness P0/P1 access guards. These changes only narrow existing
-- access and add an authenticated push-token claim path for account switching.

create or replace function private.is_event_cohost(
  target_event uuid,
  target_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.event_cohosts ec
    join public.events e on e.id = ec.event_id
    where ec.event_id = target_event
      and ec.user_id = target_user
      and not private.is_blocked_between(target_user, e.host_id)
  );
$function$;

revoke all on function private.is_event_cohost(uuid, uuid) from public, anon;
grant execute on function private.is_event_cohost(uuid, uuid) to authenticated;

create or replace function private.can_set_attendance(target_event uuid, target_status text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and not private.is_blocked_between((select auth.uid()), e.host_id)
      and (
        (e.host_id = (select auth.uid()) and target_status = 'going')
        or (e.privacy = 'public' and target_status = 'going')
        or (e.privacy = 'request' and target_status = 'requested')
      )
  );
$function$;

revoke all on function private.can_set_attendance(uuid, text) from public, anon;
grant execute on function private.can_set_attendance(uuid, text) to authenticated;

create or replace function private.can_view_feed_post(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.feed_posts fp
    join public.profiles author on author.id = fp.author_id
    join public.profiles me on me.id = (select auth.uid())
    where fp.id = p_post
      and author.account_status = 'active'
      and author.university_id = me.university_id
      and not private.is_blocked_between((select auth.uid()), fp.author_id)
      and (fp.event_id is null or private.can_view_event(fp.event_id))
  );
$function$;

revoke all on function private.can_view_feed_post(uuid) from public, anon;
grant execute on function private.can_view_feed_post(uuid) to authenticated;

create or replace function private.can_view_event_photos(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and not private.is_blocked_between((select auth.uid()), e.host_id)
      and (
        e.privacy = 'public'
        or e.host_id = (select auth.uid())
        or private.is_event_cohost(e.id, (select auth.uid()))
        or exists (
          select 1
          from public.event_attendees ea
          where ea.event_id = e.id
            and ea.user_id = (select auth.uid())
            and ea.status in ('going', 'invited')
        )
      )
  );
$function$;

revoke all on function private.can_view_event_photos(uuid) from public, anon;
grant execute on function private.can_view_event_photos(uuid) to authenticated;

create or replace function private.can_upload_event_photo(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and not private.is_blocked_between((select auth.uid()), e.host_id)
      and (
        e.host_id = (select auth.uid())
        or private.is_event_cohost(e.id, (select auth.uid()))
        or exists (
          select 1
          from public.event_attendees ea
          where ea.event_id = e.id
            and ea.user_id = (select auth.uid())
            and ea.status in ('going', 'invited')
        )
      )
  );
$function$;

revoke all on function private.can_upload_event_photo(uuid) from public, anon;
grant execute on function private.can_upload_event_photo(uuid) to authenticated;

create or replace function private.can_view_event_location(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and not private.is_blocked_between((select auth.uid()), e.host_id)
      and (
        e.host_id = (select auth.uid())
        or private.is_event_cohost(e.id, (select auth.uid()))
        or exists (
          select 1
          from public.event_attendees ea
          where ea.event_id = e.id
            and ea.user_id = (select auth.uid())
            and ea.status in ('going', 'invited')
        )
      )
  );
$function$;

revoke all on function private.can_view_event_location(uuid) from public, anon;
grant execute on function private.can_view_event_location(uuid) to authenticated;

drop policy if exists "authorized users read exact locations" on public.event_locations;
drop policy if exists "cohosts read exact locations" on public.event_locations;
create policy "authorized users read exact locations"
on public.event_locations
for select
to authenticated
using ((select private.can_view_event_location(event_id)));

create or replace function public.claim_fomo_push_token(
  p_expo_push_token text,
  p_platform text,
  p_device_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_active_account();
  v_token text := btrim(p_expo_push_token);
begin
  if length(v_token) < 20
    or length(v_token) > 512
    or v_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
  then
    raise exception using errcode = '22023', message = 'FOMO_INVALID_PUSH_TOKEN';
  end if;

  if p_platform not in ('ios', 'android', 'unknown') then
    raise exception using errcode = '22023', message = 'FOMO_INVALID_PUSH_PLATFORM';
  end if;

  insert into public.user_push_tokens (
    user_id,
    expo_push_token,
    platform,
    device_name,
    updated_at,
    last_seen_at
  ) values (
    v_user,
    v_token,
    p_platform,
    nullif(left(btrim(p_device_name), 120), ''),
    now(),
    now()
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      device_name = excluded.device_name,
      updated_at = now(),
      last_seen_at = now();
end;
$function$;

revoke all on function public.claim_fomo_push_token(text, text, text) from public, anon;
grant execute on function public.claim_fomo_push_token(text, text, text) to authenticated;

do $migration$
begin
  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    cross join lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
    where n.nspname in ('private', 'public')
      and p.proname in (
        'is_event_cohost',
        'can_set_attendance',
        'can_view_feed_post',
        'can_view_event_photos',
        'can_upload_event_photo',
        'can_view_event_location',
        'claim_fomo_push_token'
      )
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception using errcode = '42501', message = 'Launch-readiness functions must not be executable by PUBLIC';
  end if;
end;
$migration$;
