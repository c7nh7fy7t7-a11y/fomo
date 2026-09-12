import { supabase } from '@/lib/supabase';

type CachedSignedUrl={url:string;validUntil:number};
const signedUrlCache=new Map<string,CachedSignedUrl>();
let globalCacheGeneration=0;
const bucketCacheGenerations=new Map<string,number>();

const keyFor=(bucket:string,path:string)=>`${bucket}:${path}`;
const lifetimeFor=(bucket:string)=>bucket==='event-photos'
  ? {reuseMs:2*60*1000,signedSeconds:3*60}
  : {reuseMs:50*60*1000,signedSeconds:60*60};

export async function signedUrlsFor(bucket:string,paths:string[]):Promise<Map<string,string>>{
  const result=new Map<string,string>();
  const now=Date.now();
  const requestGeneration=globalCacheGeneration;
  const requestBucketGeneration=bucketCacheGenerations.get(bucket)??0;
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
  const lifetime=lifetimeFor(bucket);
  const signed=await supabase.storage.from(bucket).createSignedUrls(missing,lifetime.signedSeconds);
  if(signed.error)throw signed.error;
  if(requestGeneration!==globalCacheGeneration||requestBucketGeneration!==(bucketCacheGenerations.get(bucket)??0))return new Map();
  (signed.data??[]).forEach((item,index)=>{
    const path=missing[index];
    if(!path||!item.signedUrl)return;
    const cached={url:item.signedUrl,validUntil:Date.now()+lifetime.reuseMs};
    signedUrlCache.set(keyFor(bucket,path),cached);
    result.set(path,cached.url);
  });
  return result;
}

export function forgetSignedUrl(bucket:string,path?:string){
  if(path){signedUrlCache.delete(keyFor(bucket,path));return;}
  for(const key of [...signedUrlCache.keys()])if(key.startsWith(`${bucket}:`))signedUrlCache.delete(key);
}

export function clearSignedUrlCache(bucket?:string){
  if(bucket){
    bucketCacheGenerations.set(bucket,(bucketCacheGenerations.get(bucket)??0)+1);
    forgetSignedUrl(bucket);
    return;
  }
  globalCacheGeneration+=1;
  bucketCacheGenerations.clear();
  signedUrlCache.clear();
}
