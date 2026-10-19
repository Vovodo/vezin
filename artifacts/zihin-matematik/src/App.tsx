import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Clock3, Flame, RotateCcw, Sparkles, Target } from 'lucide-react';
import { Header } from './components/Header';
import { LogoMark } from './components/Logo';
import { QuizCard } from './components/QuizCard';
import { ModeSelector } from './components/ModeSelector';
import { CustomSettingsModal } from './components/CustomSettingsModal';
import { MissedQuestionsReview } from './components/MissedQuestionsReview';
import { StatsDashboard } from './components/StatsDashboard';
import { createSession, loadData, recordResponse, recordSession, saveData, updateSettings } from './services/analytics';
import { generateUniqueQuestion, generateUniqueQuestions, questionSignature } from './services/mathEngine';
import { soundEffects } from './services/soundEffects';
import { BASIC_OPERATIONS, type AppData, type Difficulty, type GameMode, type MathQuestion, type Operation, type ResponseLog, type SessionRecord } from './types/math';

function App() {
  const [data,setData]=useState<AppData>(()=>loadData());
  const [statsOpen,setStatsOpen]=useState(false);
  const [customOpen,setCustomOpen]=useState(false);
  const [started,setStarted]=useState(false);
  const [running,setRunning]=useState(false);
  const [paused,setPaused]=useState(false);
  const [question,setQuestion]=useState<MathQuestion|null>(null);
  const [queue,setQueue]=useState<MathQuestion[]>([]);
  const [value,setValue]=useState('');
  const [feedback,setFeedback]=useState<'correct'|'wrong'|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const [remaining,setRemaining]=useState<number|null>(null);
  const [answered,setAnswered]=useState(0);
  const [correct,setCorrect]=useState(0);
  const [incorrect,setIncorrect]=useState(0);
  const [sessionStreak,setSessionStreak]=useState(0);
  const [review,setReview]=useState<MathQuestion[]>([]);
  const [result,setResult]=useState<SessionRecord|null>(null);
  const [poolExhausted,setPoolExhausted]=useState(false);
  const [sessionKind,setSessionKind]=useState<'regular'|'errors'|'weak'>('regular');
  const startedAt=useRef(0);
  const questionAt=useRef(0);
  const elapsedRef=useRef(0);
  const pauseAt=useRef(0);
  const responseTimes=useRef<number[]>([]);
  const submitting=useRef(false);
  const autoTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const errorSource=useRef<MathQuestion[]>([]);
  const opsForSession=useRef<Operation[]>([]);
  const seenQuestions=useRef(new Set<string>());

  const commitData=useCallback((next:AppData)=>{setData(next);saveData(next)},[]);
  useEffect(()=>{document.documentElement.dataset.theme=data.settings.theme;document.documentElement.classList.toggle('dark',data.settings.theme==='dark')},[data.settings.theme]);

  const currentModeName= data.settings.mode==='practice'?'Serbest pratik':data.settings.mode==='marathon'?'60 sn maraton':data.settings.mode==='sudden'?'Ani ölüm':'20 soru sprinti';
  const configuredBasicOperations=data.settings.custom.operations.filter(operation=>BASIC_OPERATIONS.includes(operation));
  const visibleOperations=data.settings.difficulty==='custom'
    ?data.settings.custom.operations
    :configuredBasicOperations.length?configuredBasicOperations:BASIC_OPERATIONS;
  const activeOperations=data.settings.difficulty==='custom'?data.settings.custom.operations:visibleOperations;
  const planTotal=data.settings.mode==='sprint'&&sessionKind==='regular'?20:sessionKind==='errors'?queue.length:sessionKind==='weak'?20:0;
  const resetCounts=()=>{setAnswered(0);setCorrect(0);setIncorrect(0);setSessionStreak(0);setReview([]);setResult(null);setElapsed(0);elapsedRef.current=0;responseTimes.current=[];pauseAt.current=0;setRemaining(data.settings.mode==='marathon'?60000:null)};

  const begin=(kind:'regular'|'errors'|'weak'='regular',override?:MathQuestion[])=>{
    const selectedOperations=data.settings.difficulty==='custom'
      ?data.settings.custom.operations
      :configuredBasicOperations.length?configuredBasicOperations:BASIC_OPERATIONS;
    const ops=kind==='weak'?(data.logs.length?(()=>{const stats=new Map<Operation,{t:number;n:number;w:number}>();data.logs.forEach(l=>{const o=stats.get(l.operationType)??{t:0,n:0,w:0};o.t+=l.timeSpentMs;o.n++;if(!l.isCorrect)o.w++;stats.set(l.operationType,o)});const sorted=[...stats].sort((a,b)=>(b[1].w/b[1].n+b[1].t/b[1].n/10000)-(a[1].w/a[1].n+a[1].t/a[1].n/10000));return sorted[0]?.[0]??'add'})():'add'):undefined;
    seenQuestions.current.clear();
    const nextQueue=override??(kind==='regular'?[]:kind==='errors'
      ?errorSource.current.map(question=>({...question,userAnswers:[],timeSpentMs:0}))
      :generateUniqueQuestions(20,data.settings.difficulty,[ops??'add'],seenQuestions.current,data.settings.custom));
    nextQueue.forEach(question=>seenQuestions.current.add(questionSignature(question)));
    const first=nextQueue[0]??generateUniqueQuestion(data.settings.difficulty,selectedOperations,seenQuestions.current,data.settings.custom);
    if(!first){setPoolExhausted(true);setStarted(false);setRunning(false);setQuestion(null);return}
    opsForSession.current=ops?[ops]:selectedOperations;
    setSessionKind(kind);setQueue(nextQueue.slice(1));setQuestion(first);
    resetCounts();setPoolExhausted(false);setStarted(true);setPaused(false);setRunning(true);startedAt.current=Date.now();questionAt.current=Date.now();setValue('');setFeedback(null);submitting.current=false;
  };

  const finish=useCallback((override?:{total?:number;right?:number;wrong?:number})=>{
    setRunning(false);setPaused(false);setStarted(true);
    const total=override?.total??answered,right=override?.right??correct,wrong=override?.wrong??incorrect;
    const duration=Date.now()-startedAt.current;
    const mean=responseTimes.current.length?responseTimes.current.reduce((sum,n)=>sum+n,0)/responseTimes.current.length:undefined;
    const session=createSession(data.settings.mode,data.settings.difficulty,total,right,wrong,duration,sessionStreak,opsForSession.current.length?opsForSession.current:(question?[question.operation]:[]),mean);
    setResult(session);
    if(total>0){const next=recordSession(data,session);commitData(next);if(right>0&&right>=data.bestStreak)soundEffects.record()}
  },[answered,correct,incorrect,data,sessionStreak,commitData,data.settings.mode,data.settings.difficulty,question]);

  useEffect(()=>{
    if(!running||paused)return;
    const interval=window.setInterval(()=>{
      const elapsedNow=Date.now()-startedAt.current;elapsedRef.current=elapsedNow;setElapsed(elapsedNow);
      if(data.settings.mode==='marathon'){
        const left=(remaining??60000)-250;setRemaining(Math.max(0,left));
        if(left<=0)finish();
      }
    },250);
    return()=>window.clearInterval(interval)
  },[running,paused,data.settings.mode,remaining,finish]);

  const nextQuestion=(current:MathQuestion)=>{
    if(sessionKind==='regular'&&data.settings.mode==='sprint'&&correct+1>=20){finish({total:answered+1,right:correct+1,wrong:incorrect});return}
    if(sessionKind!=='regular'&&queue.length===0){finish({total:answered+1,right:correct+1,wrong:incorrect});return}
    const next=queue[0];
    const nextOperations=sessionKind==='weak'&&opsForSession.current.length?opsForSession.current:activeOperations;
    const fresh=next??generateUniqueQuestion(data.settings.difficulty,nextOperations,seenQuestions.current,data.settings.custom);
    if(!fresh){setPoolExhausted(true);finish();return}
    if(next)setQueue(q=>q.slice(1));
    setQuestion(fresh);questionAt.current=Date.now();setValue('');setFeedback(null);submitting.current=false;
  };

  const submit=useCallback(()=>{
    if(!running||!question||submitting.current||!value.trim())return;
    if(autoTimer.current){clearTimeout(autoTimer.current);autoTimer.current=null}
    const answer=Number(value),now=Date.now(),time=Math.max(0,now-questionAt.current),isCorrect=answer===question.correctAnswer;
    responseTimes.current.push(time);
    const log:ResponseLog={questionId:question.id,operationType:question.operation,difficulty:data.settings.difficulty,timeSpentMs:time,isCorrect,timestamp:now};
    commitData(recordResponse(data,log));
    setAnswered(n=>n+1);
    if(isCorrect){
      submitting.current=true;
      setCorrect(n=>n+1);setSessionStreak(n=>n+1);
      if(time>6500&&!review.some(q=>q.id===question.id))setReview(prev=>[...prev,{...question,timeSpentMs:question.timeSpentMs+time,userAnswers:[...question.userAnswers,answer]}]);
      setQuestion({...question,userAnswers:[...question.userAnswers,answer],timeSpentMs:question.timeSpentMs+time});
      setFeedback('correct');if(!data.settings.muted){if(sessionStreak>=4)soundEffects.streak();else soundEffects.correct()}
      if(data.settings.mode==='marathon')setRemaining(n=>(n??60000)+1000);
      window.setTimeout(()=>nextQuestion(question),115);
    }else{
      setIncorrect(n=>n+1);setSessionStreak(0);
      const missed={...question,userAnswers:[...question.userAnswers,answer],timeSpentMs:question.timeSpentMs+time};
      setQuestion(missed);
      setReview(prev=>prev.some(q=>q.id===question.id)?prev.map(q=>q.id===question.id?missed:q):[...prev,missed]);
      setFeedback('wrong');if(!data.settings.muted)soundEffects.wrong();
      if(data.settings.mode==='sudden'){window.setTimeout(()=>finish({total:answered+1,right:correct,wrong:incorrect+1}),180)}
      else {questionAt.current=Date.now();window.setTimeout(()=>{setValue('');setFeedback(null)},260)}
    }
  },[running,question,value,data,commitData,review,data.settings,sessionStreak,nextQuestion,finish,answered,correct,incorrect]);

  useEffect(()=>{
    if(!running||!question||!value||Number(value)!==question.correctAnswer||submitting.current)return;
    autoTimer.current=setTimeout(()=>submit(),280);
    return()=>{if(autoTimer.current)clearTimeout(autoTimer.current)}
  },[value,question,running,submit]);

  const pause=()=>{if(!started||result)return;if(paused){const held=Date.now()-pauseAt.current;startedAt.current+=held;questionAt.current+=held;setPaused(false);setRunning(true)}else{pauseAt.current=Date.now();setPaused(true);setRunning(false)}};
  const restart=()=>begin(sessionKind,sessionKind==='regular'?undefined:sessionKind==='errors'?errorSource.current:undefined);
  const chooseMode=(mode:GameMode)=>{commitData(updateSettings(data,{mode}));setResult(null);setStarted(false);setRunning(false);setPaused(false)};
  const chooseDifficulty=(difficulty:Difficulty)=>{commitData(updateSettings(data,{difficulty}));setResult(null)};
  const toggleOperation=(operation:Operation)=>{
    const configured=data.settings.custom.operations;
    const savedBasic=configured.filter(item=>BASIC_OPERATIONS.includes(item));
    const currentBasic=data.settings.difficulty==='custom'?savedBasic:savedBasic.length?savedBasic:BASIC_OPERATIONS;
    const nextBasic=currentBasic.includes(operation)?currentBasic.filter(item=>item!==operation):[...currentBasic,operation];
    if(!nextBasic.length)return;
    const advanced=configured.filter(item=>!BASIC_OPERATIONS.includes(item));
    commitData(updateSettings(data,{custom:{...data.settings.custom,operations:[...advanced,...nextBasic]}}));
    setResult(null);
  };
  const cycleTheme=()=>{const themes=['light','dark','neon'] as const;const theme=themes[(themes.indexOf(data.settings.theme)+1)%themes.length];commitData(updateSettings(data,{theme}))};
  const toggleMute=()=>commitData(updateSettings(data,{muted:!data.settings.muted}));
  const onWeak=()=>{setStatsOpen(false);begin('weak')};

  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement|null;
      const editable=!!target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName));
      if(editable)return;
      if(e.key===' '||e.key==='Enter'){e.preventDefault();if(running){if(e.key==='Enter')submit()}else if(paused)pause();else if(!result)begin()}
      if(e.key.toLowerCase()==='r'){e.preventDefault();restart()}
      if(e.key==='Escape'){e.preventDefault();if(running||paused)pause();else if(started&&!result)finish()}
      if(['1','2','3','4'].includes(e.key)){const modes:GameMode[]=['practice','marathon','sudden','sprint'];chooseMode(modes[Number(e.key)-1])}
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)
  });

  const repeatErrors=()=>{
    const source=review.length?review:errorSource.current;
    if(!source.length)return;
    errorSource.current=source.map(q=>({...q,userAnswers:[],timeSpentMs:0}));
    setResult(null);begin('errors',errorSource.current.map(q=>({...q,userAnswers:[],timeSpentMs:0})));
  };
  const repeatFromResults=()=>repeatErrors();
  const displayedQuestion=question;
  const allTimeLogs=data.logs;

  return <div className="app-shell" data-theme={data.settings.theme}>
    <div className="wrap">
      <Header theme={data.settings.theme} muted={data.settings.muted} onMute={toggleMute} onTheme={cycleTheme} onStats={()=>setStatsOpen(v=>!v)} statsOpen={statsOpen}/>
      {statsOpen?<StatsDashboard data={data} onWeakWorkout={onWeak}/>:<>
        <div className="hero"><div><p className="eyebrow">Günlük zihin antrenmanı · {new Date().toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})}</p><h1>Hız, biraz<br/>alışkanlık meselesi.</h1><p>Bir dakikanı ayır. Aklından çöz, ritmini yakala ve her gün biraz daha rahatla.</p></div><div className="daily-mark"><div><strong>{data.currentStreak}</strong>seri</div></div></div>
        {result?<div className="main-grid animate-in">
          <section className="panel result-card" data-testid="session-results"><p className="eyebrow">Oturum tamamlandı</p><div className="result-score">{result.correct}<span style={{fontSize:24,color:'var(--subtle)'}}> / {result.total}</span></div><p className="result-subtitle">{poolExhausted?'Bu ayardaki farklı sorular tamamlandı. Yeni turda soru havuzu yeniden karışacak.':result.correct===result.total&&result.total>0?'Temiz ve akıcı bir tur.':result.correct?'İyi iş. Bir tur daha hız kazandırır.':'İlk tekrar tamam. Buradan başlıyoruz.'}</p>
            <div className="result-metrics"><div className="result-metric"><strong>{result.incorrect}</strong><span>YANLIŞ</span></div><div className="result-metric"><strong>{result.averageMs?(result.averageMs/1000).toFixed(2)+'s':'—'}</strong><span>ORT. SÜRE</span></div><div className="result-metric"><strong>{result.total?Math.round(result.correct/result.total*100):0}%</strong><span>DOĞRULUK</span></div><div className="result-metric"><strong>{result.streak}</strong><span>EN İYİ SERİ</span></div></div>
            <MissedQuestionsReview questions={review} onRepeat={repeatFromResults}/>
            <div className="action-row"><button className="start-button" onClick={()=>begin()} data-testid="again-session"><RotateCcw size={15}/> Yeni tur</button><button className="quiet-button" onClick={()=>setStatsOpen(true)} data-testid="results-stats"><BarChart3 size={15}/> İstatistikler</button></div>
          </section>
          <aside className="side-stack"><ModeSelector mode={data.settings.mode} difficulty={data.settings.difficulty} selectedOperations={visibleOperations} onMode={chooseMode} onDifficulty={chooseDifficulty} onCustom={()=>setCustomOpen(true)} onToggleOperation={toggleOperation}/><section className="weak-card"><p className="eyebrow">Güzel bir başlangıç</p><h2>Bugünün pratiği tamam.</h2><p>İlerleme kaydın bu cihazda saklandı. Yarın kaldığın yerden devam et.</p><button className="quiet-button" onClick={()=>begin('weak')} data-testid="result-weak-workout"><Sparkles size={14}/> Güçlü kal</button></section></aside>
        </div>:<div className="main-grid">
          <div className="side-stack">
            <QuizCard question={displayedQuestion} value={value} onValue={setValue} onSubmit={submit} feedback={feedback} running={running} paused={paused} started={started} elapsed={elapsed} remaining={remaining} mode={currentModeName} answered={answered} total={planTotal} onStart={()=>{if(paused){setPaused(false);setRunning(true)}else begin()}} onPause={pause} onRestart={restart} onEscape={()=>finish()}/>
            <div className="below-grid">
              <section className="panel side-panel"><div className="side-title"><h2>Bu oturum</h2><Target size={16} color="var(--green)"/></div><div className="quick-stats"><div className="metric"><strong>{correct}</strong><span>Doğru</span></div><div className="metric"><strong>{incorrect}</strong><span>Yanlış</span></div><div className="metric"><strong>{sessionStreak}</strong><span>Seri</span></div><div className="metric"><strong>{(elapsed/1000).toFixed(0)}s</strong><span>Odak süresi</span></div></div></section>
              <section className="panel side-panel"><div className="side-title"><h2>Odak ipucu</h2><Sparkles size={16} color="var(--orange)"/></div><p style={{fontSize:12,lineHeight:1.7,color:'var(--subtle)',margin:'8px 0 0'}}>Cevabı zihninde tamamla; yazarken ritmini bozma. Yanlış cevaplar yalnızca sana görünür.</p><div className="hint-line"><span className="keycap">Space</span> başlat <span className="keycap">R</span> yeniden başlat <span className="keycap">Esc</span> duraklat</div></section>
            </div>
          </div>
          <aside className="side-stack"><ModeSelector mode={data.settings.mode} difficulty={data.settings.difficulty} selectedOperations={visibleOperations} onMode={chooseMode} onDifficulty={chooseDifficulty} onCustom={()=>setCustomOpen(true)} onToggleOperation={toggleOperation}/>
            <section className="panel side-panel"><div className="side-title"><h2>Senin ritmin</h2><BarChart3 size={16} color="var(--green)"/></div><div className="quick-stats"><div className="metric"><strong>{allTimeLogs.length?`${Math.round(allTimeLogs.filter(l=>l.isCorrect).length/allTimeLogs.length*100)}%`:'—'}</strong><span>Doğruluk</span></div><div className="metric"><strong>{data.bestStreak}</strong><span>En iyi seri</span></div></div><button className="quiet-button" style={{width:'100%',justifyContent:'center',marginTop:12}} onClick={()=>setStatsOpen(true)} data-testid="view-progress"><BarChart3 size={14}/> Tüm ilerlemeyi gör</button></section>
            <section className="weak-card"><span className="weak-symbol"><Flame size={48}/></span><p className="eyebrow">Odaklan, çöz, akışa gir</p><h2>Her gün bir küçük adım.</h2><p>Bir soruya ayırdığın dikkat, hızından daha değerli.</p><div className="eyebrow"><Clock3 size={12} style={{verticalAlign:'middle'}}/> Verilerin yalnızca cihazında</div></section>
          </aside>
        </div>}
      </>}
      <footer className="footer"><span><span className="footer-mark"><LogoMark size={14} /></span>Vezin <span style={{color:'var(--green)'}}>·</span> Kendinle yarış.</span><span>Hesapların bu cihazda saklanır.</span></footer>
    </div>
    {customOpen&&<CustomSettingsModal config={data.settings.custom} onClose={()=>setCustomOpen(false)} onSave={custom=>commitData(updateSettings(data,{custom,difficulty:'custom'}))}/>}
  </div>
}

export default App;
