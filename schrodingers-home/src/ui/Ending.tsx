import { useEffect, useState } from 'react';
import { D } from '../data/dialogue';
import { continueGame } from '../game/session';
import { audio } from '../sound/audioEngine';
import { gameStore, uiStore, useGame, useSettings } from '../state/store';
import { TitleArt } from './TitleScreen';
import { CatShape } from './Cat';

/** Original animated pixel cat. */
function Cat({ blink }: { blink: boolean }) {
  return (
    <svg viewBox="0 0 32 28" width="min(300px, 70vw)" shapeRendering="crispEdges" aria-label="A small, very alive, grey and white cat">
      <rect x="6" y="26" width="22" height="2" fill="#000" opacity="0.4" />
      <g className="cat-body">
        <CatShape blink={blink} />
      </g>
    </svg>
  );
}

type Stage = 'open' | 'ask' | 'static' | 'harmed' | 'alive' | 'james' | 'stats';

export function Ending() {
  const s = useGame();
  const reduced = useSettings().reducedMotion;
  const [stage, setStage] = useState<Stage>('open');
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 1800);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (stage === 'static') {
      audio.sfx('static');
      const t = setTimeout(() => setStage('harmed'), reduced ? 300 : 1600);
      return () => clearTimeout(t);
    }
  }, [stage, reduced]);
  const live = s.journal.shots.filter((x) => x.source === 'timeline').length;
  const elapsed = Math.round(s.playMs / 60000);
  return (
    <div className="screen" data-testid="ending">
      <div className="stars" />
      {stage === 'static' && <div className="fx rewind" />}
      {stage === 'open' && (
        <div className="panel center" style={{ maxWidth: 640 }}>
          <h2>The vault swings open</h2>
          <p>Inside, a plain cardboard box with air holes. Something inside it is breathing. On the lid, in J&apos;s handwriting: <b>&quot;CAT (qubit #1). Always 1. Feed at 6.&quot;</b></p>
          <p className="small muted">The first switch never changed. The window never closed. It was never a household chore. It was a cat.</p>
          <button className="btn primary" onClick={() => setStage('ask')} autoFocus>Open the box</button>
        </div>
      )}
      {(stage === 'ask' || stage === 'harmed') && (
        <div className="panel center" style={{ maxWidth: 560 }}>
          {stage === 'harmed' && <p className="gold">{D.catDead[2].text}</p>}
          {stage === 'harmed' && <p className="small muted">(That was a fake reset. Your progress is perfectly safe.)</p>}
          <h2>{D.catAsk[0].text}</h2>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => { audio.sfx('success'); setStage('alive'); }} autoFocus>Alive</button>
            <button className="btn" onClick={() => setStage('static')}>Dead</button>
          </div>
        </div>
      )}
      {stage === 'alive' && (
        <div className="panel center" style={{ maxWidth: 640 }}>
          <Cat blink={blink} />
          <p>It was always 1. A small grey cat steps out, stretches, and sits on your foot like it has been waiting for exactly you.</p>
          {s.inventory.delivered.length >= 3 && <p className="gold small">J (from the doorway): &quot;You put my prism back AND found the cat? Best roommate in any branch of the wavefunction.&quot;</p>}
          <button className="btn primary" onClick={() => setStage('james')} autoFocus>…</button>
        </div>
      )}
      {stage === 'james' && (
        <div className="panel center" style={{ maxWidth: 560 }}>
          <h2>{D.jamesJoke[0].text}</h2>
          <p>{D.jamesJoke[1].text}</p>
          <p className="tiny muted">(A joke, not a measurement: nothing quantum renamed you, {s.playerName}.)</p>
          <button className="btn primary" onClick={() => setStage('stats')} autoFocus>Continue</button>
        </div>
      )}
      {stage === 'stats' && (
        <div className="panel" style={{ maxWidth: 620, width: '100%' }}>
          <TitleArt />
          <h2 style={{ marginTop: 12 }}>Observation complete, {s.playerName}</h2>
          <table className="pix">
            <tbody>
              <tr><td>Timelines lived</td><td>{s.timeline.index}</td></tr>
              <tr><td>Ordinary notes measured</td><td>{s.journal.shots.length} (live {live}, toaster {s.journal.shots.filter((x) => x.source === 'toaster').length}{s.demo ? `, archive ${s.journal.shots.filter((x) => x.source === 'archive').length}` : ''})</td></tr>
              <tr><td>Ghost echoes</td><td>{s.journal.echoes.length}</td></tr>
              <tr><td>Rewinds</td><td>{s.counters.rewinds}</td></tr>
              <tr><td>Vault attempts</td><td>{s.counters.vaultAttempts}</td></tr>
              <tr><td>Hints revealed</td><td>{Object.values(s.hints).reduce((a, b) => a + (b ?? 0), 0)}</td></tr>
              <tr><td>Play time</td><td>{elapsed} min</td></tr>
              <tr><td>Closing chord</td><td>C {s.puzzles.vault.chord}</td></tr>
              <tr><td>Badges</td><td>{s.achievements.join(', ') || '—'}</td></tr>
              {s.demo && <tr><td colSpan={2} className="gold small">Includes archived demo-checkpoint data ({s.demo}).</td></tr>}
            </tbody>
          </table>
          <div className="spacer" />
          <div className="row">
            <button className="btn" onClick={() => continueGame(gameStore.get())}>Keep exploring</button>
            <button className="btn primary" onClick={() => uiStore.update((u) => void (u.screen = 'name'))}>New game (new secret)</button>
            <button className="btn" onClick={() => uiStore.update((u) => void (u.screen = 'credits'))}>Credits</button>
          </div>
        </div>
      )}
      <style>{reduced ? '' : `.cat-body{animation:breathe 1.6s ease-in-out infinite alternate;transform-origin:16px 26px}@keyframes breathe{from{transform:scaleY(1)}to{transform:scaleY(1.03)}}`}</style>
    </div>
  );
}

export function Credits() {
  return (
    <div className="screen">
      <div className="stars" />
      <div className="panel" style={{ maxWidth: 640 }}>
        <h2>Credits</h2>
        <p><b>Schrödinger&apos;s Home</b> — a university quantum hackathon project.</p>
        <h3>Team</h3>
        <p className="small">Design, quantum circuit &amp; story: the Schrödinger&apos;s Home team. Art: procedural placeholders (replaceable; see ART_REPLACEMENT_GUIDE.md).</p>
        <h3>Technology</h3>
        <ul className="small">
          <li>8-qubit statevector simulator written from scratch in TypeScript (no external quantum backend)</li>
          <li>Phaser 3 (MIT) · React (MIT) · Vite (MIT)</li>
          <li>All music and sound synthesized live with the Web Audio API; all sprites drawn procedurally. No third-party game assets.</li>
        </ul>
        <h3>Fonts (SIL Open Font License 1.1, bundled offline)</h3>
        <ul className="small">
          <li>Press Start 2P — CodeMan38</li>
          <li>Pixelify Sans — Stefie Justprince</li>
        </ul>
        <h3>Thanks</h3>
        <p className="small">To J, for the furniture. To the cat, for being 1. Built with AI pair-programming assistance (Claude); the circuit design and its verification are documented in QUANTUM_EXPLANATION.md.</p>
        <button className="btn primary" onClick={() => uiStore.update((u) => void (u.screen = 'title'))} autoFocus>Back to title</button>
      </div>
    </div>
  );
}
