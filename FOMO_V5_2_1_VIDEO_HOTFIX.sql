-- FOMO V5.2.1 video duration hotfix
-- iOS may report video duration with fractional milliseconds.
-- Safe to run on a V5.2 database; RLS and storage policies are unchanged.

alter table public.feed_post_media
  alter column duration_ms type double precision
  using duration_ms::double precision;

select 'FOMO V5.2.1 fractional video duration hotfix installed' as status;
