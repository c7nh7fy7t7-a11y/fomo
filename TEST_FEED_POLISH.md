# Feed reaction polish

## Scope

- One shared reaction strip, with larger emojis and readable counts underneath. Selected reactions use periwinkle emphasis; all five choices remain one tap away.
- Clearer author/time hierarchy, larger captions, and more separation between posts.
- Event context appears once below the media as a tappable title; tagged profiles remain accessible.
- Comments sit below the reactions, expand inline, and retain the existing keyboard-focus handling.
- All/Friends controls are simplified. Filtering, fetching, scroll restoration, media sizing/playback, reaction persistence, emoji rain, and haptic timing are unchanged.
- No backend, permissions, navigation-route, dependency, or protected-location changes.

## Completed local checks

- TypeScript check and existing Weekly Rotation unit suite passed.
- iOS and Android production JavaScript/Hermes bundle exports passed. These are local checks, not distributed builds.
- Synthetic component checks passed for all five reaction callbacks, replacement/removal/counts, selected states, rain/haptic and Reduce Motion wiring, inline comments and input-focus callback, sending/deleting comments, profile/event/tag links, and owner/tagged/report controls.
- Synthetic media checks confirmed unchanged sizing for portrait, landscape, and square fixtures at 320, 375, 393, and 430-point widths, plus the existing video visibility/comments flags.
- Exact-location fixture fields were not rendered. Data access and event authorization code were not modified.
- Final diff checked for whitespace errors, unrelated files, secrets, private content, and debugging output.

Synthetic checks do not verify native layout, actual persistence, physical haptics, keyboard movement, or playback. Neither platform's device pass has been completed for this change; this Mac has no available iOS simulator or Android device tooling.

## Device acceptance — iPhone and Android

1. Open Home → Feed. Switch All/Friends, pull to refresh, and load more posts. Confirm content and scroll restoration still behave normally.
2. Check a small phone and larger system text. Names, verification badges, event titles, tag names, reaction counts, and comment controls must remain readable without overlapping or clipping. All five reaction targets must remain visible.
3. Tap 🔥, switch to 😂, then tap 😂 again. Confirm a single saved reaction, correct counts and selected state, replacement, then removal. Reopen the post to confirm persistence.
4. Confirm the matching emoji rain and existing extended burst haptics. Enable Reduce Motion and confirm no rain and one light haptic on adding a reaction.
5. Open/hide comments on posts near the top and deep in the Feed. Focus the field, type, send once, and delete your own comment. The field and send button must stay above the keyboard. Repeat on post details.
6. Check portrait/landscape photos and video. Confirm no stretching, correct play/pause and double-tap heart behavior, and video pause when offscreen, in the background, or while comments are open.
7. Scroll quickly and slowly through the reaction strip. No snapping, paging, accidental reactions, or scroll hijacking. Check bottom-navigation clearance and safe areas.
8. Open author, event, and tagged-profile links. Confirm own-post deletion, remove-tag, and report actions remain available to the correct viewer. Use only disposable test posts for destructive checks.
9. Open a private linked event as unauthorized and then as authorized. Exact location must remain hidden until permitted; verify the existing authorized view is preserved.

Follow the baseline smoke test in `TEST_THIS_FIRST.md` and the affected acceptance checks in `TEST_V6_3.md` before merge approval.
