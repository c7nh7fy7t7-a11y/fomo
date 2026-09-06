import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PushType = 'follow'|'friend'|'comment'|'tag'|'event_approved'|'event_invite'|'message';
type Input = { recipientId:string; type:PushType; postId?:string; eventId?:string; messageId?:string };

const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers:{'content-type':'application/json'} });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({error:'method_not_allowed'},405);
  const authHeader=req.headers.get('Authorization');
  if(!authHeader) return json({error:'missing_auth'},401);

  const url=Deno.env.get('SUPABASE_URL');
  const anon=Deno.env.get('SUPABASE_ANON_KEY');
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service) return json({error:'server_not_configured'},500);

  const callerClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await callerClient.auth.getUser();
  if(userError||!user) return json({error:'unauthorized'},401);
  const {data:activeProfile,error:profileError}=await callerClient.from('profiles').select('id')
    .eq('id',user.id).eq('account_status','active').maybeSingle();
  if(profileError||!activeProfile) return json({error:'account_inactive'},403);

  let input:Input;
  try{ input=await req.json(); }catch{ return json({error:'invalid_json'},400); }
  const allowed=new Set<PushType>(['follow','friend','comment','tag','event_approved','event_invite','message']);
  if(!input?.recipientId||!allowed.has(input.type)||input.recipientId===user.id) return json({error:'invalid_request'},400);

  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let noticeQuery=admin.from('notifications').select('id,user_id,actor_id,type,post_id,event_id,message_id,created_at')
    .eq('user_id',input.recipientId).eq('actor_id',user.id).eq('type',input.type)
    .gte('created_at',new Date(Date.now()-5*60*1000).toISOString()).order('created_at',{ascending:false}).limit(1);
  if(input.postId) noticeQuery=noticeQuery.eq('post_id',input.postId);
  if(input.eventId) noticeQuery=noticeQuery.eq('event_id',input.eventId);
  if(input.messageId) noticeQuery=noticeQuery.eq('message_id',input.messageId);
  const {data:notices,error:noticeError}=await noticeQuery;
  if(noticeError||!notices?.length) return json({error:'no_authorized_notification'},403);
  const notice=notices[0];

  const category=input.type==='message'?'messages':(['event_approved','event_invite'] as string[]).includes(input.type)?'events':'social';
  const {data:pref}=await admin.from('notification_preferences').select('messages,social,events,reminders').eq('user_id',input.recipientId).maybeSingle();
  if(pref && pref[category]===false) return json({ok:true,skipped:'preference'});

  const [{data:actor},{data:tokens}]=await Promise.all([
    admin.from('profiles').select('full_name,username').eq('id',user.id).single(),
    admin.from('user_push_tokens').select('expo_push_token').eq('user_id',input.recipientId),
  ]);
  if(!tokens?.length) return json({ok:true,skipped:'no_tokens'});
  const actorName=actor?.full_name||actor?.username||'Someone';

  let title='FOMO'; let body='Something new happened on FOMO.'; let route='/notifications';
  if(input.type==='message'){
    title=actorName; body='sent you a message';
    const {data:m}=await admin.from('messages').select('conversation_id').eq('id',notice.message_id).single();
    if(m?.conversation_id) route=`/chat/${m.conversation_id}?peer=${user.id}`;
  }else if(input.type==='follow'){
    title='New follower'; body=`${actorName} followed you`; route=`/profile/${user.id}`;
  }else if(input.type==='friend'){
    title='You’re friends now'; body=`You and ${actorName} follow each other`; route=`/profile/${user.id}`;
  }else if(input.type==='comment'){
    title=actorName; body='commented on your post'; route=`/post/${notice.post_id}`;
  }else if(input.type==='tag'){
    title=actorName; body='tagged you in a post'; route=`/post/${notice.post_id}`;
  }else if(input.type==='event_approved'){
    const {data:e}=await admin.from('events').select('title').eq('id',notice.event_id).single();
    title='You’re in'; body=`Your request for ${e?.title||'an event'} was approved`; route=`/event/${notice.event_id}`;
  }else if(input.type==='event_invite'){
    const {data:e}=await admin.from('events').select('title').eq('id',notice.event_id).single();
    title='Event invite'; body=`${actorName} invited you to ${e?.title||'an event'}`; route=`/event/${notice.event_id}`;
  }

  const messages=tokens.map((t)=>({to:t.expo_push_token,sound:'default',title,body,data:{route,type:input.type}}));
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  const expoAccess=Deno.env.get('EXPO_ACCESS_TOKEN'); if(expoAccess) headers.Authorization=`Bearer ${expoAccess}`;
  const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers,body:JSON.stringify(messages)});
  const result=await response.json().catch(()=>null);
  if(!response.ok) return json({error:'expo_push_failed',detail:result},502);
  return json({ok:true,count:messages.length,result});
});
