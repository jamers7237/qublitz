import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, uiStore } from '../src/state/store';
import { goToRoom, rewind } from '../src/game/timeline';
import { interact, pullLever, useItemOn } from '../src/game/interactions';
import { drainDialogue } from '../src/game/dialogueFlow';
import { P, manualRowStatus } from '../src/game/progression';
import { audio } from '../src/sound/audioEngine';
import { buildCheckpoint } from '../src/game/session';
import { activateToaster } from '../src/game/timeline';
import { setNextMode, measureCalibration, placeCalibrationGate, submitNotebookMatch } from '../src/game/puzzles';
import { saveGame, loadGame } from '../src/state/persistence';
import { sensorAsset } from '../src/data/interactables';
import { freshTimeline, memoryStorage, reset, walkAddress } from './helpers';
import { SENSORS } from '../src/data/sensors';

describe('11. one timeline = one shot', () => {
  beforeEach(() => reset(31337));
  it('entering from the foyer prepares exactly one copy and one full measurement', () => {
    expect(gameStore.get().journal.shots).toHaveLength(0);
    goToRoom('common', 'fromFoyer');
    expect(gameStore.get().journal.shots).toHaveLength(1);
    expect(gameStore.get().timeline.status).toBe('active');
    // walking back out and in again without a rewind does NOT sample again
    goToRoom('foyer', 'fromCommon');
    goToRoom('common', 'fromFoyer');
    expect(gameStore.get().journal.shots).toHaveLength(1);
  });
  it('audio replay is classical playback, not a shot', () => {
    goToRoom('common', 'fromFoyer');
    const n = gameStore.get().journal.shots.length;
    audio.playEvent(gameStore.get().timeline.outcome!);
    expect(gameStore.get().journal.shots.length).toBe(n);
  });
  it('household states are internally consistent with the single measured string', () => {
    goToRoom('common', 'fromFoyer');
    const s = gameStore.get();
    for (const sensor of SENSORS) {
      const bit = (s.timeline.outcome! >> (8 - sensor.address)) & 1;
      expect(sensorAsset(sensor.id)(s)).toBe(`${sensor.assetBase}.${bit ? sensor.one.key : sensor.zero.key}`);
    }
  });
  it('front door cannot rewind before the prologue rewind', () => {
    interact('frontdoor');
    expect(uiStore.get().dialogue[0].text).toMatch(/will not budge/);
  });
});

describe('21. ECHO timelines produce no fabricated Z reading', () => {
  it('logs one echo, zero normal shots, sensors unresolved, lever gives no Z evidence', () => {
    const s = buildCheckpoint('late', 4242);
    gameStore.set(s);
    uiStore.set({ ...uiStore.get(), dialogue: [], panel: null });
    setNextMode('echo');
    rewind('debug');
    const shots = gameStore.get().journal.shots.length;
    const echoes = gameStore.get().journal.echoes.length;
    const obs = gameStore.get().journal.observations.length;
    goToRoom('common', 'fromFoyer');
    drainDialogue();
    const g = gameStore.get();
    expect(g.timeline.mode).toBe('echo');
    expect(g.timeline.outcome).toBeNull();
    expect(g.journal.shots.length).toBe(shots);
    expect(g.journal.echoes.length).toBe(echoes + 1);
    for (const sensor of SENSORS) {
      const a = sensorAsset(sensor.id)(g);
      expect(a).toBe(sensor.address === 1 ? 'obj.window.open' : `${sensor.assetBase}.unresolved`);
    }
    walkAddress(3);
    expect(pullLever()).toBe('echo');
    interact('clock');
    drainDialogue();
    expect(gameStore.get().journal.observations.length).toBe(obs);
    // next NORMAL timeline resolves again
    setNextMode('normal');
    freshTimeline();
    expect(gameStore.get().timeline.mode).toBe('normal');
    expect(gameStore.get().journal.shots.length).toBe(shots + 1);
  });
  it('toaster: four independent copies, walking timeline untouched', () => {
    const s = buildCheckpoint('vault', 99);
    gameStore.set(s);
    freshTimeline();
    const before = structuredClone(gameStore.get().timeline);
    const n = gameStore.get().journal.shots.length;
    const out = activateToaster();
    expect(out).toHaveLength(4);
    expect(gameStore.get().journal.shots.length).toBe(n + 4);
    expect(gameStore.get().timeline).toEqual(before);
    expect(gameStore.get().journal.shots.slice(-4).every((x) => x.source === 'toaster')).toBe(true);
  });
});

describe('notebook, calibration and House Manual', () => {
  beforeEach(() => reset(2024));
  it('prologue -> rewind -> notebook match puzzle', () => {
    goToRoom('common', 'fromFoyer');
    drainDialogue();
    const first = gameStore.get().journal.shots[0].outcome;
    goToRoom('vault', 'fromCommon');
    interact('vault');
    drainDialogue();
    expect(gameStore.get().flags.firstRewind).toBe(true);
    expect(gameStore.get().room).toBe('foyer');
    expect(gameStore.get().journal.shots).toHaveLength(1); // preserved
    freshTimeline();
    goToRoom('left', 'fromCommon');
    drainDialogue();
    interact('notebook');
    drainDialogue();
    expect(uiStore.get().panel).toEqual({ kind: 'minigame', id: 'notebookMatch' });
    expect(submitNotebookMatch(first ^ 0xff)).toBe(false);
    expect(submitNotebookMatch(first)).toBe(true);
    expect(P.notebook(gameStore.get())).toBe(true);
  });
  it('calibration needs an empty measurement and an X gate; it never touches the song journal', () => {
    goToRoom('common', 'fromFoyer');
    gameStore.update((g) => {
      g.inventory.keyItems.push('notebook');
      g.journal.observations.push({ timeline: 1, objectId: 'window', state: 'open', via: 'inspect' });
    });
    const journal = structuredClone(gameStore.get().journal);
    placeCalibrationGate('X');
    expect(measureCalibration()).toBe(1);
    expect(gameStore.get().puzzles.calibration.solved).toBe(false); // must see "off" first
    placeCalibrationGate('');
    expect(measureCalibration()).toBe(0);
    placeCalibrationGate('X');
    expect(measureCalibration()).toBe(1);
    expect(gameStore.get().puzzles.calibration.solved).toBe(true);
    expect(gameStore.get().journal).toEqual(journal);
  });
  it('before calibration, inspection text never states 0/1 meanings', () => {
    goToRoom('common', 'fromFoyer');
    drainDialogue();
    for (const s of SENSORS.filter((x) => x.room === 'common')) {
      interact(s.id);
      const text = uiStore.get().dialogue.map((l) => l.text).join(' ');
      expect(text).not.toMatch(/\b(zero|one|0|1)\b/i);
      drainDialogue();
    }
  });
  it('15. manual edits survive rewind and save/reload; verification needs evidence', () => {
    (globalThis as any).localStorage = memoryStorage();
    goToRoom('common', 'fromFoyer');
    gameStore.update((g) => {
      g.manual[2] = { route: 'R R', object: 'trash', zero: 'full', notes: 'wrong guess first' };
    });
    expect(manualRowStatus(gameStore.get())[2].verified).toBe(false); // no evidence yet
    walkAddress(3);
    pullLever();
    drainDialogue();
    gameStore.update((g) => void (g.puzzles.calibration.solved = true));
    expect(manualRowStatus(gameStore.get())[2].polarityOk).toBe(false);
    gameStore.update((g) => void (g.manual[2].zero = 'empty')); // revise hypothesis
    expect(manualRowStatus(gameStore.get())[2].verified).toBe(true);
    rewind('door');
    expect(gameStore.get().manual[2].notes).toBe('wrong guess first');
    saveGame();
    const loaded = loadGame();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state.manual[2]).toEqual({ route: 'R R', object: 'trash', zero: 'empty', notes: 'wrong guess first' });
      expect(loaded.state.seed).toBe(gameStore.get().seed);
      expect(loaded.state.phase).toBe(gameStore.get().phase);
    }
  });
  it('corrupt save is detected, not crashed on', () => {
    (globalThis as any).localStorage = memoryStorage();
    localStorage.setItem('schrodingers-home/save/v1', '{"oops":');
    expect(loadGame()).toMatchObject({ ok: false, reason: 'corrupt' });
  });
});

describe('16. inventory and Roommate Exchange', () => {
  beforeEach(() => {
    reset(5150);
    goToRoom('common', 'fromFoyer');
    gameStore.update((g) => {
      g.flags.firstRewind = true;
      g.inventory.keyItems.push('notebook');
    });
    goToRoom('left', 'fromCommon');
    drainDialogue();
    interact('jnote');
    drainDialogue();
  });
  it('picks up, carries, rejects wrong targets without consuming, and delivers', () => {
    expect(P.sideQuest(gameStore.get())).toBe(true);
    interact('pickup.prism');
    interact('pickup.prism'); // no duplicate
    drainDialogue();
    expect(gameStore.get().inventory.items).toEqual(['prism']);
    expect(useItemOn('prism', 'listening')).toBe(false);
    drainDialogue();
    expect(gameStore.get().inventory.items).toEqual(['prism']);
    rewind('door');
    drainDialogue();
    expect(gameStore.get().inventory.items).toEqual(['prism']); // persists across rewinds
    freshTimeline();
    goToRoom('right', 'fromCommon');
    expect(useItemOn('prism', 'projector')).toBe(true);
    drainDialogue();
    expect(gameStore.get().inventory.delivered).toEqual(['prism']);
    interact('pickup.cassette');
    drainDialogue();
    goToRoom('common', 'fromRight');
    goToRoom('left', 'fromCommon');
    interact('pickup.key');
    drainDialogue();
    expect(useItemOn('cassette', 'listening')).toBe(true);
    expect(gameStore.get().journal.tapes).toHaveLength(2);
    goToRoom('common', 'fromLeft');
    goToRoom('right', 'fromCommon');
    expect(useItemOn('metronomeKey', 'metronome')).toBe(true);
    drainDialogue();
    expect(gameStore.get().achievements).toContain('Good Roommate');
    expect(gameStore.get().flags.clueToken).toBe(true);
  });
  it('tapes are archival references, never counted as measurements', () => {
    interact('pickup.prism');
    drainDialogue();
    const shots = gameStore.get().journal.shots.length;
    gameStore.update((g) => {
      g.inventory.items.push('cassette');
      g.inventory.picked.push('cassette');
    });
    useItemOn('cassette', 'listening');
    expect(gameStore.get().journal.shots.length).toBe(shots);
  });
});

describe('juice bottle save compatibility', () => {
  it.each([['dry','sealed'],['dripping','spilled'],['leaking','spilled']])('migrates an old %s guess without losing progress', (oldState,newState) => {
    (globalThis as any).localStorage = memoryStorage();
    const old = buildCheckpoint('vault', 2025);
    old.manual[6].zero = oldState;
    old.journal.observations.push({ timeline: 1, objectId: 'sink', state: oldState, via: 'lever' });
    saveGame(old);
    const loaded = loadGame();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.manual[6].zero).toBe(newState);
    expect(loaded.state.journal.observations[0].state).toBe(newState);
    expect(loaded.state.journal.routes).toEqual(old.journal.routes);
    expect(loaded.state.puzzles).toEqual(old.puzzles);
    expect(manualRowStatus(loaded.state)[6].verified).toBe(newState === 'sealed');
    saveGame(loaded.state);
    expect(loadGame()).toEqual(loaded);
  });
});
