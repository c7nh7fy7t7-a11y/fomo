-- FOMO V6.2 — Speed, Discovery & Daily Use
-- Additive security-first migration. Does not remove V6/V6.1 data.

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null default 'unknown' check (platform in ('ios','android','unknown')),
  device_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists user_push_tokens_user_idx on public.user_push_tokens(user_id);
alter table public.user_push_tokens enable row level security;
drop policy if exists "users read own push tokens" on public.user_push_tokens;
create policy "users read own push tokens" on public.user_push_tokens for select using (user_id=auth.uid());
drop policy if exists "users register own push tokens" on public.user_push_tokens;
create policy "users register own push tokens" on public.user_push_tokens for insert with check (user_id=auth.uid());
drop policy if exists "users update own push tokens" on public.user_push_tokens;
create policy "users update own push tokens" on public.user_push_tokens for update using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "users remove own push tokens" on public.user_push_tokens;
create policy "users remove own push tokens" on public.user_push_tokens for delete using (user_id=auth.uid());

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  messages boolean not null default true,
  social boolean not null default true,
  events boolean not null default true,
  reminders boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
drop policy if exists "users read own notification preferences" on public.notification_preferences;
create policy "users read own notification preferences" on public.notification_preferences for select using (user_id=auth.uid());
drop policy if exists "users create own notification preferences" on public.notification_preferences;
create policy "users create own notification preferences" on public.notification_preferences for insert with check (user_id=auth.uid());
drop policy if exists "users update own notification preferences" on public.notification_preferences;
create policy "users update own notification preferences" on public.notification_preferences for update using (user_id=auth.uid()) with check (user_id=auth.uid());

create table if not exists public.user_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest text not null check (interest in ('parties','sports','clubs','study','campus','music','social','gaming')),
  created_at timestamptz not null default now(),
  primary key (user_id, interest)
);
create index if not exists user_interests_interest_idx on public.user_interests(interest);
alter table public.user_interests enable row level security;
drop policy if exists "users read own interests" on public.user_interests;
create policy "users read own interests" on public.user_interests for select using (user_id=auth.uid());
drop policy if exists "users add own interests" on public.user_interests;
create policy "users add own interests" on public.user_interests for insert with check (user_id=auth.uid());
drop policy if exists "users remove own interests" on public.user_interests;
create policy "users remove own interests" on public.user_interests for delete using (user_id=auth.uid());

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
alter table public.user_blocks enable row level security;
drop policy if exists "users read blocks they created" on public.user_blocks;
create policy "users read blocks they created" on public.user_blocks for select using (blocker_id=auth.uid());
drop policy if exists "users block as self" on public.user_blocks;
create policy "users block as self" on public.user_blocks for insert with check (blocker_id=auth.uid() and blocked_id<>auth.uid());
drop policy if exists "users unblock as self" on public.user_blocks;
create policy "users unblock as self" on public.user_blocks for delete using (blocker_id=auth.uid());

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user','post','event')),
  target_user_id uuid references public.profiles(id) on delete set null,
  target_post_id uuid references public.feed_posts(id) on delete set null,
  target_event_id uuid references public.events(id) on delete set null,
  reason text not null check (reason in ('spam','harassment','inappropriate','fake_event','safety','other')),
  details text check (details is null or char_length(details)<=1000),
  status text not null default 'open' check (status in ('open','reviewing','closed')),
  created_at timestamptz not null default now(),
  check (
    (target_type='user' and target_user_id is not null and target_post_id is null and target_event_id is null)
    or (target_type='post' and target_post_id is not null and target_user_id is null and target_event_id is null)
    or (target_type='event' and target_event_id is not null and target_user_id is null and target_post_id is null)
  )
);
create index if not exists reports_reporter_idx on public.reports(reporter_id,created_at desc);
create index if not exists reports_status_idx on public.reports(status,created_at desc);
alter table public.reports enable row level security;
drop policy if exists "users create own reports" on public.reports;
create policy "users create own reports" on public.reports for insert with check (reporter_id=auth.uid());
drop policy if exists "users read own reports" on public.reports;
create policy "users read own reports" on public.reports for select using (reporter_id=auth.uid());

create table if not exists public.organizer_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,32}$'),
  bio text check (bio is null or char_length(bio)<=300),
  avatar_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizer_profiles_university_idx on public.organizer_profiles(university_id);
alter table public.organizer_profiles enable row level security;
drop policy if exists "campus reads organizer profiles" on public.organizer_profiles;
create policy "campus reads organizer profiles" on public.organizer_profiles for select using (
  university_id=private.current_university_id() and private.same_campus_profile(profile_id)
);
drop policy if exists "organizers update own metadata" on public.organizer_profiles;
create policy "organizers update own metadata" on public.organizer_profiles for update using (profile_id=auth.uid()) with check (profile_id=auth.uid() and university_id=private.current_university_id());
-- Deliberately no authenticated INSERT/DELETE policy: organizer accounts are provisioned by trusted admin/backend operations.

create table if not exists public.event_social_invites (
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id,sender_id,recipient_id),
  check (sender_id<>recipient_id)
);
create index if not exists event_social_invites_recipient_idx on public.event_social_invites(recipient_id,created_at desc);
alter table public.event_social_invites enable row level security;
drop policy if exists "participants read social invites" on public.event_social_invites;
create policy "participants read social invites" on public.event_social_invites for select using (sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists "users invite visible campus people" on public.event_social_invites;
create policy "users invite visible campus people" on public.event_social_invites for insert with check (
  sender_id=auth.uid()
  and recipient_id<>auth.uid()
  and private.same_campus_profile(recipient_id)
  and private.can_view_event(event_id)
  and exists(select 1 from public.events e where e.id=event_id and e.privacy in ('public','request') and e.status='active')
);
drop policy if exists "senders remove social invites" on public.event_social_invites;
create policy "senders remove social invites" on public.event_social_invites for delete using (sender_id=auth.uid());

create or replace function private.is_blocked_between(a uuid,b uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select case when a is null or b is null or a=b then false else exists(
    select 1 from public.user_blocks ub
    where (ub.blocker_id=a and ub.blocked_id=b) or (ub.blocker_id=b and ub.blocked_id=a)
  ) end;
$$;
revoke all on function private.is_blocked_between(uuid,uuid) from public,anon,authenticated;

create or replace function private.same_campus_profile(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1
    from public.profiles target
    join public.profiles me on me.id=auth.uid()
    where target.id=p_user
      and target.account_status='active'
      and target.onboarding_completed=true
      and target.university_id=me.university_id
      and not private.is_blocked_between(auth.uid(),p_user)
  );
$$;

create or replace function private.can_view_event(target_event uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.events e
    where e.id=target_event
      and e.university_id=private.current_university_id()
      and e.status='active'
      and not private.is_blocked_between(auth.uid(),e.host_id)
      and (
        e.privacy in ('public','request')
        or e.host_id=auth.uid()
        or exists(select 1 from public.event_cohosts ec where ec.event_id=e.id and ec.user_id=auth.uid())
        or exists(select 1 from public.event_attendees ea where ea.event_id=e.id and ea.user_id=auth.uid() and ea.status in ('going','invited'))
      )
  );
$$;

create or replace function private.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.conversation_members mine
    where mine.conversation_id=p_conversation and mine.user_id=auth.uid()
  ) and not exists(
    select 1 from public.conversation_members other
    where other.conversation_id=p_conversation
      and other.user_id<>auth.uid()
      and private.is_blocked_between(auth.uid(),other.user_id)
  );
$$;

create or replace function public.get_or_create_direct_conversation(p_peer uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_me uuid:=auth.uid();
  v_conversation uuid;
begin
  if v_me is null then raise exception 'FOMO_AUTH_REQUIRED'; end if;
  if p_peer is null or p_peer=v_me then raise exception 'FOMO_INVALID_PEER'; end if;
  if private.is_blocked_between(v_me,p_peer) then raise exception 'FOMO_UNAVAILABLE'; end if;
  if not private.same_campus_profile(p_peer) then raise exception 'FOMO_INVALID_PEER'; end if;
  perform pg_advisory_xact_lock(hashtext(least(v_me::text,p_peer::text)||':'||greatest(v_me::text,p_peer::text)));
  select cm.conversation_id into v_conversation
  from public.conversation_members cm
  where cm.user_id=v_me
    and exists(select 1 from public.conversation_members peer where peer.conversation_id=cm.conversation_id and peer.user_id=p_peer)
    and 2=(select count(*) from public.conversation_members allm where allm.conversation_id=cm.conversation_id)
  limit 1;
  if v_conversation is null then
    insert into public.conversations default values returning id into v_conversation;
    insert into public.conversation_members(conversation_id,user_id) values(v_conversation,v_me),(v_conversation,p_peer);
  end if;
  return v_conversation;
end;
$$;
revoke all on function public.get_or_create_direct_conversation(uuid) from public,anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

create or replace function private.cleanup_social_graph_on_block()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  delete from public.follows
  where (follower_id=new.blocker_id and following_id=new.blocked_id)
     or (follower_id=new.blocked_id and following_id=new.blocker_id);
  return new;
end;
$$;
drop trigger if exists user_blocks_cleanup_social_graph on public.user_blocks;
create trigger user_blocks_cleanup_social_graph after insert on public.user_blocks for each row execute function private.cleanup_social_graph_on_block();

create or replace function private.notify_social_event_invite()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(user_id,actor_id,type,event_id)
  values(new.recipient_id,new.sender_id,'event_invite',new.event_id);
  return new;
end;
$$;
drop trigger if exists event_social_invites_notify on public.event_social_invites;
create trigger event_social_invites_notify after insert on public.event_social_invites for each row execute function private.notify_social_event_invite();

-- Tighten existing campus visibility around blocks.
drop policy if exists "same campus can read completed profiles" on public.profiles;
create policy "same campus can read completed profiles" on public.profiles for select using (
  account_status='active'
  and (
    id=auth.uid()
    or (onboarding_completed=true and university_id=private.current_university_id() and not private.is_blocked_between(auth.uid(),id))
  )
);

drop policy if exists "visible campus events" on public.events;
create policy "visible campus events" on public.events for select using (
  university_id=private.current_university_id()
  and status='active'
  and not private.is_blocked_between(auth.uid(),host_id)
  and (
    privacy in ('public','request')
    or host_id=auth.uid()
    or exists(select 1 from public.event_cohosts ec where ec.event_id=events.id and ec.user_id=auth.uid())
    or exists(select 1 from public.event_attendees ea where ea.event_id=events.id and ea.user_id=auth.uid() and ea.status in ('going','invited'))
  )
);

-- Ensure verification remains backend-controlled.
revoke insert,update,delete on public.profile_verifications from authenticated,anon;

-- Useful grants for new user-owned tables.
grant select,insert,update,delete on public.user_push_tokens to authenticated;
grant select,insert,update on public.notification_preferences to authenticated;
grant select,insert,delete on public.user_interests to authenticated;
grant select,insert,delete on public.user_blocks to authenticated;
grant select,insert on public.reports to authenticated;
grant select,update on public.organizer_profiles to authenticated;
grant select,insert,delete on public.event_social_invites to authenticated;

-- V6.2 follow-up: privacy-safe blocked-user settings helper.
create or replace function public.get_my_blocked_profiles()
returns table(id uuid, full_name text, username text, avatar_url text)
language sql stable security definer set search_path='' as $$
  select p.id,p.full_name,p.username,p.avatar_url
  from public.user_blocks ub
  join public.profiles p on p.id=ub.blocked_id
  where ub.blocker_id=auth.uid()
  order by ub.created_at desc;
$$;
revoke all on function public.get_my_blocked_profiles() from public,anon;
grant execute on function public.get_my_blocked_profiles() to authenticated;

-- V6.2 follow-up: private event invitations are real attendance invitations.
create or replace function public.invite_people_to_private_event(p_event_id uuid,p_recipient_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare v_me uuid:=auth.uid(); v_recipient uuid; v_count integer:=0;begin
 if v_me is null then raise exception 'FOMO_AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.events e where e.id=p_event_id and e.status='active' and e.privacy='private' and (e.host_id=v_me or exists(select 1 from public.event_cohosts ec where ec.event_id=e.id and ec.user_id=v_me))) then raise exception 'FOMO_NOT_EVENT_MANAGER'; end if;
 foreach v_recipient in array coalesce(p_recipient_ids,array[]::uuid[]) loop
   if v_recipient<>v_me and private.same_campus_profile(v_recipient) and not private.is_blocked_between(v_me,v_recipient) then
     insert into public.event_attendees(event_id,user_id,status) values(p_event_id,v_recipient,'invited')
     on conflict(event_id,user_id) do update set status='invited',updated_at=now();
     v_count:=v_count+1;
   end if;
 end loop;
 return v_count;
end;$$;
revoke all on function public.invite_people_to_private_event(uuid,uuid[]) from public,anon;
grant execute on function public.invite_people_to_private_event(uuid,uuid[]) to authenticated;

-- RLS policies call the private block helper. It remains outside the exposed public schema,
-- but authenticated policy evaluation must be able to execute it.
grant execute on function private.is_blocked_between(uuid,uuid) to authenticated;

-- V6.2 follow-up: least-privilege grants for new API tables.
revoke all on public.user_push_tokens from authenticated,anon;
grant select,insert,update,delete on public.user_push_tokens to authenticated;

revoke all on public.notification_preferences from authenticated,anon;
grant select,insert,update on public.notification_preferences to authenticated;

revoke all on public.user_interests from authenticated,anon;
grant select,insert,delete on public.user_interests to authenticated;

revoke all on public.user_blocks from authenticated,anon;
grant select,insert,delete on public.user_blocks to authenticated;

revoke all on public.reports from authenticated,anon;
grant select,insert on public.reports to authenticated;

revoke all on public.organizer_profiles from authenticated,anon;
grant select,update on public.organizer_profiles to authenticated;

revoke all on public.event_social_invites from authenticated,anon;
grant select,insert,delete on public.event_social_invites to authenticated;

revoke all on public.profile_verifications from authenticated,anon;
grant select on public.profile_verifications to authenticated;
