import { useMemo, useState } from 'react';
import { notebookMatchOptions, submitNotebookMatch } from '../../game/puzzles';
import { audio } from '../../sound/audioEngine';
import { useGame } from '../../state/store';
import { Modal, Waveform } from '../common';

/** Torn-page puzzle: match the note you heard before the rewind to its scribbled waveform. */
export function NotebookMatch() {
  const s = useGame();
  const options = useMemo(() => notebookMatchOptions(s), [s.seed, s.journal.shots.length > 0]);
  const memory = s.journal.shots[0]?.outcome;
  const [msg, setMsg] = useState('');
  return (
    <Modal title="A torn first page" narrow>
      <p>Three waveforms are scribbled across the page, as if someone tried to draw a sound from memory. Only one is circled... but the circle has been torn away.</p>
      <p className="small">Same home. Different sound. <b>Remember what you heard.</b></p>
      <p className="small muted">Replay the remembered note, then audition the candidates. Match the instrument, pitch and length; you can listen as often as you like.</p>
      {memory !== undefined && (
        <button className="btn" onClick={() => audio.playEvent(memory)}>▶ Recall the note from before the rewind</button>
      )}
      <div className="spacer" />
      <div className="col">
        {options.map((o, i) => (
          <div key={o} className="row">
            <span className="title-font tiny">{'ABC'[i]}</span>
            <Waveform index={o} height={34} />
            <button className="btn small" onClick={() => audio.playEvent(o)}>▶ hum it</button>
            <button
              className="btn small primary"
              onClick={() => {
                if (!submitNotebookMatch(o)) setMsg('Not quite. Close your eyes and listen again.');
              }}
            >
              This one
            </button>
          </div>
        ))}
      </div>
      {msg && <p className="bad small">{msg}</p>}
      <p className="tiny muted">Accessibility: the waveform shape follows the instrument, colour follows the pitch, width follows the length.</p>
    </Modal>
  );
}
