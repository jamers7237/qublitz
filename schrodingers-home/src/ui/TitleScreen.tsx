import { useMemo, useState } from 'react';
import { continueGame, startNewGame } from '../game/session';
import { audio } from '../sound/audioEngine';
import { deleteSave, loadGame } from '../state/persistence';
import { uiStore } from '../state/store';
import { Settings } from './Settings';
import { CatShape } from './Cat';

/** Original title art: a cat silhouette split between two states, in an open window. */
export function TitleArt() {
  return (
    <svg viewBox="0 0 64 48" width="min(420px, 86vw)" shapeRendering="crispEdges" aria-label="A cat silhouette, half teal and half rose, sitting in an open window">
      <rect width="64" height="48" fill="#0b1230" />
      <rect x="2" y="2" width="60" height="44" fill="none" stroke="#93643f" strokeWidth="2" />
      <rect x="30" y="2" width="2" height="44" fill="#93643f" />
      <rect x="44" y="8" width="6" height="6" fill="#f2c46d" />
      <rect x="10" y="10" width="1" height="1" fill="#fff" />
      <rect x="54" y="20" width="1" height="1" fill="#fff" />
      <rect x="20" y="6" width="1" height="1" fill="#c9a7ff" />
      {/* one cat, two states: left half teal, right half rose */}
      <defs>
        <clipPath id="catL"><rect x="0" y="0" width="32" height="48" /></clipPath>
        <clipPath id="catR"><rect x="32" y="0" width="32" height="48" /></clipPath>
      </defs>
      <g clipPath="url(#catL)"><g transform="translate(16 17)"><CatShape fur="#5fd3c4" light="#bff5ec" /></g></g>
      <g clipPath="url(#catR)"><g transform="translate(16 17)"><CatShape fur="#e46b8f" light="#ffd1de" /></g></g>
      <rect x="2" y="44" width="60" height="2" fill="#6e4a33" />
    </svg>
  );
}

export function TitleScreen() {
  const save = useMemo(() => loadGame(), []);
  const [settings, setSettings] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  return (
    <div className="screen" data-testid="title">
      <div className="stars" />
      <TitleArt />
      <div className="title">Schrödinger&apos;s Home</div>
      <div className="subtitle">A QUANTUM ESCAPE ROOM IN EIGHT QUBITS</div>
      <div className="menu">
        {save.ok && (
          <button
            className="btn primary"
            onClick={() => {
              audio.ensure();
              audio.startAmbient();
              continueGame(save.state);
            }}
          >
            Continue — {save.state.playerName} · {save.state.timeline.index} timelines
          </button>
        )}
        {save.ok === false && save.reason === 'corrupt' && (
          <div className="panel small">
            <p className="bad">Your save file looks damaged.</p>
            <div className="row">
              <button className="btn small" onClick={() => navigator.clipboard?.writeText(save.raw ?? '')}>Copy raw save</button>
              <button className="btn small danger" onClick={() => { deleteSave(); location.reload(); }}>Discard it</button>
            </div>
          </div>
        )}
        <button
          className="btn"
          data-testid="new-game"
          onClick={() => {
            audio.ensure();
            if (save.ok && !confirmNew) return setConfirmNew(true);
            uiStore.update((u) => void (u.screen = 'name'));
          }}
        >
          {confirmNew ? 'New Game (overwrites save) — click again' : 'New Game'}
        </button>
        <button className="btn" onClick={() => setSettings(true)}>Settings</button>
        <button className="btn" onClick={() => uiStore.update((u) => void (u.screen = 'credits'))}>Credits</button>
      </div>
      <div className="tiny muted center">WASD / arrows to move · E or Space to interact · click anything that glows white</div>
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}

export function NameEntry() {
  const [name, setName] = useState('');
  const begin = () => {
    audio.ensure();
    audio.startAmbient();
    startNewGame(name || 'Wanderer');
  };
  return (
    <div className="screen" data-testid="name-entry">
      <div className="stars" />
      <div className="panel" style={{ maxWidth: 520, width: '100%' }}>
        <h2>The landlord&apos;s ledger</h2>
        <p>The ledger by the door has a line for every tenant of Suite 8. Yours is blank.</p>
        <p className="muted small">Write your name. (It stays in this browser only.)</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            begin();
          }}
          className="row"
        >
          <input className="pix grow" autoFocus maxLength={16} value={name} onChange={(e) => setName(e.target.value.replace(/[<>]/g, ''))} placeholder="Your name" aria-label="Your name" data-testid="name-input" />
          <button className="btn primary" type="submit" data-testid="begin">Begin</button>
        </form>
        <div className="spacer" />
        <button className="btn small" onClick={() => uiStore.update((u) => void (u.screen = 'title'))}>Back</button>
      </div>
    </div>
  );
}
