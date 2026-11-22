import { useState } from 'react';
import { gameStore, settingsStore, uiStore, useSettings } from '../state/store';
import { deleteSave, saveGame } from '../state/persistence';
import type { Settings as S } from '../state/types';
import { closePanel, toast } from '../state/uiActions';
import { Modal } from './common';

export function Settings({ onClose }: { onClose?: () => void }) {
  const s = useSettings();
  const inGame = uiStore.get().screen === 'game';
  const [confirm, setConfirm] = useState<'' | 'new' | 'delete'>('');
  const set = (patch: Partial<S>) => settingsStore.set({ ...settingsStore.get(), ...patch });
  const slider = (key: 'master' | 'music' | 'sfx' | 'notes', label: string) => (
    <label className="row">
      <span style={{ width: 110 }}>{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={s[key]} onChange={(e) => set({ [key]: Number(e.target.value) })} className="grow" aria-label={label} />
      <span className="small" style={{ width: 40 }}>{Math.round(s[key] * 100)}</span>
    </label>
  );
  return (
    <Modal title={inGame ? 'Paused' : 'Settings'} narrow onClose={onClose ?? closePanel}>
      <h3>Sound</h3>
      {slider('master', 'Master')}
      {slider('music', 'Music')}
      {slider('sfx', 'Effects')}
      {slider('notes', 'Notes')}
      <label className="row"><input type="checkbox" checked={s.muted} onChange={(e) => set({ muted: e.target.checked })} /> Mute everything</label>
      <h3>Comfort</h3>
      <label className="row"><input type="checkbox" checked={s.reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} /> Reduced motion (no shakes, warps or fades)</label>
      <label className="row">
        Text speed
        <select className="pix" value={s.textSpeed} onChange={(e) => set({ textSpeed: e.target.value as S['textSpeed'] })}>
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
          <option value="instant">Instant</option>
        </select>
      </label>
      <label className="row">
        On-screen controls
        <select className="pix" value={s.showTouchControls} onChange={(e) => set({ showTouchControls: e.target.value as S['showTouchControls'] })}>
          <option value="auto">Auto (touch / narrow)</option>
          <option value="on">Always</option>
          <option value="off">Never</option>
        </select>
      </label>
      {document.fullscreenEnabled && (
        <button className="btn small" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>Toggle fullscreen</button>
      )}
      <h3>Controls</h3>
      <table className="pix small">
        <tbody>
          <tr><td>Move</td><td>WASD / arrow keys / on-screen pad</td></tr>
          <tr><td>Interact</td><td>E or Space (nearest glowing object) · or click / tap it</td></tr>
          <tr><td>Dialogue</td><td>E / Space / Enter: finish line, then continue</td></tr>
          <tr><td>Notebook · Inventory · Hints</td><td>N · I · H</td></tr>
          <tr><td>Pause / close</td><td>Esc</td></tr>
        </tbody>
      </table>
      {inGame && (
        <>
          <h3>Game</h3>
          <div className="row">
            <button className="btn small" onClick={() => toast(saveGame() ? 'Saved.' : 'Could not save (storage blocked?)')}>Save now</button>
            <button className="btn small" onClick={() => { saveGame(); closePanel(); uiStore.update((u) => void (u.screen = 'title')); }}>Save &amp; return to title</button>
          </div>
          <div className="spacer" />
          <div className="row">
            {confirm === 'new' ? (
              <>
                <span className="bad small">Start over with a NEW secret? (Rewinding is different: use the front door.)</span>
                <button className="btn small danger" onClick={() => { deleteSave(); closePanel(); uiStore.update((u) => void (u.screen = 'name')); }}>Yes, new game</button>
                <button className="btn small" onClick={() => setConfirm('')}>No</button>
              </>
            ) : (
              <button className="btn small danger" onClick={() => setConfirm('new')}>New Game…</button>
            )}
          </div>
          <p className="tiny muted">Seed hint for bug reports: #{gameStore.get().seed.toString(36)}</p>
        </>
      )}
      {!inGame && (
        <div className="row">
          {confirm === 'delete' ? (
            <>
              <span className="bad small">Delete the saved game?</span>
              <button className="btn small danger" onClick={() => { deleteSave(); setConfirm(''); toast('Save deleted.'); location.reload(); }}>Delete</button>
              <button className="btn small" onClick={() => setConfirm('')}>Keep</button>
            </>
          ) : (
            <button className="btn small danger" onClick={() => setConfirm('delete')}>Delete save…</button>
          )}
        </div>
      )}
    </Modal>
  );
}
