export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'square' | 'sqrt' | 'percentage' | 'chain';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';
export type GameMode = 'practice' | 'marathon' | 'sudden' | 'sprint';
export type Theme = 'light' | 'dark' | 'neon';
export interface MathQuestion { id:string; operand1:number; operand2:number; operation:Operation; correctAnswer:number; userAnswers:number[]; timeSpentMs:number; expression:string; }
export interface ResponseLog { questionId:string; operationType:Operation; difficulty:Difficulty; timeSpentMs:number; isCorrect:boolean; timestamp:number; }
export interface SessionRecord { id:string; mode:GameMode; difficulty:Difficulty; total:number; correct:number; incorrect:number; durationMs:number; averageMs:number; streak:number; completedAt:number; operations:Operation[]; }
export interface CustomConfig { digits:number; operations:Operation[]; }
export interface AppData { logs:ResponseLog[]; sessions:SessionRecord[]; settings:{theme:Theme; muted:boolean; difficulty:Difficulty; mode:GameMode; custom:CustomConfig}; currentStreak:number; bestStreak:number; }
export const OPERATION_LABELS:Record<Operation,string>={add:'Toplama',subtract:'Çıkarma',multiply:'Çarpma',divide:'Bölme',square:'Kare',sqrt:'Karekök',percentage:'Yüzde',chain:'Zincir'};
