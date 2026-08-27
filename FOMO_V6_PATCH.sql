-- FOMO V6 — SOCIAL GRAPH, PROFILES & RELIABILITY
-- Additive migration for the working V5.2/V5.2.1 backend.
-- Keeps RLS enabled and leaves the legacy friendships table intact for history/rollback.

-- ============================================================
-- PROFILE BIO
-- ============================================================
alter table public.profiles add column if not exists bio text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_bio_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_check
      check (bio is null or char_length(bio) <= 160);
  end if;
end $$;

-- ============================================================
-- FOLLOW GRAPH
-- ============================================================
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows(following_id, created_at desc);
create index if not exists follows_follower_idx on public.follows(follower_id, created_at desc);
alter table public.follows enable row level security;

grant select, insert, delete on public.follows to authenticated;
revoke all on public.follows from anon;

drop policy if exists "campus reads follow graph" on public.follows;
create policy "campus reads follow graph" on public.follows
for select to authenticated
using (
  private.same_campus_profile(follower_id)
  and private.same_campus_profile(following_id)
);

drop policy if exists "users follow as self" on public.follows;
create policy "users follow as self" on public.follows
for insert to authenticated
with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
  and private.same_campus_profile(following_id)
);

drop policy if exists "users unfollow as self" on public.follows;
create policy "users unfollow as self" on public.follows
for delete to authenticated
using (follower_id = auth.uid());

-- Existing accepted friendships become two reciprocal follows.
insert into public.follows(follower_id, following_id, created_at)
select requester_id, addressee_id, created_at
from public.friendships
where status = 'accepted'
on conflict do nothing;

insert into public.follows(follower_id, following_id, created_at)
select addressee_id, requester_id, created_at
from public.friendships
where status = 'accepted'
on conflict do nothing;

-- A legacy pending friend request naturally becomes the requester's one-way follow.
insert into public.follows(follower_id, following_id, created_at)
select requester_id, addressee_id, created_at
from public.friendships
where status = 'pending'
on conflict do nothing;

create or replace function private.is_following(p_follower uuid, p_following uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.follows f
    where f.follower_id = p_follower and f.following_id = p_following
  );
$$;

create or replace function private.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_following(p_a, p_b) and private.is_following(p_b, p_a);
$$;

revoke all on function private.is_following(uuid,uuid) from public;
revoke all on function private.are_friends(uuid,uuid) from public;
grant execute on function private.is_following(uuid,uuid) to authenticated;
grant execute on function private.are_friends(uuid,uuid) to authenticated;

create or replace function public.get_profile_social_stats(p_profile uuid)
returns table(follower_count bigint, following_count bigint, friend_count bigint, mutual_friend_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.same_campus_profile(p_profile) then
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
        )
    );
end;
$$;

revoke all on function public.get_profile_social_stats(uuid) from public;
grant execute on function public.get_profile_social_stats(uuid) to authenticated;

-- ============================================================
-- SAVED EVENTS
-- ============================================================
create table if not exists public.saved_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index if not exists saved_events_user_created_idx on public.saved_events(user_id, created_at desc);
alter table public.saved_events enable row level security;
grant select, insert, delete on public.saved_events to authenticated;
revoke all on public.saved_events from anon;

drop policy if exists "users read own saved events" on public.saved_events;
create policy "users read own saved events" on public.saved_events
for select to authenticated using (user_id = auth.uid());

drop policy if exists "users save visible events" on public.saved_events;
create policy "users save visible events" on public.saved_events
for insert to authenticated
with check (user_id = auth.uid() and private.can_view_event(event_id));

drop policy if exists "users unsave own events" on public.saved_events;
create policy "users unsave own events" on public.saved_events
for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- EVENT CO-HOSTS
-- ============================================================
create table if not exists public.event_cohosts (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_cohosts_user_idx on public.event_cohosts(user_id, created_at desc);
alter table public.event_cohosts enable row level security;
grant select, insert, delete on public.event_cohosts to authenticated;
revoke all on public.event_cohosts from anon;

create or replace function private.is_event_cohost(target_event uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_cohosts ec
    where ec.event_id = target_event and ec.user_id = target_user
  );
$$;

create or replace function private.is_event_manager(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_event_host(target_event)
      or private.is_event_cohost(target_event, auth.uid());
$$;

revoke all on function private.is_event_cohost(uuid,uuid) from public;
revoke all on function private.is_event_manager(uuid) from public;
grant execute on function private.is_event_cohost(uuid,uuid) to authenticated;
grant execute on function private.is_event_manager(uuid) to authenticated;

drop policy if exists "campus reads visible event cohosts" on public.event_cohosts;
create policy "campus reads visible event cohosts" on public.event_cohosts
for select to authenticated using (private.can_view_event(event_id) or private.is_event_cohost(event_id, auth.uid()));

drop policy if exists "hosts add same campus cohosts" on public.event_cohosts;
create policy "hosts add same campus cohosts" on public.event_cohosts
for insert to authenticated
with check (
  private.is_event_host(event_id)
  and added_by = auth.uid()
  and user_id <> auth.uid()
  and private.same_campus_profile(user_id)
);

drop policy if exists "hosts or self remove cohosts" on public.event_cohosts;
create policy "hosts or self remove cohosts" on public.event_cohosts
for delete to authenticated
using (private.is_event_host(event_id) or user_id = auth.uid());

-- Co-hosts can read private events they manage.
drop policy if exists "cohosts read managed events" on public.events;
create policy "cohosts read managed events" on public.events
for select to authenticated
using (
  status = 'active'
  and university_id = private.current_university_id()
  and private.is_event_cohost(id, auth.uid())
);

-- Co-hosts can edit event content, but a trigger prevents ownership/campus/id takeover.
drop policy if exists "cohosts update managed events" on public.events;
create policy "cohosts update managed events" on public.events
for update to authenticated
using (private.is_event_cohost(id, auth.uid()))
with check (
  private.is_event_cohost(id, auth.uid())
  and university_id = private.current_university_id()
);

create or replace function private.guard_cohost_event_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and auth.uid() <> old.host_id
     and private.is_event_cohost(old.id, auth.uid()) then
    if new.id <> old.id or new.host_id <> old.host_id or new.university_id <> old.university_id then
      raise exception 'FOMO_CO_HOST_OWNERSHIP_PROTECTED';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_cohost_event_update() from public;

drop trigger if exists events_guard_cohost_update on public.events;
create trigger events_guard_cohost_update
before update on public.events
for each row execute function private.guard_cohost_event_update();

-- Co-hosts can manage attendee requests.
drop policy if exists "cohosts view event attendees" on public.event_attendees;
create policy "cohosts view event attendees" on public.event_attendees
for select to authenticated using (private.is_event_cohost(event_id, auth.uid()));

drop policy if exists "cohosts manage attendee status" on public.event_attendees;
create policy "cohosts manage attendee status" on public.event_attendees
for update to authenticated
using (private.is_event_cohost(event_id, auth.uid()))
with check (private.is_event_cohost(event_id, auth.uid()));

drop policy if exists "cohosts remove attendance" on public.event_attendees;
create policy "cohosts remove attendance" on public.event_attendees
for delete to authenticated using (private.is_event_cohost(event_id, auth.uid()));

-- Co-hosts can view and maintain the protected exact location for an event they manage.
drop policy if exists "cohosts read exact locations" on public.event_locations;
create policy "cohosts read exact locations" on public.event_locations
for select to authenticated using (private.is_event_cohost(event_id, auth.uid()));

drop policy if exists "cohosts create exact locations" on public.event_locations;
create policy "cohosts create exact locations" on public.event_locations
for insert to authenticated with check (private.is_event_cohost(event_id, auth.uid()));

drop policy if exists "cohosts update exact locations" on public.event_locations;
create policy "cohosts update exact locations" on public.event_locations
for update to authenticated
using (private.is_event_cohost(event_id, auth.uid()))
with check (private.is_event_cohost(event_id, auth.uid()));

drop policy if exists "cohosts delete exact locations" on public.event_locations;
create policy "cohosts delete exact locations" on public.event_locations
for delete to authenticated using (private.is_event_cohost(event_id, auth.uid()));

-- ============================================================
-- EVENT SHARES INSIDE DMS
-- ============================================================
create table if not exists public.message_event_shares (
  message_id uuid primary key references public.messages(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists message_event_shares_event_idx on public.message_event_shares(event_id);
alter table public.message_event_shares enable row level security;
grant select, insert on public.message_event_shares to authenticated;
revoke all on public.message_event_shares from anon;

drop policy if exists "conversation members read event shares" on public.message_event_shares;
create policy "conversation members read event shares" on public.message_event_shares
for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_id
      and private.is_conversation_member(m.conversation_id)
  )
  and private.can_view_event(event_id)
);

drop policy if exists "senders attach visible events" on public.message_event_shares;
create policy "senders attach visible events" on public.message_event_shares
for insert to authenticated
with check (
  private.can_view_event(event_id)
  and exists (
    select 1 from public.messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
      and private.is_conversation_member(m.conversation_id)
  )
);

-- ============================================================
-- IN-APP NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  post_id uuid references public.feed_posts(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_type_check check (type in (
    'follow','friend','reaction','comment','tag','event_approved','event_invite','message'
  ))
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);
alter table public.notifications enable row level security;

-- Clients may read/delete their own rows, but may not forge or mutate notification payloads.
grant select, delete on public.notifications to authenticated;
revoke insert, update on public.notifications from authenticated;
revoke all on public.notifications from anon;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "users mark own notifications" on public.notifications;
drop policy if exists "users delete own notifications" on public.notifications;
create policy "users delete own notifications" on public.notifications
for delete to authenticated using (user_id = auth.uid());

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = auth.uid();
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- Follow / friend notifications.
create or replace function private.notify_follow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare reciprocal boolean;
begin
  select exists(
    select 1 from public.follows f
    where f.follower_id = new.following_id and f.following_id = new.follower_id
  ) into reciprocal;

  if reciprocal then
    insert into public.notifications(user_id, actor_id, type)
    values
      (new.following_id, new.follower_id, 'friend'),
      (new.follower_id, new.following_id, 'friend');
  else
    insert into public.notifications(user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$;

-- Reactions, comments and tags.
create or replace function private.notify_feed_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target uuid;
begin
  if tg_op = 'UPDATE' and old.reaction is not distinct from new.reaction then
    return new;
  end if;
  select fp.author_id into target from public.feed_posts fp where fp.id = new.post_id;
  if target is not null and target <> new.user_id then
    insert into public.notifications(user_id, actor_id, type, post_id)
    values (target, new.user_id, 'reaction', new.post_id);
  end if;
  return new;
end;
$$;

create or replace function private.notify_feed_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target uuid;
begin
  select fp.author_id into target from public.feed_posts fp where fp.id = new.post_id;
  if target is not null and target <> new.author_id then
    insert into public.notifications(user_id, actor_id, type, post_id)
    values (target, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$;

create or replace function private.notify_feed_tag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id <> new.tagged_by then
    insert into public.notifications(user_id, actor_id, type, post_id)
    values (new.user_id, new.tagged_by, 'tag', new.post_id);
  end if;
  return new;
end;
$$;

-- Event approval/invite notifications.
create or replace function private.notify_event_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid;
begin
  actor := auth.uid();
  if actor is null then
    select e.host_id into actor from public.events e where e.id = new.event_id;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'requested'
     and new.status in ('going','invited') then
    if new.user_id <> actor then
      insert into public.notifications(user_id, actor_id, type, event_id)
      values (new.user_id, actor, 'event_approved', new.event_id);
    end if;
  elsif tg_op = 'INSERT' and new.status = 'invited' then
    if new.user_id <> actor then
      insert into public.notifications(user_id, actor_id, type, event_id)
      values (new.user_id, actor, 'event_invite', new.event_id);
    end if;
  end if;
  return new;
end;
$$;

-- New direct-message notifications.
create or replace function private.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare recipient uuid;
begin
  for recipient in
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.sender_id
  loop
    insert into public.notifications(user_id, actor_id, type, message_id)
    values (recipient, new.sender_id, 'message', new.id);
  end loop;
  return new;
end;
$$;

revoke all on function private.notify_follow_change() from public;
revoke all on function private.notify_feed_reaction() from public;
revoke all on function private.notify_feed_comment() from public;
revoke all on function private.notify_feed_tag() from public;
revoke all on function private.notify_event_attendance_change() from public;
revoke all on function private.notify_new_message() from public;

drop trigger if exists follows_notify_insert on public.follows;
create trigger follows_notify_insert after insert on public.follows
for each row execute function private.notify_follow_change();

drop trigger if exists feed_reactions_notify_change on public.feed_reactions;
create trigger feed_reactions_notify_change after insert or update of reaction on public.feed_reactions
for each row execute function private.notify_feed_reaction();

drop trigger if exists feed_comments_notify_insert on public.feed_comments;
create trigger feed_comments_notify_insert after insert on public.feed_comments
for each row execute function private.notify_feed_comment();

drop trigger if exists feed_tags_notify_insert on public.feed_post_tags;
create trigger feed_tags_notify_insert after insert on public.feed_post_tags
for each row execute function private.notify_feed_tag();

drop trigger if exists event_attendees_notify_change on public.event_attendees;
create trigger event_attendees_notify_change after insert or update of status on public.event_attendees
for each row execute function private.notify_event_attendance_change();

drop trigger if exists messages_notify_insert on public.messages;
create trigger messages_notify_insert after insert on public.messages
for each row execute function private.notify_new_message();

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
do $$
begin
  begin alter publication supabase_realtime add table public.follows; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.saved_events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.event_cohosts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.message_event_shares; exception when duplicate_object then null; end;
end $$;

select 'FOMO V6 social backend installed' as status;

-- ============================================================
-- V6 REAL EVENT DATES (calendar picker instead of Fri/Sat/Sun)
-- ============================================================
alter table public.events add column if not exists event_date date;

with legacy as (
  select id,
         (created_at at time zone 'America/Regina')::date as local_created,
         case day when 'Monday' then 1 when 'Tuesday' then 2 when 'Wednesday' then 3
                  when 'Thursday' then 4 when 'Friday' then 5 when 'Saturday' then 6
                  when 'Sunday' then 0 else null end as target_dow
  from public.events
  where event_date is null
)
update public.events e
set event_date = case
  when e.day = 'Tonight' then l.local_created
  when l.target_dow is not null then l.local_created + (((l.target_dow - extract(dow from l.local_created)::int) + 7) % 7)
  else l.local_created
end
from legacy l
where e.id = l.id;

alter table public.events alter column event_date set not null;
create index if not exists events_university_date_idx on public.events(university_id,event_date,created_at desc);
alter table public.events drop constraint if exists events_day_check;

-- Keep old V5.2 event creation working during the V6 transition. If a legacy
-- client omits event_date, derive it from the old `day` value before NOT NULL checks.
create or replace function private.sync_event_calendar_fields()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_today date := (now() at time zone 'America/Regina')::date;
  v_target_dow int;
begin
  if new.event_date is null then
    if new.day = 'Tonight' then
      new.event_date := v_today;
    else
      v_target_dow := case new.day
        when 'Monday' then 1 when 'Tuesday' then 2 when 'Wednesday' then 3
        when 'Thursday' then 4 when 'Friday' then 5 when 'Saturday' then 6
        when 'Sunday' then 0 else null end;
      if v_target_dow is null then
        new.event_date := v_today;
      else
        new.event_date := v_today + (((v_target_dow - extract(dow from v_today)::int) + 7) % 7);
      end if;
    end if;
  end if;
  new.day := trim(to_char(new.event_date,'FMDay'));
  new.date_label := upper(to_char(new.event_date,'Dy · Mon DD'));
  return new;
end;
$$;
revoke all on function private.sync_event_calendar_fields() from public;
drop trigger if exists events_sync_calendar_fields on public.events;
create trigger events_sync_calendar_fields
before insert or update of event_date, day on public.events
for each row execute function private.sync_event_calendar_fields();

update public.events
set day = trim(to_char(event_date,'FMDay')),
    date_label = upper(to_char(event_date,'Dy · Mon DD'))
where event_date is not null;

create or replace function public.create_fomo_event_v6(
  p_title text,
  p_category text,
  p_event_date date,
  p_time_label text,
  p_location_label text,
  p_description text,
  p_privacy text,
  p_cover_url text,
  p_latitude double precision,
  p_longitude double precision,
  p_precise_address text,
  p_precise_latitude double precision,
  p_precise_longitude double precision
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_university uuid;
  v_status text;
  v_event uuid;
  v_public_lat double precision;
  v_public_lng double precision;
  v_day text;
  v_date_label text;
begin
  if v_user is null then raise exception 'FOMO_AUTH_REQUIRED: You must be signed in to create an event.'; end if;
  perform public.ensure_fomo_profile();
  select p.university_id,p.account_status into v_university,v_status from public.profiles p where p.id=v_user;
  if v_university is null then raise exception 'FOMO_PROFILE_MISSING: Your FOMO profile could not be loaded.'; end if;
  if v_status <> 'active' then raise exception 'FOMO_ACCOUNT_INACTIVE: This account cannot create events.'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'FOMO_TITLE_REQUIRED: Event name is required.'; end if;
  if p_event_date is null then raise exception 'FOMO_DATE_REQUIRED: Choose a date for the event.'; end if;
  if p_event_date < (now() at time zone 'America/Regina')::date then raise exception 'FOMO_DATE_IN_PAST: Choose today or a future date.'; end if;
  if p_event_date > ((now() at time zone 'America/Regina')::date + 366) then raise exception 'FOMO_DATE_TOO_FAR: Events can be scheduled up to one year ahead.'; end if;
  if p_privacy not in ('public','request','private') then raise exception 'FOMO_INVALID_PRIVACY: Invalid event privacy.'; end if;
  if p_precise_latitude is null or p_precise_longitude is null then raise exception 'FOMO_LOCATION_REQUIRED: Drop a pin for the event location.'; end if;

  v_day := trim(to_char(p_event_date,'FMDay'));
  v_date_label := upper(to_char(p_event_date,'Dy · Mon DD'));
  if p_privacy='public' then
    v_public_lat:=p_precise_latitude; v_public_lng:=p_precise_longitude;
  else
    v_public_lat:=round(p_precise_latitude::numeric,3)::double precision;
    v_public_lng:=round(p_precise_longitude::numeric,3)::double precision;
  end if;

  insert into public.events(
    university_id,host_id,title,category,day,event_date,date_label,time_label,
    location_label,description,privacy,cover_url,latitude,longitude
  ) values (
    v_university,v_user,trim(p_title),coalesce(nullif(trim(p_category),''),'Other'),v_day,p_event_date,v_date_label,
    coalesce(nullif(trim(p_time_label),''),'TBD'),coalesce(nullif(trim(p_location_label),''),'USask Campus'),
    nullif(trim(coalesce(p_description,'')),''),p_privacy,p_cover_url,v_public_lat,v_public_lng
  ) returning id into v_event;

  insert into public.event_attendees(event_id,user_id,status)
  values(v_event,v_user,'going')
  on conflict(event_id,user_id) do update set status='going',updated_at=now();

  insert into public.event_locations(event_id,precise_address,precise_latitude,precise_longitude)
  values(v_event,nullif(trim(coalesce(p_precise_address,'')),''),p_precise_latitude,p_precise_longitude)
  on conflict(event_id) do update set
    precise_address=excluded.precise_address,
    precise_latitude=excluded.precise_latitude,
    precise_longitude=excluded.precise_longitude,
    updated_at=now();
  return v_event;
exception when others then
  raise log 'FOMO V6 create event failed user=% title=% date=% privacy=% sqlstate=% message=%',v_user,left(coalesce(p_title,''),80),p_event_date,p_privacy,sqlstate,sqlerrm;
  raise;
end;
$$;
revoke all on function public.create_fomo_event_v6(text,text,date,text,text,text,text,text,double precision,double precision,text,double precision,double precision) from public;
grant execute on function public.create_fomo_event_v6(text,text,date,text,text,text,text,text,double precision,double precision,text,double precision,double precision) to authenticated;

-- Co-hosts are authorized event viewers too, without changing private-location
-- visibility for anyone else.
create or replace function private.can_view_event(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1 from public.events e
    where e.id=target_event
      and e.university_id=private.current_university_id()
      and e.status='active'
      and (
        e.privacy in ('public','request')
        or e.host_id=auth.uid()
        or exists(select 1 from public.event_cohosts ec where ec.event_id=e.id and ec.user_id=auth.uid())
        or exists(select 1 from public.event_attendees ea where ea.event_id=e.id and ea.user_id=auth.uid() and ea.status in ('going','invited'))
      )
  );
$$;
revoke all on function private.can_view_event(uuid) from public;
grant execute on function private.can_view_event(uuid) to authenticated;

select 'FOMO V6 complete backend patch installed' as status;

-- ============================================================
-- V6 RPC SECURITY HARDENING
-- ============================================================
revoke execute on function public.create_fomo_event(text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision) from anon;
revoke execute on function public.create_fomo_event_v6(text,text,date,text,text,text,text,text,double precision,double precision,text,double precision,double precision) from anon;
revoke execute on function public.ensure_fomo_profile() from anon;
revoke execute on function public.get_feed_post_view_counts(uuid[]) from anon;
revoke execute on function public.get_my_profile_view_count() from anon;
revoke execute on function public.get_or_create_direct_conversation(uuid) from anon;
revoke execute on function public.get_profile_social_stats(uuid) from anon;
revoke execute on function public.mark_all_notifications_read() from anon;
revoke execute on function public.mark_notification_read(uuid) from anon;
revoke execute on function public.record_feed_post_view(uuid) from anon;
revoke execute on function public.record_profile_view(uuid) from anon;

grant execute on function public.create_fomo_event(text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision) to authenticated;
grant execute on function public.create_fomo_event_v6(text,text,date,text,text,text,text,text,double precision,double precision,text,double precision,double precision) to authenticated;
grant execute on function public.ensure_fomo_profile() to authenticated;
grant execute on function public.get_feed_post_view_counts(uuid[]) to authenticated;
grant execute on function public.get_my_profile_view_count() to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.get_profile_social_stats(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.record_feed_post_view(uuid) to authenticated;
grant execute on function public.record_profile_view(uuid) to authenticated;
