# V5 build notes

## Visual
The former block-heavy Campus Pulse treatment was removed in favor of a softer consumer-social layout: deep black shell, white lowercase FOMO branding, rounded imagery/surfaces, floating navigation, overlapping avatars, and user/event photography as the main source of color. There is no light-mode toggle in V5.

## Backend
V5 adds RLS-protected Feed and DM tables. Exact event coordinates live in `event_locations`; Request/Invite Only events expose only a coarse public map coordinate until an authorized attendee can read the exact location row.

Raw post/profile viewer rows are intentionally not exposed to the client. The app receives aggregate counts through authenticated RPCs.

## Beta scope
V5 intentionally does not include stories, video feed, followers, group chat, marketplace, ticketing, Uber, subscriptions, streaks, or AI recommendations.
