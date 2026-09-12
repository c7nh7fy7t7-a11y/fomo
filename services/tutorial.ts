const TUTORIAL_VERSION='v1';
const PREFIX='fomo:v63:first-launch-tour:';
const listeners=new Set<(userId:string)=>void>();

const keyFor=(userId:string)=>`${PREFIX}${TUTORIAL_VERSION}:${userId}`;

export function hasCompletedFirstLaunchTutorial(userId:string){
  try{return localStorage.getItem(keyFor(userId))==='1';}catch{return false;}
}

export function completeFirstLaunchTutorial(userId:string){
  try{localStorage.setItem(keyFor(userId),'1');}catch{}
}

export function requestFirstLaunchTutorial(userId:string){
  try{localStorage.removeItem(keyFor(userId));}catch{}
  listeners.forEach((listener)=>listener(userId));
}

export function subscribeToFirstLaunchTutorial(listener:(userId:string)=>void){
  listeners.add(listener);
  return()=>{listeners.delete(listener);};
}
