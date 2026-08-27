# FOMO

FOMO is a dark-first campus social app for discovering events, seeing what friends are doing, sharing posts, and coordinating through direct messages. This repository contains **FOMO V6.3 — Liquid Social**, built on the working V6.2 Speed/Discovery foundation.

V6.3 introduces the graphite and electric-coral design system, Liquid-Glass-style surfaces, tactile controls, a floating navigation bar, and the signature hold → slide → release reaction gesture with five reactions: ❤️ 🔥 😂 😮 👏.

## Included

- Expo SDK 54 / React Native application for iOS and Android
- Expo Router navigation
- Supabase authentication, database, storage, realtime, and Edge Function integration
- Feed posts with photos, videos, comments, reactions, tagging, and profiles
- Event discovery, RSVPs, private locations, invitations, co-hosts, and saved events
- Following, friends, mutuals, search, direct messages, notifications, blocking, and reporting
- Offline/cache support and focused realtime subscriptions
- Supabase setup SQL, versioned patches, and device regression checklists

See [V6_3_CHANGES.md](V6_3_CHANGES.md) for the release details and [TEST_V6_3.md](TEST_V6_3.md) for the physical-device acceptance tests.

## Requirements

- Node.js 20 or newer
- npm
- Expo Go for quick device testing, or an Expo development build
- A Supabase project configured with the included schema and migrations

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in the client-safe Supabase values in `.env.local`:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   ```

4. Start Expo:

   ```bash
   npm start
   ```

On macOS, `START_FOMO.command` and `START_FOMO_TUNNEL.command` provide the same normal and tunnel launch flows.

## Supabase

For a new environment, begin with `supabase/FOMO_SETUP.sql`, then apply the versioned patches in order. `FOMO_V6_3_PATCH.sql` only expands the Feed reaction constraint to allow `clap`.

For an existing environment, check its migration history before running any patch. Do not rerun migrations solely to start the app.

The checked-in `.env.example` contains placeholders only. Local environment files, service-role keys, database passwords, signing material, and other secrets are intentionally ignored. Publishable/anonymous client keys may be used by the app, but keep all privileged Supabase credentials server-side.

The push notification Edge Function source is under `supabase/functions/send-fomo-push/`.

## Validation

Follow the regression plans in the `TEST_*.md` files. The V6.3 reaction gesture, emoji fountain, reduced-motion behavior, and haptic sequence require testing on a physical iPhone; Android must also receive a full regression pass before release.

The packaged application passed its static syntax, local-import, and configuration checks. The Supabase Edge Function uses Deno's remote-module/runtime types and should be checked with the Supabase/Deno toolchain rather than the React Native TypeScript configuration.

## Project status

V6.3 is the current launch candidate. Its packaged source passed static syntax/import/config checks, but final acceptance still depends on the real-device tests documented in [TEST_V6_3.md](TEST_V6_3.md).

## Private project

This repository contains proprietary FOMO application code. Do not redistribute it or commit credentials, private user data, production exports, or generated local files.
