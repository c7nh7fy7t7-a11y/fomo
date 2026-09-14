import { supabase } from '@/lib/supabase';

export type PushKind='follow'|'friend'|'comment'|'tag'|'event_approved'|'event_invite'|'message';

export async function registerPushToken(_userId:string,_requestPermission:boolean){
  return {enabled:false,reason:'unsupported'};
}

// A browser logout must not delete the user's tokens for their signed-in phones.
export async function unregisterPushTokens(_userId:string){}

export async function sendPushForNotification(input:{recipientId:string;type:PushKind;postId?:string;eventId?:string;messageId?:string}){
  if(!supabase)return;
  const result=await supabase.functions.invoke('send-fomo-push',{body:input});
  if(result.error)console.warn('[FOMO:push-send]',result.error.message);
}

export async function scheduleEventReminder(_input:{eventId:string;title:string;eventDate:string;time:string;location:string}){}
export async function cancelEventReminder(_eventId:string){}
export async function cancelAllEventReminders(){}
