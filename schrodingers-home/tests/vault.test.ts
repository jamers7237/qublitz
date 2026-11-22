import { describe, expect, it } from 'vitest';
import { gameStore, uiStore } from '../src/state/store';
import { goToRoom } from '../src/game/timeline';
import { interact, pullLever } from '../src/game/interactions';
import { drainDialogue } from '../src/game/dialogueFlow';
import { P } from '../src/game/progression';
import {
  answerToasterCertainty, answerToasterFrequency, assignLedger, installCartridge, measureCalibration, notebookMatchOptions,
  patchSwitchboard, placeCalibrationGate, rotateShard, runToaster, setListeningLabel, setNextMode, setVaultChord,
  setVaultOrder, submitLedger, submitListening, submitNotebookMatch, submitVault, toasterQuizPair, traceBeam, isVaultCorrect,
} from '../src/game/puzzles';
import { addressToRoute } from '../src/game/navigationCipher';
import { SENSORS } from '../src/data/sensors';
import { correctScore, supportedEvents, weightFromOdds, satisfiesParity } from '../src/quantum/model';
import { buildCheckpoint } from '../src/game/session';
import { freshTimeline, reset, seedWithPhase, walkAddress } from './helpers';
import { newGameState } from '../src/state/initial';

/** Plays the entire game through the same logic functions the UI calls. */
function goldenPath(seed: number, opts: { sideQuest: boolean }) {
  reset(seed, 'Golden');
  // Prologue
  goToRoom('common', 'fromFoyer');
  drainDialogue();
  expect(gameStore.get().journal.shots).toHaveLength(1);
  goToRoom('vault', 'fromCommon');
  interact('vault');
  drainDialogue();
  expect(gameStore.get().flags.firstRewind).toBe(true);
  // Notebook
  freshTimeline();
  goToRoom('left', 'fromCommon');
  drainDialogue();
  interact('notebook');
  drainDialogue();
  const opts3 = notebookMatchOptions(gameStore.get());
  expect(opts3).toContain(gameStore.get().journal.shots[0].outcome);
  submitNotebookMatch(gameStore.get().journal.shots[0].outcome);
  drainDialogue();
  if (opts.sideQuest) {
    interact('jnote');
    drainDialogue();
  }
  // Observe a sensor, then calibrate
  interact('closet');
  drainDialogue();
  interact('cabinet');
  drainDialogue();
  placeCalibrationGate('');
  measureCalibration();
  placeCalibrationGate('X');
  measureCalibration();
  drainDialogue();
  expect(P.calibrated(gameStore.get())).toBe(true);
  goToRoom('common', 'fromLeft');
  // Left-first lever (route "L") is the zero address: knock only
  expect(pullLever()).toBe('knock');
  // Discover all 8 addresses and fill the House Manual by hand
  for (let a = 1; a <= 8; a++) {
    walkAddress(a);
    expect(pullLever()).toEqual({ address: a });
    drainDialogue();
    const sensor = SENSORS.find((x) => x.address === a)!;
    gameStore.update((g) => void (g.manual[a - 1] = { route: addressToRoute(a).split('').join(','), object: sensor.id, zero: sensor.zero.key, notes: '' }));
  }
  expect(P.verifiedRows(gameStore.get())).toBe(8);
  // A few more single-shot timelines
  while (gameStore.get().journal.shots.length < 6) freshTimeline();
  // Listening desk
  goToRoom('left', 'fromCommon');
  interact('listening');
  drainDialogue();
  expect(gameStore.get().flags.impressions).toBe(true);
  const L = { 2: 'voice', 3: 'voice', 4: 'height', 5: 'height', 6: 'height', 7: 'breath', 8: 'breath' } as const;
  setListeningLabel(2, 'height');
  expect(submitListening()).toBeLessThan(7);
  for (const [a, l] of Object.entries(L)) setListeningLabel(+a, l);
  expect(submitListening()).toBe(7);
  drainDialogue();
  goToRoom('common', 'fromLeft');
  // Switchboard (uses only recorded strings)
  goToRoom('right', 'fromCommon');
  interact('switchboard');
  drainDialogue();
  expect(patchSwitchboard(6, 2, 4).ok).toBe(true);
  expect(patchSwitchboard(7, 3, 5).ok).toBe(true);
  expect(patchSwitchboard(8, 5, 2).ok).toBe(true);
  drainDialogue();
  expect(P.parityDone(gameStore.get())).toBe(true);
  // Mirror: two meaningful intermediate states before the latch
  expect(traceBeam(gameStore.get().puzzles.mirror.rot).shardsHit).toBe(1);
  rotateShard(0);
  expect(traceBeam(gameStore.get().puzzles.mirror.rot).shardsHit).toBe(2);
  rotateShard(1);
  expect(traceBeam(gameStore.get().puzzles.mirror.rot).shardsHit).toBe(3);
  rotateShard(2);
  rotateShard(2);
  rotateShard(2);
  drainDialogue();
  expect(gameStore.get().puzzles.mirror.solved).toBe(true);
  goToRoom('common', 'fromRight');
  // Hadamard's Harmonics
  interact('hatch');
  expect(uiStore.get().panel).toEqual({ kind: 'minigame', id: 'cartridge' });
  installCartridge();
  drainDialogue();
  // Echo experiments (fresh copies only)
  setNextMode('echo');
  for (let i = 0; i < 20; i++) freshTimeline();
  const echoes = gameStore.get().journal.echoes;
  expect(echoes).toHaveLength(20);
  const zeros = echoes.filter((e) => e.bit === 0).length;
  let chord: 'major' | 'minor' = zeros > echoes.length / 2 ? 'minor' : 'major';
  setNextMode('normal');
  freshTimeline();
  // Prime ledger
  interact('sleeves');
  drainDialogue();
  for (const id of ['closet', 'trash', 'couch', 'clock']) {
    if (id === 'closet') goToRoom('left', 'fromCommon');
    interact(id);
    drainDialogue();
    if (id === 'closet') goToRoom('common', 'fromLeft');
  }
  expect(gameStore.get().puzzles.ledger.clues).toHaveLength(4);
  assignLedger(2, 3);
  expect(submitLedger()).toBe(false);
  drainDialogue();
  assignLedger(2, 2);
  assignLedger(3, 3);
  assignLedger(4, 5);
  assignLedger(5, 7);
  expect(submitLedger()).toBe(true);
  drainDialogue();
  // Toaster
  goToRoom('right', 'fromCommon');
  const pair = toasterQuizPair(gameStore.get())!;
  expect(pair).not.toBeNull();
  const best = pair[0].count > pair[1].count ? pair[0] : pair[1];
  const worst = best === pair[0] ? pair[1] : pair[0];
  expect(answerToasterFrequency(worst.outcome)).toBe(false);
  expect(answerToasterFrequency(best.outcome)).toBe(true);
  expect(answerToasterCertainty('certain')).toBe(false);
  expect(answerToasterCertainty('evidence')).toBe(true);
  drainDialogue();
  runToaster();
  drainDialogue();
  goToRoom('common', 'fromRight');
  // Vault: the player derives the order from the 16 parity-allowed labels and the ledger
  expect(P.vaultReady(gameStore.get())).toBe(true);
  const allowed = Array.from({ length: 128 }, (_, i) => 128 + i).filter(satisfiesParity);
  expect(allowed).toHaveLength(16);
  const order = [...allowed].sort((a, b) => weightFromOdds(a, gameStore.get().puzzles.ledger.assign as any) - weightFromOdds(b, gameStore.get().puzzles.ledger.assign as any));
  goToRoom('vault', 'fromCommon');
  interact('vault');
  drainDialogue();
  setVaultOrder(order);
  setVaultChord(chord);
  const journalBefore = structuredClone(gameStore.get().journal);
  const secret = { seed: gameStore.get().seed, phase: gameStore.get().phase };
  let opened = submitVault();
  if (!opened) {
    // evidence misled us: wrong vault rewinds to the SAME secret and keeps the journal
    drainDialogue();
    expect(gameStore.get().room).toBe('foyer');
    expect({ seed: gameStore.get().seed, phase: gameStore.get().phase }).toEqual(secret);
    expect(gameStore.get().journal).toEqual(journalBefore);
    chord = chord === 'major' ? 'minor' : 'major';
    freshTimeline();
    setVaultChord(chord);
    opened = submitVault();
  }
  expect(opened).toBe(true);
  expect(gameStore.get().puzzles.vault.opened).toBe(true);
  expect(chord).toBe(gameStore.get().phase === 0 ? 'major' : 'minor');
  return gameStore.get();
}

describe('19. golden path', () => {
  it('phase 0 (C major) without the side quest', () => {
    const s = goldenPath(seedWithPhase(0, 100), { sideQuest: false });
    expect(s.phase).toBe(0);
    expect(s.inventory.delivered).toHaveLength(0);
  });
  it('phase 1 (C minor), alternate seed, with the side quest note read', () => {
    const s = goldenPath(seedWithPhase(1, 5000), { sideQuest: true });
    expect(s.phase).toBe(1);
  });
});

describe('13/14. vault scoring', () => {
  it('only the exact ascending order + correct chord opens', () => {
    const target = correctScore();
    expect(isVaultCorrect(target, 'major', 0)).toBe(true);
    expect(isVaultCorrect(target, 'minor', 0)).toBe(false);
    expect(isVaultCorrect(target, 'minor', 1)).toBe(true);
    expect(isVaultCorrect([...target].reverse(), 'major', 0)).toBe(false);
    for (let i = 0; i < 15; i++) {
      const o = [...target];
      [o[i], o[i + 1]] = [o[i + 1], o[i]];
      expect(isVaultCorrect(o, 'major', 0)).toBe(false);
    }
  });
  it('wrong submission rewinds with the same secret and preserved research', () => {
    const s = buildCheckpoint('vault', seedWithPhase(0, 1));
    gameStore.set(s);
    freshTimeline();
    const before = structuredClone(gameStore.get());
    setVaultOrder(correctScore());
    setVaultChord('minor');
    expect(submitVault()).toBe(false);
    const after = gameStore.get();
    expect(after.seed).toBe(before.seed);
    expect(after.phase).toBe(before.phase);
    expect(after.journal).toEqual(before.journal);
    expect(after.manual).toEqual(before.manual);
    expect(after.timeline.status).toBe('pending');
    expect(after.counters.rewinds).toBe(before.counters.rewinds + 1);
    freshTimeline();
    expect(gameStore.get().timeline.index).toBe(before.timeline.index + 1);
  });
  it('New Game changes seed/phase as intended', () => {
    const phases = new Set<number>();
    for (let seed = 1; seed < 40; seed++) phases.add(newGameState('x', seed).phase);
    expect(phases).toEqual(new Set([0, 1]));
  });
  it('the vault offers exactly the 16 supported events as cards', () => {
    expect(supportedEvents()).toHaveLength(16);
  });
});
