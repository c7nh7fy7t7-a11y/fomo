-- Staged, idempotent Saskatoon Weekly Rotation catalog.
--
-- This file is intentionally separate from the schema migration. Run it only
-- after the target environment has been explicitly approved. Ethan authorized
-- his existing active @ethan profile to own these curated event occurrences.
-- This file never creates an auth user or changes account permissions.

do $seed$
declare
  v_curator uuid;
  v_university uuid;
  v_existing uuid;
  v_series uuid;
  v_seed record;
begin
  select p.id, p.university_id
  into v_curator, v_university
  from public.profiles p
  where lower(p.username) = 'ethan'
    and p.account_status = 'active'
  limit 1;

  if v_curator is null or v_university is null then
    raise exception using
      errcode = 'P0001',
      message = 'FOMO_CURATOR_PROFILE_REQUIRED',
      detail = 'An active profile with username ethan is required to own the Weekly Rotation catalog.';
  end if;

  for v_seed in
    select *
    from (values
      (
        'Burgers, Beverages & Bangers!', 'Social', 'Louis'' · USask',
        'A recurring Tuesday campus hangout at Louis''.',
        2::smallint, time '16:00', date '2026-09-15', date '2026-10-06',
        52.12984::double precision, -106.63499::double precision,
        'Lower Level, Memorial Union Building, 93 Campus Drive, Saskatoon, SK S7N 5B2',
        52.12984::double precision, -106.63499::double precision,
        'https://ussu.ca/venue/louis/',
        'Official USSU venue calendar listed Sep 15, Sep 22, Sep 29, and Oct 6 at 4:00 PM.',
        'Fall 2026 run currently published through October 6; recheck before extending.',
        'seasonal', date '2026-10-07', false, 140
      ),
      (
        'Askatune', 'Music', 'Louis'' · USask',
        'A recurring Wednesday evening at Louis''.',
        3::smallint, time '18:30', date '2026-09-16', date '2026-09-30',
        52.12984::double precision, -106.63499::double precision,
        'Lower Level, Memorial Union Building, 93 Campus Drive, Saskatoon, SK S7N 5B2',
        52.12984::double precision, -106.63499::double precision,
        'https://ussu.ca/venue/louis/',
        'Official USSU venue calendar listed Sep 16, Sep 23, and Sep 30 at 6:30 PM.',
        'Fall 2026 run currently published through September 30; recheck before extending.',
        'seasonal', date '2026-10-01', true, 130
      ),
      (
        'Pub Stumpers Trivia Night', 'Social', 'Amigos Cantina · Broadway',
        'Weekly Wednesday pub trivia at Amigos Cantina.',
        3::smallint, time '20:00', date '2026-09-16', date '2026-10-28',
        52.11759::double precision, -106.65440::double precision,
        '806 Dufferin Avenue, Saskatoon, SK S7H 2B8',
        52.11759::double precision, -106.65440::double precision,
        'https://www.amigoscantina.com/events-and-concerts/',
        'Official Amigos calendar listed consecutive Wednesdays from Sep 16 through Oct 28 at 8:00 PM.',
        'Fall 2026 dates are currently published through October 28; recheck before extending.',
        'seasonal', date '2026-10-29', false, 120
      ),
      (
        'Thursday Night Trivia', 'Social', '3 Hall Public House · Nutana',
        'Six rounds of general trivia on the top floor at 3 Hall Public House.',
        4::smallint, time '19:00', date '2026-09-03', null::date,
        52.11858::double precision, -106.65572::double precision,
        '612 11th Street East, Saskatoon, SK S7N 1B2',
        52.11858::double precision, -106.65572::double precision,
        'https://www.eventbrite.ca/e/3-hall-public-house-thursday-night-weekly-trivia-at-7pm-tickets-1549378325279',
        'Organizer listing describes weekly Thursday trivia at 7:00 PM with multiple current dates.',
        'Community-confirmed weekly listing; recheck monthly for exceptions or cancellation.',
        'community_confirmed', date '2026-10-13', false, 110
      ),
      (
        'Friday Night Karaoke', 'Music', 'Ledinna''s · Riversdale',
        'Weekly Friday karaoke at Ledinna''s.',
        5::smallint, time '20:00', date '2026-09-18', null::date,
        52.12450::double precision, -106.67300::double precision,
        '316 Avenue C South, Saskatoon, SK S7M 1N4',
        null::double precision, null::double precision,
        'https://ledinnastaste.ca/reservation/',
        'Official Ledinna''s page says karaoke runs every Friday from 8:00 PM onward.',
        'Exact address is verified; the catalog keeps an approximate Riversdale map point until the precise pin is independently verified.',
        'verified', date '2026-10-13', false, 100
      )
    ) as seed_rows(
      title, category, location_label, description,
      day_of_week, start_time, recurrence_start_date, recurrence_end_date,
      latitude, longitude, precise_address, precise_latitude, precise_longitude,
      source_url, source_note, seasonal_note, verification_status,
      verification_review_after, weekly_staple, sort_priority
    )
  loop
    v_existing := null;
    select s.id into v_existing
    from public.recurring_event_series s
    where s.university_id = v_university
      and lower(s.title) = lower(v_seed.title)
      and lower(s.location_label) = lower(v_seed.location_label)
      and s.day_of_week = v_seed.day_of_week
      and s.start_time = v_seed.start_time
    limit 1;

    if v_existing is not null then
      raise notice 'Skipping existing Weekly Rotation series: %', v_seed.title;
      continue;
    end if;

    insert into public.recurring_event_series (
      university_id, host_id, title, category, location_label, description,
      privacy, latitude, longitude, recurrence_type, day_of_week, start_time,
      recurrence_start_date, recurrence_end_date, timezone, active, is_curated,
      is_weekly_staple, sort_priority, verification_status, verified_at,
      source_url, source_note, seasonal_note, verification_review_after
    ) values (
      v_university, v_curator, v_seed.title, v_seed.category,
      v_seed.location_label, v_seed.description, 'public', v_seed.latitude,
      v_seed.longitude, 'weekly', v_seed.day_of_week, v_seed.start_time,
      v_seed.recurrence_start_date, v_seed.recurrence_end_date,
      'America/Regina', true, true, v_seed.weekly_staple, v_seed.sort_priority,
      v_seed.verification_status, timestamptz '2026-09-13 00:00:00-06',
      v_seed.source_url, v_seed.source_note, v_seed.seasonal_note,
      v_seed.verification_review_after
    ) returning id into v_series;

    insert into public.recurring_event_series_locations (
      series_id, precise_address, precise_latitude, precise_longitude
    ) values (
      v_series, v_seed.precise_address, v_seed.precise_latitude,
      v_seed.precise_longitude
    );
  end loop;
end;
$seed$;
