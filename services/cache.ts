import { BackendState } from '@/services/backend';
import { ConversationSummary, FeedPost, FomoEvent, SocialNotification } from '@/data/seed';

const PREFIX='fomo:v62:';
const MAX_POST_CACHE_MS=45*60*1000;

export type SessionCache = {
  savedAt:number;
  state:BackendState;
  posts:FeedPost[];
  conversations:ConversationSummary[];
  notifications:SocialNotification[];
  profileViewCount:number;
};

function safeEvents(events:FomoEvent[]):FomoEvent[]{
  return events.map(({exactLocation,exactLatitude,exactLongitude,photos,...event})=>({...event,photos:[]}));
}

export function markOnboarded(userId:string){ try{localStorage.setItem(`${PREFIX}onboarded:${userId}`,'1');}catch{} }
export function hasOnboardedCache(userId:string){ try{return localStorage.getItem(`${PREFIX}onboarded:${userId}`)==='1';}catch{return false;} }
export function clearUserCache(userId:string){try{localStorage.removeItem(`${PREFIX}session:${userId}`);localStorage.removeItem(`${PREFIX}onboarded:${userId}`);}catch{}}

export function writeSessionCache(userId:string,cache:SessionCache){
  try{
    const publicEventIds=new Set(cache.state.events.filter((event)=>event.privacy==='Public').map((event)=>event.id));
    const safe:SessionCache={
      ...cache,
      state:{...cache.state,events:safeEvents(cache.state.events)},
      posts:cache.posts.filter((post)=>!post.eventId||publicEventIds.has(post.eventId)),
      conversations:cache.conversations.map(({lastMessage,...conversation})=>conversation),
    };
    localStorage.setItem(`${PREFIX}session:${userId}`,JSON.stringify(safe));
  }catch(error){console.warn('[FOMO:cache-write]',error);}
}

export function readSessionCache(userId:string):SessionCache|undefined{
  try{
    const raw=localStorage.getItem(`${PREFIX}session:${userId}`); if(!raw)return;
    const parsed=JSON.parse(raw) as SessionCache;
    if(!parsed?.savedAt||!parsed.state)return;
    if(Date.now()-parsed.savedAt>24*60*60*1000)return;
    const publicEventIds=new Set(parsed.state.events.filter((event)=>event.privacy==='Public').map((event)=>event.id));
    parsed.state={...parsed.state,events:safeEvents(parsed.state.events)};
    parsed.posts=(parsed.posts??[]).filter((post)=>!post.eventId||publicEventIds.has(post.eventId));
    parsed.conversations=(parsed.conversations??[]).map(({lastMessage,...conversation})=>conversation);
    if(Date.now()-parsed.savedAt>MAX_POST_CACHE_MS)parsed.posts=[];
    return parsed;
  }catch{return;}
}
