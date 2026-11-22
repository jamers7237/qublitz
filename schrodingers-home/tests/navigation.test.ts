import { beforeEach, describe, expect, it } from 'vitest';
import { addressToRoute, appendRoute, normalizeRoute, parseRoute } from '../src/game/navigationCipher';
import { gameStore, uiStore } from '../src/state/store';
import { goToRoom } from '../src/game/timeline';
import { pullLever } from '../src/game/interactions';
import { bus } from '../src/game/bus';
import { sensorByAddress } from '../src/data/sensors';
import { freshTimeline, reset, walkRoute, walkAddress } from './helpers';
import { drainDialogue } from '../src/game/dialogueFlow';

describe('route cipher', () => {
  it('maps binary routes 1..8', () => {
    const expected = ['R', 'RL', 'RR', 'RLL', 'RLR', 'RRL', 'RRR', 'RLLL'];
    expected.forEach((r, i) => {
      expect(addressToRoute(i + 1)).toBe(r);
      expect(parseRoute(r)).toEqual({ kind: 'address', address: i + 1 });
    });
  });
  it('treats Left-first (zero) as invalid', () => {
    expect(parseRoute('L')).toEqual({ kind: 'zero' });
    expect(parseRoute('LR')).toEqual({ kind: 'zero' });
    expect(parseRoute('LRR')).toEqual({ kind: 'zero' });
  });
  it('rejects > 8 and empty', () => {
    expect(parseRoute('RLLR').kind).toBe('invalid');
    expect(parseRoute('RRRR').kind).toBe('invalid');
    expect(parseRoute('')).toEqual({ kind: 'empty' });
  });
  it('normalises typed input', () => {
    expect(normalizeRoute('r, l , l')).toBe('RLL');
    expect(normalizeRoute('right left')).toBe('RL');
  });
  it('bounds the buffer', () => {
    let r = '';
    for (let i = 0; i < 20; i++) r = appendRoute(r, 'R');
    expect(r.length).toBeLessThanOrEqual(6);
  });
});

describe('route buffer in the world', () => {
  beforeEach(() => {
    reset(777);
    goToRoom('common', 'fromFoyer');
    drainDialogue();
  });
  it('appends exactly one symbol per bedroom ENTRY, nothing on returning', () => {
    goToRoom('left', 'fromCommon');
    expect(gameStore.get().route).toBe('L');
    goToRoom('common', 'fromLeft');
    expect(gameStore.get().route).toBe('L');
    goToRoom('right', 'fromCommon');
    goToRoom('common', 'fromRight');
    expect(gameStore.get().route).toBe('LR');
  });
  it('internal bedroom moves never create a new sample', () => {
    const shots = gameStore.get().journal.shots.length;
    walkRoute('RLRLRL');
    goToRoom('vault', 'fromCommon');
    goToRoom('common', 'fromVault');
    expect(gameStore.get().journal.shots.length).toBe(shots);
  });
  it('12. Left-first then lever: ONLY a quiet knock. No popup, no focus, nothing logged.', () => {
    const focus: string[] = [];
    const off = bus.on('focusObject', (p) => focus.push(p.objectId));
    goToRoom('left', 'fromCommon');
    goToRoom('common', 'fromLeft');
    const before = structuredClone(gameStore.get().journal);
    const dialogueBefore = uiStore.get().dialogue.length;
    const res = pullLever();
    off();
    expect(res).toBe('knock');
    expect(uiStore.get().dialogue.length).toBe(dialogueBefore);
    expect(uiStore.get().panel).toBeNull();
    expect(focus).toEqual([]);
    expect(gameStore.get().journal).toEqual(before);
    expect(gameStore.get().route).toBe('');
    expect(gameStore.get().notebook.pages).not.toContain('routes');
  });
  it('valid addresses reveal (never change) the measured state of the right object', () => {
    for (let a = 1; a <= 8; a++) {
      const outcome = gameStore.get().timeline.outcome!;
      walkAddress(a);
      const res = pullLever();
      drainDialogue();
      expect(res).toEqual({ address: a });
      expect(gameStore.get().timeline.outcome).toBe(outcome);
      const obs = gameStore.get().journal.observations.filter((o) => o.via === 'lever').pop()!;
      const sensor = sensorByAddress(a)!;
      expect(obs.objectId).toBe(sensor.id);
      const bit = (outcome >> (8 - a)) & 1;
      expect(obs.state).toBe(bit ? sensor.one.key : sensor.zero.key);
    }
    expect(Object.keys(gameStore.get().journal.routes)).toHaveLength(8);
  });
  it('lever pull with route > 8 is a quiet click', () => {
    walkRoute('RLLR');
    expect(pullLever()).toBe('click');
    expect(uiStore.get().dialogue.length).toBe(0);
  });
  it('route buffer clears on rewind', () => {
    walkRoute('RR');
    freshTimeline();
    expect(gameStore.get().route).toBe('');
  });
});
