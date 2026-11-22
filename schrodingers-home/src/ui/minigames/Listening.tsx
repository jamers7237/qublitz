import { useState } from 'react';
import { auditionFlip, compareRecordings, listeningRecordings, setListeningLabel, submitListening } from '../../game/puzzles';
import { flipAddress } from '../../quantum/codebook';
import { audio } from '../../sound/audioEngine';
import { useGame } from '../../state/store';
import type { PropertyLabel } from '../../state/types';
import { Lamps, Modal, PlayBtn, Waveform } from '../common';

export function Listening() {
  const s = useGame();
  const recs = listeningRecordings(s);
  const [a, setA] = useState(recs[recs.length - 1]?.key ?? '');
  const [b, setB] = useState(recs[recs.length - 2]?.key ?? '');
  const [cmp, setCmp] = useState<ReturnType<typeof compareRecordings> | null>(null);
  const [flip, setFlip] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const ra = recs.find((r) => r.key === a);
  const rb = recs.find((r) => r.key === b);
  const labels = s.puzzles.listening.labels;
  const pick = (val: string, set: (k: string) => void) => (
    <select className="pix" value={val} onChange={(e) => { set(e.target.value); setCmp(null); setFlip(null); }} aria-label="Choose a recording">
      {recs.map((r) => <option key={r.key} value={r.key}>{r.label}{r.archival ? ' (archival)' : ''}</option>)}
    </select>
  );
  return (
    <Modal title="Listening Desk">
      <p className="small">Headphones on. Beneath every archived note you can hear its <b>impression</b>: eight little lights, one per hidden switch (#1–#8). Replays are classical playback only; no new measurement happens here.</p>
      <h3>Compare two recordings</h3>
      <div className="row">
        {pick(a, setA)}
        {ra && <><PlayBtn index={ra.outcome} /><Lamps index={ra.outcome} /><Waveform index={ra.outcome} /></>}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        {pick(b, setB)}
        {rb && <><PlayBtn index={rb.outcome} /><Lamps index={rb.outcome} /><Waveform index={rb.outcome} /></>}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn small" disabled={!ra || !rb} onClick={() => { if (ra && rb) { setCmp(compareRecordings(ra.outcome, rb.outcome)); audio.playEvent(ra.outcome); audio.playEvent(rb.outcome, 0.2 + 2.1); } }}>
          Compare (play both)
        </button>
        {cmp && <span className="small">{cmp.diff.length ? `Lights that differ: ${cmp.diff.map((d) => `#${d}`).join(' ')}. ` : ''}{cmp.feedback}</span>}
      </div>
      <h3>Flip one wire (audition)</h3>
      <p className="small muted">Change exactly one light of the first recording and listen to what changes. This is just the desk&apos;s synthesizer; it may play patterns the house never actually produces.</p>
      <div className="row">
        {[2, 3, 4, 5, 6, 7, 8].map((ad) => (
          <button key={ad} className={`btn small ${flip === ad ? 'sel' : ''}`} disabled={!ra} onClick={() => { if (ra) { setFlip(ad); auditionFlip(ra.outcome, ad); } }}>
            flip #{ad}
          </button>
        ))}
      </div>
      {ra && flip && (
        <div className="row small" style={{ marginTop: 6 }}>
          before <Lamps index={ra.outcome} /> → after <Lamps index={flipAddress(ra.outcome, flip)} flip={flip} />
          <button className="btn small" onClick={() => auditionFlip(ra.outcome, flip)}>▶ again</button>
        </div>
      )}
      <h3>Label the wires</h3>
      <p className="small">A voice, a height, a breath. Which quality does each light control? Voice means instrument, height means pitch, breath means how long the note lasts. Several lights can share a job. (One light makes no sound at all.)</p>
      <div className="row">
        {[2, 3, 4, 5, 6, 7, 8].map((ad) => (
          <label key={ad} className="col small" style={{ gap: 2 }}>
            #{ad}
            <select className="pix" value={labels[ad] ?? ''} onChange={(e) => { setListeningLabel(ad, e.target.value as PropertyLabel); setScore(null); }} aria-label={`Label for light ${ad}`}>
              <option value="">?</option>
              <option value="voice">voice</option>
              <option value="height">height</option>
              <option value="breath">breath</option>
            </select>
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn primary" disabled={s.puzzles.listening.solved} onClick={() => setScore(submitListening())}>
          {s.puzzles.listening.solved ? 'Solved ✓' : 'Check labels'}
        </button>
        {score !== null && !s.puzzles.listening.solved && <span className="small">{score} of 7 wires hum in agreement.</span>}
      </div>
      {s.journal.tapes.length === 0 && <p className="tiny muted">There is an empty cassette slot. J mentioned a reference tape somewhere.</p>}
    </Modal>
  );
}
