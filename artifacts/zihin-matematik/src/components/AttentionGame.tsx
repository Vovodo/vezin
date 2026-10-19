import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

const BEST_KEY = 'zihin-matematik-stroop-v1';

const COLORS = [
  {id:'kirmizi', label:'KIRMIZI', ink:'#d64545'},
  {id:'mavi', label:'MAVİ', ink:'#3c7dff'},
  {id:'yesil', label:'YEŞİL', ink:'#2f9e62'},
  {id:'sari', label:'SARI', ink:'#c99612'},
] as const;

type Ink = typeof COLORS[number];
type Trial = {word:Ink; ink:Ink};
type FailReason = 'color'|'time'|null;

function limitFor(streak:number) {
  return Math.max(850, 2400 - streak * 75);
}

function makeTrial(streak:number, previous:Trial|null):Trial {
  const ink = COLORS[Math.floor(Math.random() * COLORS.length)];
  const trap = Math.random() < Math.min(0.92, 0.62 + streak * 0.025);
  const pool = trap ? COLORS.filter(color => color.id !== ink.id) : [ink];
  let word = pool[Math.floor(Math.random() * pool.length)];
  if (previous && word.id === previous.word.id && ink.id === previous.ink.id) {
    word = COLORS.find(color => color.id !== word.id) ?? word;
  }
  return {word, ink};
}

export function AttentionGame({muted,onExit}:{muted:boolean;onExit:()=>void}) {
  const [phase,setPhase] = useState<'ready'|'play'|'fail'>('ready');
  const [trial,setTrial] = useState<Trial|null>(null);
  const [streak,setStreak] = useState(0);
  const [left,setLeft] = useState(1);
  const [picked,setPicked] = useState<string|null>(null);
  const [reason,setReason] = useState<FailReason>(null);
  const [best,setBest] = useState(() => {
    const stored = Number(localStorage.getItem(BEST_KEY) || 0);
    return Number.isFinite(stored) ? stored : 0;
  });
  const phaseRef = useRef(phase);
  const trialRef = useRef<Trial|null>(null);
  const streakRef = useRef(0);
  const lockRef = useRef(false);
  phaseRef.current = phase;
  trialRef.current = trial;

  const remember = (value:number) => {
    setBest(current => {
      const next = Math.max(current, value);
      if (next !== current) localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
  };

  const deal = (nextStreak:number) => {
    const next = makeTrial(nextStreak, trialRef.current);
    streakRef.current = nextStreak;
    trialRef.current = next;
    phaseRef.current = 'play';
    lockRef.current = false;
    setStreak(nextStreak);
    setTrial(next);
    setPicked(null);
    setReason(null);
    setLeft(1);
    setPhase('play');
  };

  const miss = (why:FailReason, choice:string|null) => {
    if (phaseRef.current !== 'play' || lockRef.current) return;
    lockRef.current = true;
    phaseRef.current = 'fail';
    setPicked(choice);
    setReason(why);
    setPhase('fail');
    remember(streakRef.current);
    if (!muted) soundEffects.wrong();
  };

  const pick = (id:string) => {
    if (phaseRef.current !== 'play' || lockRef.current || !trialRef.current) return;
    if (id !== trialRef.current.ink.id) {
      miss('color', id);
      return;
    }
    lockRef.current = true;
    const next = streakRef.current + 1;
    if (!muted) {
      if (next > 0 && next % 5 === 0) soundEffects.streak();
      else soundEffects.correct();
    }
    remember(next);
    window.setTimeout(() => deal(next), 90);
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const started = performance.now();
    const limit = limitFor(streakRef.current);
    let frame = 0;
    const tick = (now:number) => {
      const ratio = 1 - (now - started) / limit;
      if (ratio <= 0) {
        setLeft(0);
        miss('time', null);
        return;
      }
      setLeft(ratio);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, trial]);

  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if (phaseRef.current !== 'play') return;
      const index = Number(event.key) - 1;
      if (index < 0 || index >= COLORS.length) return;
      event.preventDefault();
      pick(COLORS[index].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [muted]);

  const status = phase === 'play' ? 'Rengi seç' : phase === 'fail' ? 'Seri koptu' : 'Hazır';
  const limitLabel = `${(limitFor(phase === 'play' ? streak : 0) / 1000).toFixed(1)} sn`;

  return <section className="pattern-screen" data-testid="attention-game">
    <div className="pattern-top">
      <button className="quiet-button" type="button" onClick={onExit} data-testid="attention-exit">Oyunlar</button>
      <p className="eyebrow">{status}</p>
    </div>
    <div className="pattern-board">
      <div className="pattern-meta">
        <div><strong>{streak}</strong><span>seri</span></div>
        <div><strong>{best}</strong><span>en iyi seri</span></div>
        <div><strong>{phase === 'ready' ? '2.4' : limitLabel.replace(' sn','')}</strong><span>süre</span></div>
      </div>
      <div className="stroop-timer" aria-hidden="true"><span style={{width:`${Math.max(0, left) * 100}%`}}/></div>
      {trial && phase !== 'ready' ? <p className="stroop-word" style={{color:trial.ink.ink}} data-testid="stroop-word" data-ink={trial.ink.id}>{trial.word.label}</p> : <p className="stroop-word stroop-idle">RENK</p>}
      <p className="pattern-copy">{phase === 'fail'
        ? reason === 'time' ? 'Süre bitti. Kelimeyi okumadan renge bak.' : 'Kelimeye değil, mürekkebin rengine bas.'
        : 'Kelimeyi okuma. Yazının rengini seç. Seri uzadıkça süre kısalır.'}</p>
      <div className="stroop-choices">
        {COLORS.map((color, index) => {
          const show = phase === 'fail' && trial;
          return <button
            key={color.id}
            type="button"
            className={`stroop-choice${show && picked === color.id ? ' bad' : ''}${show && color.id === trial?.ink.id ? ' expected' : ''}`}
            disabled={phase !== 'play'}
            onClick={() => pick(color.id)}
            data-testid={`stroop-${color.id}`}
          ><span className="keycap">{index + 1}</span>{color.label}</button>;
        })}
      </div>
      <div className="action-row">
        {phase === 'ready' && <button className="start-button" type="button" onClick={() => deal(0)} data-testid="attention-start">Dikkati başlat</button>}
        {phase === 'fail' && <button className="start-button" type="button" onClick={() => deal(0)} data-testid="attention-retry"><RotateCcw size={15}/> Yeniden başla</button>}
      </div>
    </div>
  </section>;
}
