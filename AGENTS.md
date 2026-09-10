# FOMO V6.3 repository instructions

## Mission

FOMO V6.3 is the current launch candidate. The goal is to polish and stabilize the existing build for demo and launch readiness. Do not add major features, redesign established flows, or expand a task beyond the smallest change needed to fix or validate it.

The Mac checkout is currently the preferred working baseline. Do not replace it wholesale, merge in another machine's copy, or overwrite known-good behavior without an explicit request and a reviewed diff.

## Non-negotiable safeguards

- Never work directly on `main`. Before making changes, confirm the current branch is not `main`; use a narrowly named `codex/` branch when a new branch is needed.
- Never weaken, bypass, disable, or broadly relax Supabase Row Level Security.
- Never expose a Supabase service-role key, database password, signing key, token, or other privileged credential to the client, logs, commits, screenshots, or chat output.
- Never commit `.env`, `.env.local`, generated credentials, production data, or other secrets. Only `.env.example` placeholders belong in version control.
- Never expose exact coordinates, addresses, map pins, or equivalent location metadata for private events to users who are not authorized to see them. Check both data access and rendered UI when location-related code changes.
- Never deploy to production, publish a release, submit to an app store, run a production migration, or distribute a production build without explicit human approval.
- Preserve both iOS and Android support.
- Do not reintroduce snapping, paging, or magnetic settling in Feed scrolling. Feed scrolling must remain free and natural.

## Behavior that must remain intact

Every change must preserve existing behavior for:

- authentication and session handling;
- onboarding;
- profiles, search, following, friends, and mutuals;
- Feed, posts, photos, videos, tagging, reactions, and comments;
- public events, private events, invitations, requests, RSVPs, co-hosts, saved events, and protected locations;
- direct messages and realtime updates;
- notifications and push-notification integration;
- blocking and reporting;
- offline/cache behavior where already supported.

Treat regressions in any of these areas as launch blockers, even when they are outside the screen being polished.

## Working approach

1. Read the relevant implementation and the applicable `TEST_*.md` files before editing.
2. Keep each task narrowly scoped. Avoid opportunistic refactors, dependency upgrades, formatting sweeps, generated-file churn, or unrelated cleanup.
3. Preserve the existing Expo SDK, React Native, Expo Router, and Supabase architecture unless the task explicitly requires a compatible correction.
4. Prefer a targeted fix over a broad rewrite. Keep diffs easy to review and revert.
5. Inspect the working tree before editing. Existing changes belong to the user; do not discard, overwrite, or reformat them.
6. Do not claim a fix is complete until the relevant checks have passed. Report any validation that could not be performed.

## Local demo setup

- Use Node.js 20 or newer and npm.
- Install the checked-in dependency set before diagnosing source problems. Do not change dependency versions merely to get the demo running.
- Use only the client-safe Supabase values documented in `.env.example`. Existing local environment files may be used but must never be printed, copied into tracked files, or committed.
- Start the normal local flow with `npm start` or `START_FOMO.command`. Use `START_FOMO_TUNNEL.command` only when the device cannot reach the Mac over the local network.
- Do not rerun Supabase setup scripts or migrations solely to start the app. First determine whether the existing environment is already configured.
- Prefer a physical iPhone for the V6.3 gesture, haptic, video, and reduced-motion checks. Also complete the Android regression before launch approval.

## Supabase and database changes

- Any schema, policy, trigger, function, index, or data-contract change requires a new, reviewable migration. Do not edit production state manually as a substitute.
- Review migrations for least-privilege access, safe rollout, and compatibility with existing clients.
- Keep the service-role credential server-side only. Mobile code must use publishable/anonymous client credentials together with RLS.
- For private-event work, explicitly test an authorized attendee and an unauthorized or signed-out user. Unauthorized responses and UI must not contain protected location data.
- Do not apply a migration to production without explicit human approval.

## Validation expectations

Match validation to the change, starting with the fastest relevant checks and ending with device testing when UI, gestures, media, notifications, permissions, or native behavior are involved.

- Run the repository's relevant static, import, and configuration checks.
- Use `npm run doctor` when dependency or Expo compatibility is in scope.
- Follow `TEST_THIS_FIRST.md` for the baseline smoke test and `TEST_V6_3.md` for V6.3 acceptance.
- Confirm Feed remains non-snapping after any Feed or gesture change.
- Confirm private-event details remain protected after any event, query, cache, notification, map, or realtime change.
- Test the affected flow on iOS and Android, or clearly identify the platform that remains unverified.
- Recheck the final diff for unrelated changes, generated files, local paths, credentials, private user data, and debug logging.

## Definition of done

A task is complete only when the requested narrow outcome is implemented, relevant checks pass, protected behavior remains intact, the diff contains no secrets or unrelated edits, and any unperformed device or environment validation is clearly called out. Production release remains a separate, human-approved action.
