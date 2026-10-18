import { Check, RotateCcw, X } from 'lucide-react';
import type { MathQuestion } from '../types/math';
export function MissedQuestionsReview({questions,onRepeat}:{questions:MathQuestion[];onRepeat:()=>void}) {
 return <section className="panel side-panel" data-testid="missed-review"><div className="side-title"><h2>Tekrar bakılacaklar</h2><span className="eyebrow">{questions.length} soru</span></div>
  {questions.length?<><div className="review-list">{questions.slice(0,8).map(q=><div className="review-row" key={q.id}><span>{q.expression}</span><span><X size={12} color="var(--destructive)"/> {q.userAnswers.length?q.userAnswers.join(', '):'—'} <small>→ {q.correctAnswer}</small></span></div>)}</div><button className="quiet-button" onClick={onRepeat} data-testid="repeat-errors"><RotateCcw size={14}/> Hataları tekrar et</button></>:<div className="empty-state" style={{padding:'20px 6px'}}><div className="empty-orbit"><Check size={18}/></div><h2>Temiz bir tur.</h2><p>Yanlış ya da yavaş cevap yok. Aynı ritmi koru.</p></div>}
 </section>
}
