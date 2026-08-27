# FOMO V6.1 test checklist

## 1. Existing account regression
- Log in with an existing verified account.
- Login should navigate quickly instead of waiting for all Feed/messages/notification data.
- Existing profile should NOT be sent through onboarding.
- Feed/messages/events should populate in the background.

## 2. Feed scroll regression
- Open Home → Feed.
- Slow scroll, flick, stop between posts, read a long caption.
- Expected: normal free scrolling. No magnetic snap. No snap haptic.
- Video should still pause when a new drag begins/offscreen behavior still applies.

## 3. New signup
- Create a brand-new test account.
- Signup screen should contain only Email, Password, Confirm Password.
- Password and Confirm Password each have an eye icon.
- Mismatched passwords should be rejected before signup.
- No personal name/username examples should appear in grey placeholders.

## 4. Email verification
- After signup, FOMO should show the Check your email screen.
- Verify the email.
- Return to FOMO and log in.

## 5. Post-verification onboarding
- New verified account should land on Set up your profile.
- Choose name, username, program, graduation year and optional avatar.
- Finish onboarding.
- Expected: Home opens and the actual chosen identity is used.
- Another account should not be able to discover the temporary incomplete profile before onboarding is finished.

## 6. Password AutoFill
- On iPhone, tap the login email/password fields and check for Apple Password AutoFill suggestions where available.
- Signup password fields should be tagged as new-password fields.
- Login password field should be tagged as current-password.
- The app must never store the raw password itself.

## 7. Core V6 regression
- Follow/follow back/friends.
- Notifications.
- Create dated event → return to Home Feed.
- Take photo / upload photo post.
- Video post/playback.
- DMs and event sharing.
- Saved events.
- Private exact event location remains protected.
