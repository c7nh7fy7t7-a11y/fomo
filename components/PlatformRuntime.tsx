import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.setOptions({duration:350,fade:true});
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});

export function PlatformRuntime(){
  const router=useRouter();
  useEffect(()=>{
    const sub=Notifications.addNotificationResponseReceivedListener((response)=>{
      const route=response.notification.request.content.data?.route;
      if(typeof route==='string'&&route.startsWith('/'))router.push(route as any);
    });
    Notifications.getLastNotificationResponseAsync().then((response)=>{
      const route=response?.notification.request.content.data?.route;
      if(typeof route==='string'&&route.startsWith('/'))setTimeout(()=>router.push(route as any),100);
    }).catch(()=>{});
    return()=>sub.remove();
  },[router]);
  return null;
}
