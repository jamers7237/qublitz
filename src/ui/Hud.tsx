import { ROOMS } from '../data/roomLayouts';
import { ITEMS } from '../data/items';
import { P } from '../game/progression';
import { useGame, useUI, uiStore } from '../state/store';
import { openPanel } from '../state/uiActions';

export function Hud() {
  const s = useGame();
  const ui = useUI();
  const hasNotebook = P.notebook(s);
  const busy = ui.dialogue.length > 0;
  return (
    <>
      <div className="hud-left">
        <span className="chip">{ROOMS[s.room].name}</span>
        {s.demo && <span className="chip demo">DEMO CHECKPOINT · ARCHIVED DATA</span>}
        {s.timeline.mode === 'echo' && <span className="chip echo">SIDE X timeline · no ordinary reading</span>}
        {P.cartridgeInstalled(s) && s.timeline.status === 'active' && s.nextMode !== (s.timeline.mode ?? 'normal') && (
          <span className="chip small">Next entry: {s.nextMode === 'echo' ? 'SIDE X (echo)' : 'SIDE Z (normal)'}</span>
        )}
        {s.lanternAddress && <span className="chip small">Lantern primed on #{s.lanternAddress}</span>}
      </div>
      <div className="hud-top">
        <button className="btn" disabled={!hasNotebook} onClick={() => openPanel('notebook')} title="Notebook (N)" aria-label="Notebook (N)">
          📓 <span className="small">N</span>
          {hasNotebook && s.notebook.unread.length > 0 && <span className="badge-dot" aria-label="unread pages" />}
        </button>
        <button className="btn" onClick={() => openPanel('inventory')} title="Inventory (I)" aria-label="Inventory (I)">
          🎒 <span className="small">I</span>
        </button>
        <button className="btn" onClick={() => openPanel('hints')} title="Hints (H)" aria-label="Hints (H)">
          ? <span className="small">H</span>
        </button>
        <button className="btn" onClick={() => openPanel('settings')} title="Pause / settings (Esc)" aria-label="Settings (Esc)">
          ⚙
        </button>
      </div>
      {ui.heldItem && (
        <div className="chip held">
          Using: {ITEMS[ui.heldItem].name} — interact with a target ·{' '}
          <button className="btn small" onClick={() => uiStore.update((u) => void (u.heldItem = null))}>
            cancel (Esc)
          </button>
        </div>
      )}
      {ui.prompt && !busy && !ui.panel && (
        <div className={`prompt ${ui.prompt.locked ? 'locked' : ''}`} data-testid="prompt">
          <span className="key">{ui.prompt.via === 'mouse' ? 'CLICK' : 'E'}</span>
          {ui.prompt.verb} — {ui.prompt.label}
          {ui.prompt.locked ? ' (locked)' : ''}
        </div>
      )}
      {ui.toast && (
        <div key={ui.toast.id} className="toast chip" role="status">
          {ui.toast.text}
        </div>
      )}
    </>
  );
}
