-- FOMO V5.2: video metadata + video MIME support for the existing private feed-media bucket.
-- Safe to run after V5/V5.1. This does not weaken RLS.

alter table public.feed_post_media add column if not exists media_type text not null default 'image';
alter table public.feed_post_media add column if not exists width integer;
alter table public.feed_post_media add column if not exists height integer;
alter table public.feed_post_media add column if not exists duration_ms double precision;

-- Older V5.2 installs used bigint, but iOS can return fractional millisecond durations.
alter table public.feed_post_media
  alter column duration_ms type double precision
  using duration_ms::double precision;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'feed_post_media_type_check'
      and conrelid = 'public.feed_post_media'::regclass
  ) then
    alter table public.feed_post_media
      add constraint feed_post_media_type_check check (media_type in ('image','video'));
  end if;
end $$;

update storage.buckets
set public = false,
    file_size_limit = 104857600,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/heic','image/heif',
      'video/mp4','video/quicktime','video/webm','video/x-m4v'
    ]
where id = 'feed-media';

select 'FOMO V5.2 video media support installed' as status;
