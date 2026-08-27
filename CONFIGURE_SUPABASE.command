#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1

clear
printf '\n==============================================\n'
printf '             FOMO SUPABASE CONFIG\n'
printf '==============================================\n\n'
echo "This Mac build is already configured for the current FOMO Supabase project."
echo "Only continue if you intentionally want to connect it to a DIFFERENT project."
echo
read -r -p "Type YES to replace the current Supabase config: " CONTINUE
if [ "$CONTINUE" != "YES" ] && [ "$CONTINUE" != "yes" ]; then
  exit 0
fi

echo
read -r -p "Paste Project URL: " SUPABASE_URL
read -r -p "Paste Publishable key: " SUPABASE_KEY

if [ -z "$SUPABASE_URL" ]; then
  echo "Project URL cannot be empty."
  read -r -p "Press Return to close..." _
  exit 1
fi
if [ -z "$SUPABASE_KEY" ]; then
  echo "Publishable key cannot be empty."
  read -r -p "Press Return to close..." _
  exit 1
fi

{
  printf 'EXPO_PUBLIC_SUPABASE_URL=%s\n' "$SUPABASE_URL"
  printf 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n' "$SUPABASE_KEY"
} > .env.local

echo
echo "Supabase config updated."
echo "Never place a secret or service_role key in this file."
echo
read -r -p "Press Return to close..." _
