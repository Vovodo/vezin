import { Eye, Grid3x3, Target } from 'lucide-react';
import { LogoMark } from './Logo';

export function GameMenu({onMath,onPattern,onAttention,onTarget}:{onMath:()=>void;onPattern:()=>void;onAttention:()=>void;onTarget:()=>void}) {
  return <section className="game-menu" aria-label="Oyunlar">
    <button className="game-card" onClick={onMath} data-testid="game-math">
      <span className="game-card-mark math-mark" aria-hidden="true"><LogoMark size={28}/></span>
      <span>
        <b>Zihin hesabı</b>
        <small>Aklından çöz, ritmini yakala.</small>
        <em>İşlem hızı</em>
      </span>
    </button>
    <button className="game-card" onClick={onPattern} data-testid="game-pattern">
      <span className="game-card-mark" aria-hidden="true"><Grid3x3 size={28}/></span>
      <span>
        <b>Deseni Hatırla</b>
        <small>Yanan kareleri aynı sırayla tekrarla.</small>
        <em>Görsel bellek · 3×3'ten 6×6'ya</em>
      </span>
    </button>
    <button className="game-card" onClick={onAttention} data-testid="game-attention">
      <span className="game-card-mark" aria-hidden="true"><Eye size={28}/></span>
      <span>
        <b>Dikkat Tuzağı</b>
        <small>Kelimeyi okuma, yazının rengini seç.</small>
        <em>Seçici dikkat · kusursuz seri</em>
      </span>
    </button>
    <button className="game-card" onClick={onTarget} data-testid="game-target">
      <span className="game-card-mark" aria-hidden="true"><Target size={28}/></span>
      <span>
        <b>Hedef Sayı</b>
        <small>Sayıları işle, hedefe en kısa yoldan var.</small>
        <em>Planlama · günlük bulmaca</em>
      </span>
    </button>
  </section>;
}
