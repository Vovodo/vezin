export type TargetOp = '+' | '-' | '*' | '/';
export type TargetDifficulty = 'easy' | 'medium' | 'hard';

export type TargetPuzzle = {
  numbers: number[];
  target: number;
  minOps: number;
};

const OPS: TargetOp[] = ['+', '-', '*', '/'];
const LARGE = [25, 50, 75, 100];

export function combine(a: number, b: number, op: TargetOp): number | null {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return null;
  let value = 0;
  if (op === '+') value = a + b;
  else if (op === '-') value = a - b;
  else if (op === '*') value = a * b;
  else if (b === 0 || a % b !== 0) return null;
  else value = a / b;
  if (!Number.isInteger(value) || value < 1 || value > 100000) return null;
  return value;
}

export function minimumOperations(numbers: number[], target: number): number | null {
  if (numbers.some(number => number === target)) return 0;
  const start = numbers.slice().sort((left, right) => left - right);
  const seen = new Set<string>([start.join(',')]);
  let layer = [start];
  for (let ops = 1; ops < numbers.length; ops++) {
    const next: number[][] = [];
    for (const state of layer) {
      for (let i = 0; i < state.length; i++) {
        for (let j = 0; j < state.length; j++) {
          if (i === j) continue;
          for (const op of OPS) {
            const value = combine(state[i], state[j], op);
            if (value === null) continue;
            if (value === target) return ops;
            const rest = state.filter((_, index) => index !== i && index !== j);
            rest.push(value);
            rest.sort((left, right) => left - right);
            const key = rest.join(',');
            if (seen.has(key)) continue;
            seen.add(key);
            next.push(rest);
          }
        }
      }
    }
    layer = next;
    if (!layer.length) break;
  }
  return null;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash >>> 0;
}

function rollNumbers(difficulty: TargetDifficulty, rng: () => number) {
  const pick = (span: number) => 1 + Math.floor(rng() * span);
  if (difficulty === 'easy') return Array.from({length: 4}, () => pick(9));
  if (difficulty === 'medium') return Array.from({length: 5}, () => pick(12));
  return [...Array.from({length: 4}, () => pick(10)), LARGE[Math.floor(rng() * LARGE.length)]];
}

function buildTarget(source: number[], steps: number, rng: () => number) {
  let current = source.slice();
  let created = 0;
  for (let step = 0; step < steps; step++) {
    const options: {left: number; right: number; value: number}[] = [];
    for (let i = 0; i < current.length; i++) {
      for (let j = 0; j < current.length; j++) {
        if (i === j) continue;
        for (const op of OPS) {
          const value = combine(current[i], current[j], op);
          if (value !== null) options.push({left: i, right: j, value});
        }
      }
    }
    if (!options.length) return null;
    const choice = options[Math.floor(rng() * options.length)];
    current = current.filter((_, index) => index !== choice.left && index !== choice.right);
    current.push(choice.value);
    created = choice.value;
  }
  return created;
}

function inRange(difficulty: TargetDifficulty, target: number) {
  if (difficulty === 'easy') return target >= 12 && target <= 80;
  if (difficulty === 'medium') return target >= 24 && target <= 250;
  return target >= 100 && target <= 999;
}

export function createPuzzle(difficulty: TargetDifficulty, seed: number): TargetPuzzle {
  const rng = mulberry32(seed || 1);
  const steps = difficulty === 'easy' ? 2 : 3;
  const floor = difficulty === 'easy' ? 1 : 2;
  for (let attempt = 0; attempt < 80; attempt++) {
    const numbers = rollNumbers(difficulty, rng);
    const target = buildTarget(numbers, steps, rng);
    if (target === null || numbers.includes(target) || !inRange(difficulty, target)) continue;
    const minOps = minimumOperations(numbers, target);
    if (minOps === null || minOps < floor) continue;
    return {numbers, target, minOps};
  }
  return {numbers: [2, 5, 7, 10], target: 24, minOps: 2};
}

export function dateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dailyPuzzle(date = new Date()): TargetPuzzle {
  return createPuzzle('medium', hashSeed(`vezin-hedef-${dateKey(date)}`));
}
