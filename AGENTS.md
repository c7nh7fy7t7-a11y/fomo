FOMO V6.3 launch agent instructions.

Current goal:
Polish and stabilize the current FOMO build for launch.
Do not add major new features.

Rules:
- Never work directly on main.
- Never weaken Supabase RLS.
- Never expose service-role credentials.
- Never expose private event coordinates to unauthorized users.
- Never commit .env files or secrets.
- Preserve iOS and Android.
- Preserve auth, onboarding, profiles, following, feed, posts, videos,
  reactions, comments, events, private events, DMs, notifications,
  blocking, reporting and realtime.
- Do not bring back snapping/magnetic Feed scrolling.
- Database changes require migrations.
- Keep every task small and narrowly scoped.
- Test changes before declaring them complete.
- Production releases always require human approval.
