import { D } from '../data/dialogue';
import { X, H } from '../quantum/gates';
import { measureQubit } from '../quantum/measure';
import { bitAt, flipAddress, PROPERTY_OF_ADDRESS, decode } from '../quantum/codebook';
import { correctScore, PARITY_RELATIONS, supportedEvents } from '../quantum/model';
import { streamRng, mulberry32, hashSeed } from '../quantum/rng';
import { StateVector } from '../quantum/statevector';
import { audio } from '../sound/audioEngine';
import { gameStore, logAction, uiStore } from '../state/store';
import type { GameState, PropertyLabel } from '../state/types';
import { closePanel, playEffect, say } from '../state/uiActions';
import { P, syncProgress } from './progression';
import { activateToaster, rewind } from './timeline';

// ---------------------------------------------------------------- notebook discovery

/** Three scribbled waveforms: the note you heard before the rewind + two distinct decoys. */
export function notebookMatchOptions(s: GameState): number[] {
  const target = s.journal.shots[0]?.outcome ?? supportedEvents()[15].index;
  const t = decode(target);
  const decoys = supportedEvents()
    .map((e) => e.index)
    .filter((i) => i !== target && decode(i).instrument.id !== t.instrument.id);
  const rng = mulberry32(hashSeed(s.seed, 'nb-decoys'));
  const pick: number[] = [];
  while (pick.length < 2 && decoys.length) pick.push(decoys.splice(Math.floor(rng() * decoys.length), 1)[0]);
  const all = [target, ...pick];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export function submitNotebookMatch(choice: number): boolean {
  const s = gameStore.get();
  const target = s.journal.shots[0]?.outcome;
  gameStore.update((g) => void g.puzzles.notebookMatch.tries++);
  if (target !== undefined && choice !== target) {
    audio.sfx('error');
    return false;
  }
  gameStore.update((g) => {
    g.puzzles.notebookMatch.solved = true;
    if (!g.inventory.keyItems.includes('notebook')) g.inventory.keyItems.push('notebook');
  });
  audio.sfx('success');
  closePanel();
  say(D.notebookFound);
  syncProgress();
  return true;
}

// ---------------------------------------------------------------- polarity cabinet (reference qubit)

export function placeCalibrationGate(slot: '' | 'X' | 'H') {
  gameStore.update((g) => void (g.puzzles.calibration.slot = slot));
}

/** A REAL one-qubit experiment: |0> -> [slot] -> measure. Separate from the hidden 8-qubit song. */
export function measureCalibration(): 0 | 1 {
  const s = gameStore.get();
  const c = s.puzzles.calibration;
  const sv = new StateVector(1);
  if (c.slot === 'X') sv.apply1(0, X);
  if (c.slot === 'H') sv.apply1(0, H);
  const bit = measureQubit(sv, 0, streamRng(s.seed, 'calibration', c.runs));
  const solvedNow = !c.solved && c.slot === 'X' && bit === 1 && c.measuredEmpty;
  gameStore.update((g) => {
    const cc = g.puzzles.calibration;
    cc.runs++;
    cc.lastResult = bit;
    if (cc.slot === '') cc.measuredEmpty = true;
    if (solvedNow) cc.solved = true;
  });
  audio.sfx(bit ? 'ding' : 'click');
  if (solvedNow) {
    audio.sfx('success');
    say(D.cabinetSolved);
    syncProgress();
  }
  return bit;
}

// ---------------------------------------------------------------- listening desk

export interface Recording {
  key: string;
  label: string;
  outcome: number;
  archival: boolean;
}

export function listeningRecordings(s: GameState): Recording[] {
  const out: Recording[] = s.journal.shots.map((sh) => ({
    key: `shot-${sh.id}`,
    label: `${sh.source === 'archive' ? 'Archive' : sh.source === 'toaster' ? 'Toast' : 'Loop'} ${sh.timeline}${sh.source === 'toaster' ? ` #${sh.id}` : ''}`,
    outcome: sh.outcome,
    archival: sh.source === 'archive',
  }));
  s.journal.tapes.forEach((o, i) => out.push({ key: `tape-${i}`, label: `J’s tape ${'AB'[i]}`, outcome: o, archival: true }));
  return out;
}

export function compareRecordings(a: number, b: number) {
  gameStore.update((g) => void g.puzzles.listening.comparisons++);
  const diff: number[] = [];
  for (let ad = 1; ad <= 8; ad++) if (bitAt(a, ad) !== bitAt(b, ad)) diff.push(ad);
  const props = new Set(diff.map((d) => PROPERTY_OF_ADDRESS[d]));
  return { diff, propertiesChanged: props.size, feedback: diff.length === 0 ? 'Those are the same recording pattern.' : props.size > 1 ? D.listeningWrongPair[0].text : 'Only one quality changed. Listen closely to which.' };
}

/** Classical audition of a one-wire change. NOT a measurement; may be a pattern the house never produces. */
export function auditionFlip(base: number, address: number): number {
  const flipped = flipAddress(base, address);
  gameStore.update((g) => void g.puzzles.listening.flips++);
  audio.playEvent(base, 0);
  audio.playEvent(flipped, decode(base).duration.seconds + 0.35);
  return flipped;
}

export function setListeningLabel(address: number, label: PropertyLabel) {
  gameStore.update((g) => void (g.puzzles.listening.labels[address] = label));
}

export function submitListening(): number {
  const s = gameStore.get();
  let correct = 0;
  for (let ad = 2; ad <= 8; ad++) if (s.puzzles.listening.labels[ad] === PROPERTY_OF_ADDRESS[ad]) correct++;
  if (correct === 7 && !s.puzzles.listening.solved) {
    gameStore.update((g) => void (g.puzzles.listening.solved = true));
    audio.sfx('success');
    say(D.listeningSolved);
    syncProgress();
  } else if (correct < 7) audio.sfx('error');
  return correct;
}

// ---------------------------------------------------------------- tangled switchboard

/** Every 8-bit pattern the player has legitimately heard (shots + archival tapes). */
export const knownStrings = (s: GameState): number[] => [...s.journal.shots.map((x) => x.outcome), ...s.journal.tapes];

export type PatchResult =
  | { ok: true; relation: string; already: boolean }
  | { ok: false; reason: 'contradiction'; against: number; total: number }
  | { ok: false; reason: 'weak'; total: number }
  | { ok: false; reason: 'invalid' };

export function patchSwitchboard(target: number, a: number, b: number): PatchResult {
  if (new Set([target, a, b]).size !== 3 || [target, a, b].some((x) => x < 2 || x > 8)) return { ok: false, reason: 'invalid' };
  gameStore.update((g) => void g.puzzles.switchboard.attempts++);
  const s = gameStore.get();
  const data = knownStrings(s);
  const bad = data.filter((o) => (bitAt(o, target) ^ bitAt(o, a) ^ bitAt(o, b)) !== 0).length;
  if (bad > 0) {
    audio.sfx('error');
    return { ok: false, reason: 'contradiction', against: bad, total: data.length };
  }
  const triple = [target, a, b].sort((x, y) => x - y).join(',');
  const rel = PARITY_RELATIONS.find((r) => [...r.addresses].sort((x, y) => x - y).join(',') === triple);
  if (!rel) {
    audio.sfx('click');
    return { ok: false, reason: 'weak', total: data.length };
  }
  const already = s.puzzles.switchboard.solved.includes(rel.id);
  if (!already) {
    gameStore.update((g) => void g.puzzles.switchboard.solved.push(rel.id));
    audio.sfx('unlock');
    const n = gameStore.get().puzzles.switchboard.solved.length;
    say(n >= 3 ? D.switchboardDone : D.switchboardOne);
    syncProgress();
  }
  return { ok: true, relation: rel.id, already };
}

// ---------------------------------------------------------------- fractured mirror

export const MIRROR = {
  cols: 6,
  rows: 4,
  emitter: { x: 0, y: 0, dx: 1, dy: 0 },
  shards: [
    { x: 3, y: 0 },
    { x: 3, y: 2 },
    { x: 1, y: 2 },
  ],
  latch: { x: 1, y: 3 },
  cracks: [{ x: 5, y: 3 }, { x: 0, y: 3 }],
};
/** 0 '/', 1 '—' (passes E/W), 2 '\', 3 '|' (passes N/S) */
export const SHARD_GLYPH = ['╱', '─', '╲', '│'];

export interface BeamTrace {
  path: { x: number; y: number }[];
  hit: 'latch' | 'wall' | 'blocked' | 'crack';
  shardsHit: number; // how many shards the beam has threaded in order (progress)
}

export function traceBeam(rot: number[]): BeamTrace {
  let { x, y, dx, dy } = MIRROR.emitter;
  const path = [{ x, y }];
  const visited = new Set<string>();
  let shardsHit = 0;
  for (let step = 0; step < 64; step++) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= MIRROR.cols || y >= MIRROR.rows) return { path, hit: 'wall', shardsHit };
    path.push({ x, y });
    if (x === MIRROR.latch.x && y === MIRROR.latch.y) return { path, hit: 'latch', shardsHit };
    if (MIRROR.cracks.some((c) => c.x === x && c.y === y)) return { path, hit: 'crack', shardsHit };
    const k = MIRROR.shards.findIndex((m) => m.x === x && m.y === y);
    if (k >= 0) {
      if (k === shardsHit) shardsHit++;
      const r = rot[k];
      if (r === 0) [dx, dy] = [-dy, -dx];
      else if (r === 2) [dx, dy] = [dy, dx];
      else if (r === 1 && dx === 0) return { path, hit: 'blocked', shardsHit };
      else if (r === 3 && dy === 0) return { path, hit: 'blocked', shardsHit };
    }
    const key = `${x},${y},${dx},${dy}`;
    if (visited.has(key)) return { path, hit: 'wall', shardsHit };
    visited.add(key);
  }
  return { path, hit: 'wall', shardsHit };
}

export function rotateShard(i: number): BeamTrace {
  const s = gameStore.get();
  if (s.puzzles.mirror.solved || !P.mirrorAvailable(s)) return traceBeam(s.puzzles.mirror.rot);
  gameStore.update((g) => void (g.puzzles.mirror.rot[i] = (g.puzzles.mirror.rot[i] + 1) % 4));
  const rot = gameStore.get().puzzles.mirror.rot;
  const t = traceBeam(rot);
  audio.sfx('mirror');
  if (t.hit === 'latch') {
    gameStore.update((g) => void (g.puzzles.mirror.solved = true));
    audio.sfx('unlock');
    say(D.mirrorSolved);
    syncProgress();
  }
  return t;
}

// ---------------------------------------------------------------- Hadamard's Harmonics

export function installCartridge() {
  const s = gameStore.get();
  if (!P.cartridgeAvailable(s) || P.cartridgeInstalled(s)) return;
  gameStore.update((g) => void g.inventory.keyItems.push('cartridge'));
  audio.sfx('unlock');
  closePanel();
  say(D.cartridgeInstalled);
  syncProgress();
}

export function setNextMode(mode: 'normal' | 'echo') {
  const s = gameStore.get();
  if (mode === 'echo' && !P.cartridgeInstalled(s)) return;
  gameStore.update((g) => void (g.nextMode = mode));
  audio.sfx('click');
  logAction(`next mode ${mode}`);
}

// ---------------------------------------------------------------- prime ledger

export const LEDGER_SOLUTION: Record<number, number> = { 2: 2, 3: 3, 4: 5, 5: 7 };

export function assignLedger(address: number, odds: number | null) {
  gameStore.update((g) => {
    const a = g.puzzles.ledger.assign;
    if (odds !== null) for (const k of Object.keys(a)) if (a[+k] === odds) a[+k] = null;
    a[address] = odds;
  });
}

export function submitLedger(): boolean {
  const s = gameStore.get();
  const ok = Object.entries(LEDGER_SOLUTION).every(([ad, r]) => s.puzzles.ledger.assign[+ad] === r);
  if (ok && !s.puzzles.ledger.solved) {
    gameStore.update((g) => void (g.puzzles.ledger.solved = true));
    audio.sfx('success');
    say(D.ledgerSolved);
    syncProgress();
  } else if (!ok) {
    audio.sfx('error');
    say(D.ledgerWrong);
  }
  return ok;
}

// ---------------------------------------------------------------- toaster quiz

export function toasterQuizPair(s: GameState): [{ outcome: number; count: number }, { outcome: number; count: number }] | null {
  const counts = new Map<number, number>();
  for (const sh of s.journal.shots) counts.set(sh.outcome, (counts.get(sh.outcome) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (sorted.length < 2) return null;
  const top = sorted[0];
  const other = sorted.find(([, c]) => c < top[1]);
  if (!other) return null;
  // present in a seed-stable order so the answer is not always on the left
  const pair: [{ outcome: number; count: number }, { outcome: number; count: number }] = [
    { outcome: top[0], count: top[1] },
    { outcome: other[0], count: other[1] },
  ];
  return hashSeed(s.seed, 'toaster-order') & 1 ? [pair[1], pair[0]] : pair;
}

export function answerToasterFrequency(outcome: number): boolean {
  const s = gameStore.get();
  const pair = toasterQuizPair(s);
  if (!pair) return false;
  const best = pair[0].count > pair[1].count ? pair[0] : pair[1];
  const ok = outcome === best.outcome;
  if (ok) gameStore.update((g) => void (g.puzzles.toaster.step = 1));
  audio.sfx(ok ? 'click' : 'error');
  return ok;
}

export function answerToasterCertainty(answer: 'certain' | 'evidence'): boolean {
  if (answer !== 'evidence') {
    audio.sfx('error');
    return false;
  }
  gameStore.update((g) => {
    g.puzzles.toaster.step = 2;
    g.puzzles.toaster.unlocked = true;
  });
  audio.sfx('ding');
  say(D.toasterUnlocked);
  syncProgress();
  return true;
}

export function runToaster(): number[] {
  const out = activateToaster();
  say(D.toasterRun);
  return out;
}

// ---------------------------------------------------------------- lantern

export function setLantern(address: number | null) {
  const s = gameStore.get();
  if (!P.lanternAvailable(s)) return;
  gameStore.update((g) => void (g.lanternAddress = address));
}

// ---------------------------------------------------------------- vault

export function vaultInitialOrder(s: GameState): number[] {
  if (s.puzzles.vault.order.length === 16) return s.puzzles.vault.order;
  const ids = supportedEvents().map((e) => e.index);
  const rng = mulberry32(hashSeed(s.seed, 'vault-shuffle'));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function setVaultOrder(order: number[]) {
  gameStore.update((g) => void (g.puzzles.vault.order = [...order]));
}

export function setVaultChord(chord: 'major' | 'minor') {
  gameStore.update((g) => {
    g.puzzles.vault.chord = chord;
    g.notebook.chordDraft = chord;
  });
}

export function isVaultCorrect(order: number[], chord: string, phase: 0 | 1): boolean {
  const target = correctScore();
  return order.length === 16 && order.every((x, i) => x === target[i]) && chord === (phase === 0 ? 'major' : 'minor');
}

export function submitVault(): boolean {
  const s = gameStore.get();
  if (!P.vaultReady(s)) return false;
  const order = s.puzzles.vault.order.length === 16 ? s.puzzles.vault.order : vaultInitialOrder(s);
  gameStore.update((g) => void g.counters.vaultAttempts++);
  if (isVaultCorrect(order, s.puzzles.vault.chord, s.phase)) {
    gameStore.update((g) => {
      g.puzzles.vault.opened = true;
      g.completedAt = Date.now();
    });
    logAction('vault opened');
    closePanel();
    playEffect('vaultOpen');
    audio.playChord(s.puzzles.vault.chord as 'major' | 'minor');
    say(D.vaultRight.map((l) => ({ ...l, then: 'ending' })));
    return true;
  }
  logAction('vault wrong');
  closePanel();
  audio.sfx('static');
  say(D.vaultWrong);
  rewind('vault-wrong');
  return false;
}

export function goToEnding() {
  uiStore.update((u) => {
    u.screen = 'ending';
    u.panel = null;
    u.dialogue = [];
  });
}
