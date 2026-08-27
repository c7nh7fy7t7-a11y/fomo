-- FOMO real-backend alpha
-- Run this once in a NEW Supabase project's SQL Editor.
-- It creates the USask beta community, open-email accounts, profiles, events, RSVPs,
-- join approvals, private event locations/photos, and RLS rules that protect user data.

create extension if not exists pgcrypto;

-- Keep privileged helper/trigger functions out of the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  city text not null,
  region text not null,
  country text not null,
  latitude double precision not null,
  longitude double precision not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.university_domains (
  domain text primary key,
  university_id uuid not null references public.universities(id) on delete cascade
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  email_domain text not null,
  full_name text not null,
  username text not null unique,
  graduation_year text,
  program text,
  avatar_url text,
  account_status text not null default 'active' check (account_status in ('active','suspended','banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  category text not null,
  day text not null check (day in ('Tonight','Friday','Saturday','Sunday')),
  date_label text not null,
  time_label text not null,
  location_label text not null,
  description text,
  privacy text not null default 'request' check (privacy in ('public','request','private')),
  cover_url text,
  latitude double precision not null,
  longitude double precision not null,
  trending boolean not null default false,
  status text not null default 'active' check (status in ('active','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exact addresses are separated from the public event row on purpose.
create table if not exists public.event_locations (
  event_id uuid primary key references public.events(id) on delete cascade,
  precise_address text,
  precise_latitude double precision,
  precise_longitude double precision,
  updated_at timestamptz not null default now()
);

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('going','requested','invited','rejected','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique
  on public.friendships ((least(requester_id, addressee_id)), (greatest(requester_id, addressee_id)));

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists events_university_created_idx on public.events(university_id, created_at desc);
create index if not exists event_attendees_user_idx on public.event_attendees(user_id, status);
create index if not exists event_photos_event_idx on public.event_photos(event_id, created_at desc);
create index if not exists friendships_requester_idx on public.friendships(requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);

-- First campus
insert into public.universities (id, name, short_name, city, region, country, latitude, longitude, active)
values ('11111111-1111-1111-1111-111111111111', 'University of Saskatchewan', 'USask', 'Saskatoon', 'Saskatchewan', 'Canada', 52.1332, -106.6278, true)
on conflict (id) do update set active = excluded.active;

insert into public.university_domains (domain, university_id) values
  ('usask.ca', '11111111-1111-1111-1111-111111111111'),
  ('mail.usask.ca', '11111111-1111-1111-1111-111111111111')
on conflict (domain) do update set university_id = excluded.university_id;

-- Helper functions live in a private schema and run as the database owner so
-- RLS policies can safely ask authorization questions without recursion.
create or replace function private.current_university_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select university_id from public.profiles where id = auth.uid();
$$;

create or replace function private.is_event_host(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.events where id = target_event and host_id = auth.uid());
$$;

create or replace function private.can_view_event(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and (
        e.privacy in ('public','request')
        or e.host_id = auth.uid()
        or exists (
          select 1 from public.event_attendees ea
          where ea.event_id = e.id and ea.user_id = auth.uid() and ea.status in ('going','invited')
        )
      )
  );
$$;

create or replace function private.can_view_event_photos(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and (
        e.privacy = 'public'
        or e.host_id = auth.uid()
        or exists (
          select 1 from public.event_attendees ea
          where ea.event_id = e.id and ea.user_id = auth.uid() and ea.status in ('going','invited')
        )
      )
  );
$$;

create or replace function private.can_upload_event_photo(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and (
        e.host_id = auth.uid()
        or exists (
          select 1 from public.event_attendees ea
          where ea.event_id = e.id and ea.user_id = auth.uid() and ea.status in ('going','invited')
        )
      )
  );
$$;

-- Beta onboarding: any verified email may create an account.
-- Until multi-campus onboarding ships, new accounts join the USask test community.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text;
  v_university uuid := '11111111-1111-1111-1111-111111111111';
  v_username text;
  v_name text;
begin
  v_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if v_name is null then v_name := split_part(new.email, '@', 1); end if;

  insert into public.profiles (id, university_id, email_domain, full_name, username, graduation_year, program)
  values (
    new.id,
    v_university,
    v_domain,
    v_name,
    v_username,
    nullif(new.raw_user_meta_data ->> 'graduation_year', ''),
    nullif(new.raw_user_meta_data ->> 'program', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- Force every event into the host's university regardless of what the client sends.
create or replace function private.set_event_university()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.host_id <> auth.uid() then
    raise exception 'Host must match signed-in user.';
  end if;
  new.university_id := private.current_university_id();
  return new;
end;
$$;

drop trigger if exists set_event_university_trigger on public.events;
create trigger set_event_university_trigger
  before insert on public.events
  for each row execute procedure private.set_event_university();


create or replace function private.can_set_attendance(target_event uuid, target_status text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and (
        (e.host_id = (select auth.uid()) and target_status = 'going')
        or (e.privacy = 'public' and target_status = 'going')
        or (e.privacy = 'request' and target_status = 'requested')
      )
  );
$$;

-- Function execution privileges.
-- RLS policies call these helpers, but they are not exposed as public RPC endpoints.
revoke all on function private.current_university_id() from public, anon;
revoke all on function private.is_event_host(uuid) from public, anon;
revoke all on function private.can_view_event(uuid) from public, anon;
revoke all on function private.can_view_event_photos(uuid) from public, anon;
revoke all on function private.can_upload_event_photo(uuid) from public, anon;
revoke all on function private.can_set_attendance(uuid, text) from public, anon;

grant execute on function private.current_university_id() to authenticated;
grant execute on function private.is_event_host(uuid) to authenticated;
grant execute on function private.can_view_event(uuid) to authenticated;
grant execute on function private.can_view_event_photos(uuid) to authenticated;
grant execute on function private.can_upload_event_photo(uuid) to authenticated;
grant execute on function private.can_set_attendance(uuid, text) to authenticated;

-- Trigger functions should not be callable directly by client roles.
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_event_university() from public, anon, authenticated;

-- RLS
alter table public.universities enable row level security;
alter table public.university_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_locations enable row level security;
alter table public.event_attendees enable row level security;
alter table public.friendships enable row level security;
alter table public.event_photos enable row level security;

-- Universities/domain lookup
DROP POLICY IF EXISTS "authenticated can read universities" ON public.universities;
CREATE POLICY "authenticated can read universities" ON public.universities FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "authenticated can read domains" ON public.university_domains;
CREATE POLICY "authenticated can read domains" ON public.university_domains FOR SELECT TO authenticated USING (true);

-- Profiles: only active students from your own university are discoverable.
DROP POLICY IF EXISTS "same campus can read profiles" ON public.profiles;
CREATE POLICY "same campus can read profiles" ON public.profiles FOR SELECT TO authenticated
USING (university_id = private.current_university_id() and account_status = 'active');
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() and university_id = private.current_university_id());

-- Events
DROP POLICY IF EXISTS "visible campus events" ON public.events;
CREATE POLICY "visible campus events" ON public.events FOR SELECT TO authenticated
USING (
  university_id = private.current_university_id()
  and status = 'active'
  and (
    privacy in ('public','request')
    or host_id = (select auth.uid())
    or exists (
      select 1 from public.event_attendees ea
      where ea.event_id = events.id
        and ea.user_id = (select auth.uid())
        and ea.status in ('going','invited')
    )
  )
);
DROP POLICY IF EXISTS "users create own events" ON public.events;
CREATE POLICY "users create own events" ON public.events FOR INSERT TO authenticated
WITH CHECK (host_id = auth.uid() and university_id = private.current_university_id());
DROP POLICY IF EXISTS "hosts update events" ON public.events;
CREATE POLICY "hosts update events" ON public.events FOR UPDATE TO authenticated
USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid() and university_id = private.current_university_id());
DROP POLICY IF EXISTS "hosts delete events" ON public.events;
CREATE POLICY "hosts delete events" ON public.events FOR DELETE TO authenticated
USING (host_id = auth.uid());

-- Exact locations: host + approved/invited attendees only.
DROP POLICY IF EXISTS "authorized users read exact locations" ON public.event_locations;
CREATE POLICY "authorized users read exact locations" ON public.event_locations FOR SELECT TO authenticated
USING (
  private.is_event_host(event_id)
  or exists (select 1 from public.event_attendees ea where ea.event_id = event_locations.event_id and ea.user_id = auth.uid() and ea.status in ('going','invited'))
);
DROP POLICY IF EXISTS "hosts create exact locations" ON public.event_locations;
CREATE POLICY "hosts create exact locations" ON public.event_locations FOR INSERT TO authenticated
WITH CHECK (private.is_event_host(event_id));
DROP POLICY IF EXISTS "hosts update exact locations" ON public.event_locations;
CREATE POLICY "hosts update exact locations" ON public.event_locations FOR UPDATE TO authenticated
USING (private.is_event_host(event_id)) WITH CHECK (private.is_event_host(event_id));
DROP POLICY IF EXISTS "hosts delete exact locations" ON public.event_locations;
CREATE POLICY "hosts delete exact locations" ON public.event_locations FOR DELETE TO authenticated
USING (private.is_event_host(event_id));

-- RSVPs / join requests
DROP POLICY IF EXISTS "event attendees visible appropriately" ON public.event_attendees;
CREATE POLICY "event attendees visible appropriately" ON public.event_attendees FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  or private.is_event_host(event_id)
  or (status in ('going','invited') and private.can_view_event(event_id))
);
DROP POLICY IF EXISTS "students join or request themselves" ON public.event_attendees;
CREATE POLICY "students join or request themselves" ON public.event_attendees FOR INSERT TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  and (select private.can_set_attendance(event_id, status))
);
DROP POLICY IF EXISTS "hosts manage attendee status" ON public.event_attendees;
CREATE POLICY "hosts manage attendee status" ON public.event_attendees FOR UPDATE TO authenticated
USING (private.is_event_host(event_id)) WITH CHECK (private.is_event_host(event_id));
DROP POLICY IF EXISTS "users or hosts remove attendance" ON public.event_attendees;
CREATE POLICY "users or hosts remove attendance" ON public.event_attendees FOR DELETE TO authenticated
USING (user_id = auth.uid() or private.is_event_host(event_id));

-- Friendships
DROP POLICY IF EXISTS "users read own friendships" ON public.friendships;
CREATE POLICY "users read own friendships" ON public.friendships FOR SELECT TO authenticated
USING (requester_id = auth.uid() or addressee_id = auth.uid());
DROP POLICY IF EXISTS "users send same-campus friend requests" ON public.friendships;
CREATE POLICY "users send same-campus friend requests" ON public.friendships FOR INSERT TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.profiles target
    where target.id = addressee_id
      and target.university_id = private.current_university_id()
      and target.account_status = 'active'
  )
);
DROP POLICY IF EXISTS "recipient answers friend requests" ON public.friendships;
CREATE POLICY "recipient answers friend requests" ON public.friendships FOR UPDATE TO authenticated
USING (addressee_id = auth.uid() and status = 'pending')
WITH CHECK (addressee_id = auth.uid() and status in ('accepted','declined'));
DROP POLICY IF EXISTS "participants delete friendships" ON public.friendships;
CREATE POLICY "participants delete friendships" ON public.friendships FOR DELETE TO authenticated
USING (requester_id = auth.uid() or addressee_id = auth.uid());

-- Photo metadata
DROP POLICY IF EXISTS "authorized users read photo rows" ON public.event_photos;
CREATE POLICY "authorized users read photo rows" ON public.event_photos FOR SELECT TO authenticated
USING (private.can_view_event_photos(event_id));
DROP POLICY IF EXISTS "attendees add photo rows" ON public.event_photos;
CREATE POLICY "attendees add photo rows" ON public.event_photos FOR INSERT TO authenticated
WITH CHECK (uploader_id = auth.uid() and private.can_upload_event_photo(event_id));
DROP POLICY IF EXISTS "users delete own photo rows" ON public.event_photos;
CREATE POLICY "users delete own photo rows" ON public.event_photos FOR DELETE TO authenticated
USING (uploader_id = auth.uid());

-- Table privileges (new Supabase projects are moving toward explicit grants).
grant usage on schema public to authenticated;
grant select on public.universities, public.university_domains, public.profiles, public.events, public.event_locations, public.event_attendees, public.friendships, public.event_photos to authenticated;
grant insert, update, delete on public.profiles, public.events, public.event_locations, public.event_attendees, public.friendships, public.event_photos to authenticated;

-- Storage buckets. Avatars and event covers are public; photo dumps are private.
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('event-covers', 'event-covers', true),
  ('event-photos', 'event-photos', false)
on conflict (id) do update set public = excluded.public;

DROP POLICY IF EXISTS "users upload own avatars" ON storage.objects;
CREATE POLICY "users upload own avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "users update own avatars" ON storage.objects;
CREATE POLICY "users update own avatars" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "users delete own avatars" ON storage.objects;
CREATE POLICY "users delete own avatars" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users upload own event covers" ON storage.objects;
CREATE POLICY "users upload own event covers" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-covers' and (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "users update own event covers" ON storage.objects;
CREATE POLICY "users update own event covers" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-covers' and (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "users delete own event covers" ON storage.objects;
CREATE POLICY "users delete own event covers" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-covers' and (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authorized users read event photo objects" ON storage.objects;
CREATE POLICY "authorized users read event photo objects" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'event-photos'
  and private.can_view_event_photos(((storage.foldername(name))[1])::uuid)
);
DROP POLICY IF EXISTS "attendees upload event photo objects" ON storage.objects;
CREATE POLICY "attendees upload event photo objects" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
  and private.can_upload_event_photo(((storage.foldername(name))[1])::uuid)
);
DROP POLICY IF EXISTS "users delete own event photo objects" ON storage.objects;
CREATE POLICY "users delete own event photo objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-photos' and (storage.foldername(name))[2] = auth.uid()::text);

-- Enable realtime for the social actions used in this alpha.
do $$
declare
  t text;
begin
  foreach t in array array['profiles','events','event_attendees','friendships','event_photos']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ===== Stability fixes included for new installs =====
-- FOMO Stage 3 stability patch
-- Safe to run on the EXISTING FOMO Supabase project.
-- Fixes the bugs found during live testing:
--   - signup 500s caused by duplicate usernames in the auth trigger
--   - event creation leaving a half-created event when host RSVP/location failed
--   - event + attendee RLS hotfixes
-- Run once in Supabase -> SQL Editor -> New query.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- 1) Robust open-email profile creation.
-- If a requested username already exists, keep signup alive by adding a short
-- user-specific suffix rather than crashing the entire auth transaction.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text;
  v_university uuid := '11111111-1111-1111-1111-111111111111';
  v_base_username text;
  v_username text;
  v_name text;
  v_suffix text;
begin
  v_domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  v_base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1), 'student'),
    '[^a-z0-9_]', '', 'g'
  ));

  if coalesce(v_base_username, '') = '' then
    v_base_username := 'student';
  end if;

  v_base_username := left(v_base_username, 24);
  v_username := v_base_username;
  v_suffix := left(replace(new.id::text, '-', ''), 6);

  if exists (select 1 from public.profiles p where lower(p.username) = lower(v_username)) then
    v_username := left(v_base_username, 17) || '_' || v_suffix;
  end if;

  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if v_name is null then
    v_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  if v_name is null then
    v_name := 'FOMO Student';
  end if;

  insert into public.profiles (
    id, university_id, email_domain, full_name, username, graduation_year, program
  ) values (
    new.id,
    v_university,
    v_domain,
    v_name,
    v_username,
    nullif(new.raw_user_meta_data ->> 'graduation_year', ''),
    nullif(new.raw_user_meta_data ->> 'program', '')
  );

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- 2) Event read policy used by the feed and INSERT/RETURNING paths.
drop policy if exists "visible campus events" on public.events;
create policy "visible campus events"
on public.events
for select
to authenticated
using (
  university_id = private.current_university_id()
  and status = 'active'
  and (
    privacy in ('public','request')
    or host_id = (select auth.uid())
    or exists (
      select 1
      from public.event_attendees ea
      where ea.event_id = events.id
        and ea.user_id = (select auth.uid())
        and ea.status in ('going','invited')
    )
  )
);

-- 3) Keep attendee authorization outside event_attendees' own RLS path.
create or replace function private.can_set_attendance(target_event uuid, target_status text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event
      and e.university_id = private.current_university_id()
      and e.status = 'active'
      and (
        (e.host_id = (select auth.uid()) and target_status = 'going')
        or (e.privacy = 'public' and target_status = 'going')
        or (e.privacy = 'request' and target_status = 'requested')
      )
  );
$$;

revoke all on function private.can_set_attendance(uuid, text) from public, anon;
grant execute on function private.can_set_attendance(uuid, text) to authenticated;

drop policy if exists "students join or request themselves" on public.event_attendees;
create policy "students join or request themselves"
on public.event_attendees
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_set_attendance(event_id, status))
);

drop policy if exists "hosts manage attendee status" on public.event_attendees;
create policy "hosts manage attendee status"
on public.event_attendees
for update
to authenticated
using (private.is_event_host(event_id))
with check (private.is_event_host(event_id));

drop policy if exists "users or hosts remove attendance" on public.event_attendees;
create policy "users or hosts remove attendance"
on public.event_attendees
for delete
to authenticated
using (user_id = (select auth.uid()) or private.is_event_host(event_id));

-- 4) Atomic event creation.
-- One transaction creates the event, adds the host as Going, and stores the
-- protected address. If any part fails, none of it is left behind.
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
  v_event uuid;
begin
  if v_user is null then
    raise exception 'You must be signed in to create an event.';
  end if;

  select p.university_id
  into v_university
  from public.profiles p
  where p.id = v_user and p.account_status = 'active';

  if v_university is null then
    raise exception 'Your FOMO profile is missing or inactive.';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Event name is required.';
  end if;
  if p_day not in ('Tonight','Friday','Saturday','Sunday') then
    raise exception 'Invalid event day.';
  end if;
  if p_privacy not in ('public','request','private') then
    raise exception 'Invalid event privacy.';
  end if;

  insert into public.events (
    university_id, host_id, title, category, day, date_label, time_label,
    location_label, description, privacy, cover_url, latitude, longitude
  ) values (
    v_university, v_user, trim(p_title), p_category, p_day, p_date_label,
    p_time_label, p_location_label, nullif(trim(coalesce(p_description, '')), ''),
    p_privacy, p_cover_url, p_latitude, p_longitude
  ) returning id into v_event;

  insert into public.event_attendees (event_id, user_id, status)
  values (v_event, v_user, 'going');

  if nullif(trim(coalesce(p_precise_address, '')), '') is not null then
    insert into public.event_locations (
      event_id, precise_address, precise_latitude, precise_longitude
    ) values (
      v_event, trim(p_precise_address), p_precise_latitude, p_precise_longitude
    );
  end if;

  return v_event;
end;
$$;

revoke all on function public.create_fomo_event(
  text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision
) from public, anon;
grant execute on function public.create_fomo_event(
  text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision
) to authenticated;

-- Repair any old events that were created before the host-attendee insert failed.
insert into public.event_attendees (event_id, user_id, status)
select e.id, e.host_id, 'going'
from public.events e
left join public.event_attendees ea
  on ea.event_id = e.id and ea.user_id = e.host_id
where ea.event_id is null
on conflict (event_id, user_id) do nothing;

select 'FOMO stability patch installed' as result;

-- ===== V4 multi-user reliability upgrade =====
-- FOMO V4 stability + multi-user event creation patch
-- Run once on the EXISTING FOMO Supabase project.
-- Goal: every authenticated active profile can create an event reliably.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Self-heal a profile for older/test accounts that authenticated successfully
-- but never received the matching public.profiles row.
create or replace function public.ensure_fomo_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_name text;
  v_base text;
  v_username text;
  v_suffix text;
  v_university uuid := '11111111-1111-1111-1111-111111111111';
begin
  if v_user is null then
    raise exception 'FOMO_AUTH_REQUIRED: You must be signed in.';
  end if;

  if exists (select 1 from public.profiles p where p.id = v_user) then
    return v_user;
  end if;

  select u.email,
         nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
         lower(regexp_replace(
           coalesce(u.raw_user_meta_data ->> 'username', split_part(coalesce(u.email, ''), '@', 1), 'student'),
           '[^a-z0-9_]', '', 'g'
         ))
    into v_email, v_name, v_base
  from auth.users u
  where u.id = v_user;

  if v_email is null then
    raise exception 'FOMO_PROFILE_MISSING: Could not recover your account profile.';
  end if;

  if v_name is null then v_name := split_part(v_email, '@', 1); end if;
  if coalesce(v_base, '') = '' then v_base := 'student'; end if;
  v_suffix := left(replace(v_user::text, '-', ''), 10);
  v_username := left(v_base, 13) || '_' || v_suffix;

  insert into public.profiles (
    id, university_id, email_domain, full_name, username, graduation_year, program, account_status
  )
  select
    v_user,
    v_university,
    lower(split_part(v_email, '@', 2)),
    coalesce(v_name, 'FOMO Student'),
    v_username,
    nullif(u.raw_user_meta_data ->> 'graduation_year', ''),
    nullif(u.raw_user_meta_data ->> 'program', ''),
    'active'
  from auth.users u
  where u.id = v_user
  on conflict (id) do nothing;

  return v_user;
end;
$$;

revoke all on function public.ensure_fomo_profile() from public, anon;
grant execute on function public.ensure_fomo_profile() to authenticated;

-- Small caller-only diagnostic RPC for debugging create failures without exposing
-- another user's profile data.
create or replace function public.fomo_create_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'auth_user_id', auth.uid(),
    'profile_exists', exists(select 1 from public.profiles p where p.id = auth.uid()),
    'profile_id', (select p.id from public.profiles p where p.id = auth.uid()),
    'university_id', (select p.university_id from public.profiles p where p.id = auth.uid()),
    'account_status', (select p.account_status from public.profiles p where p.id = auth.uid()),
    'username', (select p.username from public.profiles p where p.id = auth.uid())
  );
$$;

revoke all on function public.fomo_create_context() from public, anon;
grant execute on function public.fomo_create_context() to authenticated;

-- Replace the event/attendance policies we touched while debugging so there is
-- one clear version of each policy.
drop policy if exists "visible campus events" on public.events;
create policy "visible campus events"
on public.events
for select
to authenticated
using (
  university_id = private.current_university_id()
  and status = 'active'
  and (
    privacy in ('public','request')
    or host_id = (select auth.uid())
    or exists (
      select 1 from public.event_attendees ea
      where ea.event_id = events.id
        and ea.user_id = (select auth.uid())
        and ea.status in ('going','invited')
    )
  )
);

drop policy if exists "users create own events" on public.events;
create policy "users create own events"
on public.events
for insert
to authenticated
with check (
  host_id = (select auth.uid())
  and university_id = private.current_university_id()
);

drop policy if exists "hosts update events" on public.events;
create policy "hosts update events"
on public.events
for update
to authenticated
using (host_id = (select auth.uid()))
with check (host_id = (select auth.uid()) and university_id = private.current_university_id());

drop policy if exists "students join or request themselves" on public.event_attendees;
create policy "students join or request themselves"
on public.event_attendees
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_set_attendance(event_id, status))
);

drop policy if exists "hosts manage attendee status" on public.event_attendees;
create policy "hosts manage attendee status"
on public.event_attendees
for update
to authenticated
using (private.is_event_host(event_id))
with check (private.is_event_host(event_id));

drop policy if exists "users or hosts remove attendance" on public.event_attendees;
create policy "users or hosts remove attendance"
on public.event_attendees
for delete
to authenticated
using (user_id = (select auth.uid()) or private.is_event_host(event_id));

-- Atomic event creation. Core event + host RSVP + protected location either all
-- succeed or all roll back. Cover upload is deliberately not part of this RPC;
-- the mobile client attaches it afterward so a photo-storage failure can never
-- prevent a valid event from being created.
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

  insert into public.events (
    university_id, host_id, title, category, day, date_label, time_label,
    location_label, description, privacy, cover_url, latitude, longitude
  ) values (
    v_university, v_user, trim(p_title), coalesce(nullif(trim(p_category), ''), 'Other'),
    p_day, p_date_label, coalesce(nullif(trim(p_time_label), ''), 'TBD'),
    coalesce(nullif(trim(p_location_label), ''), 'USask Campus'),
    nullif(trim(coalesce(p_description, '')), ''), p_privacy, p_cover_url,
    p_latitude, p_longitude
  ) returning id into v_event;

  insert into public.event_attendees (event_id, user_id, status)
  values (v_event, v_user, 'going')
  on conflict (event_id, user_id) do update set status = 'going', updated_at = now();

  if nullif(trim(coalesce(p_precise_address, '')), '') is not null then
    insert into public.event_locations (event_id, precise_address, precise_latitude, precise_longitude)
    values (v_event, trim(p_precise_address), p_precise_latitude, p_precise_longitude)
    on conflict (event_id) do update set
      precise_address = excluded.precise_address,
      precise_latitude = excluded.precise_latitude,
      precise_longitude = excluded.precise_longitude,
      updated_at = now();
  end if;

  return v_event;
exception when others then
  raise log 'FOMO create event failed user=% title=% category=% day=% privacy=% sqlstate=% message=%',
    v_user, left(coalesce(p_title, ''), 80), p_category, p_day, p_privacy, sqlstate, sqlerrm;
  raise;
end;
$$;

revoke all on function public.create_fomo_event(
  text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision
) from public, anon;
grant execute on function public.create_fomo_event(
  text,text,text,text,text,text,text,text,text,double precision,double precision,text,double precision,double precision
) to authenticated;

-- Explicit grants for new-project Data API behavior.
grant usage on schema public to authenticated;
grant select on public.profiles, public.events, public.event_locations, public.event_attendees, public.friendships, public.event_photos to authenticated;
grant insert, update, delete on public.profiles, public.events, public.event_locations, public.event_attendees, public.friendships, public.event_photos to authenticated;

-- Repair older active events whose host row was missing.
insert into public.event_attendees (event_id, user_id, status)
select e.id, e.host_id, 'going'
from public.events e
left join public.event_attendees ea on ea.event_id = e.id and ea.user_id = e.host_id
where e.status = 'active' and ea.event_id is null
on conflict (event_id, user_id) do nothing;

select 'FOMO V4 multi-user patch installed' as result;
