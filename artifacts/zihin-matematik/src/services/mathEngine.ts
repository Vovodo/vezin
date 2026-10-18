import type { CustomConfig, Difficulty, MathQuestion, Operation } from '../types/math';

const randomInt=(min:number,max:number)=>Math.floor(Math.random()*(max-min+1))+min;
const pick=<T,>(items:T[])=>items[randomInt(0,items.length-1)];
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const digits=(n:number)=>Math.floor(Math.log10(Math.max(1,n)))+1;
const digitRange=(count:number):[number,number]=>[count===1?1:10**(count-1),10**count-1];
const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);

export function generateQuestion(difficulty:Difficulty='easy', selectedOperations?:Operation[], custom?:CustomConfig):MathQuestion {
  const operations:Operation[]=selectedOperations?.length?selectedOperations:(difficulty==='easy'?['add','subtract','multiply','divide']:['add','subtract','multiply','divide','square','sqrt','percentage','chain']);
  const operation=pick<Operation>(operations);
  let a=0,b=0,answer=0,expression='';
  if(operation==='add'||operation==='subtract'){
    let min=difficulty==='easy'?1:10,max=99;
    if(difficulty==='medium'){min=10;max=999} if(difficulty==='hard'){min=100;max=999}
    if(difficulty==='custom'){min=10**((custom?.digits??2)-1);max=10**(custom?.digits??2)-1}
    a=randomInt(min,max);b=randomInt(min,max);
    if(operation==='subtract'&&b>a)[a,b]=[b,a];
    answer=operation==='add'?a+b:a-b;expression=`${a} ${operation==='add'?'+':'−'} ${b}`;
  } else if(operation==='multiply'){
    if(difficulty==='easy'){a=randomInt(2,9);b=randomInt(2,9)}
    else if(difficulty==='medium'){a=randomInt(2,9);b=randomInt(10,99)}
    else if(difficulty==='hard'){a=randomInt(10,99);b=randomInt(10,99)}
    else {const lo=10**((custom?.digits??2)-1);const hi=10**(custom?.digits??2)-1;a=randomInt(lo,hi);b=randomInt(lo,hi)}
    answer=a*b;expression=`${a} × ${b}`;
  } else if(operation==='divide'){
    if(difficulty==='easy'){b=randomInt(2,9);answer=randomInt(2,9);a=b*answer}
    else if(difficulty==='medium'){b=randomInt(2,12);answer=randomInt(2,Math.floor(999/b));a=b*answer}
    else if(difficulty==='custom'){
      const [min,max]=digitRange(custom?.digits??2);
      b=randomInt(Math.max(2,min),max);
      answer=randomInt(Math.ceil(min/b),Math.floor(max/b));
      a=b*answer;
    }
    else {b=randomInt(2,25);answer=randomInt(10,99);a=b*answer}
    if(difficulty==='hard'&&digits(a)!==3){b=randomInt(5,20);answer=randomInt(Math.ceil(100/b),Math.floor(999/b));a=b*answer}
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
