import { supabase } from '@/lib/supabase';

type CachedSignedUrl={url:string;validUntil:number};
const signedUrlCache=new Map<string,CachedSignedUrl>();
// Session cache can retain posts for another 45 minutes. Keeping ten minutes
// here ensures a restored URL remains inside its one-hour signature lifetime.
const REUSE_MS=10*60*1000;
const SIGNED_SECONDS=60*60;

const keyFor=(bucket:string,path:string)=>`${bucket}:${path}`;

export async function signedUrlsFor(bucket:string,paths:string[]):Promise<Map<string,string>>{
  const result=new Map<string,string>();
  const now=Date.now();
  const unique=[...new Set(paths.filter(Boolean))];
  const missing:string[]=[];
  for(const path of unique){
    const cached=signedUrlCache.get(keyFor(bucket,path));
    if(cached&&cached.validUntil>now){result.set(path,cached.url);continue;}
    if(cached)signedUrlCache.delete(keyFor(bucket,path));
    missing.push(path);
  }
  if(!missing.length)return result;
  if(!supabase)return result;
  const signed=await supabase.storage.from(bucket).createSignedUrls(missing,SIGNED_SECONDS);
  if(signed.error)throw signed.error;
  (signed.data??[]).forEach((item,index)=>{
    const path=missing[index];
    if(!path||!item.signedUrl)return;
    const cached={url:item.signedUrl,validUntil:Date.now()+REUSE_MS};
    signedUrlCache.set(keyFor(bucket,path),cached);
    result.set(path,cached.url);
  });
  return result;
}

export function forgetSignedUrl(bucket:string,path?:string){
  if(path){signedUrlCache.delete(keyFor(bucket,path));return;}
  for(const key of [...signedUrlCache.keys()])if(key.startsWith(`${bucket}:`))signedUrlCache.delete(key);
}
