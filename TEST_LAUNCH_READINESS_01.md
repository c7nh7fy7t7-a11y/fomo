# Launch Readiness 01 — device acceptance

Run `TEST_THIS_FIRST.md` and `TEST_V6_3.md` first. Complete this checklist on the build that includes the launch-readiness migration and the updated `send-fomo-push` function.

Use two ordinary test accounts on the same campus. Do not use production user data.

## Authentication and account boundaries

- Sign in as account A, open Feed, Messages, and one private event, then sign out.
- Confirm the welcome screen appears immediately and protected deep links cannot open Feed, chat, post, event, profile, or Settings.
- Sign in as account B without restarting. Confirm A's profile, follows, saved events, requests, notifications, conversations, message previews, and private-event details never appear.
- Force-close and reopen while signed in, then while signed out. Confirm neither state hangs or redirects in a loop.
- Disable the network, reopen with a previously used account, then reconnect and foreground the app. Confirm saved public content appears safely and live data catches up without a restart.

## Private-event revocation

- As A, create a Request or Private event with a clearly different public area and exact address/pin. Add one event photo.
- As B before approval, confirm only the approximate area is returned and rendered. The exact address, coordinates, marker, and protected photo must be absent.
- Approve or invite B. Reopen the event and confirm the authorized exact location and photo appear.
- Remove B, have B leave, and repeat after blocking B. Each time, confirm the event screen hides protected details immediately on open and the server no longer returns the exact-location row or protected photo.
- Background and foreground B after access is removed. Confirm protected details do not reappear from memory or cache.
- Sign out B while the private event is open. Confirm no protected event details or event reminder remains visible.

## Core reliability

- Create one photo post and one video post. Test caption, friend tags, event association, event search, cancel, failed upload, retry, and success. Confirm no blank or duplicate card remains after a failed upload.
- Scroll Feed naturally. Confirm one visible video autoplays, off-screen video pauses, looping works, reactions/comments work once, and returning from another tab does not duplicate posts.
- Create Public, Request, and Private events. Test join, request, approve, reject, invite, leave, co-host photo upload, removal, and cancellation without restarting.
- Open an existing chat, start a new chat, rapidly tap Send once, receive realtime messages, background/foreground, interrupt the network, and reconnect. Confirm messages are ordered and appear once.
- Deny location access where the OS prompts for it. Confirm Discover/Map remains usable with no crash or clipped state.
- Verify the first-launch tutorial once with each account. Test Skip and Done, relaunch, and confirm completion never crosses accounts.

## Physical iPhone checks

- Password AutoFill, keyboard/composer positioning, safe areas, Dynamic Island/rounded corners, gesture navigation, haptics, video autoplay/pause/loop, photo/video picker permissions, notification permission, push deep links, background/foreground token refresh, and Reduce Motion.

## Android checks

- Keyboard/composer positioning, system back, navigation-bar safe area, date picker, haptics, video autoplay/pause/loop, photo/video picker permissions, notification channel/permission, push deep links, and background/foreground reconnect.
