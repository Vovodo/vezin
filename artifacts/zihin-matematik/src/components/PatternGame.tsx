import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

const BEST_KEY = 'zihin-matematik-pattern-v1';

function roundPlan(level:number) {
  const grid = Math.min(6, 3 + Math.floor((level - 1) / 3));
  const length = Math.min(grid * grid, 2 + level);
  return {grid, length};
}

function makeSequence(grid:number, length:number) {
  const cells = grid * grid;
  const sequence:number[] = [];
  while (sequence.length < length) {
    const next = Math.floor(Math.random() * cells);
    if (sequence.length && next === sequence[sequence.length - 1]) continue;
    sequence.push(next);
  }
  return sequence;
}

export function PatternGame({muted,onExit}:{muted:boolean;onExit:()=>void}) {
  const [level,setLevel] = useState(1);
  const [phase,setPhase] = useState<'ready'|'watch'|'input'|'fail'>('ready');
  const [sequence,setSequence] = useState<number[]>([]);
  const [cursor,setCursor] = useState(0);
  const [lit,setLit] = useState<number|null>(null);
  const [wrong,setWrong] = useState<number|null>(null);
  const [best,setBest] = useState(() => {
    const stored = Number(localStorage.getItem(BEST_KEY) || 0);
    return Number.isFinite(stored) ? stored : 0;
  });
  const timers = useRef<number[]>([]);
  const playId = useRef(0);
  const phaseRef = useRef(phase);
  const sequenceRef = useRef(sequence);
  const cursorRef = useRef(0);
  phaseRef.current = phase;
  sequenceRef.current = sequence;
  const plan = roundPlan(phase === 'fail' ? Math.max(1, level) : level);

  const clearTimers = () => {
    timers.current.forEach(id => window.clearTimeout(id));
    timers.current = [];
  };
  const later = (fn:() => void, ms:number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => () => clearTimers(), []);

  const remember = (completed:number) => {
    setBest(current => {
      const next = Math.max(current, completed);
      if (next !== current) localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
  };

  const startRound = (nextLevel:number) => {
    clearTimers();
    const token = ++playId.current;
    const {grid, length} = roundPlan(nextLevel);
    const nextSequence = makeSequence(grid, length);
    setLevel(nextLevel);
    setSequence(nextSequence);
    sequenceRef.current = nextSequence;
    cursorRef.current = 0;
    phaseRef.current = 'watch';
    setCursor(0);
    setWrong(null);
    setLit(null);
    setPhase('watch');
    const step = 640;
    nextSequence.forEach((cell, index) => {
      later(() => {
        if (playId.current !== token) return;
        setLit(cell);
        if (!muted) soundEffects.note(cell);
      }, 420 + index * step);
      later(() => {
        if (playId.current !== token) return;
        setLit(current => current === cell ? null : current);
      }, 420 + index * step + 340);
    });
    later(() => {
      if (playId.current !== token) return;
      setLit(null);
      phaseRef.current = 'input';
      setPhase('input');
    }, 420 + nextSequence.length * step);
  };

  const tap = (index:number) => {
    if (phaseRef.current !== 'input') return;
    const expected = sequenceRef.current[cursorRef.current];
    setLit(index);
    later(() => setLit(current => current === index ? null : current), 160);
    if (index !== expected) {
      phaseRef.current = 'fail';
      setWrong(index);
      setPhase('fail');
      if (!muted) soundEffects.wrong();
      remember(level - 1);
      return;
    }
    if (!muted) soundEffects.note(index);
    const next = cursorRef.current + 1;
    cursorRef.current = next;
    if (next < sequenceRef.current.length) {
      setCursor(next);
      return;
    }
    setCursor(next);
    remember(level);
    if (!muted) soundEffects.correct();
    later(() => startRound(level + 1), 520);
  };

  const grid = plan.grid;
  const status = phase === 'watch' ? 'Deseni izle' : phase === 'input' ? 'Sıra sende' : phase === 'fail' ? 'Desen koptu' : 'Hazır';

  return <section className="pattern-screen" data-testid="pattern-game">
    <div className="pattern-top">
      <button className="quiet-button" type="button" onClick={onExit} data-testid="pattern-exit">Oyunlar</button>
      <p className="eyebrow">{status}</p>
    </div>
    <div className="pattern-board">
      <div className="pattern-meta">
        <div><strong>Tur {phase === 'ready' ? 1 : level}</strong><span>{grid}×{grid}</span></div>
        <div><strong>{phase === 'ready' ? roundPlan(1).length : sequence.length || plan.length}</strong><span>kare</span></div>
        <div><strong>{best}</strong><span>en iyi tur</span></div>
      </div>
      <div className="pattern-progress" aria-hidden="true">
        {Array.from({length: sequence.length || plan.length}, (_, index) => <i key={index} className={index < cursor ? 'done' : ''}/>)}
      </div>
      <div className="pattern-grid" style={{gridTemplateColumns:`repeat(${grid}, minmax(0, 1fr))`}} role="group" aria-label={`${grid} kareye ${grid} ızgara`}>
        {Array.from({length:grid * grid}, (_, index) => {
          const row = Math.floor(index / grid) + 1;
          const column = index % grid + 1;
          const showExpected = phase === 'fail' && index === sequence[cursor];
          return <button
            key={index}
            type="button"
            className={`pattern-cell${lit === index ? ' lit' : ''}${wrong === index ? ' bad' : ''}${showExpected ? ' expected' : ''}`}
            aria-label={`Satır ${row}, sütun ${column}`}
            disabled={phase !== 'input'}
            onClick={() => tap(index)}
          />;
        })}
      </div>
      {phase === 'ready' && <p className="pattern-copy">Kareler sırayla yanar. Aynı sırayla dokun. Her üç turda ızgara bir adım büyür.</p>}
      {phase === 'watch' && <p className="pattern-copy">Şimdi sadece izle. Sıra sana gelince kareler dokunulabilir olur.</p>}
      {phase === 'input' && <p className="pattern-copy">{cursor} / {sequence.length} doğru. Kaldığın yerden devam et.</p>}
      {phase === 'fail' && <p className="pattern-copy">Tur {level} tamamlanamadı. Yanan kare beklenen sıradaki hücreydi.</p>}
      <div className="action-row">
        {phase === 'ready' && <button className="start-button" type="button" onClick={() => startRound(1)} data-testid="pattern-start">Deseni başlat</button>}
        {phase === 'fail' && <button className="start-button" type="button" onClick={() => startRound(1)} data-testid="pattern-retry"><RotateCcw size={15}/> Yeniden başla</button>}
      </div>
    </div>
  </section>;
}
