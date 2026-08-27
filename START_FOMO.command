#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1

clear
printf '\n==============================================\n'
printf '             fomo V6.2 SPEED + DISCOVERY - MAC\n'
printf '==============================================\n\n'

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed or is not on PATH."
  echo "Install Node.js 20.19 or newer, then open this file again."
  echo
  read -r -p "Press Return to close..." _
  exit 1
fi

echo "Node version: $(node -v)"
echo

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local is missing."
  echo "Run CONFIGURE_SUPABASE.command first."
  read -r -p "Press Return to close..." _
  exit 1
fi

if [ ! -d node_modules ] || \
   [ ! -d node_modules/expo-video ] || \
   [ ! -d node_modules/expo-haptics ] || \
   [ ! -d node_modules/@react-native-community/datetimepicker ]; then
  echo "Installing fomo V6.2 dependencies..."
  echo "This can take a few minutes on the first launch."
  echo
  npm install
  if [ $? -ne 0 ]; then
    echo
    echo "ERROR: npm install failed."
    echo "Take a screenshot of this Terminal window and send it to ChatGPT."
    read -r -p "Press Return to close..." _
    exit 1
  fi
fi

echo
echo "Starting fomo V6.2 Speed + Discovery..."
echo "Keep this Terminal window open while testing in Expo Go."
echo
echo "NOTE: The live FOMO Supabase project is already patched for V6.2."
echo "Do NOT run FOMO_V6_PATCH.sql, FOMO_V6_1_PATCH.sql, or FOMO_V6_2_PATCH.sql again just to launch this copy."
echo
npx expo start -c

echo
echo "Expo stopped."
read -r -p "Press Return to close..." _
