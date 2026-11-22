import { useState } from 'react';
import { setVaultChord, setVaultOrder, submitVault, vaultInitialOrder } from '../../game/puzzles';
import { noteLabel } from '../../quantum/codebook';
import { audio } from '../../sound/audioEngine';
import { useGame } from '../../state/store';
import { Bits, Modal, PlayBtn, Waveform } from '../common';

/** Sixteen supported event cards: drag-and-drop, or click-to-select then click-to-swap / arrow buttons. */
export function VaultSequencer() {
  const s = useGame();
  const order = s.puzzles.vault.order.length === 16 ? s.puzzles.vault.order : vaultInitialOrder(s);
  const [sel, setSel] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to > 15) return;
    const o = [...order];
    const [x] = o.splice(from, 1);
    o.splice(to, 0, x);
    setVaultOrder(o);
  };
  const swap = (i: number, j: number) => {
    const o = [...order];
    [o[i], o[j]] = [o[j], o[i]];
    setVaultOrder(o);
  };
  const click = (i: number) => {
    if (sel === null) return setSel(i);
    if (sel !== i) swap(sel, i);
    setSel(null);
  };
  const chord = s.puzzles.vault.chord;
  return (
    <Modal title="The Sixteen Grooves">
      <p className="small"><i>&quot;The rarest voice begins. The most inevitable voice finishes.&quot;</i> Arrange all sixteen possible notes from least to most probable, then choose the closing chord.</p>
      <div className="vault-grid" role="list" aria-label="Score order">
        {order.map((idx, i) => (
          <div
            key={idx}
            role="listitem"
            className={`card ${sel === i ? 'sel' : ''} ${over === i ? 'over' : ''}`}
            draggable
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}
            onDragEnd={() => { setDrag(null); setOver(null); }}
            onClick={() => click(i)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(i); }
              if (e.key === 'ArrowLeft') move(i, i - 1);
              if (e.key === 'ArrowRight') move(i, i + 1);
            }}
            aria-label={`Position ${i + 1}: ${noteLabel(idx)}`}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <span onClick={(e) => e.stopPropagation()}><PlayBtn index={idx} /></span>
            </div>
            <div className="name">{noteLabel(idx)}</div>
            <div className="row" style={{ gap: 6 }}>
              <Bits index={idx} />
            </div>
            <Waveform index={idx} height={18} />
            <div className="row" style={{ gap: 4, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
              <button className="btn small" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move earlier">◀</button>
              <button className="btn small" disabled={i === 15} onClick={() => move(i, i + 1)} aria-label="Move later">▶</button>
            </div>
          </div>
        ))}
      </div>
      <p className="tiny muted">Drag cards, or click one card then another to swap them; arrow keys move a focused card.</p>
      <h3>Closing chord</h3>
      <div className="row">
        {(['major', 'minor'] as const).map((c) => (
          <button key={c} className={`btn ${chord === c ? 'sel' : ''}`} onClick={() => { setVaultChord(c); audio.playChord(c); }} aria-pressed={chord === c}>
            C {c}
          </button>
        ))}
        <span className="small muted">Your notebook guess: {s.notebook.chordDraft ? `C ${s.notebook.chordDraft}` : '—'}</span>
      </div>
      <div className="spacer" />
      <div className="row">
        <button className="btn" onClick={() => audio.playMelody(order, chord || undefined)}>▶ Play the whole composition</button>
        <button className="btn primary" disabled={!chord} onClick={() => { setVaultOrder(order); submitVault(); }} data-testid="vault-submit">
          Submit to the vault
        </button>
      </div>
      <p className="tiny muted">A wrong composition destabilises the timeline (you rewind, keeping everything you learned; the secret stays the same).</p>
    </Modal>
  );
}
