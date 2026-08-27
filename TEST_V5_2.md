# FOMO V5.2 test pass

1. Open Home. Confirm Discover / Feed are larger and centered.
2. Swipe left to Feed, right to Discover, then aggressively scroll vertically. Normal vertical scrolling should not accidentally switch pages.
3. Post a portrait photo, landscape photo, and near-square photo. Confirm no stretching, forced-square crop, or unnecessary black bars.
4. Tap Create. Confirm Photo / Video / Make a party are immediately obvious.
5. Post a short video. Confirm it appears in the Feed, taps to play/pause, and double-tap likes without normal scroll gestures liking it.
6. Link a post to an event and tag another user. Verify the other account sees the event context/tag.
7. Open Map. Collapse, partially open, and expand the nearby tray. Verify the last event can be reached and nothing sits behind the floating bottom nav.
8. Like, react, comment, delete your own comment, and confirm short timestamps such as 3s / 1m / 1h / 1d.
9. Message another account and verify realtime delivery.
10. From authenticated Home, try the iOS left-edge back gesture. Login/Signup/Welcome must not appear.
11. Repeat on separate networks through START_FOMO_TUNNEL.command.
