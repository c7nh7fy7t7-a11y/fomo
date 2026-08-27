export function friendlyErrorMessage(error: any, fallback = 'Something went wrong. Try again.') {
  const raw = String(error?.message ?? error?.error_description ?? error?.details ?? '').trim();
  const code = String(error?.code ?? '').toLowerCase();
  const status = Number(error?.status ?? 0);
  const lower = raw.toLowerCase();

  if (lower.includes('invalid login credentials')) return 'That email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Confirm your email first, then come back and log in.';
  if (lower.includes('user already registered') || lower.includes('already been registered')) return 'That email already has a FOMO account. Try logging in instead.';
  if ((lower.includes('duplicate key') || code === '23505') && lower.includes('username')) return 'That username is already taken. Try another one.';
  if (lower.includes('fomo_auth_required') || lower.includes('jwt') || lower.includes('session')) return 'Your session expired. Log in again and retry.';
  if (lower.includes('fomo_profile_missing')) return 'Your FOMO profile needs a quick repair. Log out, log back in, and try again.';
  if (lower.includes('fomo_account_inactive')) return 'This account cannot create events right now.';
  if (lower.includes('fomo_title_required')) return 'Give your event a name first.';
  if (lower.includes('fomo_invalid_day') || lower.includes('fomo_invalid_privacy')) return 'One of the event settings is invalid. Reopen the form and try again.';
  if (lower.includes('row-level security') || lower.includes('violates row level security') || code === '42501') {
    return 'FOMO blocked that action because the live database rules need the V4 patch.';
  }
  if (status >= 500 || lower.includes('database error saving new user') || lower.includes('unexpected_failure')) {
    return 'The FOMO backend rejected that action. Your data is safe—try once more, then check the Supabase log if it repeats.';
  }
  if (lower.includes('network request failed') || lower.includes('failed to fetch') || lower.includes('network')) return 'Could not reach FOMO right now. Check your connection and try again.';

  if (!raw || raw.length > 180 || raw.includes('content-security-policy') || raw.includes('strict-transport-security') || raw.startsWith('{')) return fallback;
  return raw;
}
