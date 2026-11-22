import { useEffect, useState } from 'react';
import { photoById, type PhotoDef } from '../data/photos';
import { existingAssetUrl } from '../game/scenes/BootScene';
import { gameStore } from '../state/store';
import { Modal } from './common';

/** Handsome placeholder art per scene type when the real photo is absent. */
function Placeholder({ p }: { p: PhotoDef }) {
  const common = { width: '100%', style: { maxHeight: '62vh', display: 'block' } as const, shapeRendering: 'crispEdges' as const };
  switch (p.placeholderScene) {
    case 'portrait':
      return (
        <svg viewBox="0 0 80 100" {...common} aria-label={p.alt}>
          <rect width="80" height="100" fill="#33456b" />
          <rect x="0" y="70" width="80" height="30" fill="#2a2238" />
          <rect x="26" y="22" width="28" height="30" fill="#f0c8a0" />
          <rect x="22" y="16" width="36" height="12" fill="#6e4a33" />
          <rect x="33" y="34" width="3" height="3" fill="#0a0814" />
          <rect x="45" y="34" width="3" height="3" fill="#0a0814" />
          <rect x="34" y="44" width="12" height="3" fill="#b8383f" />
          <rect x="16" y="54" width="48" height="46" fill="#e46b8f" />
          <rect x="52" y="60" width="22" height="14" fill="#d4d8e6" />
          <rect x="55" y="57" width="6" height="4" fill="#d9a45f" />
          <rect x="64" y="57" width="6" height="4" fill="#d9a45f" />
          <text x="40" y="96" fill="#f1ead8" fontSize="5" textAnchor="middle" fontFamily="monospace">PHOTO PLACEHOLDER — add public/{p.path}</text>
        </svg>
      );
    case 'dorm':
      return (
        <svg viewBox="0 0 120 80" {...common} aria-label={p.alt}>
          <rect width="120" height="80" fill="#3b2f5c" />
          <rect y="50" width="120" height="30" fill="#6e4a33" />
          <rect x="12" y="10" width="34" height="26" fill="#0b1230" stroke="#93643f" strokeWidth="2" />
          <rect x="12" y="10" width="34" height="9" fill="#22336a" />
          <rect x="60" y="34" width="40" height="18" fill="#6b5a8e" />
          <rect x="70" y="20" width="8" height="14" fill="#b8925a" />
          <text x="60" y="76" fill="#f1ead8" fontSize="5" textAnchor="middle" fontFamily="monospace">PHOTO PLACEHOLDER — public/{p.path}</text>
        </svg>
      );
    case 'paper':
    case 'sticky':
      return (
        <svg viewBox="0 0 100 70" {...common} aria-label={p.alt}>
          <rect width="100" height="70" fill="#0b0a12" />
          <rect x="14" y="8" width="72" height="54" fill={p.placeholderScene === 'sticky' ? '#f5e17a' : '#e8dcc0'} />
          <path d="M14 8 l6 4 l-6 4 z M86 62 l-5 -3 l5 -4 z" fill="#3a2a1a" />
        </svg>
      );
    case 'poster':
      return (
        <svg viewBox="0 0 70 100" {...common} aria-label={p.alt}>
          <rect width="70" height="100" fill="#20183a" />
          <circle cx="35" cy="38" r="22" fill="none" stroke="#5fd3c4" strokeWidth="3" />
          <line x1="13" y1="38" x2="57" y2="38" stroke="#e46b8f" strokeWidth="2" />
          <line x1="35" y1="16" x2="35" y2="60" stroke="#f2c46d" strokeWidth="2" />
          <text x="35" y="76" fill="#f2c46d" fontSize="7" textAnchor="middle" fontFamily="monospace">THE EIGENSTATES</text>
          <text x="35" y="86" fill="#f1ead8" fontSize="4.5" textAnchor="middle" fontFamily="monospace">LIVE AT THE BLOCH SPHERE</text>
          <text x="35" y="93" fill="#c9a7ff" fontSize="4.5" textAnchor="middle" fontFamily="monospace">SIDE Z · SIDE X</text>
        </svg>
      );
    case 'projection':
      return (
        <svg viewBox="0 0 120 80" {...common} aria-label={p.alt}>
          <rect width="120" height="80" fill="#0b0a12" />
          <rect x="6" y="6" width="108" height="58" fill="#1d2547" />
          {['1', '10', '11', '100', '101', '110', '111', '1000'].map((t, i) => (
            <g key={t}>
              <rect x={12 + (i % 4) * 26} y={12 + Math.floor(i / 4) * 24} width="22" height="18" fill="#b8862f" />
              <text x={23 + (i % 4) * 26} y={24 + Math.floor(i / 4) * 24} fill="#0a0814" fontSize="6" textAnchor="middle" fontFamily="monospace">{t}</text>
            </g>
          ))}
        </svg>
      );
  }
}

export function PhotoModal({ id }: { id: string }) {
  const p = photoById(id);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    gameStore.update((g) => void (g.flags[`photo_${id}`] = true));
  }, [id]);
  if (!p) return null;
  const url = existingAssetUrl(p.path);
  return (
    <Modal title={p.title}>
      <div className="photo-frame" style={{ overflow: zoom ? 'auto' : 'hidden' }}>
        {url && !failed ? (
          <img src={url} alt={p.alt} onError={() => setFailed(true)} onClick={() => setZoom((z) => !z)} style={{ transform: zoom ? 'scale(1.8)' : 'none', cursor: zoom ? 'zoom-out' : 'zoom-in', transformOrigin: 'center' }} />
        ) : (
          <div style={{ width: 'min(560px, 100%)' }} onClick={() => setZoom((z) => !z)}>
            <div style={{ transform: zoom ? 'scale(1.5)' : 'none', transformOrigin: 'center' }}>
              <Placeholder p={p} />
            </div>
          </div>
        )}
        {p.overlay && <div className={`photo-overlay ${p.overlay.style} pos-${p.overlay.position}`}>{p.overlay.text}</div>}
      </div>
      <p>{p.caption}</p>
      <div className="row">
        <button className="btn small" onClick={() => setZoom((z) => !z)}>{zoom ? 'Zoom out' : 'Zoom in'}</button>
        <span className="tiny muted">Esc to close</span>
      </div>
    </Modal>
  );
}
