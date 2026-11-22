import { setLantern } from '../../game/puzzles';
import { useGame } from '../../state/store';
import { Modal } from '../common';

export function Lantern() {
  const s = useGame();
  return (
    <Modal title="Which-Path Lantern" narrow>
      <p className="small">The lantern looks at <b>one</b> switch first (a partial measurement). Then the record measures the rest from whatever state is left. The final note always agrees with what the lantern saw, because it is sampled from the <i>collapsed</i> state, not drawn independently.</p>
      <p className="small">Choose a switch for the next timeline (it applies once, on the next entry from the hallway, in Side Z mode):</p>
      <div className="row">
        {[2, 3, 4, 5, 6, 7, 8].map((a) => (
          <button key={a} className={`btn small ${s.lanternAddress === a ? 'sel' : ''}`} onClick={() => setLantern(s.lanternAddress === a ? null : a)}>
            #{a}
          </button>
        ))}
        <button className="btn small" onClick={() => setLantern(null)}>off</button>
      </div>
      <p className="small">{s.lanternAddress ? `Primed: the lantern will look at #${s.lanternAddress} first.` : 'Shutter closed.'}</p>
      {s.journal.shots.filter((x) => x.lantern).length > 0 && (
        <>
          <h3>Lantern log</h3>
          <ul className="small">
            {s.journal.shots.filter((x) => x.lantern).slice(-6).map((x) => (
              <li key={x.id}>Loop {x.timeline}: #{x.lantern!.address} read {x.lantern!.bit} first → full note agreed ({((x.outcome >> (8 - x.lantern!.address)) & 1) === x.lantern!.bit ? '✓' : '✗'})</li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
