# FOMO V6 — Changes

## Social graph
- Added `follows` as the V6 relationship source.
- Follow is one-way; reciprocal follows are Friends.
- Existing accepted friendships are preserved as reciprocal follows.
- Existing pending friend requests migrate to the requester's one-way follow.
- Added social counts, lists, and mutual-friend stats.

## Profiles
- Added a 160-character bio.
- Added POSTS / EVENTS / TAGGED profile views.
- Feed posts are reused on profiles rather than duplicated.
- Hosted and co-hosted events appear under EVENTS; own Saved events are accessible from profile.

## Notifications
- Added an RLS-protected in-app notification center.
- Backend-generated notifications cover follows/friendship, reactions, comments, tags, event approvals/invites, and messages.
- Users cannot forge notification inserts from the client.

## Posting / camera / media
- Photo creation now offers Take photo or Upload.
- Camera permission and rear-camera capture are wired through Expo ImagePicker.
- Video keeps the V5.2.1 fractional-duration hotfix and stricter MIME/extension normalization.
- Failed media creation keeps cleanup behavior to avoid permanently broken posts.

## Events
- Replaced Friday/Saturday/Sunday creation buttons with a real calendar date picker.
- Added `events.event_date` and `create_fomo_event_v6`.
- Day/date labels are derived from the real date.
- Legacy V5.2 event creation remains compatible during V6 testing.
- Successful V6 event creation resets the form and replaces navigation back to Home → Feed.
- Added Saved events, DM event shares, and server-authorized co-hosts.

## Feed
- Added lightweight social-aware ranking without hiding wider campus posts.
- Added variable-height magnetic nearest-post settling.
- One selection haptic fires only when a different post becomes the settled post.
- Existing video pause-on-scroll behavior is preserved.

## Security
- RLS remains enabled.
- No service-role key is used in the client.
- Exact event locations and DMs remain protected.
- Follow rows can only be created/deleted by the follower.
- Co-host permissions are enforced server-side and cannot transfer event ownership.
