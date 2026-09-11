# FOMO V6.3 physical-device test

Use an actual iPhone for the tactile test. Also run the Android regression before calling V6.3 complete.

## 1. Baseline preservation
- Sign up, verify email, onboard, log out, and log back in.
- Confirm Apple/system password autofill still appears.
- Confirm Feed scroll is fully free: no snapping or magnetic settling.
- Confirm posts, images, video pause-offscreen, comments, DMs, event access, invites, requests, follows, blocks and notifications still work.
- Confirm a private event does not expose exact location until authorized.

## 2. Signature reaction test
1. Open Feed.
2. Confirm ❤️ 🔥 😂 😮 👏 are visible in a single row at the bottom of every post.
3. Tap 🔥 and confirm it saves once, its button shows the selected state, its count updates, matching emoji rain falls briefly, and a short multi-pulse haptic fires.
4. Tap 😂 and confirm it replaces 🔥 instead of adding a second reaction from the same user.
5. Tap 😂 again and confirm it removes the reaction.
6. Repeat while a video is playing and confirm playback stays responsive.
7. Aggressively scroll the Feed and confirm the reaction row never interferes with natural vertical scrolling.

## 3. Reduced motion
- Enable iOS Reduce Motion.
- Repeat a reaction and confirm the one-tap row remains responsive, emoji rain is removed, and feedback becomes one light haptic.

## 4. Visual consistency
Compare Login, Feed, Discover, Search, Event, Profile, Messages, Chat, Notifications and Create side-by-side. Confirm the same graphite surfaces, periwinkle accent, corner language, verification mark and control hierarchy appear throughout.

## 5. Inline comments
- Tap "View comments" on a Feed post and confirm the thread expands directly beneath that post without opening a new screen or sheet.
- Repeat from posts near the top, middle and bottom of Feed. Confirm every tap expands the correct thread.
- Focus the inline field after scrolling deeply and confirm it moves above the keyboard so typed text and the send button remain visible.
- Add a comment from the inline field and confirm it saves once and appears immediately.
- Delete one of your comments and confirm other comments remain intact.
- Tap "Hide comments" and confirm the post collapses cleanly without losing Feed position.
- Repeat on a post detail screen and confirm the same inline behavior.

## 6. Performance
- Scroll a mixed Feed with portrait/landscape photos, video, long captions and comments.
- Trigger each reaction repeatedly and confirm counts and selected states stay accurate and every emoji-rain burst disappears cleanly.
- Confirm video remains responsive while reaction buttons are used.
- Confirm no obvious memory or frame-rate degradation after repeated reactions.
