import { hashSeed } from '../quantum/rng';
import type { GameState, ManualRow } from './types';

export const phaseFromSeed = (seed: number): 0 | 1 => (hashSeed(seed, 'hidden-phase') & 1) as 0 | 1;

export const emptyManual = (): ManualRow[] => Array.from({ length: 8 }, () => ({ route: '', object: '', zero: '', notes: '' }));

export function newGameState(playerName: string, seed: number): GameState {
  return {
    version: 1,
    playerName,
    seed: seed >>> 0,
    phase: phaseFromSeed(seed >>> 0),
    demo: null,
    room: 'foyer',
    spawn: 'start',
    timeline: { index: 0, status: 'pending', mode: null, outcome: null, echo: null, lantern: null, revealed: [] },
    nextMode: 'normal',
    lanternAddress: null,
    route: '',
    flags: {},
    counters: { rewinds: 0, vaultAttempts: 0, toasterActivations: 0, leverPulls: 0, nextShotId: 1 },
    journal: { shots: [], echoes: [], observations: [], routes: {}, tapes: [] },
    manual: emptyManual(),
    notebook: { pages: [], unread: [], scoreNotes: '', chordDraft: '' },
    puzzles: {
      notebookMatch: { solved: false, tries: 0 },
      calibration: { slot: '', measuredEmpty: false, lastResult: null, runs: 0, solved: false },
      listening: { labels: {}, solved: false, comparisons: 0, flips: 0 },
      switchboard: { solved: [], attempts: 0 },
      mirror: { rot: [1, 3, 1], solved: false },
      ledger: { found: false, clues: [], assign: { 2: null, 3: null, 4: null, 5: null }, solved: false },
      toaster: { step: 0, unlocked: false },
      vault: { order: [], chord: '', opened: false },
    },
    inventory: { items: [], picked: [], delivered: [], keyItems: [] },
    hints: {},
    achievements: [],
    startedAt: Date.now(),
    playMs: 0,
    completedAt: null,
  };
}
