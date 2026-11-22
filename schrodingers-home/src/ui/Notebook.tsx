import { useMemo, useState } from 'react';
import { SENSORS, ROW_GLYPHS, sensorById, sensorByAddress } from '../data/sensors';
import { shortcutRoute } from '../game/interactions';
import { addressToRoute, prettyRoute } from '../game/navigationCipher';
import { manualRowStatus, P } from '../game/progression';
import { LEDGER_SOLUTION, listeningRecordings } from '../game/puzzles';
import { bitAt, DURATIONS, INSTRUMENTS, PITCHES, noteLabel, toBits } from '../quantum/codebook';
import { PARITY_RELATIONS, satisfiesParity, weightFromOdds } from '../quantum/model';
import { audio } from '../sound/audioEngine';
import { gameStore, uiStore, useGame, useUI } from '../state/store';
import type { GameState, PageId } from '../state/types';
import { Bits, Modal, PlayBtn, Waveform, Lamps } from './common';

const PAGES: { id: PageId; title: string }[] = [
  { id: 'loops', title: 'Loops' },
  { id: 'manual', title: 'House Manual' },
  { id: 'routes', title: 'Room Symbols' },
  { id: 'sounds', title: 'Sound Comparison' },
  { id: 'parity', title: 'Parity Notes' },
  { id: 'ledger', title: 'Prime Ledger' },
  { id: 'echo', title: 'Phase / Echo' },
  { id: 'score', title: 'Draft Score' },
];

export function Notebook() {
  const s = useGame();
  const ui = useUI();
  const pages = PAGES.filter((p) => s.notebook.pages.includes(p.id));
  const page = pages.some((p) => p.id === ui.notebookPage) ? ui.notebookPage : pages[0]?.id ?? 'loops';
  const go = (id: PageId) => {
    audio.sfx('page');
    uiStore.update((u) => void (u.notebookPage = id));
    gameStore.update((g) => void (g.notebook.unread = g.notebook.unread.filter((x) => x !== id)));
  };
  if (s.notebook.unread.includes(page)) queueMicrotask(() => gameStore.update((g) => void (g.notebook.unread = g.notebook.unread.filter((x) => x !== page))));
  return (
    <Modal title="The Survivor's Notebook" className="notebook">
      <div className="tabs" role="tablist">
        {pages.map((p) => (
          <button key={p.id} role="tab" aria-selected={p.id === page} className={`tab ${p.id === page ? 'on' : ''}`} onClick={() => go(p.id)}>
            {p.title}
            {s.notebook.unread.includes(p.id) && p.id !== page && <span className="badge-dot" />}
          </button>
        ))}
      </div>
      <div className="page" role="tabpanel">
        {page === 'loops' && <Loops s={s} />}
        {page === 'manual' && <Manual s={s} />}
        {page === 'routes' && <Routes s={s} />}
        {page === 'sounds' && <Sounds s={s} />}
        {page === 'parity' && <Parity s={s} />}
        {page === 'ledger' && <Ledger s={s} />}
        {page === 'echo' && <Echo s={s} />}
        {page === 'score' && <Score s={s} />}
      </div>
    </Modal>
  );
}

const SRC_TAG: Record<string, string> = { timeline: 'live', toaster: 'toaster', archive: 'ARCHIVE' };

function Loops({ s }: { s: GameState }) {
  const [all, setAll] = useState(false);
  const shots = [...s.journal.shots].reverse();
  const shown = all ? shots : shots.slice(0, 12);
  const live = s.journal.shots.filter((x) => x.source === 'timeline').length;
  const toast = s.journal.shots.filter((x) => x.source === 'toaster').length;
  const arch = s.journal.shots.filter((x) => x.source === 'archive').length;
  const obsThis = s.journal.observations.filter((o) => o.timeline === s.timeline.index);
  return (
    <div>
      <p className="small">
        Ordinary song measurements: <b>{s.journal.shots.length}</b> (live {live} · toaster {toast}
        {arch ? <> · <span className="gold">archive {arch}</span></> : null}) · ghost echoes: <b>{s.journal.echoes.length}</b> (kept separately) · rewinds: {s.counters.rewinds}
      </p>
      <p className="small muted">Each loop prepared one fresh copy of the same song and measured it once. Replaying a recording is just playback; it never measures anything.</p>
      <h3>This timeline (#{s.timeline.index})</h3>
      <p className="small">
        {s.timeline.status === 'pending' && 'Not started: walk in from the hallway.'}
        {s.timeline.mode === 'normal' && <>An ordinary note was heard. <PlayBtn index={s.timeline.outcome!} label="▶ replay" /></>}
        {s.timeline.mode === 'echo' && <>A ghost echo ({s.timeline.echo === 0 ? 'hollow' : 'bright'}). No ordinary household reading exists in this frequency.</>}
      </p>
      {obsThis.length > 0 && (
        <p className="small">Observed: {obsThis.map((o) => `${sensorById(o.objectId)?.name.toLowerCase()} ${o.state}${o.via === 'lever' ? ' (lever)' : ''}`).join(' · ')}</p>
      )}
      <h3>Recordings</h3>
      <table className="pix">
        <thead>
          <tr><th>Loop</th><th>Source</th><th>Sound</th><th>Impression</th>{s.puzzles.listening.solved && <th>Decoded</th>}</tr>
        </thead>
        <tbody>
          {shown.map((sh) => (
            <tr key={sh.id}>
              <td>{sh.timeline}</td>
              <td className={sh.source === 'archive' ? 'gold' : ''}>{SRC_TAG[sh.source]}{sh.lantern ? ` · lantern #${sh.lantern.address}=${sh.lantern.bit}` : ''}</td>
              <td><div className="row" style={{ gap: 6 }}><PlayBtn index={sh.outcome} /><Waveform index={sh.outcome} height={22} /></div></td>
              <td>{P.impressions(s) ? <Bits index={sh.outcome} /> : <span className="muted">{houseGlyphs(s, sh.timeline)}</span>}</td>
              {s.puzzles.listening.solved && <td className="small">{noteLabel(sh.outcome)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {shots.length > 12 && <button className="btn small" onClick={() => setAll((a) => !a)}>{all ? 'Show recent' : `Show all ${shots.length}`}</button>}
    </div>
  );
}

/** Before impressions are readable: only the physical things you personally saw that loop. */
function houseGlyphs(s: GameState, timeline: number) {
  const obs = s.journal.observations.filter((o) => o.timeline === timeline);
  if (!obs.length) return '(nothing observed)';
  return obs.map((o) => `${sensorById(o.objectId)?.name.split(' ').pop()?.toLowerCase()}: ${o.state}`).join(', ');
}

function Manual({ s }: { s: GameState }) {
  const status = manualRowStatus(s);
  const edit = (k: number, patch: Partial<GameState['manual'][number]>) => gameStore.update((g) => void Object.assign(g.manual[k], patch));
  return (
    <div>
      <p className="small">Your own worksheet. Rows are the house&apos;s eight hidden switches, numbered like addresses. Write guesses freely; <span className="ok">green</span> marks are verified by evidence you gathered.</p>
      <p className="small muted">The lever identifies an address&apos;s object. Once impressions are readable, compare that visit&apos;s numbered bit with the object&apos;s physical state to check your 0/1 guess. Use evidence from the same visit.</p>
      {P.calibrated(s) ? (
        <div className="panel" style={{ padding: 10, marginBottom: 10, background: '#1d1812' }}>
          <b className="gold">Physical 0/1 convention</b> (Polarity Cabinet): <i>Zero is what the house lacks. One is what it reveals.</i> Absent / inactive / quiet → 0. Present / active / happening → 1. You still decide which object is which switch.
        </div>
      ) : (
        <p className="small muted">The 0/1 columns stay unverifiable until you learn the house&apos;s counting convention.</p>
      )}
      {s.flags.clueToken && <p className="small gold">Clue token (Good Roommate): the loudest certainty arrives when every free switch is on.</p>}
      <div className="manual-grid">
        {s.manual.map((row, k) => {
          const st = status[k];
          const sensor = sensorById(row.object);
          const states = sensor ? [sensor.zero.key, sensor.one.key].sort() : [];
          const disc = s.journal.routes[k + 1];
          const revealedNow = s.timeline.revealed.includes(k + 1) && s.timeline.outcome !== null;
          const nowState = revealedNow ? (() => { const sd = sensorByAddress(k + 1)!; return bitAt(s.timeline.outcome!, k + 1) ? sd.one.key : sd.zero.key; })() : null;
          return (
            <div key={k} className={`manual-card ${st.verified ? 'verified' : ''}`} data-testid={`manual-row-${k + 1}`}>
              <div className="row">
                <span className="glyph">{ROW_GLYPHS[k]}</span>
                <b>#{k + 1}</b>
                {st.verified ? <span className="tag ok">verified</span> : <span className="tag muted">guess</span>}
              </div>
              <label>
                Bedroom route (L/R) {st.routeOk && <span className="ok">✓</span>}
                <input className="pix" value={row.route} placeholder="e.g. R, L" onChange={(e) => edit(k, { route: e.target.value.slice(0, 20) })} aria-label={`Route guess for row ${k + 1}`} />
              </label>
              <label>
                Object {st.objectOk && <span className="ok">✓</span>}
                <select className="pix" value={row.object} onChange={(e) => edit(k, { object: e.target.value, zero: '' })} aria-label={`Object guess for row ${k + 1}`}>
                  <option value="">—</option>
                  {SENSORS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <label>
                Means 0 when… {st.polarityOk && <span className="ok">✓</span>}
                <select className="pix" value={row.zero} disabled={!sensor} onChange={(e) => edit(k, { zero: e.target.value })} aria-label={`Zero meaning for row ${k + 1}`}>
                  <option value="">—</option>
                  {states.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              {sensor && row.zero && <div className="tiny muted">…and 1 when {row.zero === sensor.zero.key ? sensor.one.key : sensor.zero.key}</div>}
              <div className="tiny" style={{ marginTop: 6 }}>
                Evidence: {disc ? <>lever route {prettyRoute(addressToRoute(k + 1))} focused the <b>{sensorById(disc.objectId)?.name.toLowerCase()}</b> (loop {disc.timeline})</> : <span className="muted">none yet</span>}
              </div>
              {nowState && (
                <div className="tiny">
                  This timeline: <b>{nowState}</b>
                  {row.zero && row.object === sensorByAddress(k + 1)?.id ? <> → your manual reads <b>{nowState === row.zero ? 0 : 1}</b></> : null}
                </div>
              )}
              <label>
                Notes
                <input className="pix" value={row.notes} onChange={(e) => edit(k, { notes: e.target.value.slice(0, 200) })} aria-label={`Notes for row ${k + 1}`} />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Routes({ s }: { s: GameState }) {
  const found = Object.entries(s.journal.routes).map(([a, r]) => ({ address: +a, ...r })).sort((a, b) => a.address - b.address);
  const inCommon = s.room === 'common';
  return (
    <div>
      <p className="small">Strange: every time you enter a bedroom from the common room, something in the walls clicks. A low click on the left, a high click on the right. The brass lever seems to read them.</p>
      <p className="small muted">Return to common after each bedroom visit. Pull the lever after the whole sequence; it reads and clears the route. Bedroom trips explore the current note. Leaving through the front door and re-entering prepares a new one.</p>
      <h3>Clues collected</h3>
      <ul className="small">
        {s.flags.photo_james && <li>Scratched behind J&apos;s portrait: <i>&quot;RR = third&quot;</i></li>}
        {s.flags.photo_clipping && <li>Clipping: <i>&quot;Two rooms, more addresses than doors.&quot;</i></li>}
        {s.flags.photo_sticky && <li>Sticky note: <i>&quot;Nobody lives at address zero.&quot;</i></li>}
        {s.flags.photo_projector && <li>Projected slide: mailboxes numbered 1, 10, 11, 100…</li>}
        {(s.hints.routes ?? 0) >= 3 && <li>Left writes zero; right writes one; do not begin an address with zero.</li>}
        {!s.flags.photo_james && !s.flags.photo_clipping && !s.flags.photo_sticky && <li className="muted">Photos and papers around the bedrooms may help.</li>}
      </ul>
      <h3>Routes that answered</h3>
      {found.length === 0 && <p className="muted small">None yet.</p>}
      <table className="pix">
        <tbody>
          {found.map((r) => (
            <tr key={r.address}>
              <td className="bits">{prettyRoute(addressToRoute(r.address))}</td>
              <td>{sensorById(r.objectId)?.name}</td>
              <td className="tiny muted">first in loop {r.timeline}</td>
              <td>
                <button className="btn small" disabled={!inCommon} onClick={() => shortcutRoute(r.address)} title={inCommon ? 'Pull the lever with this route' : 'Stand in the common room'}>
                  pull again
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {found.length > 0 && !inCommon && <p className="tiny muted">Shortcuts work while you stand in the common room.</p>}
    </div>
  );
}

function Sounds({ s }: { s: GameState }) {
  if (!s.puzzles.listening.solved)
    return (
      <div>
        <p>The Listening Desk shows each recording&apos;s impression as eight lights. Which lights change the <b>voice</b>, the <b>height</b>, the <b>breath</b>?</p>
        <p className="small muted">Your current wire labels: {[2, 3, 4, 5, 6, 7, 8].map((a) => `#${a}=${s.puzzles.listening.labels[a] || '?'}`).join('  ')}</p>
      </div>
    );
  const recs = listeningRecordings(s);
  const uniq = [...new Map(recs.map((r) => [r.outcome, r])).values()];
  return (
    <div>
      <p className="small">Light #1 makes no sound. #2–#3: voice. #4–#6: height. #7–#8: breath (at 120 bpm).</p>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <CodeTable title="Voice #2#3" rows={INSTRUMENTS.map((i) => [i.code, i.name])} />
        <CodeTable title="Height #4#5#6" rows={PITCHES.map((p) => [p.code, p.name])} />
        <CodeTable title="Breath #7#8" rows={DURATIONS.map((d) => [d.code, `${d.name} (${d.seconds}s)`])} />
      </div>
      <h3>Distinct notes heard ({uniq.length})</h3>
      <table className="pix">
        <tbody>
          {uniq.map((r) => (
            <tr key={r.outcome}>
              <td><Bits index={r.outcome} /></td>
              <td>{noteLabel(r.outcome)}</td>
              <td><PlayBtn index={r.outcome} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <table className="pix" style={{ width: 'auto' }}>
      <thead><tr><th colSpan={2}>{title}</th></tr></thead>
      <tbody>{rows.map(([c, n]) => <tr key={c}><td className="bits">{c}</td><td className="small">{n}</td></tr>)}</tbody>
    </table>
  );
}

function Parity({ s }: { s: GameState }) {
  const solved = PARITY_RELATIONS.filter((r) => s.puzzles.switchboard.solved.includes(r.id));
  const allowed = useMemo(() => Array.from({ length: 128 }, (_, i) => 128 + i).filter(satisfiesParity), []);
  return (
    <div>
      <h3>Shadow rules found ({solved.length}/3)</h3>
      <ul>
        {solved.map((r) => (
          <li key={r.id} className="bits">#{r.addresses[2]} = #{r.addresses[0]} ⊕ #{r.addresses[1]}</li>
        ))}
      </ul>
      <p className="small muted">Correlation note: these rules say certain lights always agree. Agreement measured in one basis does NOT, by itself, prove entanglement: a classical machine copying bits would agree too. The quantum part shows up when you ask a different question (see Phase / Echo).</p>
      {solved.length >= 3 && (
        <>
          <h3>Only sixteen patterns survive</h3>
          <p className="small">Seven musical lights could make 2⁷ = 128 patterns. Three shadow rules leave 2⁴ = 16. The first light (#1) is always lit.</p>
          <div className="row" style={{ gap: 6 }}>
            {allowed.map((i) => (
              <span key={i} className="chip small"><Bits index={i} />{s.puzzles.listening.solved ? ` ${noteLabel(i)}` : ''}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const CLUE_TEXT: Record<string, string> = {
  hooks: '#2 closet: two brass hooks for one wooden one (ajar 2 : 1 latched)',
  trash: '#3 trash: full 3 weeks out of 4 (full 3 : 1 empty)',
  couch: '#4 couch: five stitched squares, one plain (stained 5 : 1 clean)',
  clock: '#5 clock: seven ticks, one silence (ticking 7 : 1 stopped)',
};

function Ledger({ s }: { s: GameState }) {
  const [weighed, setWeighed] = useState<number[]>([]);
  const allowed = useMemo(() => Array.from({ length: 128 }, (_, i) => 128 + i).filter(satisfiesParity), []);
  return (
    <div>
      <p><i>&quot;Every free switch carries a weight. When they sing together, their weights multiply. The rarest voice begins.&quot;</i></p>
      <h3>Weights noticed</h3>
      <ul className="small">
        {s.puzzles.ledger.clues.length === 0 && <li className="muted">Inspect the objects of the free switches again.</li>}
        {s.puzzles.ledger.clues.map((c) => <li key={c}>{CLUE_TEXT[c]}</li>)}
      </ul>
      <p className="small muted">Assign ratio tiles at the record sleeve rack in the common room.</p>
      {s.puzzles.ledger.solved && (
        <>
          <h3>Multiplication board</h3>
          <p className="small">Count the eight positions from left to right. Only #2–#5 supply factors: use that switch&apos;s weight for a 1, and ×1 for a 0. The other bits add no weight. Click a pattern to see its multiplication, then compare it with another.</p>
          <div className="row" style={{ gap: 6 }}>
            {allowed.map((i) => {
              const on = [2, 3, 4, 5].filter((a) => bitAt(i, a));
              const w = weightFromOdds(i, LEDGER_SOLUTION);
              const shown = weighed.includes(i);
              return (
                <button key={i} className="btn small" onClick={() => setWeighed((x) => (x.includes(i) ? x : [...x, i]))}>
                  <Bits index={i} /> {shown ? `= ${on.length ? on.map((a) => LEDGER_SOLUTION[a]).join('×') : '1'} = ${w}` : '⚖'}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Echo({ s }: { s: GameState }) {
  const zeros = s.journal.echoes.filter((e) => e.bit === 0).length;
  const ones = s.journal.echoes.length - zeros;
  const n = Math.max(1, s.journal.echoes.length);
  return (
    <div>
      <p><i>&quot;The record never lied. You were simply asking the wrong question.&quot;</i></p>
      <p className="small">Side X copies give one ghost echo instead of a note. They never produce an ordinary household reading and never count as song samples.</p>
      <div className="row" style={{ marginBottom: 6 }}>
        <span style={{ width: 120 }}>Hollow (0) {zeros}</span>
        <div className="barwrap"><div className="bar" style={{ width: `${(zeros / n) * 100}%`, background: 'var(--c-purple-2)' }} /></div>
        <button className="btn small" onClick={() => audio.playEcho(0)}>▶</button>
      </div>
      <div className="row">
        <span style={{ width: 120 }}>Bright (1) {ones}</span>
        <div className="barwrap"><div className="bar" style={{ width: `${(ones / n) * 100}%`, background: 'var(--c-cyan)' }} /></div>
        <button className="btn small" onClick={() => audio.playEcho(1)}>▶</button>
      </div>
      <p className="small">Echoes: {s.journal.echoes.map((e) => (e.bit ? '◆' : '◇')).join('') || '—'}</p>
      {s.journal.echoes.some((e) => e.source === 'archive') && (
        <p className="small gold">Includes {s.journal.echoes.filter((e) => e.source === 'archive').length} ARCHIVED echoes from a demo checkpoint (not live). Live echoes: {s.journal.echoes.filter((e) => e.source !== 'archive').length}.</p>
      )}
      <div className="panel" style={{ padding: 10, background: '#1d1812' }}>
        <b className="gold">Cartridge leaflet</b>
        <p className="small" style={{ margin: '6px 0' }}>Side X asks the first voice switch a <i>different question</i>. When the house is content, the bright echo answers about 74% of the time; when the house mourns, the hollow echo does. Content houses close in <b>C major</b>; mourning houses close in <b>C minor</b>. Trust the majority, not the moment.</p>
        <p className="tiny muted">Technical small print: P(hollow) = ½ ∓ √2⁄6 ≈ 26.4% / 73.6% for the two hidden phases. The ordinary note probabilities are identical in both cases.</p>
      </div>
      <h3>Your chord hypothesis</h3>
      <div className="row">
        {(['major', 'minor'] as const).map((c) => (
          <button key={c} className={`btn small ${s.notebook.chordDraft === c ? 'sel' : ''}`} onClick={() => gameStore.update((g) => void (g.notebook.chordDraft = c))}>
            C {c}
          </button>
        ))}
        <button className="btn small" onClick={() => audio.playChord('major')}>▶ major</button>
        <button className="btn small" onClick={() => audio.playChord('minor')}>▶ minor</button>
      </div>
    </div>
  );
}

export function exportExperimentLog(s: GameState) {
  const data = {
    game: "Schrödinger's Home",
    exportedAt: new Date().toISOString(),
    note: 'Anonymised: no player name. Archive entries come from a labelled demo checkpoint.',
    seed: s.seed,
    counts: { normal: s.journal.shots.length, echoes: s.journal.echoes.length, rewinds: s.counters.rewinds, toasterActivations: s.counters.toasterActivations },
    normalShots: s.journal.shots.map((x) => ({ timeline: x.timeline, bits: toBits(x.outcome), source: x.source, lantern: x.lantern ?? null })),
    echoes: s.journal.echoes.map((x) => ({ timeline: x.timeline, bit: x.bit, source: x.source })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `schrodingers-home-log-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Score({ s }: { s: GameState }) {
  return (
    <div>
      <p className="small">Scratch space for the vault&apos;s sixteen grooves. (The vault keeps its own draft order too.)</p>
      <textarea className="pix" rows={6} value={s.notebook.scoreNotes} onChange={(e) => gameStore.update((g) => void (g.notebook.scoreNotes = e.target.value.slice(0, 4000)))} aria-label="Score notes" />
      {s.puzzles.vault.order.length === 16 && (
        <>
          <h3>Vault draft</h3>
          <ol className="small">
            {s.puzzles.vault.order.map((i) => (
              <li key={i}><Lamps index={i} dimCat /> {s.puzzles.listening.solved ? noteLabel(i) : ''}</li>
            ))}
          </ol>
        </>
      )}
      <h3>For judges</h3>
      <button className="btn small" onClick={() => exportExperimentLog(s)}>Export experiment log (JSON)</button>
    </div>
  );
}
