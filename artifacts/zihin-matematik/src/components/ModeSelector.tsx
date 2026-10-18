import { Clock3, Flame, Settings2, Trophy } from 'lucide-react';
import type { Difficulty, GameMode } from '../types/math';
const modes:[GameMode,string,string,typeof Clock3][]=[['practice','Serbest pratik','Kendi ritminde çöz',Settings2],['marathon','60 sn maraton','Doğruda +1 saniye',Clock3],['sudden','Ani ölüm','İlk hata oturumu bitirir',Flame],['sprint','20 soru sprinti','Zamana karşı yarış',Trophy]];
export function ModeSelector({mode,difficulty,onMode,onDifficulty,onCustom}:{mode:GameMode;difficulty:Difficulty;onMode:(m:GameMode)=>void;onDifficulty:(d:Difficulty)=>void;onCustom:()=>void}) {
 return <section className="panel side-panel"><div className="side-title"><h2>Bugünkü antrenman</h2><span className="eyebrow">01 / 03</span></div>
  <div className="mode-grid">{modes.map(([key,title,desc,Icon],i)=><button key={key} className={`mode-option ${mode===key?'selected':''}`} onClick={()=>onMode(key)} aria-pressed={mode===key} data-testid={`mode-${key}`}><span className="mode-icon"><Icon size={16}/></span><span style={{flex:1}}><b>{title}</b><small>{desc}</small></span><span className="keycap">{i+1}</span></button>)}</div>
  <div className="section-head" style={{marginTop:18}}><span className="eyebrow">Zorluk</span>{difficulty==='custom'&&<button className="quiet-button" style={{padding:'5px 8px',fontSize:10}} onClick={onCustom} data-testid="custom-settings-open"><Settings2 size={12}/> Ayarla</button>}</div>
  <div className="difficulty-row">{(['easy','medium','hard','custom'] as Difficulty[]).map((d,i)=><button key={d} className={difficulty===d?'selected':''} onClick={()=>d==='custom'?onCustom():onDifficulty(d)} aria-pressed={difficulty===d} data-testid={`difficulty-${d}`}>{['Kolay','Orta','Zor','Özel'][i]}</button>)}</div>
 </section>
}
