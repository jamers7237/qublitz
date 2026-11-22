import { HINTS } from '../data/clues';
import { gameStore, useGame } from '../state/store';
import { Modal } from './common';

const TIER = ['Poetic', 'Targeted', 'Explicit'];

export function HintPanel() {
  const s = useGame();
  const active = HINTS.filter((h) => h.active(s) && !h.done(s));
  const done = HINTS.filter((h) => h.done(s));
  return (
    <Modal title="Hints" narrow>
      <p className="small muted">Each puzzle has three hints, from gentle to explicit. Nothing is revealed unless you ask.</p>
      {active.length === 0 && <p>No open puzzles right now. Explore!</p>}
      {active.map((h) => {
        const used = s.hints[h.id] ?? 0;
        return (
          <div key={h.id} className="panel" style={{ padding: 12, marginBottom: 10 }}>
            <div className="gold">{h.title}</div>
            {h.tiers.slice(0, used).map((t, i) => (
              <p key={i} className="small" style={{ margin: '6px 0' }}>
                <span className="tag teal">{TIER[i]}</span> {t}
              </p>
            ))}
            {used < 3 && (
              <button className="btn small" onClick={() => gameStore.update((g) => void (g.hints[h.id] = used + 1))}>
                Reveal {TIER[used].toLowerCase()} hint
              </button>
            )}
          </div>
        );
      })}
      {done.length > 0 && <p className="tiny muted">Solved: {done.map((h) => h.title).join(' · ')}</p>}
    </Modal>
  );
}
