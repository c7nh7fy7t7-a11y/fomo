-- FOMO V6.1 — faster auth + post-verification profile onboarding
-- The live FOMO Supabase project was already migrated on 2026-08-18.
-- Run this only on a V6 database that has NOT received V6.1 yet.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

update public.profiles
set onboarding_completed = true
where onboarding_completed = false;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_domain text;
  v_university uuid := '11111111-1111-1111-1111-111111111111';
  v_username text;
begin
  v_domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  v_username := 'student_' || left(replace(new.id::text, '-', ''), 12);

  insert into public.profiles (
    id, university_id, email_domain, full_name, username,
    graduation_year, program, onboarding_completed
  ) values (
    new.id,
    v_university,
    v_domain,
    'New student',
    v_username,
    null,
    null,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

create or replace function private.same_campus_profile(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.profiles target
    join public.profiles me on me.id = auth.uid()
    where target.id = p_user
      and target.account_status = 'active'
      and target.onboarding_completed = true
      and target.university_id = me.university_id
  );
$function$;

create or replace function public.ensure_fomo_profile()
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_username text;
  v_university uuid := '11111111-1111-1111-1111-111111111111';
begin
  if v_user is null then
    raise exception 'FOMO_AUTH_REQUIRED: You must be signed in.';
  end if;

  if exists (select 1 from public.profiles p where p.id = v_user) then
    return v_user;
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_user;

  if v_email is null then
    raise exception 'FOMO_PROFILE_MISSING: Could not recover your account profile.';
  end if;

  v_username := 'student_' || left(replace(v_user::text, '-', ''), 12);

  insert into public.profiles (
    id, university_id, email_domain, full_name, username,
    graduation_year, program, account_status, onboarding_completed
  ) values (
    v_user,
    v_university,
    lower(split_part(v_email, '@', 2)),
    'New student',
    v_username,
    null,
    null,
    'active',
    false
  )
  on conflict (id) do nothing;

  return v_user;
end;
$function$;

drop policy if exists "same campus can read profiles" on public.profiles;
drop policy if exists "same campus can read completed profiles" on public.profiles;
create policy "same campus can read completed profiles"
on public.profiles
for select
to authenticated
using (
  account_status = 'active'
  and (
    id = auth.uid()
    or (
      onboarding_completed = true
      and university_id = private.current_university_id()
    )
  )
);

revoke execute on function public.ensure_fomo_profile() from public, anon;
grant execute on function public.ensure_fomo_profile() to authenticated;
