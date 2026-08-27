# FOMO V5.2 — Visual Polish, Media & Navigation

Built on the tunnel-tested V5.1 codebase.

## What changed

- Larger centered **Discover / Feed** switcher.
- Native-feeling horizontal paging between Discover and Feed while preserving vertical scrolling.
- Feed media uses source aspect ratios instead of a forced square.
- Photo picker no longer forces a square edit/crop step.
- Video Feed posts with inline tap-to-play playback, event linking, tagging, comments, reactions, and likes.
- Center **Create** tab is now a clear hub with Photo, Video, and Make a party options.
- Map now has collapsed / partial / expanded nearby-event tray states and dynamic bottom-nav/safe-area clearance.
- Softer charcoal UI with violet interaction accents and category color accents.
- Haptics on key social/create interactions.
- Short comment timestamps remain in the `3s`, `1m`, `1h`, `1d` style.
- Authenticated tabs remain a navigation root; the iOS swipe-back-to-login regression stays blocked.

## Backend change

`FOMO_V5_2_PATCH.sql` adds media type/dimension/duration metadata to `feed_post_media` and allows common video MIME types in the existing private `feed-media` bucket. RLS remains enabled and unchanged.
