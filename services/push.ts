import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

export type PushKind='follow'|'friend'|'comment'|'tag'|'event_approved'|'event_invite'|'message';

export async function registerPushToken(_userId:string,requestPermission:boolean){
  if(!supabase)return {enabled:false,reason:'backend'};
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('default',{name:'FOMO',importance:Notifications.AndroidImportance.DEFAULT}).catch(()=>{});
  let permissions=await Notifications.getPermissionsAsync();
  if(!permissions.granted&&requestPermission)permissions=await Notifications.requestPermissionsAsync();
  if(!permissions.granted)return {enabled:false,reason:'permission'};
  const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
  if(!projectId)return {enabled:false,reason:'project_id'};
  try{
    const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
    let result=await supabase.rpc('claim_fomo_push_token',{
      p_expo_push_token:token,
      p_platform:Platform.OS==='ios'?'ios':Platform.OS==='android'?'android':'unknown',
      p_device_name:null,
    });
    if(result.error?.code==='PGRST202'){
      result=await supabase.from('user_push_tokens').upsert({
        user_id:_userId,expo_push_token:token,platform:Platform.OS==='ios'?'ios':Platform.OS==='android'?'android':'unknown',
        device_name:null,updated_at:new Date().toISOString(),last_seen_at:new Date().toISOString(),
      },{onConflict:'expo_push_token'});
    }
    if(result.error)throw result.error;
    return {enabled:true,token};
  }catch(error:any){console.warn('[FOMO:push-register]',error?.message??error);return {enabled:false,reason:'token'};}
}

export async function unregisterPushTokens(userId:string){
  if(!supabase)return;
  const result=await supabase.from('user_push_tokens').delete().eq('user_id',userId); if(result.error)throw result.error;
}

export async function sendPushForNotification(input:{recipientId:string;type:PushKind;postId?:string;eventId?:string;messageId?:string}){
  if(!supabase)return;
  const result=await supabase.functions.invoke('send-fomo-push',{body:input});
  if(result.error)console.warn('[FOMO:push-send]',result.error.message);
}

const reminderKey=(eventId:string)=>`fomo:v62:reminder:${eventId}`;
function eventDateTime(eventDate:string,timeLabel:string){
  const match=timeLabel.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i); if(!match)return undefined;
  let hour=Number(match[1]);const minute=Number(match[2]??0);const pm=match[3].toUpperCase()==='PM';if(hour===12)hour=0;if(pm)hour+=12;
  const d=new Date(`${eventDate}T00:00:00`); if(Number.isNaN(d.getTime()))return undefined; d.setHours(hour,minute,0,0); return d;
}
export async function scheduleEventReminder(input:{eventId:string;title:string;eventDate:string;time:string;location:string}){
  const permission=await Notifications.getPermissionsAsync(); if(!permission.granted)return;
  await cancelEventReminder(input.eventId);
  const eventAt=eventDateTime(input.eventDate,input.time); if(!eventAt)return;
  const triggerAt=new Date(eventAt.getTime()-60*60*1000); if(triggerAt.getTime()<=Date.now())return;
  const id=await Notifications.scheduleNotificationAsync({content:{title:'Coming up on FOMO',body:`${input.title} starts in about an hour · ${input.location}`,data:{route:`/event/${input.eventId}`,type:'event_reminder'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:triggerAt} as any});
  try{localStorage.setItem(reminderKey(input.eventId),id);}catch{}
}
export async function cancelEventReminder(eventId:string){
  try{const id=localStorage.getItem(reminderKey(eventId));if(id){await Notifications.cancelScheduledNotificationAsync(id).catch(()=>{});localStorage.removeItem(reminderKey(eventId));}}catch{}
}
export async function cancelAllEventReminders(){
  const scheduled=await Notifications.getAllScheduledNotificationsAsync().catch(()=>[]);
  await Promise.all(scheduled.filter((item)=>item.content.data?.type==='event_reminder').map((item)=>Notifications.cancelScheduledNotificationAsync(item.identifier).catch(()=>{})));
  try{
    const keys=Array.from({length:localStorage.length},(_,index)=>localStorage.key(index)).filter((key):key is string=>Boolean(key?.startsWith('fomo:v62:reminder:')));
    keys.forEach((key)=>localStorage.removeItem(key));
  }catch{}
}
