import { useState } from 'react';
import { knownStrings, patchSwitchboard, type PatchResult } from '../../game/puzzles';
import { PARITY_RELATIONS } from '../../quantum/model';
import { bitAt } from '../../quantum/codebook';
import { useGame } from '../../state/store';
import { Modal } from '../common';

/** Tangled Switchboard: hypothesise "lamp = wire XOR wire" and test it against every recording. */
export function Switchboard() {
  const s = useGame();
  const [target, setTarget] = useState<number | null>(null);
  const [inputs, setInputs] = useState<number[]>([]);
  const [res, setRes] = useState<PatchResult | null>(null);
  const data = knownStrings(s);
  const solved = PARITY_RELATIONS.filter((r) => s.puzzles.switchboard.solved.includes(r.id));
  const ready = target !== null && inputs.length === 2;
  const matches = ready ? data.filter((o) => bitAt(o, target) === (bitAt(o, inputs[0]) ^ bitAt(o, inputs[1]))).length : 0;
  const role = (ad: number) => target === ad ? 'evidence-target' : inputs.includes(ad) ? 'evidence-wire' : '';
  const jack = (ad: number) => {
    setRes(null);
    if (target === null) return setTarget(ad);
    if (ad === target) return setTarget(null);
    setInputs((x) => (x.includes(ad) ? x.filter((y) => y !== ad) : x.length < 2 ? [...x, ad] : [x[1], ad]));
  };
  const patch = () => {
    if (target === null || inputs.length !== 2) return;
    setRes(patchSwitchboard(target, inputs[0], inputs[1]));
  };
  return (
    <Modal title="Tangled Switchboard">
      <p className="small"><i>&quot;Some switches are only shadows of others.&quot;</i> Three lamps on top. Seven jacks below (#2–#8). Pick a <b>lamp light</b> to explain, then two <b>wires</b>. The board tests <span className="bits">lamp = wire ⊕ wire</span> against all {data.length} impressions you have heard.</p>
      <p className="small muted">The three large lamps count rules you have found. Choose your target with the numbered buttons; a rule must fit every recording, not just one. Unplug all to try a different target.</p>
      <div className="row" style={{ margin: '8px 0' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`big-lamp ${solved[i] ? 'on' : ''}`} style={{ width: 34, height: 34 }} title={solved[i] ? `#${solved[i].addresses[2]} = #${solved[i].addresses[0]} ⊕ #${solved[i].addresses[1]}` : 'dark'} />
        ))}
        <span className="small">{solved.length}/3 shadows explained</span>
      </div>
      <div className="row">
        {[2, 3, 4, 5, 6, 7, 8].map((ad) => (
          <button key={ad} className={`btn ${target === ad ? 'primary sel' : inputs.includes(ad) ? 'sel' : ''}`} onClick={() => jack(ad)} aria-pressed={target === ad || inputs.includes(ad)}>
            #{ad}{target === ad ? ' (lamp)' : inputs.includes(ad) ? ' (wire)' : ''}
          </button>
        ))}
      </div>
      <p className="bits" style={{ margin: '10px 0' }}>
        {target !== null ? `#${target}` : '#?'} = {inputs[0] ? `#${inputs[0]}` : '#?'} ⊕ {inputs[1] ? `#${inputs[1]}` : '#?'}
      </p>
      <div className="row">
        <button className="btn primary" disabled={target === null || inputs.length !== 2} onClick={patch}>Patch</button>
        <button className="btn small" onClick={() => { setTarget(null); setInputs([]); setRes(null); }}>Unplug all</button>
      </div>
      {res && (
        <p className={`small ${res.ok ? 'ok' : 'bad'}`}>
          {res.ok && (res.already ? 'Already lit.' : 'The lamp settles into a steady glow. Consistent with every recording.')}
          {!res.ok && res.reason === 'contradiction' && `Sparks! ${res.against} of ${res.total} recordings disagree with that rule.`}
          {!res.ok && res.reason === 'weak' && `No recording contradicts it (${res.total} checked)... but the lamp stays dim. Too few or too similar recordings to trust it — or it is a coincidence.`}
          {!res.ok && res.reason === 'invalid' && 'Pick one lamp and two different wires.'}
        </p>
      )}
      <h3>Your evidence (impressions)</h3>
      <p className="small" id="evidence-help">Each row is one recording; each column is a house address. Gold = on (1), dark = off (0). Look for a lamp that is on exactly when its two wires differ: <b>0 ⊕ 0 = 0; 0 ⊕ 1 = 1; 1 ⊕ 0 = 1; 1 ⊕ 1 = 0.</b></p>
      <p className="small" aria-live="polite">{ready
        ? `Selected rule: #${target} = #${inputs[0]} ⊕ #${inputs[1]}. Matches ${matches}/${data.length} recordings. Compare the highlighted columns, then press Patch to test the rule.`
        : 'Choose one numbered button as the lamp, then two others as wires. Their columns will be highlighted below.'}</p>
      <div className="switchboard-evidence">
        <table className="pix evidence-table" aria-label="Recorded house bits and selected XOR rule" aria-describedby="evidence-help">
          <thead><tr>
            <th scope="col">Recording</th>
            {Array.from({ length: 8 }, (_, k) => <th scope="col" key={k} className={role(k + 1)}>#{k + 1}<span className="evidence-role">{target === k + 1 ? 'lamp' : inputs.includes(k + 1) ? 'wire' : k === 0 ? 'cat' : ''}</span></th>)}
            {ready && <th scope="col">Wire XOR → lamp</th>}
          </tr></thead>
          <tbody>{data.map((o, i) => {
            const actual = target === null ? null : bitAt(o, target);
            const expected = ready ? bitAt(o, inputs[0]) ^ bitAt(o, inputs[1]) : null;
            return <tr key={i}>
              <th scope="row">{i < s.journal.shots.length ? `Note ${i + 1}` : `Tape ${i - s.journal.shots.length + 1}`}</th>
              {Array.from({ length: 8 }, (_, k) => <td key={k} className={role(k + 1)}><span className={`lamp evidence-bit ${bitAt(o, k + 1) ? 'on' : ''}`} aria-label={`Address ${k + 1}: ${bitAt(o, k + 1) ? 'on' : 'off'}`}>{bitAt(o, k + 1)}</span></td>)}
              {ready && <td className={`evidence-check ${actual === expected ? 'ok' : 'bad'}`}>{bitAt(o, inputs[0])} ⊕ {bitAt(o, inputs[1])} = {expected} → {actual} {actual === expected ? '✓ match' : '✕ differs'}</td>}
            </tr>;
          })}</tbody>
        </table>
      </div>
      {data.length === 0 && <p className="small">No recordings yet. Leave through the front door and re-enter to record a note.</p>}
      <p className="tiny muted">Reminder: a consistent pattern in one kind of measurement is correlation, not proof of entanglement.</p>
    </Modal>
  );
}
