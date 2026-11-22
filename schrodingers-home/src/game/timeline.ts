import { D } from '../data/dialogue';
import { sampleEcho, sampleNormal } from '../quantum/model';
import { streamRng } from '../quantum/rng';
import { audio } from '../sound/audioEngine';
import { gameStore, logAction, uiStore } from '../state/store';
import type { RoomId } from '../state/types';
import { closePanel, playEffect, say, toast } from '../state/uiActions';
import { bus } from './bus';
import { appendRoute } from './navigationCipher';
import { P, syncProgress } from './progression';

/** Move between rooms through a doorway. Handles the hidden route cipher and fresh timelines. */
export function goToRoom(to: RoomId, spawn: string) {
  const from = gameStore.get().room;
  if (from === to) return;
  gameStore.update((s) => {
    s.room = to;
    s.spawn = spawn;
  });
  logAction(`room ${from} -> ${to}`);
  bus.emit('roomChanged', { room: to, spawn });
  onEnterRoom(from, to);
}

/** Debug-only teleport: no route symbols, no timelines, no story side effects. */
export function teleport(to: RoomId) {
  gameStore.update((s) => {
    s.room = to;
    s.spawn = 'center';
  });
  logAction(`[debug] teleport ${to}`);
  bus.emit('roomChanged', { room: to, spawn: 'center' });
}

function onEnterRoom(from: RoomId, to: RoomId) {
  const s = gameStore.get();
  // Room ENTRY event (fires once per doorway crossing) writes one route symbol.
  if ((to === 'left' || to === 'right') && from === 'common') {
    const sym = to === 'left' ? 'L' : 'R';
    gameStore.update((g) => {
      g.route = appendRoute(g.route, sym);
    });
    audio.sfx(sym === 'L' ? 'clickL' : 'clickR');
  } else {
    audio.sfx('door');
  }
  if (to === 'common' && from === 'foyer') {
    if (s.timeline.status === 'pending') startFreshTimeline();
  }
  if (to === 'left' && s.flags.firstRewind && !P.notebook(s) && !s.flags.notebookTeased) {
    gameStore.update((g) => void (g.flags.notebookTeased = true));
    say(D.notebookTease);
  }
}

/**
 * Prepare ONE fresh copy of the hidden state and run exactly ONE experiment
 * in the basis selected before entry. Never both on the same copy.
 */
export function startFreshTimeline() {
  const s = gameStore.get();
  if (s.timeline.status !== 'pending') throw new Error('Timeline already active; a fresh copy needs a rewind first');
  const index = s.timeline.index + 1;
  const rng = streamRng(s.seed, 'timeline', index);
  const mode = P.cartridgeInstalled(s) ? s.nextMode : 'normal';
  const firstEver = s.journal.shots.length === 0 && s.journal.echoes.length === 0;

  if (mode === 'normal') {
    const shot = sampleNormal(s.phase, rng, s.lanternAddress);
    gameStore.update((g) => {
      g.timeline = { index, status: 'active', mode: 'normal', outcome: shot.outcome, echo: null, lantern: shot.lantern ?? null, revealed: [] };
      g.journal.shots.push({ id: g.counters.nextShotId++, timeline: index, outcome: shot.outcome, source: 'timeline', lantern: shot.lantern, at: Date.now() });
      if (shot.lantern) {
        g.flags.lanternUsed = true;
        g.lanternAddress = null;
      }
    });
    logAction(`timeline ${index} normal -> ${shot.outcome.toString(2).padStart(8, '0')}`);
    audio.playEvent(shot.outcome, 0.7);
    bus.emit('recordPlay', { kind: 'normal', outcome: shot.outcome });
    if (firstEver) say(D.firstNote);
    else if (index === 3) say(D.everySound);
    else if (index <= 3) say(D.freshNote);
    else toast(`Timeline ${index}: the needle drops. One note.`);
    if (shot.lantern) toast(`The lantern looked first: switch #${shot.lantern.address} read ${shot.lantern.bit ? 'present' : 'absent'}. The record measured the rest.`);
  } else {
    const bit = sampleEcho(s.phase, rng);
    gameStore.update((g) => {
      g.timeline = { index, status: 'active', mode: 'echo', outcome: null, echo: bit, lantern: null, revealed: [] };
      g.journal.echoes.push({ id: g.counters.nextShotId++, timeline: index, bit, source: 'timeline', at: Date.now() });
    });
    logAction(`timeline ${index} echo -> ${bit}`);
    audio.playEcho(bit, 0.7);
    bus.emit('recordPlay', { kind: 'echo' });
    playEffect('echo');
    const firstEcho = gameStore.get().journal.echoes.length === 1;
    say(firstEcho ? [...D.freshEcho, ...D.firstEcho, ...D.echoGhostPage] : D.freshEcho.slice(0, 1));
  }
  syncProgress();
}

export type RewindReason = 'vault-prologue' | 'vault-wrong' | 'door' | 'debug';

/** Rewind to the foyer. Same secret, same journal, same inventory; the next entry is a fresh copy. */
export function rewind(reason: RewindReason) {
  gameStore.update((s) => {
    s.timeline = { index: s.timeline.index, status: 'pending', mode: null, outcome: null, echo: null, lantern: null, revealed: [] };
    s.route = '';
    s.counters.rewinds++;
    s.room = 'foyer';
    s.spawn = 'rewind';
    if (reason === 'vault-prologue') s.flags.firstRewind = true;
  });
  logAction(`rewind (${reason})`);
  uiStore.update((u) => {
    u.heldItem = null;
  });
  closePanel();
  audio.sfx('rewind');
  playEffect('rewind');
  bus.emit('rewind');
  bus.emit('roomChanged', { room: 'foyer', spawn: 'rewind' });
  if (reason === 'vault-prologue') say(D.afterFirstRewind);
  else if (reason !== 'debug') say(D.rewindGeneric);
  syncProgress();
}

/**
 * Many-Worlds Toaster: FOUR auxiliary, independently prepared copies, each measured once.
 * They are archived as normal-song shots but never touch the walking timeline's sensors.
 */
export function activateToaster(): number[] {
  const s = gameStore.get();
  if (!s.puzzles.toaster.unlocked) throw new Error('Toaster is locked');
  const k = s.counters.toasterActivations + 1;
  const outcomes = [0, 1, 2, 3].map((i) => sampleNormal(s.phase, streamRng(s.seed, 'toaster', k, i)).outcome);
  gameStore.update((g) => {
    g.counters.toasterActivations = k;
    for (const o of outcomes) g.journal.shots.push({ id: g.counters.nextShotId++, timeline: g.timeline.index, outcome: o, source: 'toaster', at: Date.now() });
  });
  logAction(`toaster #${k}: ${outcomes.map((o) => o.toString(2).padStart(8, '0')).join(',')}`);
  let t = 0.4;
  for (const o of outcomes) t += audio.playEvent(o, t) + 0.35;
  bus.emit('recordPlay', { kind: 'toaster' });
  syncProgress();
  return outcomes;
}
