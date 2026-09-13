-- Weekly Rotation: reusable weekly definitions with a bounded window of real
-- event occurrences. Existing events remain one-time when recurring_series_id
-- is null. Exact recurring locations stay in a separate, non-client-readable
-- table and are copied into the existing RLS-protected event_locations table.

create table public.recurring_event_series (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  category text not null,
  location_label text not null,
  description text,
  privacy text not null default 'public' check (privacy in ('public', 'request', 'private')),
  cover_url text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  recurrence_type text not null default 'weekly' check (recurrence_type in ('weekly')),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time without time zone not null,
  end_time time without time zone,
  recurrence_start_date date not null,
  recurrence_end_date date,
  timezone text not null default 'America/Regina',
  active boolean not null default true,
  is_curated boolean not null default false,
  is_weekly_staple boolean not null default false,
  sort_priority integer not null default 0,
  verification_status text not null default 'unverified'
    check (verification_status in ('verified', 'community_confirmed', 'seasonal', 'unverified', 'inactive')),
  verified_at timestamptz,
  source_url text,
  source_note text check (source_note is null or char_length(source_note) <= 500),
  seasonal_note text check (seasonal_note is null or char_length(seasonal_note) <= 300),
  verification_review_after date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recurrence_end_date is null or recurrence_end_date >= recurrence_start_date),
  check (not is_weekly_staple or is_curated),
  check (verification_status <> 'inactive' or not active),
  check (source_url is null or source_url ~* '^https://')
);

-- Exact addresses and coordinates are deliberately absent from the exposed
-- series row. There is no authenticated grant or permissive policy on this
-- table; the bounded generator is the only client-triggered reader.
create table public.recurring_event_series_locations (
  series_id uuid primary key references public.recurring_event_series(id) on delete cascade,
  precise_address text,
  precise_latitude double precision check (precise_latitude is null or precise_latitude between -90 and 90),
  precise_longitude double precision check (precise_longitude is null or precise_longitude between -180 and 180),
  updated_at timestamptz not null default now(),
  check (
    (precise_latitude is null and precise_longitude is null)
    or (precise_latitude is not null and precise_longitude is not null)
  )
);

alter table public.events
  add column if not exists recurring_series_id uuid references public.recurring_event_series(id) on delete set null,
  add column if not exists occurrence_starts_at timestamptz,
  add column if not exists occurrence_ends_at timestamptz,
  add column if not exists recurrence_generation_status text
    check (recurrence_generation_status in ('scheduled', 'series_paused'));

alter table public.events
  drop constraint if exists events_recurring_occurrence_shape_check;
alter table public.events
  add constraint events_recurring_occurrence_shape_check check (
    recurring_series_id is null
    or (occurrence_starts_at is not null and recurrence_generation_status is not null)
  );

create unique index recurring_event_series_identity_unique
  on public.recurring_event_series (
    university_id,
    lower(title),
    lower(location_label),
    day_of_week,
    start_time
  )
  where active;

create index recurring_event_series_active_schedule_idx
  on public.recurring_event_series (university_id, day_of_week, start_time, sort_priority desc)
  where active and recurrence_type = 'weekly' and verification_status <> 'inactive';

create index recurring_event_series_review_idx
  on public.recurring_event_series (university_id, verification_review_after)
  where active and is_curated;

create unique index events_recurring_series_date_unique
  on public.events (recurring_series_id, event_date)
  where recurring_series_id is not null;

create index events_recurring_series_start_idx
  on public.events (recurring_series_id, occurrence_starts_at)
  where recurring_series_id is not null;

create or replace function private.validate_recurring_event_series()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names tz where tz.name = new.timezone
  ) then
    raise exception using errcode = '22023', message = 'FOMO_INVALID_TIMEZONE';
  end if;

  if new.verification_status in ('verified', 'community_confirmed')
     and new.verified_at is null then
    raise exception using errcode = '23514', message = 'FOMO_VERIFICATION_DATE_REQUIRED';
  end if;

  if new.active and new.is_curated and new.verification_review_after is null then
    raise exception using errcode = '23514', message = 'FOMO_VERIFICATION_REVIEW_REQUIRED';
  end if;

  new.title := trim(new.title);
  new.category := coalesce(nullif(trim(new.category), ''), 'Other');
  new.location_label := coalesce(nullif(trim(new.location_label), ''), 'Saskatoon');
  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.source_url := nullif(trim(coalesce(new.source_url, '')), '');
  new.source_note := nullif(trim(coalesce(new.source_note, '')), '');
  new.seasonal_note := nullif(trim(coalesce(new.seasonal_note, '')), '');
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.validate_recurring_event_series() from public, anon, authenticated;

drop trigger if exists recurring_event_series_validate on public.recurring_event_series;
create trigger recurring_event_series_validate
before insert or update on public.recurring_event_series
for each row execute function private.validate_recurring_event_series();

create or replace function private.can_view_recurring_event_series(target_series uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.recurring_event_series s
    where s.id = target_series
      and s.university_id = private.current_university_id()
      and not private.is_blocked_between((select auth.uid()), s.host_id)
      and (
        (s.active and s.verification_status <> 'inactive' and s.privacy in ('public', 'request'))
        or s.host_id = (select auth.uid())
        or exists (
          select 1
          from public.events e
          where e.recurring_series_id = s.id
            and (
              private.is_event_cohost(e.id, (select auth.uid()))
              or exists (
                select 1
                from public.event_attendees ea
                where ea.event_id = e.id
                  and ea.user_id = (select auth.uid())
                  and ea.status in ('going', 'invited')
              )
            )
        )
      )
  );
$function$;

revoke all on function private.can_view_recurring_event_series(uuid) from public, anon;
grant execute on function private.can_view_recurring_event_series(uuid) to authenticated;

alter table public.recurring_event_series enable row level security;
alter table public.recurring_event_series_locations enable row level security;

drop policy if exists "active accounts only" on public.recurring_event_series;
create policy "active accounts only"
on public.recurring_event_series
as restrictive
for all
to authenticated
using ((select private.is_active_account()))
with check ((select private.is_active_account()));

drop policy if exists "view visible recurring event series" on public.recurring_event_series;
create policy "view visible recurring event series"
on public.recurring_event_series
for select
to authenticated
using ((select private.can_view_recurring_event_series(id)));

drop policy if exists "active accounts only" on public.recurring_event_series_locations;
create policy "active accounts only"
on public.recurring_event_series_locations
as restrictive
for all
to authenticated
using ((select private.is_active_account()))
with check ((select private.is_active_account()));

revoke all on table public.recurring_event_series from public, anon, authenticated;
grant select on table public.recurring_event_series to authenticated;
revoke all on table public.recurring_event_series_locations from public, anon, authenticated;

-- Generate only the recent four-day posting window plus at most 42 future
-- days. Every occurrence is a normal public.events row, so existing RSVP,
-- posts, photos, sharing, maps, and private-location policies remain in force.
create or replace function public.refresh_weekly_event_occurrences(p_horizon_days integer default 35)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_active_account();
  v_university uuid;
  v_horizon integer := least(greatest(coalesce(p_horizon_days, 35), 7), 42);
  v_series record;
  v_local_today date;
  v_window_start date;
  v_window_end date;
  v_occurrence_date date;
  v_occurrence_starts_at timestamptz;
  v_occurrence_ends_at timestamptz;
  v_event_id uuid;
  v_available integer := 0;
begin
  select p.university_id into v_university
  from public.profiles p
  where p.id = v_user and p.account_status = 'active';

  if v_university is null then
    raise exception using errcode = '42501', message = 'FOMO_ACCOUNT_INACTIVE';
  end if;

  -- A paused or retired series cannot leave future generated events visible.
  -- Historical occurrences remain available for their posts and memories.
  update public.events e
  set status = 'cancelled',
      recurrence_generation_status = 'series_paused',
      updated_at = now()
  from public.recurring_event_series s
  where s.id = e.recurring_series_id
    and s.university_id = v_university
    and e.event_date >= (now() at time zone s.timezone)::date
    and e.status = 'active'
    and (
      not s.active
      or s.verification_status = 'inactive'
      or e.event_date < s.recurrence_start_date
      or (s.recurrence_end_date is not null and e.event_date > s.recurrence_end_date)
    );

  for v_series in
    select s.*
    from public.recurring_event_series s
    join public.profiles host on host.id = s.host_id
    where s.university_id = v_university
      and s.active
      and s.verification_status <> 'inactive'
      and s.recurrence_type = 'weekly'
      and host.account_status = 'active'
  loop
    v_local_today := (now() at time zone v_series.timezone)::date;
    v_window_start := greatest(v_series.recurrence_start_date, v_local_today - 4);
    v_window_end := least(
      coalesce(v_series.recurrence_end_date, v_local_today + v_horizon),
      v_local_today + v_horizon
    );

    if v_window_start > v_window_end then
      continue;
    end if;

    for v_occurrence_date in
      select generated_day::date
      from generate_series(v_window_start::timestamp, v_window_end::timestamp, interval '1 day') generated_day
      where extract(isodow from generated_day)::smallint = v_series.day_of_week
    loop
      v_occurrence_starts_at :=
        (v_occurrence_date + v_series.start_time) at time zone v_series.timezone;
      v_occurrence_ends_at := case
        when v_series.end_time is null then null
        when v_series.end_time >= v_series.start_time then
          (v_occurrence_date + v_series.end_time) at time zone v_series.timezone
        else
          ((v_occurrence_date + 1) + v_series.end_time) at time zone v_series.timezone
      end;
      v_event_id := null;

      insert into public.events (
        university_id,
        host_id,
        title,
        category,
        day,
        event_date,
        date_label,
        time_label,
        location_label,
        description,
        privacy,
        cover_url,
        latitude,
        longitude,
        trending,
        status,
        recurring_series_id,
        occurrence_starts_at,
        occurrence_ends_at,
        recurrence_generation_status
      ) values (
        v_series.university_id,
        v_series.host_id,
        v_series.title,
        v_series.category,
        trim(to_char(v_occurrence_date, 'FMDay')),
        v_occurrence_date,
        upper(to_char(v_occurrence_date, 'Dy · Mon DD')),
        to_char(v_occurrence_date + v_series.start_time, 'FMHH12:MI AM'),
        v_series.location_label,
        v_series.description,
        v_series.privacy,
        v_series.cover_url,
        v_series.latitude,
        v_series.longitude,
        false,
        'active',
        v_series.id,
        v_occurrence_starts_at,
        v_occurrence_ends_at,
        'scheduled'
      )
      on conflict (recurring_series_id, event_date)
        where recurring_series_id is not null
      do update set
        host_id = excluded.host_id,
        title = excluded.title,
        category = excluded.category,
        time_label = excluded.time_label,
        location_label = excluded.location_label,
        description = excluded.description,
        privacy = excluded.privacy,
        cover_url = excluded.cover_url,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        occurrence_starts_at = excluded.occurrence_starts_at,
        occurrence_ends_at = excluded.occurrence_ends_at,
        status = case
          when public.events.recurrence_generation_status = 'series_paused' then 'active'
          else public.events.status
        end,
        recurrence_generation_status = 'scheduled',
        updated_at = now()
      where public.events.recurrence_generation_status = 'series_paused'
         or row(
           public.events.host_id,
           public.events.title,
           public.events.category,
           public.events.time_label,
           public.events.location_label,
           public.events.description,
           public.events.privacy,
           public.events.cover_url,
           public.events.latitude,
           public.events.longitude,
           public.events.occurrence_starts_at,
           public.events.occurrence_ends_at
         ) is distinct from row(
           excluded.host_id,
           excluded.title,
           excluded.category,
           excluded.time_label,
           excluded.location_label,
           excluded.description,
           excluded.privacy,
           excluded.cover_url,
           excluded.latitude,
           excluded.longitude,
           excluded.occurrence_starts_at,
           excluded.occurrence_ends_at
         )
      returning id into v_event_id;

      if v_event_id is null then
        select e.id into v_event_id
        from public.events e
        where e.recurring_series_id = v_series.id
          and e.event_date = v_occurrence_date;
      end if;

      -- Curated venue listings are owned operationally by FOMO, not hosted by
      -- the curator in person. Do not fabricate attendance for those rows.
      if not v_series.is_curated then
        insert into public.event_attendees (event_id, user_id, status)
        values (v_event_id, v_series.host_id, 'going')
        on conflict (event_id, user_id) do nothing;
      end if;

      insert into public.event_locations (
        event_id,
        precise_address,
        precise_latitude,
        precise_longitude
      )
      select
        v_event_id,
        source_location.precise_address,
        source_location.precise_latitude,
        source_location.precise_longitude
      from public.recurring_event_series_locations source_location
      where source_location.series_id = v_series.id
      on conflict (event_id) do update set
        precise_address = excluded.precise_address,
        precise_latitude = excluded.precise_latitude,
        precise_longitude = excluded.precise_longitude,
        updated_at = now()
      where row(
        public.event_locations.precise_address,
        public.event_locations.precise_latitude,
        public.event_locations.precise_longitude
      ) is distinct from row(
        excluded.precise_address,
        excluded.precise_latitude,
        excluded.precise_longitude
      );

      v_available := v_available + 1;
    end loop;
  end loop;

  return v_available;
end;
$function$;

revoke all on function public.refresh_weekly_event_occurrences(integer) from public, anon;
grant execute on function public.refresh_weekly_event_occurrences(integer) to authenticated;

comment on table public.recurring_event_series is
  'Reusable recurrence definitions. Existing public.events rows are one-time; generated weekly dates are real events linked through recurring_series_id.';
comment on column public.recurring_event_series.day_of_week is
  'ISO day of week: Monday=1 through Sunday=7.';
comment on column public.recurring_event_series.verified_at is
  'Date and time when the source was last checked by a human curator.';
comment on column public.recurring_event_series.verification_review_after is
  'Operational due date for stale-record detection. Curators can filter active rows where this date is before current_date.';
comment on function public.refresh_weekly_event_occurrences(integer) is
  'Idempotently maintains a recent-four-day plus bounded-future window of weekly event occurrences for the caller campus.';
