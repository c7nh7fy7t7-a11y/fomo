# FOMO V5.1 — Social polish

This build keeps the working V5 backend and social features, but replaces the barebones presentation with a more polished consumer-social UI.

## Changes

- Redesigned Home / Discover with a clearer live-campus header, event stats, richer category filters, denser event rows, and a more polished featured event.
- Redesigned Feed presentation with rounded media, clearer author/event context, reaction summaries, comment previews, and stronger visual hierarchy.
- Added deliberate double-tap-to-like on post media. A single tap does nothing and a ScrollView drag cancels the press, reducing accidental likes while scrolling.
- Added relative comment timestamps such as `3s ago`, `1m ago`, `1h ago`, and `1d ago`, refreshed while the comment sheet is open.
- Redesigned Comments into a cleaner bottom-sheet style conversation view.
- Redesigned Messages with search, richer conversation rows, and a better new-message sheet.
- Redesigned 1-to-1 chat bubbles/composer and grouped consecutive messages visually.
- Polished Profile surfaces, stats, tabs, post grid, and settings.
- Refined the floating bottom navigation and dark visual system.
- Disabled the back-swipe gesture on the authenticated tab root so iOS cannot reveal the welcome/login flow behind the app.
- Updated the bundled V5 SQL so a fresh install includes the feed-post RLS hotfix already applied to the live database.

## Backend

No new database migration is required when upgrading an already-working V5 install to V5.1. This is an app/UI update.
