import { BarChart3, Brain, Volume2, VolumeX } from 'lucide-react';
import type { Theme } from '../types/math';

export function Header({theme,muted,onMute,onTheme,onStats,statsOpen}:{theme:Theme;muted:boolean;onMute:()=>void;onTheme:()=>void;onStats:()=>void;statsOpen:boolean}) {
  return <header className="topbar">
    <div className="brand"><span className="brand-mark"><Brain size={21}/></span><span>Zihin<span style={{color:'var(--green)'}}>Matematik</span></span></div>
    <div className="top-actions">
      <button className="icon-button" onClick={onStats} aria-label={statsOpen?'Antrenmana dön':'İstatistikleri aç'} data-testid="stats-toggle"><BarChart3 size={16}/><span className="desktop-only">{statsOpen?'Antrenman':'İstatistik'}</span></button>
      <button className="icon-button" onClick={onMute} aria-label={muted?'Sesi aç':'Sesi kapat'} title={muted?'Sesi aç':'Sesi kapat'} data-testid="mute-toggle">{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button>
      <button className="icon-button" onClick={onTheme} aria-label={`Tema: ${theme}; değiştirmek için tıkla`} data-testid="theme-toggle"><span style={{fontSize:13}}>{theme==='light'?'A':theme==='dark'?'K':'N'}</span><span className="desktop-only">{theme==='light'?'Aydınlık':theme==='dark'?'Koyu':'Neon'}</span></button>
    </div>
  </header>
}
