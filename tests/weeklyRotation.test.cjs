const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const path=require('node:path');
const ts=require('typescript');

const sourcePath=path.join(__dirname,'..','utils','weeklyRotation.ts');
const source=fs.readFileSync(sourcePath,'utf8');
const output=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  fileName:sourcePath,
});
const loaded=new Module(sourcePath,module);
loaded.filename=sourcePath;
loaded.paths=module.paths;
loaded._compile(output.outputText,sourcePath);
const weekly=loaded.exports;

const occurrence=(id,date,overrides={})=>({
  id,title:'AG Night',category:'Social',day:'Thursday',eventDate:date,dateLabel:`THU · SEP ${date.slice(-2)}`,
  time:'7:00 PM',location:'Long Branch',description:'',privacy:'Public',hostId:'host',attendeeIds:[],
  latitude:52.14,longitude:-106.67,photos:[],
  recurrence:{
    seriesId:'series-ag',type:'weekly',dayOfWeek:4,startTime:'19:00:00',startDate:'2026-09-01',timezone:'America/Regina',
    active:true,curated:true,weeklyStaple:true,sortPriority:100,verificationStatus:'verified',verifiedAt:'2026-09-12T00:00:00Z',
    occurrenceStartsAt:`${date}T19:00:00-06:00`,
    ...overrides,
  },
});

assert.equal(
  weekly.dateKeyInTimeZone(new Date('2026-09-17T05:30:00Z'),'America/Regina'),
  '2026-09-16',
  'Saskatchewan-local dates must not roll over at UTC midnight',
);
assert.deepEqual(
  weekly.orderedWeekdays(new Date('2026-09-16T18:00:00Z'),'America/Regina'),
  [3,4,5,6,7,1,2],
  'full view must start with the current Saskatchewan weekday',
);

const first=occurrence('ag-17','2026-09-17');
const second=occurrence('ag-24','2026-09-24');
assert.equal(
  weekly.selectNextWeeklyOccurrences([second,first],new Date('2026-09-16T18:00:00Z'))[0].id,
  'ag-17',
  'the nearest upcoming occurrence should be selected',
);
assert.equal(
  weekly.selectNextWeeklyOccurrences([first,second],new Date('2026-09-18T18:00:00Z'))[0].id,
  'ag-24',
  'the series should roll forward after this week passes',
);
assert.equal(
  weekly.selectNextWeeklyOccurrences([occurrence('inactive','2026-09-17',{active:false})],new Date('2026-09-16T18:00:00Z')).length,
  0,
  'disabled recurrence must be excluded',
);

const lowerPriority=occurrence('lower-priority','2026-09-17',{seriesId:'series-lower',sortPriority:5});
assert.equal(
  weekly.selectNextWeeklyOccurrences([lowerPriority,first],new Date('2026-09-16T18:00:00Z'))[0].id,
  'ag-17',
  'curated sort priority should break ties on the same date',
);

first.attendeeIds.push('ethan');
assert.deepEqual(second.attendeeIds,[],'attendance on one occurrence must not appear on the next occurrence');
assert.equal(weekly.relativeOccurrenceLabel(first,new Date('2026-09-16T18:00:00Z')),'Tomorrow');
assert.equal(weekly.formatDatabaseTime('20:00:00'),'8:00 PM');
assert.equal(weekly.weeklyTimeLabel(occurrence('timed','2026-09-17',{endTime:'21:30:00'})),'7:00 PM–9:30 PM');

console.log('Weekly Rotation unit checks passed.');
