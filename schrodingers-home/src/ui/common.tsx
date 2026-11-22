import { useEffect, useState, type ReactNode } from 'react';
import { assetById } from '../assets/manifest';
import { PROCEDURAL } from '../assets/procedural';
import { existingAssetUrl } from '../game/scenes/BootScene';
import { decode, toBits, bitAt } from '../quantum/codebook';
import { audio } from '../sound/audioEngine';
import { closePanel } from '../state/uiActions';

export function Modal(props: { title: ReactNode; children: ReactNode; narrow?: boolean; className?: string; onClose?: () => void; labelledBy?: string }) {
  const close = props.onClose ?? closePanel;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`modal panel ${props.narrow ? 'narrow' : ''} ${props.className ?? ''}`} role="dialog" aria-modal="true" aria-label={typeof props.title === 'string' ? props.title : undefined}>
        <button className="btn small close" onClick={close} aria-label="Close (Esc)">
          ✕
        </button>
        <div className="modal-head">
          <h2>{props.title}</h2>
        </div>
        {props.children}
      </div>
    </div>
  );
}

const iconCache = new Map<string, string>();
/** URL for an item/object icon: teammate PNG if present, else the procedural sprite as a data URL. */
export function iconUrl(id: string): string {
  const entry = assetById(id);
  const real = existingAssetUrl(entry?.url);
  if (real) return real;
  if (iconCache.has(id)) return iconCache.get(id)!;
  const c = document.createElement('canvas');
  c.width = entry?.width ?? 16;
  c.height = entry?.height ?? 16;
  const g = c.getContext('2d')!;
  PROCEDURAL[id]?.(g, c.width, c.height);
  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}

export function Icon({ id, size = 32, alt = '' }: { id: string; size?: number; alt?: string }) {
  return <img className="pixel" src={iconUrl(id)} width={size} height={size} alt={alt} style={{ imageRendering: 'pixelated' }} />;
}

/** Portrait with graceful fallback to an original pixel face. */
export function Portrait({ id }: { id: string }) {
  const url = existingAssetUrl(assetById(id)?.url);
  const [failed, setFailed] = useState(false);
  if (url && !failed) return <img src={url} alt="" onError={() => setFailed(true)} />;
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      <rect width="16" height="16" fill="#1d2547" />
      <rect x="4" y="3" width="8" height="9" fill="#f0c8a0" />
      <rect x="3" y="2" width="10" height="3" fill="#6e4a33" />
      <rect x="3" y="5" width="1" height="3" fill="#6e4a33" />
      <rect x="6" y="7" width="1" height="1" fill="#0a0814" />
      <rect x="9" y="7" width="1" height="1" fill="#0a0814" />
      <rect x="7" y="10" width="2" height="1" fill="#b8383f" />
      <rect x="3" y="12" width="10" height="4" fill="#f2c46d" />
      <rect x="5" y="6" width="2" height="2" fill="none" stroke="#0a0814" strokeWidth="0.4" />
      <rect x="9" y="6" width="2" height="2" fill="none" stroke="#0a0814" strokeWidth="0.4" />
    </svg>
  );
}

export function Bits({ index }: { index: number }) {
  const b = toBits(index);
  return (
    <span className="bits" aria-label={`bits ${b}`}>
      <span className="cat">{b[0]}</span>
      {b.slice(1)}
    </span>
  );
}

export function Lamps({ index, flip, dimCat }: { index: number; flip?: number | null; dimCat?: boolean }) {
  return (
    <span className="lamps" aria-label={`lamps ${toBits(index)}`}>
      {Array.from({ length: 8 }, (_, k) => {
        const a = k + 1;
        const on = bitAt(index, a) === 1;
        return (
          <span key={a} className={`lamp ${on ? 'on' : ''} ${flip === a ? 'flip' : ''} ${dimCat && a === 1 ? 'dim' : ''}`} title={`#${a}: ${on ? 'lit' : 'dark'}`}>
            {a}
          </span>
        );
      })}
    </span>
  );
}

const PITCH_COLORS = ['#ff6b6b', '#ff9f5a', '#f2c46d', '#a5e07e', '#5fd3c4', '#6fa8ff', '#9d8cff', '#e46b8f'];

/** Accessibility aid: wave silhouette — shape = instrument, colour = pitch, width = duration. */
export function Waveform({ index, height = 28 }: { index: number; height?: number }) {
  const d = decode(index);
  const width = 24 + parseInt(d.duration.code, 2) * 22;
  const color = PITCH_COLORS[parseInt(d.pitch.code, 2)];
  const pts: string[] = [];
  const mid = height / 2;
  for (let x = 0; x <= width; x += 2) {
    const t = x / 6;
    const env = d.instrument.id === 'cello' || d.instrument.id === 'piano' ? Math.exp(-x / (width * 0.6)) : d.instrument.id === 'celesta' ? 0.4 + 0.6 * Math.exp(-x / (width * 0.4)) : 0.85;
    let y: number;
    if (d.instrument.id === 'pulse') y = Math.sin(t) >= 0.4 ? 1 : -1;
    else if (d.instrument.id === 'cello') y = ((t / Math.PI) % 2) - 1;
    else if (d.instrument.id === 'celesta') y = 0.6 * Math.sin(t) + 0.4 * Math.sin(t * 4);
    else y = Math.sin(t) * 0.8 + 0.2 * Math.sin(2 * t);
    pts.push(`${x},${(mid - y * env * (mid - 2)).toFixed(1)}`);
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={`waveform`} style={{ background: '#06050d', border: '1px solid #3d3660' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" shapeRendering="crispEdges" />
    </svg>
  );
}

export function PlayBtn({ index, label = '▶' }: { index: number; label?: string }) {
  return (
    <button className="btn small" onClick={() => audio.playEvent(index)} aria-label="Replay recording (no new measurement)" title="Replay (classical playback, not a new measurement)">
      {label}
    </button>
  );
}

export function useInterval(cb: () => void, ms: number | null) {
  useEffect(() => {
    if (ms === null) return;
    const t = setInterval(cb, ms);
    return () => clearInterval(t);
  }, [cb, ms]);
}
