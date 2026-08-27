
-- FOMO V5: feed, tagging, reactions, comments, views, direct messages,
-- exact map pin support, storage security, and realtime.
-- Run once in Supabase SQL Editor AFTER the V4 patch.

begin;

create schema if not exists private;

-- ---------- Existing event creation: keep exact coordinates protected ----------
create or replace function public.create_fomo_event(
  p_title text,
  p_category text,
  p_day text,
  p_date_label text,
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
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_university uuid;
  v_status text;
  v_event uuid;
  v_public_lat double precision;
  v_public_lng double precision;
begin
  if v_user is null then
    raise exception 'FOMO_AUTH_REQUIRED: You must be signed in to create an event.';
  end if;

  perform public.ensure_fomo_profile();

  select p.university_id, p.account_status
    into v_university, v_status
  from public.profiles p
  where p.id = v_user;

  if v_university is null then
    raise exception 'FOMO_PROFILE_MISSING: Your FOMO profile could not be loaded.';
  end if;
  if v_status <> 'active' then
    raise exception 'FOMO_ACCOUNT_INACTIVE: This account cannot create events.';
  end if;

  if nullif(trim(p_title), '') is null then raise exception 'FOMO_TITLE_REQUIRED: Event name is required.'; end if;
  if p_day not in ('Tonight','Friday','Saturday','Sunday') then raise exception 'FOMO_INVALID_DAY: Invalid event day.'; end if;
  if p_privacy not in ('public','request','private') then raise exception 'FOMO_INVALID_PRIVACY: Invalid event privacy.'; end if;
  if p_precise_latitude is null or p_precise_longitude is null then
    raise exception 'FOMO_LOCATION_REQUIRED: Drop a pin for the event location.';
  end if;

  -- Public events may publish the exact pin. Request/private events only expose
  -- a coarse ~100m pin. Exact coordinates remain in event_locations under RLS.
  if p_privacy = 'public' then
    v_public_lat := p_precise_latitude;
    v_public_lng := p_precise_longitude;
  else
    v_public_lat := round(p_precise_latitude::numeric, 3)::double precision;
    v_public_lng := round(p_precise_longitude::numeric, 3)::double precision;
  end if;

  insert into public.events (
    university_id, host_id, title, category, day, date_label, time_label,
    location_label, description, privacy, cover_url, latitude, longitude
  ) values (
    v_university, v_user, trim(p_title), coalesce(nullif(trim(p_category), ''), 'Other'),
    p_day, p_date_label, coalesce(nullif(trim(p_time_label), ''), 'TBD'),
    coalesce(nullif(trim(p_location_label), ''), 'USask Campus'),
    nullif(trim(coalesce(p_description, '')), ''), p_privacy, p_cover_url,
    v_public_lat, v_public_lng
  ) returning id into v_event;

  insert into public.event_attendees (event_id, user_id, status)
  values (v_event, v_user, 'going')
  on conflict (event_id, user_id)
  do update set status = 'going', updated_at = now();

  insert into public.event_locations (
    event_id, precise_address, precise_latitude, precise_longitude
  ) values (
    v_event,
    nullif(trim(coalesce(p_precise_address, '')), ''),
    p_precise_latitude,
    p_precise_longitude
  )
  on conflict (event_id) do update set
    precise_address = excluded.precise_address,
    precise_latitude = excluded.precise_latitude,
    precise_longitude = excluded.precise_longitude,
    updated_at = now();

  return v_event;
exception when others then
  raise log 'FOMO create event failed user=% title=% category=% day=% privacy=% sqlstate=% message=%',
    v_user, left(coalesce(p_title, ''), 80), p_category, p_day, p_privacy, sqlstate, sqlerrm;
  raise;
end;
$$;

revoke all on function public.create_fomo_event(text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision) from public;
grant execute on function public.create_fomo_event(text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision) to authenticated;

-- Protect existing request/private test events too: public event coordinates become coarse,
-- while exact coordinates remain in event_locations behind its existing RLS policy.
update public.events e
set latitude = round(el.precise_latitude::numeric, 3)::double precision,
    longitude = round(el.precise_longitude::numeric, 3)::double precision,
    updated_at = now()
from public.event_locations el
where el.event_id = e.id
  and e.privacy in ('request','private')
  and el.precise_latitude is not null
  and el.precise_longitude is not null;

-- ---------- Feed ----------
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_posts_created_idx on public.feed_posts(created_at desc);
create index if not exists feed_posts_author_idx on public.feed_posts(author_id, created_at desc);
create index if not exists feed_posts_event_idx on public.feed_posts(event_id, created_at desc);

create table if not exists public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists feed_post_media_post_idx on public.feed_post_media(post_id);

create table if not exists public.feed_post_tags (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tagged_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists feed_post_tags_user_idx on public.feed_post_tags(user_id, created_at desc);

create table if not exists public.feed_reactions (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('heart','fire','laugh','wow')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists feed_reactions_post_idx on public.feed_reactions(post_id);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feed_comments_post_idx on public.feed_comments(post_id, created_at asc);

create table if not exists public.feed_post_views (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.profile_views (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  primary key (profile_id, viewer_id)
);

-- ---------- Direct messages ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id, conversation_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at desc);

-- ---------- Policy helpers ----------
create or replace function private.same_campus_profile(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles target
    join public.profiles me on me.id = auth.uid()
    where target.id = p_user
      and target.account_status = 'active'
      and target.university_id = me.university_id
  );
$$;

create or replace function private.can_view_feed_post(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.feed_posts fp
    join public.profiles author on author.id = fp.author_id
    join public.profiles me on me.id = auth.uid()
    where fp.id = p_post
      and author.account_status = 'active'
      and author.university_id = me.university_id
      and (fp.event_id is null or private.can_view_event(fp.event_id))
  );
$$;

create or replace function private.is_conversation_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation
      and cm.user_id = auth.uid()
  );
$$;

revoke all on function private.same_campus_profile(uuid) from public;
revoke all on function private.can_view_feed_post(uuid) from public;
revoke all on function private.is_conversation_member(uuid) from public;
grant execute on function private.same_campus_profile(uuid) to authenticated;
grant execute on function private.can_view_feed_post(uuid) to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;

-- ---------- RLS ----------
alter table public.feed_posts enable row level security;
alter table public.feed_post_media enable row level security;
alter table public.feed_post_tags enable row level security;
alter table public.feed_reactions enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_post_views enable row level security;
alter table public.profile_views enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "campus reads feed posts" on public.feed_posts;
create policy "campus reads feed posts" on public.feed_posts
for select to authenticated
using (
  private.same_campus_profile(author_id)
  and (event_id is null or private.can_view_event(event_id))
);

drop policy if exists "users create own feed posts" on public.feed_posts;
create policy "users create own feed posts" on public.feed_posts
for insert to authenticated
with check (
  author_id = auth.uid()
  and private.same_campus_profile(author_id)
  and (event_id is null or private.can_view_event(event_id))
);

drop policy if exists "users update own feed posts" on public.feed_posts;
create policy "users update own feed posts" on public.feed_posts
for update to authenticated
using (author_id = auth.uid())
with check (
  author_id = auth.uid()
  and (event_id is null or private.can_view_event(event_id))
);

drop policy if exists "users delete own feed posts" on public.feed_posts;
create policy "users delete own feed posts" on public.feed_posts
for delete to authenticated
using (author_id = auth.uid());

drop policy if exists "campus reads feed media" on public.feed_post_media;
create policy "campus reads feed media" on public.feed_post_media
for select to authenticated
using (private.can_view_feed_post(post_id));

drop policy if exists "authors attach feed media" on public.feed_post_media;
create policy "authors attach feed media" on public.feed_post_media
for insert to authenticated
with check (exists (
  select 1 from public.feed_posts fp
  where fp.id = post_id and fp.author_id = auth.uid()
));

drop policy if exists "authors delete feed media" on public.feed_post_media;
create policy "authors delete feed media" on public.feed_post_media
for delete to authenticated
using (exists (
  select 1 from public.feed_posts fp
  where fp.id = post_id and fp.author_id = auth.uid()
));

drop policy if exists "campus reads feed tags" on public.feed_post_tags;
create policy "campus reads feed tags" on public.feed_post_tags
for select to authenticated
using (private.can_view_feed_post(post_id));

drop policy if exists "authors add feed tags" on public.feed_post_tags;
create policy "authors add feed tags" on public.feed_post_tags
for insert to authenticated
with check (
  tagged_by = auth.uid()
  and private.same_campus_profile(user_id)
  and exists (select 1 from public.feed_posts fp where fp.id = post_id and fp.author_id = auth.uid())
);

drop policy if exists "authors or tagged users remove feed tags" on public.feed_post_tags;
create policy "authors or tagged users remove feed tags" on public.feed_post_tags
for delete to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.feed_posts fp where fp.id = post_id and fp.author_id = auth.uid())
);

drop policy if exists "campus reads feed reactions" on public.feed_reactions;
create policy "campus reads feed reactions" on public.feed_reactions
for select to authenticated
using (private.can_view_feed_post(post_id));

drop policy if exists "users react as self" on public.feed_reactions;
create policy "users react as self" on public.feed_reactions
for insert to authenticated
with check (user_id = auth.uid() and private.can_view_feed_post(post_id));

drop policy if exists "users change own reaction" on public.feed_reactions;
create policy "users change own reaction" on public.feed_reactions
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and private.can_view_feed_post(post_id));

drop policy if exists "users remove own reaction" on public.feed_reactions;
create policy "users remove own reaction" on public.feed_reactions
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "campus reads feed comments" on public.feed_comments;
create policy "campus reads feed comments" on public.feed_comments
for select to authenticated
using (private.can_view_feed_post(post_id));

drop policy if exists "users add own comments" on public.feed_comments;
create policy "users add own comments" on public.feed_comments
for insert to authenticated
with check (author_id = auth.uid() and private.can_view_feed_post(post_id));

drop policy if exists "users update own comments" on public.feed_comments;
create policy "users update own comments" on public.feed_comments
for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid() and private.can_view_feed_post(post_id));

drop policy if exists "users delete own comments" on public.feed_comments;
create policy "users delete own comments" on public.feed_comments
for delete to authenticated
using (author_id = auth.uid());

-- Raw viewer identities are intentionally not exposed through the Data API.
-- The app receives aggregate counts only through the SECURITY DEFINER RPCs below.
drop policy if exists "viewers and authors read view rows" on public.feed_post_views;
drop policy if exists "profile owners read profile views" on public.profile_views;

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations
for select to authenticated
using (private.is_conversation_member(id));

drop policy if exists "members read conversation members" on public.conversation_members;
create policy "members read conversation members" on public.conversation_members
for select to authenticated
using (private.is_conversation_member(conversation_id));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages
for select to authenticated
using (private.is_conversation_member(conversation_id));

drop policy if exists "members send messages as self" on public.messages;
create policy "members send messages as self" on public.messages
for insert to authenticated
with check (sender_id = auth.uid() and private.is_conversation_member(conversation_id));

drop policy if exists "senders delete own messages" on public.messages;
create policy "senders delete own messages" on public.messages
for delete to authenticated
using (sender_id = auth.uid());

-- ---------- Secure RPCs for aggregate views + DM creation ----------
create or replace function public.record_feed_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.can_view_feed_post(p_post_id) then
    return;
  end if;
  insert into public.feed_post_views(post_id, user_id, last_viewed_at)
  values (p_post_id, auth.uid(), now())
  on conflict (post_id, user_id)
  do update set last_viewed_at = excluded.last_viewed_at;
end;
$$;

create or replace function public.get_feed_post_view_counts(p_post_ids uuid[])
returns table(post_id uuid, view_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.post_id, count(*)::bigint
  from public.feed_post_views v
  where v.post_id = any(p_post_ids)
    and private.can_view_feed_post(v.post_id)
  group by v.post_id;
$$;

create or replace function public.record_profile_view(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_profile_id is null or p_profile_id = auth.uid() then return; end if;
  if not private.same_campus_profile(p_profile_id) then return; end if;

  insert into public.profile_views(profile_id, viewer_id, last_viewed_at)
  values (p_profile_id, auth.uid(), now())
  on conflict (profile_id, viewer_id)
  do update set last_viewed_at = excluded.last_viewed_at;
end;
$$;

create or replace function public.get_my_profile_view_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint from public.profile_views where profile_id = auth.uid();
$$;

create or replace function public.get_or_create_direct_conversation(p_peer uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_conversation uuid;
begin
  if v_me is null then raise exception 'FOMO_AUTH_REQUIRED'; end if;
  if p_peer is null or p_peer = v_me then raise exception 'FOMO_INVALID_PEER'; end if;
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
$$;

revoke all on function public.record_feed_post_view(uuid) from public;
revoke all on function public.get_feed_post_view_counts(uuid[]) from public;
revoke all on function public.record_profile_view(uuid) from public;
revoke all on function public.get_my_profile_view_count() from public;
revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.record_feed_post_view(uuid) to authenticated;
grant execute on function public.get_feed_post_view_counts(uuid[]) to authenticated;
grant execute on function public.record_profile_view(uuid) to authenticated;
grant execute on function public.get_my_profile_view_count() to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

grant select, insert, update, delete on public.feed_posts to authenticated;
grant select, insert, delete on public.feed_post_media to authenticated;
grant select, insert, delete on public.feed_post_tags to authenticated;
grant select, insert, update, delete on public.feed_reactions to authenticated;
grant select, insert, update, delete on public.feed_comments to authenticated;
revoke all on public.feed_post_views from authenticated;
revoke all on public.profile_views from authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant select, insert, delete on public.messages to authenticated;

-- ---------- Feed media bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feed-media', 'feed-media', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own feed media" on storage.objects;
create policy "users upload own feed media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'feed-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.feed_posts fp
    where fp.id = ((storage.foldername(name))[2])::uuid
      and fp.author_id = auth.uid()
  )
);

drop policy if exists "campus reads authorized feed media" on storage.objects;
create policy "campus reads authorized feed media" on storage.objects
for select to authenticated
using (
  bucket_id = 'feed-media'
  and private.can_view_feed_post(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "owners delete own feed media" on storage.objects;
create policy "owners delete own feed media" on storage.objects
for delete to authenticated
using (
  bucket_id = 'feed-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------- Realtime ----------
do $$
declare
  t text;
begin
  foreach t in array array['feed_posts','feed_post_media','feed_post_tags','feed_reactions','feed_comments','messages']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;

select 'FOMO V5 social + map migration installed' as status;
