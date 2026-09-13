import type { FomoEvent } from '@/data/seed';

export const SASKATOON_TIME_ZONE='America/Regina';

export const WEEKDAY_NAMES=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;

function dateParts(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(date);
  const values=Object.fromEntries(parts.map((part)=>[part.type,part.value]));
  return {year:Number(values.year),month:Number(values.month),day:Number(values.day)};
}

export function dateKeyInTimeZone(date:Date,timeZone=SASKATOON_TIME_ZONE){
  const {year,month,day}=dateParts(date,timeZone);
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function dateKeyValue(dateKey:string){
  const [year,month,day]=dateKey.split('-').map(Number);
  if(!year||!month||!day)return Number.NaN;
  return Date.UTC(year,month-1,day);
}

export function daysFromDateKey(dateKey:string,fromDateKey:string){
  const target=dateKeyValue(dateKey); const from=dateKeyValue(fromDateKey);
  return Number.isFinite(target)&&Number.isFinite(from)?Math.round((target-from)/86400000):Number.POSITIVE_INFINITY;
}

export function isoDayForDateKey(dateKey:string){
  const value=dateKeyValue(dateKey);
  if(!Number.isFinite(value))return 1;
  const utcDay=new Date(value).getUTCDay();
  return utcDay===0?7:utcDay;
}

export function orderedWeekdays(now=new Date(),timeZone=SASKATOON_TIME_ZONE){
  const today=isoDayForDateKey(dateKeyInTimeZone(now,timeZone));
  return Array.from({length:7},(_,index)=>((today-1+index)%7)+1);
}

export function relativeOccurrenceLabel(event:FomoEvent,now=new Date()){
  const timeZone=event.recurrence?.timezone??SASKATOON_TIME_ZONE;
  const delta=daysFromDateKey(event.eventDate,dateKeyInTimeZone(now,timeZone));
  if(delta===0)return 'Today';
  if(delta===1)return 'Tomorrow';
  if(delta>1&&delta<7)return `This ${event.day}`;
  if(delta>=7&&delta<14)return `Next ${event.day}`;
  return event.dateLabel;
}

export function weeklyScheduleLabel(event:FomoEvent){
  const day=event.recurrence?WEEKDAY_NAMES[event.recurrence.dayOfWeek-1]:event.day;
  return `Every ${day}`;
}

export function formatDatabaseTime(value?:string){
  if(!value)return undefined;
  const [hourString,minuteString]=value.split(':');
  const hour=Number(hourString); const minute=Number(minuteString);
  if(!Number.isFinite(hour)||!Number.isFinite(minute))return undefined;
  const suffix=hour>=12?'PM':'AM';
  const displayHour=hour%12||12;
  return `${displayHour}:${String(minute).padStart(2,'0')} ${suffix}`;
}

export function weeklyTimeLabel(event:FomoEvent){
  const end=formatDatabaseTime(event.recurrence?.endTime);
  return end&&end!==event.time?`${event.time}–${end}`:event.time;
}

export function selectNextWeeklyOccurrences(events:FomoEvent[],now=new Date()){
  const bySeries=new Map<string,FomoEvent>();
  for(const event of events){
    const recurrence=event.recurrence;
    if(!recurrence||recurrence.type!=='weekly'||!recurrence.active||recurrence.verificationStatus==='inactive')continue;
    const today=dateKeyInTimeZone(now,recurrence.timezone);
    if(daysFromDateKey(event.eventDate,today)<0)continue;
    const current=bySeries.get(recurrence.seriesId);
    if(!current||event.eventDate<current.eventDate||(event.eventDate===current.eventDate&&event.time<current.time))bySeries.set(recurrence.seriesId,event);
  }
  return [...bySeries.values()].sort((a,b)=>{
    const aDelta=daysFromDateKey(a.eventDate,dateKeyInTimeZone(now,a.recurrence?.timezone));
    const bDelta=daysFromDateKey(b.eventDate,dateKeyInTimeZone(now,b.recurrence?.timezone));
    if(aDelta!==bDelta)return aDelta-bDelta;
    if(Boolean(a.recurrence?.weeklyStaple)!==Boolean(b.recurrence?.weeklyStaple))return a.recurrence?.weeklyStaple?-1:1;
    if(Boolean(a.recurrence?.curated)!==Boolean(b.recurrence?.curated))return a.recurrence?.curated?-1:1;
    const priority=(b.recurrence?.sortPriority??0)-(a.recurrence?.sortPriority??0);
    if(priority)return priority;
    return a.time.localeCompare(b.time)||a.title.localeCompare(b.title);
  });
}
