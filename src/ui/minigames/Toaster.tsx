import { useState } from 'react';
import { answerToasterCertainty, answerToasterFrequency, runToaster, toasterQuizPair } from '../../game/puzzles';
import { useGame } from '../../state/store';
import { Lamps, Modal, PlayBtn } from '../common';
import { noteLabel } from '../../quantum/codebook';

export function Toaster() {
  const s = useGame();
  const t = s.puzzles.toaster;
  const pair = toasterQuizPair(s);
  const [msg, setMsg] = useState('');
  const [last, setLast] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Many-Worlds Toaster" narrow>
      {!t.unlocked && (
        <>
          <p className="small"><i>&quot;One coincidence proves very little. How many worlds would you need?&quot;</i> A quiz card is taped to the slot.</p>
          {!pair && <p className="small">The card asks about your tallies, but you need at least two notes heard a different number of times. Gather a few more ordinary notes.</p>}
          {pair && t.step === 0 && (
            <>
              <p>Q1. Which of these two ordinary notes have you observed <b>more often</b>?</p>
              {pair.map((p) => (
                <div key={p.outcome} className="row" style={{ marginBottom: 6 }}>
                  <PlayBtn index={p.outcome} />
                  <Lamps index={p.outcome} dimCat />
                  <span className="bits">{'|'.repeat(Math.min(p.count, 40))}</span>
                  <button className="btn small" onClick={() => setMsg(answerToasterFrequency(p.outcome) ? '' : 'Count the tally marks again.')}>This one</button>
                </div>
              ))}
            </>
          )}
          {t.step === 1 && (
            <>
              <p>Q2. Does that prove the more frequent note is <b>certainly</b> the more probable one?</p>
              <div className="col">
                <button className="btn" onClick={() => setMsg(answerToasterCertainty('certain') ? '' : 'The toaster makes a skeptical noise. Small samples fluctuate.')}>Yes, the counts settle it.</button>
                <button className="btn" onClick={() => answerToasterCertainty('evidence')}>No — it&apos;s evidence, not certainty. More independent copies sharpen the estimate.</button>
              </div>
            </>
          )}
          {msg && <p className="bad small">{msg}</p>}
        </>
      )}
      {t.unlocked && (
        <>
          <p className="small">Four slots. Each slot prepares its <b>own fresh copy</b> of the same state and measures it once. Four copies, not four looks at one copy. Your current timeline&apos;s house is untouched.</p>
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setLast(runToaster());
              setTimeout(() => setBusy(false), 4000);
            }}
          >
            {busy ? 'Toasting four worlds…' : 'Press the lever (4 independent copies)'}
          </button>
          {last.length > 0 && (
            <div className="col" style={{ marginTop: 10 }}>
              {last.map((o, i) => (
                <div key={i} className="row small">
                  <span className="title-font tiny">SLICE {i + 1}</span>
                  <PlayBtn index={o} />
                  <Lamps index={o} dimCat />
                  {s.puzzles.listening.solved && <span>{noteLabel(o)}</span>}
                </div>
              ))}
            </div>
          )}
          <p className="tiny muted">Activations so far: {s.counters.toasterActivations}. Archived as ordinary song measurements (source: toaster).</p>
        </>
      )}
    </Modal>
  );
}
