import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';

SplashScreen.setOptions({ duration: 350, fade: true });
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner:true, shouldShowList:true, shouldPlaySound:false, shouldSetBadge:false }) });

function RootNavigator(){
  const router=useRouter();
  const {isAuthenticated,demoMode,needsOnboarding}=useApp();
  const appReady=demoMode||(isAuthenticated&&needsOnboarding===false);
  useEffect(()=>{
    const sub=Notifications.addNotificationResponseReceivedListener((response)=>{
      const route=response.notification.request.content.data?.route;
      if(typeof route==='string'&&route.startsWith('/')) router.push(route as any);
    });
    Notifications.getLastNotificationResponseAsync().then((response)=>{
      const route=response?.notification.request.content.data?.route;
      if(typeof route==='string'&&route.startsWith('/')) setTimeout(()=>router.push(route as any),100);
    }).catch(()=>{});
    return ()=>sub.remove();
  },[router]);
  return <>
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
}

export default function RootLayout() {
  return <AppProvider><RootNavigator/></AppProvider>;
}
