-- FOMO V6.3 — Liquid Social
-- Minimal backend migration. V6.3 is primarily UI/motion; RLS and privacy policies are intentionally untouched.

begin;

-- Add the fifth expressive reaction used by the V6.3 hold-slide tray.
alter table public.feed_reactions drop constraint if exists feed_reactions_reaction_check;
alter table public.feed_reactions
  add constraint feed_reactions_reaction_check
  check (reaction in ('heart','fire','laugh','wow','clap'));

commit;
