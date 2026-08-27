# FOMO V6.2 — Speed, Discovery & Daily Use

V6.2 evolves the working V6.1 app. It does not replace the social/event systems that already work.

## What changed

- Normal free vertical Feed scrolling remains. No magnetic snapping, forced paging, or snap haptics.
- Backend-driven verified badges now render from `profile_verifications`. No username hardcoding.
- The live `@ethan` profile remains founder-verified.
- Cache-first startup: safe recent campus/feed/profile state can render immediately while Supabase refreshes in the background.
- Private exact event location fields and local DM preview text are deliberately excluded from the session cache.
- Signed private feed/event-media URLs are reused while still safely valid instead of being re-signed on every refresh.
- Universal Search for People, Events, and Clubs/Organizers.
- First-time interests: Parties, Sports, Clubs, Study, Campus Events, Live Music, Social, Gaming.
- Discover now surfaces Upcoming, Friends Are Going, interest matches, This Week, and Around Campus.
- Notification preferences for Messages, Social, Events, and Reminders.
- Push-token registration and an authenticated Supabase Edge Function (`send-fomo-push`) are wired for real device push.
- Useful event reminders can be scheduled locally when notification permission exists.
- Event invitations support multi-select. Public/request events use social invites; private host/co-host invitations become real authorized attendee invitations.
- Native OS share actions for profiles and events use FOMO deep-link routes.
- Event attendee ordering/social proof prioritizes friends and followed people.
- Organizer/club profile metadata is supported through trusted backend provisioning and uses the existing follow graph.
- Block User and Blocked Users settings are server enforced.
- Report User / Post / Event is backed by a moderation queue table.
- Optimistic follow/save/comment/message interactions roll back on backend failure.
- Feed position is preserved when moving into a profile/post/event and back during the same app session.
- Realtime listeners remain table-targeted and are cleaned up when the session changes.
- Raw sync errors are no longer shown directly to users; cached content remains usable when a refresh fails.
- Feed loading is bounded/paginated instead of loading the entire campus history at once.

## Push notification note

The V6.2 source contains the push client and the live Supabase Edge Function is deployed. Remote push still requires an EAS-linked development/standalone iOS or Android build with a valid Expo project ID. Do not call remote push "tested" from Expo Go.

## Security decisions

- Verification writes are not available to authenticated clients.
- Organizer creation/deletion is not available to authenticated clients; a trusted backend/admin provisions an organizer.
- Reports are create/read-own only from the app; users cannot edit or delete moderation records.
- Block enforcement affects profile visibility, follow relationships, direct conversations, and hosted-event visibility server-side.
- Private-event social sharing does not grant exact-location access. Only a real host/co-host private invitation does.
- Service-role credentials are never shipped in the mobile client.

## Live backend

The current FOMO Supabase project already has the V6.2 migrations and `send-fomo-push` Edge Function. Do not rerun `FOMO_V6_2_PATCH.sql` against the current production/beta project just to launch the app.
