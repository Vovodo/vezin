import { useEffect, useRef } from 'react';
import { Check, Pause, Play, RotateCcw, Send } from 'lucide-react';
import type { MathQuestion } from '../types/math';

export function QuizCard({question,value,onValue,onSubmit,feedback,running,paused,started,elapsed,remaining,mode,answered,total,onStart,onPause,onRestart,onEscape}:{question:MathQuestion|null;value:string;onValue:(v:string)=>void;onSubmit:()=>void;feedback:'correct'|'wrong'|null;running:boolean;paused:boolean;started:boolean;elapsed:number;remaining:number|null;mode:string;answered:number;total:number;onStart:()=>void;onPause:()=>void;onRestart:()=>void;onEscape:()=>void}) {
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(running&&!paused)input.current?.focus()},[question?.id,running,paused]);
 const time=remaining!==null?`${Math.ceil(remaining/1000)} sn`:`${(elapsed/1000).toFixed(1)} sn`;
 return <section className="panel practice-panel" aria-label="Zihinsel matematik antrenmanı" data-testid="quiz-card">
  <div className="section-head"><div className="mode-label"><i className="mode-dot"/>{mode}</div><div className="status-pill" data-testid="timer">{time}{total>0?` · ${answered}/${total}`:''}</div></div>
  {running ? <div className="question-area">
   <p className="eyebrow">Sıradaki hesap</p>
   <h2 className="question-expression" aria-live="polite" data-testid="question-expression">{question?.expression??'Hazırlanıyor…'}</h2>
   <form onSubmit={e=>{e.preventDefault();onSubmit()}} className="answer-row">
    <input ref={input} className={`answer-input ${feedback??''}`} type="text" inputMode="numeric" pattern="-?[0-9]*" autoComplete="off" value={value} onChange={e=>onValue(e.target.value.replace(/[^0-9-]/g,''))} aria-label="Cevabınız" data-testid="answer-input"/>
    <button className="submit-button" type="submit" aria-label="Cevabı gönder" data-testid="submit-answer"><Send size={17}/><span className="desktop-only">Gönder</span></button>
   </form>
   <div className="hint-line" aria-live="polite">{feedback==='correct'?<span style={{color:'var(--green)',fontWeight:800}}><Check size={13} style={{verticalAlign:'middle'}}/> Doğru. Güzel gidiyorsun.</span>:feedback==='wrong'?'Bir kez daha dene. Cevap alanı hazır.':<>Cevap doğruysa kendiliğinden ilerler · <span className="keycap">Enter</span> gönderir</>}</div>
   <div className="action-row"><button className="quiet-button" onClick={onPause} data-testid="pause-session">{paused?<Play size={14}/>:<Pause size={14}/>} {paused?'Sürdür':'Duraklat'} <span className="keycap">Esc</span></button><button className="quiet-button" onClick={onRestart} data-testid="restart-session"><RotateCcw size={14}/> Baştan <span className="keycap">R</span></button></div>
  </div>:<div className="empty-state">
   <div className="empty-orbit"><Play size={20}/></div>
   <p className="eyebrow">{started?'Oturum duraklatıldı':'Kısa bir odak molası'}</p>
   <h2>{paused?'Hazır olduğunda devam et':'Zihnini ısıt.'}</h2>
   <p>{paused?'Soruların ve ilerlemen korunuyor.':'Her soru biraz daha hız, her gün biraz daha akıcılık. Cevabı klavyeden yaz; ritmini bul.'}</p>
   <button className="start-button" onClick={onStart} data-testid="start-session"><Play size={16}/>{paused?'Devam et':'Antrenmanı başlat'} <span className="keycap" style={{color:'inherit',borderColor:'rgba(255,255,255,.3)'}}>Space</span></button>
   {started&&<button className="quiet-button" style={{marginLeft:8}} onClick={onEscape}>Oturumu bitir</button>}
  </div>}
 </section>
}
