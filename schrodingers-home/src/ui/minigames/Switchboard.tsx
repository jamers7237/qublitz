import { useState } from 'react';
import { knownStrings, patchSwitchboard, type PatchResult } from '../../game/puzzles';
import { PARITY_RELATIONS } from '../../quantum/model';
import { useGame } from '../../state/store';
import { Lamps, Modal } from '../common';

/** Tangled Switchboard: hypothesise "lamp = wire XOR wire" and test it against every recording. */
export function Switchboard() {
  const s = useGame();
  const [target, setTarget] = useState<number | null>(null);
  const [inputs, setInputs] = useState<number[]>([]);
  const [res, setRes] = useState<PatchResult | null>(null);
  const data = knownStrings(s);
  const solved = PARITY_RELATIONS.filter((r) => s.puzzles.switchboard.solved.includes(r.id));
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
      <div className="row" style={{ gap: 4, maxHeight: 140, overflow: 'auto' }}>
        {data.map((o, i) => <Lamps key={i} index={o} dimCat />)}
      </div>
      <p className="tiny muted">Reminder: a consistent pattern in one kind of measurement is correlation, not proof of entanglement.</p>
    </Modal>
  );
}
