import { X } from 'lucide-react';
import type { CustomConfig, Operation } from '../types/math';
const ops:Operation[]=['square','sqrt','percentage','chain'];
const labels:Record<Operation,string>={add:'Toplama',subtract:'Çıkarma',multiply:'Çarpma',divide:'Bölme',square:'Kare',sqrt:'Karekök',percentage:'Yüzde',chain:'Zincir'};
export function CustomSettingsModal({config,onClose,onSave}:{config:CustomConfig;onClose:()=>void;onSave:(c:CustomConfig)=>void}) {
 const [digits,setDigits]=[config.digits,(n:number)=>onSave({...config,digits:n})];
 const toggle=(operation:Operation)=>{const next=config.operations.includes(operation)?config.operations.filter(o=>o!==operation):[...config.operations,operation];if(next.length)onSave({...config,operations:next})};
 return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="custom-title" data-testid="custom-settings-modal">
  <div className="modal-head"><div><p className="eyebrow">Kişisel ayarlar</p><h2 id="custom-title">Kendi çalışma setin</h2></div><button className="icon-button" onClick={onClose} aria-label="Kapat"><X size={17}/></button></div>
  <label className="field-label" htmlFor="digits">Sayı basamağı</label><select className="field-select" id="digits" value={digits} onChange={e=>setDigits(Number(e.target.value))} data-testid="custom-digits">{[1,2,3,4].map(n=><option value={n} key={n}>{n} basamaklı sayılar</option>)}</select>
   <p className="field-label">Ek ileri işlemler</p><div className="operation-picks">{ops.map(op=><button key={op} className={`operation-pick ${config.operations.includes(op)?'selected':''}`} onClick={()=>toggle(op)} aria-pressed={config.operations.includes(op)} data-testid={`custom-operation-${op}`}>{labels[op]}</button>)}</div>
   <p className="modal-hint">Toplama, çıkarma, çarpma ve bölmeyi ana ekrandan seçebilirsin.</p>
  <div className="action-row" style={{justifyContent:'flex-end'}}><button className="start-button" onClick={onClose} data-testid="custom-settings-done">Tamam</button></div>
 </section></div>
}
