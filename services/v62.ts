import { InterestKey, NotificationPreferences } from '@/data/seed';
import { supabase } from '@/lib/supabase';

export async function saveUserInterests(userId:string,interests:InterestKey[]){
  if(!supabase)return;
  const cleared=await supabase.from('user_interests').delete().eq('user_id',userId); if(cleared.error)throw cleared.error;
  if(interests.length){const inserted=await supabase.from('user_interests').insert([...new Set(interests)].map(interest=>({user_id:userId,interest})));if(inserted.error)throw inserted.error;}
}
export async function saveNotificationPreferences(userId:string,prefs:NotificationPreferences){
  if(!supabase)return;
  const result=await supabase.from('notification_preferences').upsert({user_id:userId,...prefs,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(result.error)throw result.error;
}
export async function invitePeopleToEvent(eventId:string,senderId:string,recipientIds:string[]){
  if(!supabase)return;
  const rows=[...new Set(recipientIds)].filter(id=>id&&id!==senderId).map(recipient_id=>({event_id:eventId,sender_id:senderId,recipient_id}));
  if(!rows.length)return;
  const result=await supabase.from('event_social_invites').upsert(rows,{onConflict:'event_id,sender_id,recipient_id',ignoreDuplicates:true});if(result.error)throw result.error;
}
export async function blockPerson(blockerId:string,blockedId:string){
  if(!supabase)return;const r=await supabase.from('user_blocks').insert({blocker_id:blockerId,blocked_id:blockedId});if(r.error)throw r.error;
}
export async function unblockPerson(blockerId:string,blockedId:string){
  if(!supabase)return;const r=await supabase.from('user_blocks').delete().eq('blocker_id',blockerId).eq('blocked_id',blockedId);if(r.error)throw r.error;
}
export type ReportTarget={type:'user';id:string}|{type:'post';id:string}|{type:'event';id:string};
export type ReportReason='spam'|'harassment'|'inappropriate'|'fake_event'|'safety'|'other';
export async function reportTarget(reporterId:string,target:ReportTarget,reason:ReportReason,details?:string){
  if(!supabase)return;
  const payload:any={reporter_id:reporterId,target_type:target.type,reason,details:details?.trim()||null};
  if(target.type==='user')payload.target_user_id=target.id;
  if(target.type==='post')payload.target_post_id=target.id;
  if(target.type==='event')payload.target_event_id=target.id;
  const r=await supabase.from('reports').insert(payload);if(r.error)throw r.error;
}
