# FOMO V5.2.1 Video Hotfix

This hotfix fixes iPhone videos whose duration is reported with fractional milliseconds (for example `5471.666...`).

Changes:
- The database patch stores `duration_ms` as `double precision`.
- The app rounds video duration before saving metadata.
- The media picker also normalizes duration immediately after selection.
- Existing RLS and storage permissions are unchanged.

The live FOMO Supabase project has already received the database hotfix.
