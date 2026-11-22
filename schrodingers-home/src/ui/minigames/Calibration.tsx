import { useState } from 'react';
import { measureCalibration, placeCalibrationGate } from '../../game/puzzles';
import { useGame } from '../../state/store';
import { Modal } from '../common';

/** Polarity Cabinet: a real one-qubit |0> -> [gate] -> measure experiment (not part of the hidden song). */
export function Calibration() {
  const s = useGame();
  const c = s.puzzles.calibration;
  const [held, setHeld] = useState<'' | 'X' | 'H'>('');
  const [over, setOver] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const place = (g: '' | 'X' | 'H') => {
    placeCalibrationGate(g);
    setHeld('');
  };
  const measure = () => {
    const slot = s.puzzles.calibration.slot;
    const r = measureCalibration();
    setLog((l) => [`|0⟩ → ${slot || '(empty)'} → measured ${r} → lamp ${r ? 'ON' : 'off'}`, ...l].slice(0, 6));
  };
  return (
    <Modal title="Polarity Cabinet" narrow>
      <p className="small">A tiny separate reference qubit, prepared fresh in |0⟩ every time you press MEASURE. It is not one of the house&apos;s eight switches.</p>
      <p className="small muted">&quot;A switch is not a guess. Turn it once, and absence becomes presence.&quot;</p>
      <div className="circuit" aria-label="Circuit: ket zero, gate slot, measurement">
        <span>|0⟩</span>
        <span className="wire" />
        <div
          className={`qslot ${c.slot ? 'filled' : ''} ${over ? 'drop' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); place(e.dataTransfer.getData('text/gate') as 'X' | 'H'); }}
          onClick={() => (held ? place(held) : c.slot && place(''))}
          role="button"
          tabIndex={0}
          aria-label={c.slot ? `Slot holds ${c.slot}; click to remove` : held ? `Place ${held} here` : 'Empty gate slot'}
          onKeyDown={(e) => e.key === 'Enter' && (held ? place(held) : c.slot && place(''))}
        >
          {c.slot || (held ? '⤓' : '')}
        </div>
        <span className="wire" />
        <span>M</span>
        <span className="wire" style={{ width: 24 }} />
        <div className={`big-lamp ${c.lastResult === 1 ? 'on' : ''}`} aria-label={`lamp ${c.lastResult === 1 ? 'on' : 'off'}`} />
      </div>
      <div className="row">
        <span className="small">Gate tiles (drag, or click then click the slot):</span>
        {(['X', 'H'] as const).map((g) => (
          <span
            key={g}
            className={`gate-tile ${held === g ? 'sel' : ''}`}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/gate', g)}
            onClick={() => setHeld(held === g ? '' : g)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setHeld(held === g ? '' : g)}
            aria-label={`${g} gate tile`}
          >
            {g}
          </span>
        ))}
        {c.slot && <button className="btn small" onClick={() => place('')}>Empty slot</button>}
      </div>
      <div className="spacer" />
      <button className="btn primary" onClick={measure}>MEASURE</button>
      <div className="small" style={{ marginTop: 10 }}>
        {log.map((l, i) => <div key={i} className={i ? 'muted' : ''}>{l}</div>)}
      </div>
      <p className="small">
        Checklist: {c.measuredEmpty ? '✓' : '○'} seen the empty circuit · {c.solved ? '✓ an absence became a presence' : '○ make the lamp light with certainty'}
      </p>
      {c.solved && <p className="gold small">Card: &quot;ZERO IS WHAT THE HOUSE LACKS. ONE IS WHAT IT REVEALS.&quot; (copied into your House Manual)</p>}
      {c.slot === 'H' && <p className="tiny muted">The H tile makes the lamp a coin-flip: H|0⟩ is an equal superposition. Each measurement is genuinely random.</p>}
    </Modal>
  );
}
