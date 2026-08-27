# FOMO V6.1 — Smooth Auth

V6.1 is a polish release on top of FOMO V6 Social.

## Feed
- Removed V6 magnetic/snap-to-post scrolling.
- Restored normal free vertical scrolling.
- Kept video pause-on-scroll behavior and the Discover/Feed horizontal pager.

## Signup
- Signup now asks only for email, password, and confirm password.
- Name, username, program, graduation year, and avatar are collected only after the account is verified and the user logs in.
- Removed personal example placeholders from signup/profile setup.
- Added show/hide eye controls to password and confirm-password fields.
- Added iOS/Android autofill hints for username/current password/new password.

## Verification + onboarding
- Added a dedicated email-verification handoff screen.
- Added a post-verification onboarding screen.
- New accounts receive a neutral temporary profile until onboarding is completed.
- Incomplete profiles are hidden from other same-campus users by RLS.
- Existing FOMO users remain marked as onboarded and are not forced through the new flow.

## Login speed
- Login no longer blocks on loading the entire Feed, conversations, notifications, profile views, and event state.
- Authentication and the small onboarding check complete first.
- The heavier FOMO state hydrates in the background after navigation.
- Persisted Supabase sessions remain enabled.

## Mac/tunnel reliability
- Pinned `react-dom` to 19.1.0 to match React 19.1.0.
- Added local `@expo/ngrok` so the tunnel launcher does not depend on Expo finding a global ngrok package.
