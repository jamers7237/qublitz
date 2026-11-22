import { MIRROR, SHARD_GLYPH, rotateShard, traceBeam } from '../../game/puzzles';
import { useGame } from '../../state/store';
import { Modal } from '../common';

/** Fractured Mirror Alignment: rotate three shards to steer the beam onto the latch. */
export function Mirror() {
  const s = useGame();
  const rot = s.puzzles.mirror.rot;
  const t = traceBeam(rot);
  const lit = new Set(t.path.map((p) => `${p.x},${p.y}`));
  const solved = s.puzzles.mirror.solved;
  const status = solved
    ? 'The beam slides under the door toward the record player. Click.'
    : t.shardsHit === 0
      ? 'The beam runs straight past everything.'
      : t.shardsHit === 1
        ? 'The beam reaches the first shard.'
        : t.shardsHit === 2
          ? 'The beam threads two shards. The light trembles.'
          : 'All three shards are lit... the beam still misses the latch.';
  return (
    <Modal title="Fractured Mirror" narrow>
      <p className="small">A lamp shines from the left. Click a shard to rotate it (╱ ─ ╲ │). Guide the beam onto the brass latch (★).</p>
      <p className="small muted">Follow the lit path from the lamp. Where does it stop or turn away? Adjust that shard, then follow the beam onward. The latch opens automatically when the beam reaches it.</p>
      <div className="mirror-grid" style={{ gridTemplateColumns: `repeat(${MIRROR.cols}, auto)` }} role="grid">
        {Array.from({ length: MIRROR.rows }, (_, y) =>
          Array.from({ length: MIRROR.cols }, (_, x) => {
            const k = MIRROR.shards.findIndex((m) => m.x === x && m.y === y);
            const isLatch = MIRROR.latch.x === x && MIRROR.latch.y === y;
            const isCrack = MIRROR.cracks.some((c) => c.x === x && c.y === y);
            const isEmit = MIRROR.emitter.x === x && MIRROR.emitter.y === y;
            const cls = `mcell ${k >= 0 ? 'shard' : ''} ${lit.has(`${x},${y}`) ? 'lit' : ''} ${isLatch ? 'latch' : ''} ${isCrack ? 'crack' : ''}`;
            return (
              <div
                key={`${x},${y}`}
                className={cls}
                role={k >= 0 ? 'button' : 'gridcell'}
                tabIndex={k >= 0 ? 0 : -1}
                aria-label={k >= 0 ? `Shard ${k + 1}, orientation ${SHARD_GLYPH[rot[k]]}` : isLatch ? 'Latch' : undefined}
                onClick={() => k >= 0 && rotateShard(k)}
                onKeyDown={(e) => k >= 0 && (e.key === 'Enter' || e.key === ' ') && rotateShard(k)}
              >
                {k >= 0 && <span className="lbl">{k + 1}</span>}
                {k >= 0 ? SHARD_GLYPH[rot[k]] : isLatch ? <span className="gold">★</span> : isCrack ? '✕' : isEmit ? <span className="gold">☀</span> : ''}
              </div>
            );
          }),
        )}
      </div>
      <p className={solved ? 'ok' : 'small'}>{status}</p>
      <p className="tiny muted">Progress: {Math.min(3, t.shardsHit)}/3 shards threaded{solved ? ' · latch open' : ''}.</p>
    </Modal>
  );
}
