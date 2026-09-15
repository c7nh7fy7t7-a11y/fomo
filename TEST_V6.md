# FOMO V6 — Physical Phone Test

Do these in order. Do not call V6 stable until the important multi-user checks pass.

## Checkpoint 1 — Event date + completion
1. Open Create → Make a party.
2. Choose a real calendar date (not a Friday/Saturday preset).
3. Publish successfully.
4. Confirm FOMO automatically lands on Home → Feed.
5. Confirm the new event appears there with the correct date.
6. Press/swipe Back. The completed Create form must NOT reopen.

## Checkpoint 2 — Follow → Friends
1. Ethan follows Fox → Ethan sees Following; Fox sees Follow Back and receives one “followed you” notification.
2. Fox follows Ethan → both show Friends. Ethan receives one “followed you back” notification; Fox does not receive a second or backwards friendship notification.
3. Ethan unfollows Fox → friendship disappears but Fox still follows Ethan; Ethan sees Follow Back.
4. Confirm notifications appear for follow/friend changes.

## Checkpoint 3 — Profiles
1. Edit bio and verify it appears.
2. Post a portrait photo, landscape photo, and video.
3. Confirm posts appear under the author's POSTS tab.
4. Tap each tile and confirm it opens the same full Feed post with matching reactions/comments.
5. Verify EVENTS and TAGGED.

## Checkpoint 4 — Camera + Upload
1. Create → Photo.
2. Tap Take photo, grant camera permission, capture, preview, caption/tag/link event, post.
3. Repeat using Upload from the photo library.
4. Confirm both appear in Feed and profile.

## Checkpoint 5 — Video
1. Choose a short iPhone `.mov` video.
2. Preview → caption → tag → optional event → post.
3. Confirm upload completes, Feed renders it, tap plays, tap pauses.
4. Scroll it sufficiently offscreen and confirm playback stops.
5. Confirm video is represented on profile and full-post view works.
6. Test portrait and landscape.

## Checkpoint 6 — Magnetic Feed
1. Slow scroll: it must remain natural.
2. Flick between posts: Feed should settle near the next logical post.
3. A different settled post should produce ONE small haptic tick.
4. Fast scroll several posts: no haptic spam.
5. Slightly scroll inside a long post: snapping must not fight reading.

## Checkpoint 7 — Events / social extras
- Save / unsave an event.
- Send an event to a friend and open its card from DM.
- Host adds a co-host; co-host can manage allowed event details/requests.
- Unauthorized user still cannot read protected exact location.

## Checkpoint 8 — Multi-phone realtime/regression
Use Ethan / Fox / Eric on separate devices and preferably different networks.
- Follow/follow-back state
- Notifications
- DMs
- Comments/reactions
- Event creation + join/request/approve
- Photos/videos
- Exact-location privacy
- Kill/reopen app and verify session persistence
- Edge swipe must never reveal Login/Signup from the authenticated app
