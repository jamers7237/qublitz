import { useState } from 'react';
import { assignLedger, submitLedger } from '../../game/puzzles';
import { sensorByAddress } from '../../data/sensors';
import { useGame } from '../../state/store';
import { Modal } from '../common';

const TILES = [2, 3, 5, 7];

export function Ledger() {
  const s = useGame();
  const L = s.puzzles.ledger;
  const [held, setHeld] = useState<number | null>(null);
  const known = (a: number) => s.manual[a - 1].object === sensorByAddress(a)?.id;
  return (
    <Modal title="The Prime Ledger" narrow>
      <p className="small"><i>&quot;Every free switch carries a weight. When they sing together, their weights multiply. The rarest voice begins.&quot;</i></p>
      <p className="small">The four free switches (#2–#5) each lean toward being ON by some odds. Place a ratio tile on each switch. (Drag, or click a tile then a switch.)</p>
      <div className="row">
        {TILES.map((t) => (
          <span key={t} className={`gate-tile ${held === t ? 'sel' : ''}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/odds', String(t))} onClick={() => setHeld(held === t ? null : t)} role="button" tabIndex={0} aria-label={`ratio ${t} to 1`}>
            {t}:1
          </span>
        ))}
      </div>
      <div className="spacer" />
      <div className="row">
        {[2, 3, 4, 5].map((a) => (
          <div
            key={a}
            className={`qslot ${L.assign[a] ? 'filled' : ''}`}
            style={{ width: 96, height: 72, flexDirection: 'column' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); assignLedger(a, Number(e.dataTransfer.getData('text/odds'))); }}
            onClick={() => { if (held) { assignLedger(a, held); setHeld(null); } else if (L.assign[a]) assignLedger(a, null); }}
            role="button"
            tabIndex={0}
            aria-label={`switch ${a}${L.assign[a] ? ` holds ${L.assign[a]}:1` : ''}`}
          >
            <span className="small">#{a}</span>
            <span className="tiny muted">{known(a) ? sensorByAddress(a)!.name.split(' ').pop() : '?'}</span>
            <b>{L.assign[a] ? `${L.assign[a]}:1` : '—'}</b>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <button className="btn primary" disabled={L.solved || Object.values(L.assign).some((v) => !v)} onClick={submitLedger}>
        {L.solved ? 'Balanced ✓' : 'Balance the ledger'}
      </button>
      <p className="tiny muted">Clues found: {L.clues.length}/4. Revisit the objects of the free switches (closet, bin, couch, clock) to notice their ratios.</p>
      {L.solved && <p className="small gold">Weight of a pattern = product of the odds of its lit free switches. The rarest has none lit (weight 1). See the multiplication board in the notebook.</p>}
    </Modal>
  );
}
