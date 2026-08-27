#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1

clear
printf '\n==============================================\n'
printf '        fomo V6.2 SPEED + DISCOVERY - MAC TUNNEL\n'
printf '==============================================\n\n'
echo "Phones on different networks can open this Expo build."
echo "Your Mac still needs to stay on while using the tunnel."
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed or is not on PATH."
  echo "Install Node.js 20.19 or newer, then open this file again."
  echo
  read -r -p "Press Return to close..." _
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local is missing."
  echo "Run CONFIGURE_SUPABASE.command first."
  read -r -p "Press Return to close..." _
  exit 1
fi

if [ ! -d node_modules ] || \
   [ ! -d node_modules/expo-video ] || \
   [ ! -d node_modules/expo-haptics ] || \
   [ ! -d node_modules/@react-native-community/datetimepicker ] || \
   [ ! -d node_modules/@expo/ngrok ] || \
   [ ! -d node_modules/expo-notifications ]; then
  echo "Installing fomo V6.2 dependencies..."
  echo
  npm install
  if [ $? -ne 0 ]; then
    echo
    echo "ERROR: npm install failed."
    read -r -p "Press Return to close..." _
    exit 1
  fi
fi

echo
echo "Starting Expo Tunnel..."
echo
npx expo start -c --tunnel

echo
echo "Expo stopped."
read -r -p "Press Return to close..." _
