import type { AppData, ResponseLog, SessionRecord, Theme, Difficulty, GameMode, CustomConfig } from '../types/math';
const KEY='zihin-matematik-v1';
const defaults:AppData={logs:[],sessions:[],settings:{theme:'light',muted:false,difficulty:'easy',mode:'practice',custom:{digits:2,operations:['add','subtract','multiply','divide']}},currentStreak:0,bestStreak:0};
export function loadData():AppData {
  try {
    const raw=localStorage.getItem(KEY);if(!raw)return structuredClone(defaults);
    const data=JSON.parse(raw) as Partial<AppData>;
    if(!Array.isArray(data.logs)||!Array.isArray(data.sessions))return structuredClone(defaults);
    const settings=data.settings??defaults.settings;
    const theme=['light','dark','neon'].includes(settings.theme)?settings.theme:defaults.settings.theme;
    const mode=['practice','marathon','sudden','sprint'].includes(settings.mode)?settings.mode:defaults.settings.mode;
    const difficulty=['easy','medium','hard','custom'].includes(settings.difficulty)?settings.difficulty:defaults.settings.difficulty;
    const custom=settings.custom??defaults.settings.custom;
    return {...defaults,...data,
      logs:data.logs.filter((x):x is ResponseLog=>!!x&&typeof x.questionId==='string'&&typeof x.timeSpentMs==='number'&&typeof x.isCorrect==='boolean'),
      sessions:data.sessions.filter((x):x is SessionRecord=>!!x&&typeof x.id==='string'&&typeof x.completedAt==='number'),
      settings:{...defaults.settings,...settings,theme,mode,difficulty,muted:typeof settings.muted==='boolean'?settings.muted:false,
        custom:{digits:[1,2,3,4].includes(custom.digits)?custom.digits:2,operations:Array.isArray(custom.operations)&&custom.operations.length?custom.operations:defaults.settings.custom.operations}}
    };
  }
  catch{return structuredClone(defaults)}
}
export function saveData(data:AppData):void {try{localStorage.setItem(KEY,JSON.stringify(data))}catch{/* Storage may be unavailable; the app remains usable in memory. */}}
export function recordResponse(data:AppData,log:ResponseLog):AppData {
  const currentStreak=log.isCorrect?data.currentStreak+1:0;
  return {...data,logs:[...data.logs,log].slice(-5000),currentStreak,bestStreak:Math.max(data.bestStreak,currentStreak)};
}
export function recordSession(data:AppData,session:SessionRecord):AppData {return {...data,sessions:[session,...data.sessions].slice(0,100)}}
export function createSession(mode:GameMode,difficulty:Difficulty,total:number,correct:number,incorrect:number,durationMs:number,streak:number,operations:SessionRecord['operations'],averageMs?:number):SessionRecord {
 const relevant=averageMs??(total?durationMs/total:0);return{id:`session-${Date.now()}`,mode,difficulty,total,correct,incorrect,durationMs,averageMs:relevant,streak,completedAt:Date.now(),operations};
}
export function updateSettings(data:AppData,patch:Partial<{theme:Theme;muted:boolean;difficulty:Difficulty;mode:GameMode;custom:CustomConfig}>):AppData{return {...data,settings:{...data.settings,...patch}}}
export function averageSpeed(logs:ResponseLog[]):number {const good=logs.filter(l=>l.isCorrect);return good.length?good.reduce((s,l)=>s+l.timeSpentMs,0)/good.length:0}
export function accuracy(logs:ResponseLog[]):number{return logs.length?100*logs.filter(l=>l.isCorrect).length/logs.length:0}
export function weakOperation(logs:ResponseLog[]):{operation:ResponseLog['operationType'];avg:number;errorRate:number;comparison:number}|null {
 const stats=new Map<string,{time:number;count:number;wrong:number}>();
 logs.forEach(l=>{const s=stats.get(l.operationType)??{time:0,count:0,wrong:0};s.time+=l.timeSpentMs;s.count++;if(!l.isCorrect)s.wrong++;stats.set(l.operationType,s)});
 const entries=[...stats.entries()].filter(([,s])=>s.count>=2).map(([operation,s])=>({operation:operation as ResponseLog['operationType'],avg:s.time/s.count,errorRate:s.wrong/s.count}));
 if(!entries.length)return null;
 entries.sort((a,b)=>(b.errorRate*2+b.avg/10000)-(a.errorRate*2+a.avg/10000));
 const weakest=entries[0], baseline=entries.filter(x=>x.operation!==weakest.operation).reduce((s,x)=>s+x.avg,0)/Math.max(1,entries.length-1);
 return {...weakest,comparison:baseline?Math.round((weakest.avg/baseline-1)*100):0};
}
