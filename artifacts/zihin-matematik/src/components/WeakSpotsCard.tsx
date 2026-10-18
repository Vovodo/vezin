import { ArrowUpRight, Sparkles } from 'lucide-react';
import { weakOperation } from '../services/analytics';
import { OPERATION_LABELS, type ResponseLog } from '../types/math';
export function WeakSpotsCard({logs,onWorkout}:{logs:ResponseLog[];onWorkout:()=>void}) {
 const weak=weakOperation(logs);
 return <section className="weak-card" data-testid="weak-spots-card"><span className="weak-symbol">↗</span><p className="eyebrow">Bir sonraki küçük hedef</p>{weak?<><h2>{OPERATION_LABELS[weak.operation]} biraz daha pratik istiyor.</h2><p>Bu işlemde ortalama {(weak.avg/1000).toFixed(2)} sn harcıyorsun. {weak.comparison>0?`Diğer işlemlerinden %${weak.comparison} daha yavaş.`:`Hata oranı %${Math.round(weak.errorRate*100)}; birkaç tekrar fark yaratabilir.`}</p><button className="quiet-button" onClick={onWorkout} data-testid="weak-workout"><Sparkles size={14}/> 20 soruluk güçlendirme <ArrowUpRight size={13}/></button></>:<><h2>Güçlü yanını birlikte bulalım.</h2><p>Her işlem türünden birkaç soru çöz. Yeterli veri oluşunca kişisel odak önerin burada belirecek.</p><button className="quiet-button" onClick={onWorkout} data-testid="weak-workout"><Sparkles size={14}/> Antrenmana başla <ArrowUpRight size={13}/></button></>}</section>
}
