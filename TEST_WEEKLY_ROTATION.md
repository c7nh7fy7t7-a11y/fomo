# Weekly Rotation acceptance test

Use a non-production Supabase environment with the Weekly Rotation migration
applied. Seed data only after a verified `fomo` organizer account exists and a
human has approved that environment.

## Setup

1. Sign in with two active accounts from the same campus: Account A and B.
2. Confirm at least two weekly series exist on different days.
3. Keep one normal one-time event available as a regression control.

## Discover and full schedule

1. Open Discover and confirm **Weekly Rotation** appears even if it is empty.
2. Verify each series appears once and shows its next real date, weekday, time,
   public area, and real per-occurrence attendance.
3. Tap **See All**. The list must begin with the current Saskatchewan weekday,
   continue through the next six days, and show a clean empty state for days
   without a listing.
4. Tap a Weekly Rotation card and confirm it opens the correct event occurrence.
5. Confirm Discover scroll remains completely natural with no snapping.

## Occurrence isolation

1. As A, RSVP to this week's occurrence and add an event post or photo.
2. Open next week's occurrence of the same series.
3. Confirm A's RSVP and this week's post/photo are absent from next week.
4. Return to this week's occurrence and confirm its RSVP and content remain.
5. Share both dates and confirm each link opens the date that was shared.

## Privacy and maps

1. Use a Request or Private weekly test series with an approximate area and a
   separate exact location.
2. As unauthorized B, confirm Discover, Event Details, Map, cache/offline state,
   and notifications never reveal the exact address, coordinates, or map pin.
3. Approve or invite B for one occurrence only. Confirm B sees that occurrence's
   exact location while the next occurrence remains protected.
4. Confirm Map shows only relevant upcoming occurrences and no duplicate marker
   explosion.

## Operations and regression

1. Run the occurrence refresh twice and confirm no duplicate dates are created.
2. Disable a series. Confirm future generated occurrences become unavailable and
   historical event memories remain intact.
3. Set `verification_review_after` before today and confirm the row is returned
   by the stale-record operations filter.
4. Verify one-time event create/edit/delete, RSVP/request/invite/co-host flows,
   event posts/photos, feed, profiles, search, messaging, notifications,
   blocking/reporting, and offline/cache behavior still work.
5. Repeat the affected flow on a physical iPhone and an Android device. Check
   small-screen text, 44-point touch targets, safe areas, and media aspect ratio.
