import { useMemo, useState } from 'react';
import { SENSORS } from '../data/sensors';
import { parseRoute, prettyRoute } from '../game/navigationCipher';
import { manualRowStatus, P } from '../game/progression';
import { loadCheckpoint, restartSameSeed, startNewGame, type CheckpointKind } from '../game/session';
import { rewind, teleport } from '../game/timeline';
import { loadReport } from '../game/scenes/BootScene';
import { describeGate, preparationGates } from '../quantum/circuit';
import { bitAt, toBits } from '../quantum/codebook';
import { echoProbabilityZero, preparedState, sampleNormal, supportedEvents } from '../quantum/model';
import { mulberry32, randomSeed } from '../quantum/rng';
import { runValidation } from '../quantum/validation';
import { deleteSave } from '../state/persistence';
import { gameStore, uiStore, useGame, useUI } from '../state/store';
import type { ItemId, RoomId } from '../state/types';
import { newGameState } from '../state/initial';
import { worldScene } from './GameCanvas';

const BUILD = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';

export function bugReport() {
  const s = gameStore.get();
  const u = uiStore.get();
  return {
    version: '1.0.0',
    build: BUILD,
    seed: s.seed,
    phase: s.phase,
    nickname: s.playerName,
    scene: s.room,
    hoveredObject: u.hovered,
    focus: worldScene()?.debugInfo() ?? null,
    route: s.route,
    timeline: s.timeline,
    nextMode: s.nextMode,
    flags: s.flags,
    puzzles: s.puzzles,
    inventory: s.inventory,
    counts: { shots: s.journal.shots.length, echoes: s.journal.echoes.length },
    recentActions: u.recentActions.slice(-20),
    assetLoad: { failed: loadReport.failed, procedural: loadReport.procedural.length, loaded: loadReport.loaded },
  };
}

/** Hidden judge/developer overlay. Only rendered with ?debug=1. */
export function DebugPanel() {
  const s = useGame();
  const ui = useUI();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'session' | 'quantum' | 'world' | 'progress' | 'tools'>('session');
  const [sim, setSim] = useState<Map<number, number> | null>(null);
  const checks = useMemo(() => runValidation(), []);
  const sv = useMemo(() => preparedState(s.phase), [s.phase]);
  if (!open) return <button className="debug" style={{ width: 'auto' }} onClick={() => setOpen(true)}>DEBUG ▲</button>;
  const route = parseRoute(s.route);
  const liveCounts = new Map<number, number>();
  for (const x of s.journal.shots) liveCounts.set(x.outcome, (liveCounts.get(x.outcome) ?? 0) + 1);
  const n = Math.max(1, s.journal.shots.length);
  const focus = worldScene()?.debugInfo();
  return (
    <div className="debug" data-testid="debug">
      <div className="row" style={{ gap: 4 }}>
        <b style={{ color: '#e46b8f' }}>DEBUG / JUDGE</b>
        {(['session', 'quantum', 'world', 'progress', 'tools'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? '#553' : undefined }}>{t}</button>
        ))}
        <button onClick={() => setOpen(false)}>▼</button>
      </div>
      {tab === 'session' && (
        <>
          <pre>
            {`seed ${s.seed}   phase s=${s.phase} (${s.phase ? 'C minor' : 'C major'})   build ${BUILD}
demo: ${s.demo ?? 'no'}   room: ${s.room}
timeline #${s.timeline.index} ${s.timeline.status} mode=${s.timeline.mode ?? '-'}
measured: ${s.timeline.outcome !== null ? toBits(s.timeline.outcome) : '-'}   echo: ${s.timeline.echo ?? '-'}
next mode: ${s.nextMode}   lantern: ${s.lanternAddress ?? '-'}
route buffer: ${prettyRoute(s.route)} -> ${JSON.stringify(route)}
revealed this timeline: ${s.timeline.revealed.join(',') || '-'}`}
          </pre>
          <h4>Household sensors (this timeline)</h4>
          <pre>{SENSORS.map((x) => `#${x.address} ${x.id.padEnd(9)} ${s.timeline.mode === 'normal' ? (bitAt(s.timeline.outcome!, x.address) ? `1 ${x.one.key}` : `0 ${x.zero.key}`) : 'unresolved'}`).join('\n')}</pre>
          <div>
            <button onClick={restartSameSeed}>restart same seed</button>
            <button onClick={() => startNewGame(s.playerName, randomSeed())}>new random seed</button>
            <button onClick={() => rewind('debug')}>simulate rewind</button>
            <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(bugReport(), null, 2))}>copy bug report JSON</button>
          </div>
        </>
      )}
      {tab === 'quantum' && (
        <>
          <h4>Validation</h4>
          <pre>{checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail}`).join('\n')}</pre>
          <h4>Echo expectation</h4>
          <pre>{`P(echo=0|s=0)=${echoProbabilityZero(0).toFixed(6)}  P(echo=0|s=1)=${echoProbabilityZero(1).toFixed(6)}
observed: ${s.journal.echoes.filter((e) => e.bit === 0).length}/${s.journal.echoes.length} zeros`}</pre>
          <h4>16 supported labels: amplitude · Born p · journal freq{sim ? ' · debug sim' : ''}</h4>
          <pre>
            {supportedEvents().map((e) => {
              const amp = sv.re[e.index].toFixed(4) + (Math.abs(sv.im[e.index]) > 1e-12 ? `${sv.im[e.index] >= 0 ? '+' : ''}${sv.im[e.index].toFixed(4)}i` : '');
              return `${e.bits} w=${String(e.weight).padStart(3)} a=${amp.padStart(8)} p=${e.prob.toFixed(4)} obs=${((liveCounts.get(e.index) ?? 0) / n).toFixed(3)}(${liveCounts.get(e.index) ?? 0})${sim ? ` sim=${((sim.get(e.index) ?? 0) / 4000).toFixed(3)}` : ''}`;
            }).join('\n')}
          </pre>
          <button onClick={() => { const rng = mulberry32(Date.now() >>> 0); const m = new Map<number, number>(); for (let i = 0; i < 4000; i++) { const o = sampleNormal(s.phase, rng).outcome; m.set(o, (m.get(o) ?? 0) + 1); } setSim(m); }}>
            run 4000 debug-only samples (not logged)
          </button>
          <h4>Circuit (phase {s.phase})</h4>
          <pre>{preparationGates(s.phase).map(describeGate).join('\n')}</pre>
        </>
      )}
      {tab === 'world' && (
        <>
          <pre>{`hovered: ${ui.hovered ?? '-'}\nfocus: ${focus ? `${focus.id} tex=${focus.texture} file=${focus.url}` : '-'}\nassets: ${loadReport.loaded.length} loaded, ${loadReport.procedural.length} procedural, ${loadReport.failed.length} failed ${loadReport.failed.join(',')}`}</pre>
          <button onClick={() => uiStore.update((u) => void (u.debugHitboxes = !u.debugHitboxes))}>{ui.debugHitboxes ? 'hide' : 'show'} hitboxes (`)</button>
          <div>
            teleport (test only):
            {(['foyer', 'common', 'left', 'right', 'vault'] as RoomId[]).map((r) => <button key={r} onClick={() => teleport(r)}>{r}</button>)}
          </div>
        </>
      )}
      {tab === 'progress' && (
        <>
          <pre>{Object.entries(P).filter(([, f]) => f.length === 1).map(([k, f]) => `${k}: ${JSON.stringify((f as (x: typeof s) => unknown)(s))}`).join('\n')}</pre>
          <h4>Flags</h4>
          <pre>{Object.keys(s.flags).filter((k) => s.flags[k]).join(', ')}</pre>
          <h4>House Manual (player hypotheses)</h4>
          <pre>{s.manual.map((r, i) => `#${i + 1} route="${r.route}" obj=${r.object || '-'} zero=${r.zero || '-'} ${manualRowStatus(s)[i].verified ? 'VERIFIED' : ''}`).join('\n')}</pre>
          <h4>Inventory</h4>
          <pre>{JSON.stringify(s.inventory)}</pre>
          <h4>Recent actions</h4>
          <pre>{ui.recentActions.slice(-12).join('\n')}</pre>
        </>
      )}
      {tab === 'tools' && (
        <>
          <h4>Demo checkpoints (clearly labelled archive)</h4>
          {(['prologue', 'midpoint', 'late', 'vault'] as CheckpointKind[]).map((k) => <button key={k} onClick={() => loadCheckpoint(k)}>{k}</button>)}
          <h4>Inventory (test)</h4>
          {(['prism', 'cassette', 'metronomeKey'] as ItemId[]).map((it) => (
            <button key={it} onClick={() => gameStore.update((g) => { if (!g.inventory.items.includes(it)) g.inventory.items.push(it); if (!g.inventory.picked.includes(it)) g.inventory.picked.push(it); })}>grant {it}</button>
          ))}
          <button onClick={() => gameStore.update((g) => void (g.inventory.items = []))}>clear items</button>
          <h4>Reset one minigame</h4>
          {(['calibration', 'listening', 'switchboard', 'mirror', 'ledger', 'toaster', 'vault'] as const).map((k) => (
            <button key={k} onClick={() => gameStore.update((g) => void ((g.puzzles as any)[k] = structuredClone((newGameState('x', 1).puzzles as any)[k])))}>{k}</button>
          ))}
          <h4>Save slot</h4>
          <button onClick={() => { if (confirm('Delete the save slot? (This cannot be undone)')) { deleteSave(); location.reload(); } }}>reset save slot…</button>
        </>
      )}
    </div>
  );
}
