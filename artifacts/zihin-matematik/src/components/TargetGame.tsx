import { useMemo, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { combine, createPuzzle, dailyPuzzle, dateKey, type TargetDifficulty, type TargetOp, type TargetPuzzle } from '../services/targetPuzzle';

const SAVE_KEY = 'zihin-matematik-target-v1';
const MODES: {id: TargetDifficulty | 'daily'; label: string}[] = [
  {id: 'daily', label: 'Günlük'},
  {id: 'easy', label: 'Kolay'},
  {id: 'medium', label: 'Orta'},
  {id: 'hard', label: 'Zor'},
];
const OP_BUTTONS: {id: TargetOp; label: string}[] = [
  {id: '+', label: '+'},
  {id: '-', label: '−'},
  {id: '*', label: '×'},
  {id: '/', label: '÷'},
];

type Tile = {id: string; value: number};
type Step = {text: string};
type Save = {dailyDate?: string; dailyOps?: number; dailyMin?: number; perfect: number};

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return {perfect: 0};
    const data = JSON.parse(raw) as Save;
    return {perfect: Number(data.perfect) || 0, dailyDate: data.dailyDate, dailyOps: data.dailyOps, dailyMin: data.dailyMin};
  } catch {
    return {perfect: 0};
  }
}

function freshTiles(numbers: number[]): Tile[] {
  return numbers.map((value, index) => ({id: `n${index}`, value}));
}

export function TargetGame({onExit}: {onExit: () => void}) {
  const [mode, setMode] = useState<TargetDifficulty | 'daily'>('daily');
  const [seed, setSeed] = useState(1);
  const [puzzle, setPuzzle] = useState<TargetPuzzle>(() => dailyPuzzle());
  const [tiles, setTiles] = useState<Tile[]>(() => freshTiles(dailyPuzzle().numbers));
  const [steps, setSteps] = useState<Step[]>([]);
  const [past, setPast] = useState<{tiles: Tile[]; steps: Step[]}[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [op, setOp] = useState<TargetOp | null>(null);
  const [note, setNote] = useState('Bir sayı, bir işlem, sonra ikinci sayı.');
  const [save, setSave] = useState<Save>(() => loadSave());
  const solved = tiles.some(tile => tile.value === puzzle.target);
  const dailyDone = save.dailyDate === dateKey() && save.dailyOps !== undefined;

  const choose = (next: TargetDifficulty | 'daily', nextSeed = seed) => {
    const created = next === 'daily' ? dailyPuzzle() : createPuzzle(next, nextSeed);
    setMode(next);
    setPuzzle(created);
    setTiles(freshTiles(created.numbers));
    setSteps([]);
    setPast([]);
    setSelected(null);
    setOp(null);
    setNote('Bir sayı, bir işlem, sonra ikinci sayı.');
  };

  const persist = (ops: number) => {
    setSave(current => {
      const perfect = ops === puzzle.minOps ? current.perfect + 1 : current.perfect;
      const next: Save = {
        perfect,
        dailyDate: mode === 'daily' ? dateKey() : current.dailyDate,
        dailyOps: mode === 'daily' ? ops : current.dailyOps,
        dailyMin: mode === 'daily' ? puzzle.minOps : current.dailyMin,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const pickTile = (tile: Tile) => {
    if (solved) return;
    if (!selected) {
      setSelected(tile.id);
      setNote('İşlemi seç.');
      return;
    }
    if (!op) {
      setSelected(tile.id);
      return;
    }
    if (tile.id === selected) return;
    const left = tiles.find(item => item.id === selected);
    if (!left) return;
    const value = combine(left.value, tile.value, op);
    if (value === null) {
      setNote(op === '/' ? 'Bölme tam sayı vermeli.' : op === '-' ? 'Sonuç 1 veya daha büyük olmalı.' : 'Bu işlem geçersiz.');
      setOp(null);
      return;
    }
    const symbol = OP_BUTTONS.find(item => item.id === op)?.label ?? op;
    const text = `${left.value} ${symbol} ${tile.value} = ${value}`;
    const nextTiles = tiles.filter(item => item.id !== left.id && item.id !== tile.id);
    nextTiles.push({id: `r${steps.length}-${value}`, value});
    setPast(history => [...history, {tiles, steps}]);
    setTiles(nextTiles);
    setSteps(history => [...history, {text}]);
    setSelected(null);
    setOp(null);
    if (value === puzzle.target) {
      persist(steps.length + 1);
      setNote(steps.length + 1 === puzzle.minOps ? 'En kısa çözüm.' : `Oldu. En kısa yol ${puzzle.minOps} işlemdi.`);
      return;
    }
    setNote('Devam et. Hedefe ulaşan kare yeterli.');
  };

  const undo = () => {
    const previous = past[past.length - 1];
    if (!previous || solved) return;
    setPast(history => history.slice(0, -1));
    setTiles(previous.tiles);
    setSteps(previous.steps);
    setSelected(null);
    setOp(null);
    setNote('Son işlem geri alındı.');
  };

  const status = useMemo(() => solved ? 'Hedefe ulaşıldı' : 'Hedefi kur', [solved]);

  return <section className="pattern-screen" data-testid="target-game">
    <div className="pattern-top">
      <button className="quiet-button" type="button" onClick={onExit} data-testid="target-exit">Oyunlar</button>
      <p className="eyebrow">{status}</p>
    </div>
    <div className="pattern-board">
      <div className="target-modes">
        {MODES.map(item => <button key={item.id} type="button" className={mode === item.id ? 'selected' : ''} onClick={() => choose(item.id, item.id === 'daily' ? seed : Math.floor(Math.random() * 1e9) + 1)} data-testid={`target-mode-${item.id}`}>{item.label}</button>)}
      </div>
      <div className="pattern-meta">
        <div><strong>{puzzle.target}</strong><span>hedef</span></div>
        <div><strong>{puzzle.minOps}</strong><span>en az işlem</span></div>
        <div><strong>{mode === 'daily' && dailyDone ? 'oldu' : save.perfect}</strong><span>{mode === 'daily' && dailyDone ? 'bugün' : 'kusursuz'}</span></div>
      </div>
      <p className="target-figure" data-testid="target-value">{puzzle.target}</p>
      <div className="target-tiles">
        {tiles.map(tile => <button key={tile.id} type="button" className={`target-tile${selected === tile.id ? ' selected' : ''}${tile.value === puzzle.target ? ' solved' : ''}`} onClick={() => pickTile(tile)} data-testid="target-tile" data-value={tile.value}>{tile.value}</button>)}
      </div>
      <div className="target-ops">
        {OP_BUTTONS.map(item => <button key={item.id} type="button" className={`target-op${op === item.id ? ' active' : ''}`} onClick={() => { if (!solved && selected) { setOp(item.id); setNote('İkinci sayıyı seç.'); } }} data-testid={`target-op-${item.id}`}>{item.label}</button>)}
      </div>
      <p className="pattern-copy" data-testid="target-note">{note}</p>
      {steps.length > 0 && <ol className="target-log">{steps.map(step => <li key={step.text}>{step.text}</li>)}</ol>}
      <div className="action-row">
        <button className="quiet-button" type="button" onClick={undo} disabled={!past.length || solved} data-testid="target-undo"><Undo2 size={15}/> Geri al</button>
        {mode !== 'daily' && <button className="quiet-button" type="button" onClick={() => { const next = Math.floor(Math.random() * 1e9) + 1; setSeed(next); choose(mode, next); }} data-testid="target-new"><RotateCcw size={15}/> Yeni bulmaca</button>}
        {solved && <button className="start-button" type="button" onClick={() => choose(mode, mode === 'daily' ? seed : Math.floor(Math.random() * 1e9) + 1)} data-testid="target-again">{mode === 'daily' ? 'Başa dön' : 'Sıradaki'}</button>}
      </div>
    </div>
  </section>;
}
