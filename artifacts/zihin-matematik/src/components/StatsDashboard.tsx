import { Activity, Target, Timer, Zap } from 'lucide-react';
import { accuracy, averageSpeed } from '../services/analytics';
import type { AppData } from '../types/math';
import { WeakSpotsCard } from './WeakSpotsCard';
export function StatsDashboard({data,onWeakWorkout}:{data:AppData;onWeakWorkout:()=>void}) {
 const speed=averageSpeed(data.logs),acc=accuracy(data.logs),sessions=data.sessions.slice(0,10).reverse();
 const chart=sessions.length?sessions.map(s=>s.averageMs):[];
 const max=Math.max(...chart,1);
 return <div className="animate-in">
  <div className="hero"><div><p className="eyebrow">Kişisel ilerleme defteri</p><h1>Her tekrar, daha akıcı.</h1><p>Verilerin yalnızca bu cihazda saklanır. Küçük kazanımların büyük resmine bak.</p></div><div className="daily-mark"><div><strong>{data.sessions.length}</strong>oturum</div></div></div>
  <div className="main-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
   <section className="panel side-panel"><div className="side-title"><h2>Genel performans</h2><Activity size={17} color="var(--green)"/></div><div className="quick-stats">
    <div className="metric"><strong>{speed?(speed/1000).toFixed(2)+' sn':'—'}</strong><span>Ortalama tepki</span></div>
    <div className="metric"><strong>{data.logs.length?`${acc.toFixed(0)}%`:'—'}</strong><span>Doğruluk</span></div>
    <div className="metric"><strong>{data.currentStreak}</strong><span>Mevcut seri</span></div>
    <div className="metric"><strong>{data.bestStreak}</strong><span>En iyi seri</span></div>
   </div><div className="side-title" style={{marginTop:24,marginBottom:4}}><h2>Son 10 oturum · hız</h2><Timer size={16} color="var(--subtle)"/></div>
    {chart.length?<><div className="chart-area" role="img" aria-label="Son oturumların ortalama cevap süresi grafiği">{chart.map((v,i)=><div key={sessions[i].id} className="chart-bar" title={`${(v/1000).toFixed(2)} saniye`} style={{height:`${Math.max(9,100-v/max*78)}%`}} data-testid={`trend-bar-${i}`}/>)}</div><div className="chart-labels"><span>Önceki</span><span>Daha hızlı →</span></div></>:<div className="empty-state" style={{padding:'22px 6px'}}><p>İlk oturumun bittiğinde burada hız trendini göreceksin.</p></div>}
   </section>
   <div style={{display:'grid',gap:14}}><WeakSpotsCard logs={data.logs} onWorkout={onWeakWorkout}/><section className="panel side-panel"><div className="side-title"><h2>Son oturumlar</h2><Target size={16} color="var(--green)"/></div>{sessions.length?data.sessions.slice(0,5).map(s=><div className="review-row" key={s.id}><span>{new Date(s.completedAt).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})} · {s.correct}/{s.total} doğru</span><small>{(s.averageMs/1000).toFixed(2)} sn/yanıt</small></div>):<div className="empty-state" style={{padding:'20px 3px'}}><p>Henüz tamamlanmış antrenman yok. İlkini başlat.</p></div>}</section></div>
  </div>
 </div>
}
