import { BASIC_OPERATIONS, type CustomConfig, type Difficulty, type MathQuestion, type Operation } from '../types/math';

const randomInt=(min:number,max:number)=>Math.floor(Math.random()*(max-min+1))+min;
const pick=<T,>(items:T[])=>items[randomInt(0,items.length-1)];
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const digitRange=(count:number):[number,number]=>[count===1?1:10**(count-1),10**count-1];
const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);

export function generateQuestion(difficulty:Difficulty='easy', selectedOperations?:Operation[], custom?:CustomConfig):MathQuestion {
  const operations:Operation[]=selectedOperations??BASIC_OPERATIONS;
  if(!operations.length)throw new Error('En az bir işlem seçilmelidir.');
  const operation=pick<Operation>(operations);
  let a=0,b=0,answer=0,expression='';
  if(operation==='add'||operation==='subtract'){
    const [min,max]=difficulty==='custom'?digitRange(custom?.digits??2):digitRange(difficulty==='easy'?1:difficulty==='medium'?2:3);
    a=randomInt(min,max);b=randomInt(min,max);
    if(operation==='subtract'&&b>a)[a,b]=[b,a];
    answer=operation==='add'?a+b:a-b;expression=`${a} ${operation==='add'?'+':'−'} ${b}`;
  } else if(operation==='multiply'){
    const [min,max]=difficulty==='custom'?digitRange(custom?.digits??2):digitRange(difficulty==='easy'?1:difficulty==='medium'?2:3);
    a=randomInt(min,max);b=randomInt(min,max);
    answer=a*b;expression=`${a} × ${b}`;
  } else if(operation==='divide'){
    const [min,max]=difficulty==='custom'?digitRange(custom?.digits??2):digitRange(difficulty==='easy'?1:difficulty==='medium'?2:3);
    b=randomInt(Math.max(2,min),max);
    answer=randomInt(Math.ceil(min/b),Math.floor(max/b));
    a=b*answer;
    expression=`${a} ÷ ${b}`;
  } else if(operation==='square'){
    const [min,max]=digitRange(custom?.digits??2);
    a=difficulty==='custom'?randomInt(min,max):randomInt(11,30);answer=a*a;expression=`${a}²`;
  } else if(operation==='sqrt'){
    if(difficulty==='custom'){
      const [min,max]=digitRange(custom?.digits??2);
      a=randomInt(Math.ceil(Math.sqrt(min)),Math.floor(Math.sqrt(max)));
    } else a=randomInt(2,30);
    b=a*a;answer=a;expression=`√${b}`;
  } else if(operation==='percentage'){
    let base:number,percent:number;
    if(difficulty==='custom'){
      const [min,max]=digitRange(custom?.digits??2);
      const options=[5,10,15,20,25,50,75].flatMap(value=>{
        const step=100/gcd(value,100),first=Math.ceil(min/step)*step;
        const count=Math.floor((max-first)/step)+1;
        return count>0?[{value,step,first,count}]:[];
      });
      const chosen=pick(options);
      base=chosen.first+randomInt(0,chosen.count-1)*chosen.step;percent=chosen.value;
    } else [base,percent]=pick([[40,5],[60,10],[80,25],[100,15],[120,15],[160,25],[200,75],[240,15],[300,30],[400,5],[450,10],[600,15]]);
    a=base;b=percent;answer=a*percent/100;expression=`${a} sayısının %${percent}’i`;
  } else {
    const [min,max]=difficulty==='custom'?digitRange(custom?.digits??2):[6,24];
    const secondMin=difficulty==='custom'?min:4,secondMax=difficulty==='custom'?max:18;
    const thirdMin=difficulty==='custom'?min:2,thirdMax=difficulty==='custom'?max:9;
    const first=randomInt(min,max),second=randomInt(secondMin,secondMax),third=randomInt(thirdMin,thirdMax);
    if(Math.random()<.5){a=first;b=second;answer=(a+b)*third;expression=`(${a} + ${b}) × ${third}`}
    else{a=Math.max(first,second);b=Math.min(first,second);answer=a-b+third;expression=`${a} − ${b} + ${third}`}
  }
  return {id:id(),operand1:a,operand2:b,operation,correctAnswer:answer,userAnswers:[],timeSpentMs:0,expression};
}

export function generateQuestions(count:number,difficulty:Difficulty,operations?:Operation[],custom?:CustomConfig):MathQuestion[]{
  return Array.from({length:count},()=>generateQuestion(difficulty,operations,custom));
}

export function questionSignature(question:MathQuestion):string {
  if(question.operation==='add'||question.operation==='multiply'){
    const [first,second]=[question.operand1,question.operand2].sort((a,b)=>a-b);
    return `${question.operation}:${first}:${second}`;
  }
  return `${question.operation}:${question.expression.replace(/\s+/g,'').toLocaleLowerCase('tr-TR')}`;
}

export function generateUniqueQuestion(
  difficulty:Difficulty,
  operations:Operation[],
  seen:Set<string>,
  custom?:CustomConfig,
):MathQuestion|null {
  for(let attempt=0;attempt<5000;attempt++){
    const question=generateQuestion(difficulty,operations,custom);
    const signature=questionSignature(question);
    if(!seen.has(signature)){
      seen.add(signature);
      return question;
    }
  }
  return null;
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
