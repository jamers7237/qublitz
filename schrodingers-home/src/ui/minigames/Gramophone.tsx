import { installCartridge, setNextMode } from '../../game/puzzles';
import { P } from '../../game/progression';
import { audio } from '../../sound/audioEngine';
import { useGame } from '../../state/store';
import { Icon, Modal, PlayBtn } from '../common';

export function Gramophone() {
  const s = useGame();
  const installed = P.cartridgeInstalled(s);
  return (
    <Modal title="Gramophone" narrow>
      <p className="small">An old gramophone with a brass horn. It only plays a new note when you come in from the hallway: one fresh copy of the song, one measurement.</p>
      {s.timeline.mode === 'normal' && (
        <p className="row">This timeline&apos;s note: <PlayBtn index={s.timeline.outcome!} label="▶ replay (no new measurement)" /></p>
      )}
      {s.timeline.mode === 'echo' && (
        <p className="row">This timeline&apos;s ghost: <button className="btn small" onClick={() => audio.playEcho(s.timeline.echo!)}>▶ replay echo</button></p>
      )}
      {installed ? (
        <>
          <h3>Hadamard&apos;s Harmonics™</h3>
          <p className="small">Choose the question for the <b>next</b> fresh timeline. It never changes a note that has already been measured.</p>
          <div className="row">
            <button className={`btn ${s.nextMode === 'normal' ? 'sel' : ''}`} onClick={() => setNextMode('normal')} aria-pressed={s.nextMode === 'normal'}>NORMAL / SIDE Z</button>
            <button className={`btn ${s.nextMode === 'echo' ? 'sel' : ''}`} onClick={() => setNextMode('echo')} aria-pressed={s.nextMode === 'echo'}>ECHO / SIDE X</button>
          </div>
          <p className="tiny muted">Side Z: an ordinary note and a fully decided house. Side X: one ghost echo and an out-of-focus house. Never both from the same copy.</p>
        </>
      ) : (
        <p className="tiny muted">There is a curious empty bracket on the stylus arm.</p>
      )}
    </Modal>
  );
}

export function Cartridge() {
  const s = useGame();
  return (
    <Modal title="Beneath the record player" narrow>
      <div className="row">
        <Icon id="item.cartridge" size={72} />
        <div className="grow">
          <div className="title-font gold" style={{ fontSize: 12, lineHeight: 1.6 }}>HADAMARD&apos;S HARMONICS™</div>
          <div>Hear What&apos;s Between the Notes</div>
          <div className="tiny muted">Now with two entirely different questions. Side Z · Side X. Not responsible for collapsed expectations.</div>
        </div>
      </div>
      <p className="small">A retro silver cartridge in a velvet tray. Its two tiny switches read <b>NORMAL / SIDE Z</b> and <b>ECHO / SIDE X</b>. The leaflet promises that Side X &quot;asks the first voice a sideways question.&quot;</p>
      <button className="btn primary" disabled={P.cartridgeInstalled(s)} onClick={installCartridge}>Snap it onto the stylus</button>
    </Modal>
  );
}
