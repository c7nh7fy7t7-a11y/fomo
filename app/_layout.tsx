import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/context/AppContext';
import { PlatformRuntime } from '@/components/PlatformRuntime';
import { WebAppShell } from '@/components/WebAppShell';
import { colors } from '@/theme/colors';

function RootNavigator(){
  const {isAuthenticated,demoMode,needsOnboarding}=useApp();
  const appReady=demoMode||(isAuthenticated&&needsOnboarding===false);
  const navigator=<>
    <PlatformRuntime/>
    <StatusBar style="light" />
    <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
          fullScreenGestureEnabled: false,
        }}
      >
        <Stack.Screen name="index" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Protected guard={!isAuthenticated&&!demoMode}>
          <Stack.Screen name="login" options={{ gestureEnabled: true }} />
          <Stack.Screen name="signup" options={{ gestureEnabled: true }} />
          <Stack.Screen name="verify-email" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated&&needsOnboarding===true}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={appReady}>
          <Stack.Screen name="interests" options={{ gestureEnabled: false, animation: 'fade' }} />
          {/* The authenticated app is a navigation root. Disabling its back gesture keeps
              iOS from revealing an auth screen that may still exist underneath in history. */}
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="event/[id]" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="profile/[id]" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="chat/[id]" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="post/[id]" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="create-event" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="weekly-rotation" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="notifications" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="search" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="notification-settings" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="blocked-users" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="settings" options={{ presentation: 'card', gestureEnabled: true }} />
          <Stack.Screen name="advanced-settings" options={{ presentation: 'card', gestureEnabled: true }} />
        </Stack.Protected>
    </Stack>
  </>;
  return appReady?<WebAppShell>{navigator}</WebAppShell>:navigator;
}

export default function RootLayout() {
  return <AppProvider><RootNavigator/></AppProvider>;
}
