-- Run against a non-production database after applying the Weekly Rotation
-- migration. All temporary rows are rolled back.
begin;

do $test$
declare
  v_host uuid;
  v_university uuid;
  v_attendee uuid;
  v_series uuid;
  v_first_event uuid;
  v_second_event uuid;
  v_count integer;
  v_occurrence_count integer;
  v_occurrence_count_after integer;
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'recurring_event_series' and c.relrowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'recurring_event_series_locations' and c.relrowsecurity
  ) then
    raise exception 'Recurring tables must have RLS enabled.';
  end if;

  if has_table_privilege('authenticated', 'public.recurring_event_series_locations', 'select') then
    raise exception 'Authenticated clients must not read recurring exact-location templates.';
  end if;

  select p.id, p.university_id
  into v_host, v_university
  from public.profiles p
  where p.account_status = 'active'
  order by p.created_at
  limit 1;

  if v_host is null then
    raise exception 'Weekly Rotation regression test requires one active test profile.';
  end if;

  select p.id into v_attendee
  from public.profiles p
  where p.account_status = 'active'
    and p.university_id = v_university
    and p.id <> v_host
  order by p.created_at
  limit 1;

  if v_attendee is null then
    raise exception 'Weekly Rotation regression test requires two active same-campus test profiles.';
  end if;

  perform set_config('request.jwt.claim.sub', v_host::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into public.recurring_event_series (
    university_id, host_id, title, category, location_label, description, privacy,
    latitude, longitude, day_of_week, start_time, recurrence_start_date, timezone,
    active, is_curated, is_weekly_staple, verification_status, verified_at,
    verification_review_after, source_url
  ) values (
    v_university, v_host, '__FOMO_WEEKLY_TEST__', 'Social', 'Test area', 'Rollback-only test', 'public',
    52.13, -106.63, 4, time '19:00', date '2026-09-01', 'America/Regina',
    true, true, true, 'verified', now(), current_date + 30, 'https://example.com/fomo-weekly-test'
  ) returning id into v_series;

  update public.recurring_event_series
  set verification_review_after = current_date - 1
  where id = v_series;
  if not exists (
    select 1 from public.recurring_event_series s
    where s.id = v_series
      and s.active and s.is_curated
      and s.verification_review_after < current_date
  ) then
    raise exception 'Stale curated series was not detectable by its review due date.';
  end if;
  update public.recurring_event_series
  set verification_review_after = current_date + 30
  where id = v_series;

  select public.refresh_weekly_event_occurrences(14) into v_count;

  select count(*) into v_occurrence_count
  from public.events e where e.recurring_series_id = v_series;
  perform public.refresh_weekly_event_occurrences(14);
  select count(*) into v_occurrence_count_after
  from public.events e where e.recurring_series_id = v_series;

  if v_occurrence_count <> v_occurrence_count_after then
    raise exception 'Repeated refresh generated duplicate occurrences.';
  end if;

  select e.id into v_first_event
  from public.events e
  where e.recurring_series_id = v_series
  order by e.event_date
  limit 1;

  select e.id into v_second_event
  from public.events e
  where e.recurring_series_id = v_series
  order by e.event_date
  offset 1 limit 1;

  if v_count < 2 or v_first_event is null or v_second_event is null or v_first_event = v_second_event then
    raise exception 'Expected at least two distinct generated occurrences.';
  end if;

  if exists (
    select 1
    from public.event_attendees ea
    join public.events e on e.id = ea.event_id
    where e.recurring_series_id = v_series and ea.user_id = v_host
  ) then
    raise exception 'Curated occurrence fabricated curator attendance.';
  end if;

  if exists (
    select 1 from public.events e
    where e.recurring_series_id = v_series
      and (
        extract(isodow from e.event_date) <> 4
        or (e.occurrence_starts_at at time zone 'America/Regina')::time <> time '19:00'
      )
  ) then
    raise exception 'Generated occurrence date or Saskatchewan-local time is incorrect.';
  end if;

  insert into public.event_attendees(event_id, user_id, status)
  values (v_first_event, v_attendee, 'going')
  on conflict (event_id, user_id) do update set status = 'going';

  if exists (
    select 1 from public.event_attendees ea
    where ea.event_id = v_second_event and ea.user_id = v_attendee
  ) then
    raise exception 'Attendance leaked from one occurrence into the next.';
  end if;

  update public.recurring_event_series set active = false where id = v_series;
  perform public.refresh_weekly_event_occurrences(14);

  if exists (
    select 1 from public.events e
    where e.recurring_series_id = v_series
      and e.event_date >= (now() at time zone 'America/Regina')::date
      and e.status = 'active'
  ) then
    raise exception 'Disabled recurrence left a future occurrence active.';
  end if;

  raise notice 'Weekly Rotation database regression checks passed.';
end;
$test$;

rollback;
