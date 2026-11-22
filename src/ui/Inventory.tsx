import { useState } from 'react';
import { ITEMS, KEY_ITEMS } from '../data/items';
import { useGame, uiStore } from '../state/store';
import type { ItemId } from '../state/types';
import { closePanel, say } from '../state/uiActions';
import { Icon, Modal } from './common';

export function Inventory() {
  const s = useGame();
  const [sel, setSel] = useState<ItemId | null>(s.inventory.items[0] ?? null);
  const slots = Array.from({ length: 8 }, (_, i) => s.inventory.items[i] ?? null);
  const item = sel && s.inventory.items.includes(sel) ? ITEMS[sel] : null;
  const ALL: ItemId[] = ['prism', 'cassette', 'metronomeKey'];
  return (
    <Modal title="Inventory" narrow>
      <p className="small muted">A pocket sewn into the notebook&apos;s cover. Things kept here survive the rewinds.</p>
      <h3>Key items</h3>
      <div className="row">
        {s.inventory.keyItems.length === 0 && <span className="muted small">None yet.</span>}
        {s.inventory.keyItems.map((k) => (
          <div key={k} className="row chip" title={KEY_ITEMS[k].desc}>
            <Icon id={KEY_ITEMS[k].icon} size={28} /> {KEY_ITEMS[k].name}
          </div>
        ))}
      </div>
      <h3>Carried ({s.inventory.items.length}/8)</h3>
      <div className="row" role="listbox" aria-label="Inventory slots">
        {slots.map((it, i) => (
          <button
            key={i}
            className={`btn icon ${it && it === sel ? 'sel' : ''}`}
            style={{ width: 52, height: 52 }}
            disabled={!it}
            onClick={() => it && setSel(it)}
            aria-label={it ? ITEMS[it].name : 'empty slot'}
            role="option"
            aria-selected={!!it && it === sel}
          >
            {it ? <Icon id={ITEMS[it].icon} size={32} /> : ''}
          </button>
        ))}
      </div>
      {item && (
        <div className="panel" style={{ marginTop: 12, padding: 12 }}>
          <div className="row">
            <Icon id={item.icon} size={48} />
            <div className="grow">
              <div className="gold">{item.name}</div>
              <div className="small">{item.desc}</div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => { closePanel(); say([{ text: item.desc }]); }}>Examine</button>
            <button
              className="btn small primary"
              onClick={() => {
                uiStore.update((u) => void (u.heldItem = item.id));
                closePanel();
              }}
            >
              Use… (then interact with a target)
            </button>
          </div>
        </div>
      )}
      {s.flags.sideQuest && (
        <>
          <h3>The Roommate Exchange (optional)</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
            {ALL.map((id) => (
              <li key={id}>
                {s.inventory.picked.includes(id) ? ITEMS[id].name : '???'} —{' '}
                {s.inventory.delivered.includes(id) ? <span className="ok">returned ✓</span> : s.inventory.picked.includes(id) ? <span className="gold">carrying; belongs in the other bedroom</span> : <span className="muted">not found yet</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {s.achievements.length > 0 && (
        <>
          <h3>Badges</h3>
          <div className="row">{s.achievements.map((a) => <span key={a} className="chip gold">★ {a}</span>)}</div>
        </>
      )}
    </Modal>
  );
}
