# FOMO V6.3 — Liquid Social

V6.3 is the visual, motion, interaction and tactile redesign built directly on the working V6.2 Speed/Discovery baseline.

## What changed
- New near-black / graphite design system with **electric coral** as the restrained primary accent.
- Reusable spacing, radius, typography and motion tokens.
- Reusable `GlassSurface`, `PressableScale`, `FomoInput`, `FomoToast` and `Skeleton` primitives.
- `expo-blur` material treatment on iOS with deliberate opaque/translucent fallbacks on Android.
- Floating Liquid-Social bottom navigation with filled/morph-like selected states and haptic tab selection.
- New FOMO verification seal instead of a generic blue social check.
- Softer squircle-like avatars and icon containers.
- Feed media/chrome polish and a signature **hold → slide → release** reaction gesture.
- Five reactions: ❤️ 🔥 😂 😮 👏.
- Reaction emoji fountain (12 bounded particles), animated reaction count, hover haptic ticks, and a short reaction haptic burst.
- Reduced-motion behavior removes the reaction particle fountain and reduces the reaction haptic event.
- Premium auth and onboarding inputs while preserving system/Apple password autofill and the V6.2 signup flow.
- Glass Search controls, glass chat composer, redesigned Create surface, animated Profile tab bubble, and glass Event action area.
- Designed skeleton and toast primitives for loading/small confirmations.

## Backend preservation
V6.3 does **not** rewrite V6.2 auth, privacy, realtime, caching, event access, university isolation, or RLS. The only V6.3 SQL change expands the existing feed reaction check constraint to permit `clap`.

## Required migration
Run `FOMO_V6_3_PATCH.sql` once after the existing V6.2 patches.

## Install note
V6.3 adds Expo SDK 54's `expo-blur` package. Run your normal install (`npm install`) after extracting the project.
