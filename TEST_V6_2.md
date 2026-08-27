# FOMO V6.2 test plan

V6.2 is not complete until physical-device and multi-account regression passes.

## 1 — Baseline / Feed

1. Open Home → Feed.
2. Slowly scroll, stop halfway through a post, flick quickly, read a long caption, open comments, return.
3. Confirm there is NO magnetic snap or forced paging.
4. Open a profile/event/post from Feed and press Back. Confirm Feed returns near the same position.

## 2 — Verified account

1. Open `@ethan`.
2. Confirm the verified badge appears beside the profile name.
3. Confirm the badge also appears where Ethan is shown as a post author / host / comment author as applicable.
4. A normal mobile user must not be able to create/edit/delete `profile_verifications`.

## 3 — Fast startup / cache

1. Open FOMO online and let Home finish loading.
2. Fully close and reopen it.
3. Recent safe content should appear quickly while fresh Supabase data refreshes.
4. Temporarily use a poor/offline connection. FOMO should show the latest safe saved activity rather than a blank screen.
5. Exact private locations must never be sourced from local session cache.

## 4 — Search

Search People by name/username/program. Search Events by title/category/location. Try event filters. Open results and return. Search Clubs/Organizers; if no real organizers are provisioned yet, verify the intentional empty state.

## 5 — Interests

Open Profile → Your interests. Select several, save, return to Discover. Confirm relevant categories can appear in “Based on your interests.” Test Skip/empty interests too.

## 6 — Notification settings

Open Profile → Notification settings. Toggle Messages / Social / Events / Reminders and relaunch. Confirm settings persist.

## 7 — Push (development/TestFlight build required)

Do this on a physical phone in an EAS-linked development/standalone build, not Expo Go.

1. Enable device push.
2. Fox messages Ethan → Ethan gets one useful push → tapping opens the chat.
3. Disable Messages → send another DM → no remote message push, but the in-app DM still appears.
4. Test follow/friend, comment/tag, event approval and event invite pushes.
5. Confirm low-value reactions are not creating push spam.

## 8 — Event invitations

Public/request event: Ethan → Invite → select multiple friends/following → Send. Recipient gets in-app invite; tapping opens event. It must not unlock a protected exact location.

Private event: only host/co-host should see the Invite action. Invite Fox. Fox should become `invited`, be able to open the private event, and then legitimately read its exact location under existing RLS.

## 9 — Who’s going

Use an event attended by friends/followed people. Confirm the event shows useful social proof and puts those people first in attendee presentation.

## 10 — Share links

Use Share on a profile and event. Confirm the native share sheet opens and the FOMO route is present. In an installed standalone/dev build, test `fomo://` routing into the correct screen. Universal web links require a controlled web domain and are a separate deployment step.

## 11 — Organizer / club

Provision a real organizer through trusted backend/admin access. Confirm it appears in Search → Clubs, has organizer metadata, verified badge when applicable, follow state, profile events, and cannot be self-created/verified by an ordinary client.

## 12 — Block / report

Use a disposable test account.

- A blocks B → their mutual/one-way follows are removed.
- B can no longer find/read A through normal profile queries.
- B cannot open/create a direct conversation with A.
- Blocked Users lets A see the minimal blocked entry and unblock.
- Report a user, post and event; confirm clean success UI.
- A normal app user cannot edit/delete moderation reports.

## 13 — Multi-device realtime

Use separate phones/networks for Ethan / Fox / Eric. Test DM, follow/follow-back, friendship, comment, notification, event change and invite. No full app restart should be required for expected realtime updates.

## 14 — Auth regression

Fresh account: Email → Password → Confirm Password → Verify Email → Profile Setup → Interests/Skip → Home. No personal-name placeholders. Password eyes work. Existing login remains auth-first and should not wait for the whole campus state to finish loading.

## 15 — V5/V6 privacy regression

Re-test exact private event coordinates, private DMs, event request/approval, co-host permissions, feed media ownership, profile writes, event creation, photo/video posting, comments/reactions/tags, saved events, event-to-DM cards and navigation protection from authenticated screens back into auth screens.
