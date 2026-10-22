import { BASIC_OPERATIONS, type CustomConfig, type Difficulty, type MathQuestion, type Operation } from '../types/math';

const MEMORY_KEY='zihin-matematik-mix-v1';
const RECENT_LIMIT=4000;
const PERCENTS=[5,8,10,12,15,16,20,24,25,30,35,40,45,50,60,75,80];

const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);
const digitRange=(count:number):[number,number]=>[count===1?1:10**(count-1),10**count-1];
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

type Held={index:number;waits:number};
type PoolCursor={cursor:number;salt:number;offset:number;deferred:Held[]};
type Memory={
  stamp:number;
  signatures:string[];
  signatureAt:Record<string,number>;
  operands:number[];
  answers:number[];
  operations:Operation[];
  pools:Record<string,PoolCursor>;
};

const memory:Memory={stamp:0,signatures:[],signatureAt:{},operands:[],answers:[],operations:[],pools:{}};

function hashKey(value:string){
  let hash=2166136261;
  for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
  return hash>>>0;
}

function loadMemory(){
  try{
    if(typeof localStorage==='undefined')return;
    const raw=localStorage.getItem(MEMORY_KEY);
    if(!raw)return;
    const data=JSON.parse(raw) as Partial<Memory>;
    if(!Array.isArray(data.signatures)||!data.pools||typeof data.pools!=='object')return;
    memory.stamp=typeof data.stamp==='number'?data.stamp:data.signatures.length;
    memory.signatures=data.signatures.filter(item=>typeof item==='string').slice(-RECENT_LIMIT);
    memory.signatureAt={};
    memory.signatures.forEach((signature,index)=>{memory.signatureAt[signature]=memory.stamp-memory.signatures.length+index+1});
    memory.operands=Array.isArray(data.operands)?data.operands.filter(item=>typeof item==='number').slice(-48):[];
    memory.answers=Array.isArray(data.answers)?data.answers.filter(item=>typeof item==='number').slice(-24):[];
    memory.operations=Array.isArray(data.operations)?data.operations.filter((item):item is Operation=>typeof item==='string').slice(-16):[];
    memory.pools={};
    for(const [key,pool] of Object.entries(data.pools)){
      if(!pool||typeof pool.cursor!=='number'||typeof pool.salt!=='number'||typeof pool.offset!=='number')continue;
      const deferred=Array.isArray(pool.deferred)?pool.deferred.flatMap(item=>{
        if(typeof item==='number')return [{index:item,waits:0}];
        if(item&&typeof item==='object'&&typeof (item as Held).index==='number')return [{index:(item as Held).index,waits:typeof (item as Held).waits==='number'?(item as Held).waits:0}];
        return [];
      }).slice(-24):[];
      memory.pools[key]={cursor:pool.cursor,salt:pool.salt>>>0,offset:pool.offset>>>0,deferred};
    }
  }catch{/* Keep the in-memory deck when storage is unreadable. */}
}

function saveMemory(){
  try{
    if(typeof localStorage==='undefined')return;
    const pools:Record<string,PoolCursor>={};
    for(const [key,pool] of Object.entries(memory.pools))pools[key]={...pool,deferred:pool.deferred.slice(-40)};
    localStorage.setItem(MEMORY_KEY,JSON.stringify({
      stamp:memory.stamp,
      signatures:memory.signatures.slice(-RECENT_LIMIT),
      operands:memory.operands.slice(-48),
      answers:memory.answers.slice(-24),
      operations:memory.operations.slice(-16),
      pools,
    }));
  }catch{/* The current session still keeps the deck in memory. */}
}

loadMemory();

function remember(question:MathQuestion){
  const signature=questionSignature(question);
  memory.stamp++;
  memory.signatureAt[signature]=memory.stamp;
  memory.signatures.push(signature);
  if(memory.signatures.length>RECENT_LIMIT){
    const removed=memory.signatures.shift();
    if(removed&&memory.signatureAt[removed]!==undefined&&!memory.signatures.includes(removed))delete memory.signatureAt[removed];
  }
  memory.operands.push(question.operand1,question.operand2);
  if(memory.operands.length>48)memory.operands.splice(0,memory.operands.length-48);
  memory.answers.push(question.correctAnswer);
  if(memory.answers.length>24)memory.answers.splice(0,memory.answers.length-24);
  memory.operations.push(question.operation);
  if(memory.operations.length>16)memory.operations.shift();
  saveMemory();
}

function basicBand(difficulty:Difficulty,custom?:CustomConfig):[number,number]{
  if(difficulty==='custom')return digitRange(custom?.digits??2);
  if(difficulty==='easy')return [2,70];
  if(difficulty==='medium')return [10,99];
  return [100,999];
}

function coprimeStep(salt:number,size:number){
  if(size<=1)return 1;
  let step=1+((salt>>>0)%(size-1));
  while(gcd(step,size)!==1)step=step>=size-1?1:step+1;
  return step;
}

function permute(index:number,size:number,pool:PoolCursor){
  if(size<=1)return 0;
  const mixed=(pool.offset+index*coprimeStep(pool.salt,size))%size;
  return mixed<0?mixed+size:mixed;
}

function pairsBefore(index:number,count:number){
  return index*count-(index*(index-1))/2;
}

function unrankPair(rank:number,count:number):[number,number]{
  let low=0,high=count-1;
  while(low<high){
    const mid=Math.floor((low+high+1)/2);
    if(pairsBefore(mid,count)<=rank)low=mid;
    else high=mid-1;
  }
  return [low,low+(rank-pairsBefore(low,count))];
}

function unrankStrict(rank:number,count:number):[number,number]{
  let low=1,high=count-1;
  while(low<high){
    const mid=Math.floor((low+high+1)/2);
    if(mid*(mid-1)/2<=rank)low=mid;
    else high=mid-1;
  }
  return [low,rank-low*(low-1)/2];
}

type Draft={operation:Operation;operand1:number;operand2:number;correctAnswer:number;expression:string};
type Pool={key:string;size:number;at:(index:number,salt:number)=>Draft};

const divideCache=new Map<string,Array<[number,number]>>();
const sumCache=new Map<string,Array<[number,number]>>();

function addBand(difficulty:Difficulty,custom?:CustomConfig):[number,number]{
  if(difficulty==='custom')return digitRange(custom?.digits??2);
  if(difficulty==='easy')return [23,78];
  if(difficulty==='medium')return [36,99];
  return [101,999];
}

function taxingSum(left:number,right:number){
  if(left<10||right<10||left%10===0||right%10===0||left%100===0||right%100===0)return false;
  return (left%10)+(right%10)>=10;
}

function taxingDifference(larger:number,smaller:number){
  if(smaller<10||larger%10===0||smaller%10===0||larger%100===0||smaller%100===0)return false;
  if((larger%10)>=(smaller%10))return false;
  return larger-smaller>=12;
}

function sumPairs(min:number,max:number,operation:'add'|'subtract'){
  const key=`${operation}:${min}:${max}`;
  const cached=sumCache.get(key);
  if(cached)return cached;
  const pairs:Array<[number,number]>=[];
  if(operation==='add'){
    for(let left=min;left<=max;left++){
      for(let right=left;right<=max;right++){
        if(taxingSum(left,right))pairs.push([left,right]);
      }
    }
  }else{
    for(let larger=min+1;larger<=max;larger++){
      for(let smaller=min;smaller<larger;smaller++){
        if(taxingDifference(larger,smaller))pairs.push([larger,smaller]);
      }
    }
  }
  sumCache.set(key,pairs);
  return pairs;
}

function dividePairs(min:number,max:number){
  const key=`${min}:${max}`;
  const cached=divideCache.get(key);
  if(cached)return cached;
  const pairs:Array<[number,number]>=[];
  for(let divisor=Math.max(2,min);divisor<=max;divisor++){
    const quotientMin=Math.max(2,Math.ceil(min/divisor));
    const quotientMax=Math.floor(max/divisor);
    for(let quotient=quotientMin;quotient<=quotientMax;quotient++)pairs.push([divisor,quotient]);
  }
  divideCache.set(key,pairs);
  return pairs;
}

function makePool(difficulty:Difficulty,operation:Operation,custom?:CustomConfig):Pool|null{
  const digits=custom?.digits??2;
  const key=`${difficulty}:${operation}:${digits}`;
  if(operation==='add'||operation==='subtract'){
    const [min,max]=addBand(difficulty,custom);
    if(difficulty==='custom'&&(custom?.digits??2)<=1){
      const count=max-min+1;
      const size=operation==='add'?count*(count+1)/2:count*(count-1)/2;
      if(size<=0)return null;
      return {key,size,at:(index,salt)=>{
        if(operation==='add'){
          const [left,right]=unrankPair(index,count);
          let operand1=min+left,operand2=min+right;
          if(operand1!==operand2&&((index+salt)&1)===1)[operand1,operand2]=[operand2,operand1];
          return {operation,operand1,operand2,correctAnswer:operand1+operand2,expression:`${operand1} + ${operand2}`};
        }
        const [larger,smaller]=unrankStrict(index,count);
        const operand1=min+larger,operand2=min+smaller;
        return {operation,operand1,operand2,correctAnswer:operand1-operand2,expression:`${operand1} − ${operand2}`};
      }};
    }
    const pairs=sumPairs(min,max,operation);
    if(!pairs.length)return null;
    return {key:`${key}:${min}:${max}`,size:pairs.length,at:(index,salt)=>{
      const [first,second]=pairs[index];
      if(operation==='subtract')return {operation,operand1:first,operand2:second,correctAnswer:first-second,expression:`${first} − ${second}`};
      let operand1=first,operand2=second;
      if(operand1!==operand2&&((index+salt)&1)===1)[operand1,operand2]=[operand2,operand1];
      return {operation,operand1,operand2,correctAnswer:operand1+operand2,expression:`${operand1} + ${operand2}`};
    }};
  }
  if(operation==='multiply'){
    const digits=difficulty==='custom'?custom?.digits??2:difficulty==='easy'?1:difficulty==='medium'?2:3;
    if(digits<=1){
      const min=2,count=8;
      const size=count*(count+1)/2;
      return {key:`${key}:1digit`,size,at:(index,salt)=>{
        const [left,right]=unrankPair(index,count);
        let operand1=min+left,operand2=min+right;
        if(operand1!==operand2&&((index+salt)&1)===1)[operand1,operand2]=[operand2,operand1];
        return {operation,operand1,operand2,correctAnswer:operand1*operand2,expression:`${operand1} × ${operand2}`};
      }};
    }
    const [leftMin,leftMax]=digitRange(digits);
    const lefts:number[]=[];
    for(let value=leftMin;value<=leftMax;value++)if(value%10!==0)lefts.push(value);
    const factorMin=2,factorMax=9;
    const factorCount=factorMax-factorMin+1;
    const size=lefts.length*factorCount;
    return {key:`${key}:${leftMin}:${leftMax}:noround`,size,at:(index,salt)=>{
      const left=lefts[Math.floor(index/factorCount)];
      const factor=factorMin+index%factorCount;
      let operand1=left,operand2=factor;
      if(((index+salt)&1)===1)[operand1,operand2]=[operand2,operand1];
      return {operation,operand1,operand2,correctAnswer:left*factor,expression:`${operand1} × ${operand2}`};
    }};
  }
  if(operation==='divide'){
    if(difficulty==='easy'){
      const divisorMin=2,divisorMax=12,quotientMin=2,quotientMax=96;
      const quotientCount=quotientMax-quotientMin+1;
      const size=(divisorMax-divisorMin+1)*quotientCount;
      return {key,size,at:index=>{
        const divisor=divisorMin+Math.floor(index/quotientCount);
        const quotient=quotientMin+(index%quotientCount);
        return {operation,operand1:divisor*quotient,operand2:divisor,correctAnswer:quotient,expression:`${divisor*quotient} ÷ ${divisor}`};
      }};
    }
    const [min,max]=basicBand(difficulty,custom);
    const pairs=dividePairs(min,max);
    if(!pairs.length)return null;
    return {key:`${key}:${min}:${max}`,size:pairs.length,at:index=>{
      const [divisor,quotient]=pairs[index];
      return {operation,operand1:divisor*quotient,operand2:divisor,correctAnswer:quotient,expression:`${divisor*quotient} ÷ ${divisor}`};
    }};
  }
  if(operation==='square'||operation==='sqrt'){
    const [min,max]=difficulty==='custom'?digitRange(digits):difficulty==='easy'?[2,30]:difficulty==='medium'?[8,55]:[15,99];
    const low=operation==='sqrt'?Math.max(2,Math.ceil(Math.sqrt(min))):Math.max(2,min);
    const high=operation==='sqrt'?Math.max(low,Math.floor(Math.sqrt(max))):max;
    const size=high-low+1;
    if(size<=0)return null;
    return {key:`${key}:${low}:${high}`,size,at:index=>{
      const root=low+index;
      if(operation==='square')return {operation,operand1:root,operand2:0,correctAnswer:root*root,expression:`${root}²`};
      return {operation,operand1:root*root,operand2:0,correctAnswer:root,expression:`√${root*root}`};
    }};
  }
  if(operation==='percentage'){
    const [min,max]=difficulty==='custom'?digitRange(digits):difficulty==='easy'?[24,640]:difficulty==='medium'?[40,2800]:[120,9600];
    const groups=PERCENTS.map(percent=>{
      const step=100/gcd(percent,100);
      const first=Math.ceil(min/step)*step;
      const count=first>max?0:Math.floor((max-first)/step)+1;
      return {percent,step,first,count};
    }).filter(group=>group.count>0);
    const size=groups.reduce((sum,group)=>sum+group.count,0);
    if(!size)return null;
    return {key:`${key}:${min}:${max}`,size,at:index=>{
      let cursor=index;
      const group=groups.find(item=>{if(cursor<item.count)return true;cursor-=item.count;return false})??groups[0];
      const base=group.first+cursor*group.step;
      return {operation,operand1:base,operand2:group.percent,correctAnswer:base*group.percent/100,expression:`${base} sayısının %${group.percent}’i`};
    }};
  }
  const chain=chainPool(difficulty,custom);
  return chain&&{key,size:chain.size,at:index=>chain.at(index)};
}

function chainPool(difficulty:Difficulty,custom?:CustomConfig){
  const customBand=digitRange(custom?.digits??2);
  const [min,max]=difficulty==='custom'?customBand:difficulty==='easy'?[3,18]:difficulty==='medium'?[6,36]:[12,72];
  const factorMax=difficulty==='custom'?Math.min(max,custom?.digits&&custom.digits>2?24:max):difficulty==='easy'?9:difficulty==='medium'?14:18;
  const factorMin=Math.min(2,factorMax);
  const width=max-min+1;
  const factorWidth=factorMax-factorMin+1;
  if(width<=1||factorWidth<=0)return null;
  const addMul=width*width*factorWidth;
  const subMul=(width*(width-1)/2)*factorWidth;
  const subAdd=(width*(width-1)/2)*width;
  const templates=[{count:addMul},{count:subMul},{count:addMul},{count:subAdd}];
  const size=templates.reduce((sum,template)=>sum+template.count,0);
  return {size,at:(index:number):Draft=>{
    let cursor=index;
    let template=0;
    for(let i=0;i<templates.length;i++){
      if(cursor<templates[i].count){template=i;break}
      cursor-=templates[i].count;
    }
    if(template===0||template===2){
      const c=factorMin+cursor%factorWidth;
      const pair=Math.floor(cursor/factorWidth);
      const a=min+Math.floor(pair/width),b=min+pair%width;
      if(template===0)return {operation:'chain',operand1:a,operand2:b,correctAnswer:(a+b)*c,expression:`(${a} + ${b}) × ${c}`};
      return {operation:'chain',operand1:a,operand2:b,correctAnswer:a*b+c,expression:`${a} × ${b} + ${c}`};
    }
    if(template===1){
      const c=factorMin+cursor%factorWidth;
      const rank=Math.floor(cursor/factorWidth);
      const [larger,smaller]=unrankStrict(rank,width);
      const a=min+larger,b=min+smaller;
      return {operation:'chain',operand1:a,operand2:b,correctAnswer:(a-b)*c,expression:`(${a} − ${b}) × ${c}`};
    }
    const c=min+cursor%width;
    const rank=Math.floor(cursor/width);
    const [larger,smaller]=unrankStrict(rank,width);
    const a=min+larger,b=min+smaller;
    return {operation:'chain',operand1:a,operand2:b,correctAnswer:a-b+c,expression:`${a} − ${b} + ${c}`};
  }};
}

function toQuestion(draft:Draft):MathQuestion{
  return {...draft,id:id(),userAnswers:[],timeSpentMs:0};
}

function endingLoad(value:number){
  const ending=Math.abs(value)%10;
  return memory.operands.slice(-12).reduce((sum,item)=>sum+(Math.abs(item)%10===ending?1:0),0);
}

function proximity(draft:Draft){
  let score=0;
  const recentOperands=memory.operands.slice(-24);
  if(recentOperands.includes(draft.operand1))score+=48;
  if(draft.operand2&&recentOperands.includes(draft.operand2))score+=48;
  if(memory.answers.slice(-6).includes(draft.correctAnswer))score+=22;
  score+=endingLoad(draft.operand1)*5;
  if(draft.operand2)score+=endingLoad(draft.operand2)*5;
  if(draft.operand1===draft.operand2)score+=14;
  const round=(value:number)=>value>=10&&value%10===0;
  const recentRounds=memory.operands.slice(-8).filter(round).length;
  if((round(draft.operand1)||round(draft.operand2))&&recentRounds>=2)score+=18;
  const previousLeft=memory.operands.at(-2);
  const previousRight=memory.operands.at(-1);
  if(previousLeft!==undefined&&previousRight!==undefined){
    if(Math.abs(previousLeft-draft.operand1)<=1&&Math.abs(previousRight-draft.operand2)<=1)score+=48;
  }
  if(memory.operations.at(-1)===draft.operation&&memory.operations.length>1)score+=6;
  return score;
}

function signatureAge(signature:string){
  const seenAt=memory.signatureAt[signature];
  if(seenAt===undefined)return Number.POSITIVE_INFINITY;
  return memory.stamp-seenAt;
}

function poolCursor(key:string,size:number){
  const existing=memory.pools[key];
  if(existing)return existing;
  const created={cursor:0,salt:(hashKey(key)|1)>>>0,offset:size?hashKey(`${key}:offset`)%size:0,deferred:[]};
  memory.pools[key]=created;
  return created;
}

function slotAt(pool:Pool,cursor:PoolCursor,index:number){
  if(index<0||index>=pool.size)return null;
  const draft=pool.at(permute(index,pool.size,cursor),cursor.salt);
  const question=toQuestion(draft);
  const signature=questionSignature(question);
  return {draft,question,signature};
}

function recycle(pool:Pool,cursor:PoolCursor){
  cursor.cursor=0;
  cursor.deferred=[];
  cursor.salt=(Math.imul(cursor.salt,5)+1)>>>0;
  cursor.offset=pool.size?(cursor.offset+1+hashKey(String(cursor.salt)))%pool.size:0;
}

function drawFromPool(pool:Pool,seen:Set<string>){
  const cursor=poolCursor(pool.key,pool.size);
  const fresh=(index:number)=>index>=0&&index<pool.size&&!seen.has(slotAt(pool,cursor,index)!.signature);
  cursor.deferred=cursor.deferred.filter(item=>fresh(item.index));
  while(cursor.cursor<pool.size&&!fresh(cursor.cursor))cursor.cursor++;
  if(cursor.cursor>=pool.size&&!cursor.deferred.length){
    recycle(pool,cursor);
    while(cursor.cursor<pool.size&&!fresh(cursor.cursor))cursor.cursor++;
    if(cursor.cursor>=pool.size)return null;
  }
  cursor.deferred.forEach(item=>{item.waits++});
  const lookahead=cursor.deferred.length>=16?1:8;
  const candidates:Held[]=cursor.deferred.map(item=>({...item}));
  for(let look=0;look<lookahead&&cursor.cursor+look<pool.size;look++){
    const index=cursor.cursor+look;
    if(fresh(index))candidates.push({index,waits:0});
  }
  let best:{index:number;question:MathQuestion;score:number}|null=null;
  for(const candidate of candidates){
    const slot=slotAt(pool,cursor,candidate.index);
    if(!slot||seen.has(slot.signature))continue;
    const age=signatureAge(slot.signature);
    const repeatPenalty=Number.isFinite(age)?Math.max(0,Math.min(pool.size,RECENT_LIMIT)*0.92-age):0;
    const score=proximity(slot.draft)+repeatPenalty*2-candidate.waits*15;
    if(!best||score<best.score)best={index:candidate.index,question:slot.question,score};
  }
  if(!best)return null;
  cursor.deferred=cursor.deferred.filter(item=>item.index!==best.index);
  if(best.index>=cursor.cursor){
    for(let skipped=cursor.cursor;skipped<best.index&&cursor.deferred.length<24;skipped++){
      if(fresh(skipped))cursor.deferred.push({index:skipped,waits:0});
    }
    cursor.cursor=best.index+1;
  }
  return best.question;
}

function chooseOperation(operations:Operation[]){
  const recent=memory.operations.slice(-operations.length*2);
  const ranked=[...operations].sort((left,right)=>hashKey(`${memory.stamp}:${left}`)-hashKey(`${memory.stamp}:${right}`));
  ranked.sort((left,right)=>recent.filter(item=>item===left).length-recent.filter(item=>item===right).length);
  return ranked[0];
}

function drawQuestion(difficulty:Difficulty,operations:Operation[],seen:Set<string>,custom?:CustomConfig){
  const pending=[...new Set(operations)];
  const preferred=chooseOperation(pending);
  const ordered=[preferred,...pending.filter(operation=>operation!==preferred)];
  for(const operation of ordered){
    const pool=makePool(difficulty,operation,custom);
    if(!pool)continue;
    const question=drawFromPool(pool,seen);
    if(question){
      remember(question);
      return question;
    }
  }
  return null;
}

export function questionSignature(question:MathQuestion):string {
  if(question.operation==='add'||question.operation==='multiply'){
    const [first,second]=[question.operand1,question.operand2].sort((a,b)=>a-b);
    return `${question.operation}:${first}:${second}`;
  }
  return `${question.operation}:${question.expression.replace(/\s+/g,'').toLocaleLowerCase('tr-TR')}`;
}

export function generateQuestion(difficulty:Difficulty='easy', selectedOperations?:Operation[], custom?:CustomConfig):MathQuestion {
  const operations=selectedOperations?.length?selectedOperations:BASIC_OPERATIONS;
  const question=drawQuestion(difficulty,operations,new Set(),custom);
  if(question)return question;
  throw new Error('Bu ayar için soru üretilemedi.');
}

export function generateQuestions(count:number,difficulty:Difficulty,operations?:Operation[],custom?:CustomConfig):MathQuestion[]{
  return Array.from({length:count},()=>generateQuestion(difficulty,operations,custom));
}

export function generateUniqueQuestion(
  difficulty:Difficulty,
  operations:Operation[],
  seen:Set<string>,
  custom?:CustomConfig,
):MathQuestion|null {
  const question=drawQuestion(difficulty,operations.length?operations:BASIC_OPERATIONS,seen,custom);
  if(!question)return null;
  seen.add(questionSignature(question));
  return question;
}

export function generateUniqueQuestions(
  count:number,
  difficulty:Difficulty,
  operations:Operation[],
  seen:Set<string>,
  custom?:CustomConfig,
):MathQuestion[] {
  const questions:MathQuestion[]=[];
  while(questions.length<count){
    const question=generateUniqueQuestion(difficulty,operations,seen,custom);
    if(!question)break;
    questions.push(question);
  }
  return questions;
}
