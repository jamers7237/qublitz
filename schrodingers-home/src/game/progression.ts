import { addressToRoute, normalizeRoute } from './navigationCipher';
import { sensorByAddress } from '../data/sensors';
import { gameStore } from '../state/store';
import type { GameState, PageId } from '../state/types';
import { toast } from '../state/uiActions';

export interface RowStatus {
  address: number;
  discovered: boolean; // lever has revealed this address
  routeOk: boolean;
  objectOk: boolean;
  polarityOk: boolean;
  verified: boolean;
}

/** Compares the player's own House Manual hypotheses to evidence they have actually gathered. */
export function manualRowStatus(s: GameState): RowStatus[] {
  return s.manual.map((row, k) => {
    const address = k + 1;
    const sensor = sensorByAddress(address)!;
    const discovered = !!s.journal.routes[address];
    const routeOk = discovered && normalizeRoute(row.route) === addressToRoute(address);
    const objectOk = discovered && row.object === sensor.id;
    const polarityOk = s.puzzles.calibration.solved && objectOk && row.zero === sensor.zero.key;
    return { address, discovered, routeOk, objectOk, polarityOk, verified: routeOk && objectOk && polarityOk };
  });
}

const normalShots = (s: GameState) => s.journal.shots.length;

/** Data-driven unlock predicates (no timers). */
export const P = {
  notebook: (s: GameState) => s.inventory.keyItems.includes('notebook'),
  calibrationAvailable: (s: GameState) => P.notebook(s) && s.journal.observations.length > 0,
  calibrated: (s: GameState) => s.puzzles.calibration.solved,
  verifiedRows: (s: GameState) => manualRowStatus(s).filter((r) => r.verified).length,
  listeningAvailable: (s: GameState) => P.calibrated(s) && P.verifiedRows(s) >= 2 && normalShots(s) >= 3,
  impressions: (s: GameState) => !!s.flags.impressions,
  listeningSolved: (s: GameState) => s.puzzles.listening.solved,
  switchboardAvailable: (s: GameState) => P.impressions(s) && normalShots(s) >= 4,
  parityCount: (s: GameState) => s.puzzles.switchboard.solved.length,
  parityDone: (s: GameState) => s.puzzles.switchboard.solved.length >= 3,
  mirrorAvailable: (s: GameState) => P.parityDone(s),
  mirrorSolved: (s: GameState) => s.puzzles.mirror.solved,
  cartridgeAvailable: (s: GameState) => P.mirrorSolved(s) && P.listeningSolved(s),
  cartridgeInstalled: (s: GameState) => s.inventory.keyItems.includes('cartridge'),
  ledgerAvailable: (s: GameState) => P.parityDone(s) && P.cartridgeInstalled(s),
  ledgerSolved: (s: GameState) => s.puzzles.ledger.solved,
  toasterChallengeAvailable: (s: GameState) => P.parityDone(s) && P.cartridgeInstalled(s) && s.journal.echoes.length >= 3,
  toasterUnlocked: (s: GameState) => s.puzzles.toaster.unlocked,
  lanternAvailable: (s: GameState) => P.impressions(s) && P.parityCount(s) >= 1,
  vaultReady: (s: GameState) => P.parityDone(s) && P.listeningSolved(s) && P.ledgerSolved(s) && P.cartridgeInstalled(s),
  sideQuest: (s: GameState) => !!s.flags.sideQuest,
};

function unlockPage(s: GameState, page: PageId) {
  if (!s.notebook.pages.includes(page)) {
    s.notebook.pages.push(page);
    if (!s.notebook.unread.includes(page)) s.notebook.unread.push(page);
  }
}

interface Milestone {
  flag: string;
  when: (s: GameState) => boolean;
  apply?: (s: GameState) => void;
  message?: string;
}

const MILESTONES: Milestone[] = [
  { flag: 'm_notebook', when: P.notebook, apply: (s) => { unlockPage(s, 'loops'); unlockPage(s, 'manual'); } },
  { flag: 'm_routes', when: (s) => Object.keys(s.journal.routes).length > 0 || !!s.flags.leverFirst, apply: (s) => unlockPage(s, 'routes') },
  { flag: 'm_calibrated', when: P.calibrated, apply: (s) => { s.notebook.unread.includes('manual') || s.notebook.unread.push('manual'); } },
  { flag: 'manualTwo', when: (s) => P.verifiedRows(s) >= 2, message: 'Two House Manual rows are verified by evidence.' },
  { flag: 'm_listeningReady', when: P.listeningAvailable, message: 'In the left bedroom, the Listening Desk’s headphones crackle.' },
  { flag: 'm_sounds', when: P.impressions, apply: (s) => unlockPage(s, 'sounds') },
  { flag: 'm_switchboardReady', when: P.switchboardAvailable, message: 'A switchboard lamp flickers in the right bedroom.' },
  { flag: 'm_parity', when: (s) => P.parityCount(s) >= 1, apply: (s) => unlockPage(s, 'parity') },
  { flag: 'm_parityDone', when: P.parityDone, apply: (s) => unlockPage(s, 'score'), message: 'The mirror shards in the right bedroom turn toward you.' },
  { flag: 'm_lantern', when: P.lanternAvailable, message: 'The Which-Path Lantern’s shutter unlatches (left bedroom).' },
  { flag: 'm_rattle', when: P.cartridgeAvailable, message: 'A rattle from beneath the record player. The brass panel has swung loose.' },
  { flag: 'm_echo', when: P.cartridgeInstalled, apply: (s) => unlockPage(s, 'echo') },
  { flag: 'm_ledger', when: (s) => s.puzzles.ledger.found, apply: (s) => unlockPage(s, 'ledger') },
  { flag: 'm_ledgerHint', when: P.ledgerAvailable, message: 'One of the record sleeves by the gramophone is thicker than the others.' },
  { flag: 'm_toaster', when: P.toasterChallengeAvailable, message: 'Something in the right bedroom just went *ding*.' },
  { flag: 'm_vault', when: P.vaultReady, message: 'The vault hums a new note. Its sixteen grooves are glowing.' },
  {
    flag: 'm_goodRoommate', when: (s) => s.inventory.delivered.length >= 3,
    apply: (s) => { if (!s.achievements.includes('Good Roommate')) s.achievements.push('Good Roommate'); s.flags.clueToken = true; },
    message: 'Badge earned: GOOD ROOMMATE. A clue token was tucked into your notebook.',
  },
];

/** Re-evaluate data-driven milestones after any action. Returns flags that newly fired. */
export function syncProgress(): string[] {
  const fired: string[] = [];
  const messages: string[] = [];
  const s0 = gameStore.get();
  const pending = MILESTONES.filter((m) => !s0.flags[m.flag] && m.when(s0));
  if (pending.length) {
    gameStore.update((s) => {
      for (const m of pending) {
        s.flags[m.flag] = true;
        m.apply?.(s);
        fired.push(m.flag);
        if (m.message) messages.push(m.message);
      }
    });
  }
  // flag gate for the lantern UI (used by hints)
  const s1 = gameStore.get();
  if (P.lanternAvailable(s1) && !s1.flags.lanternOpen) gameStore.update((s) => void (s.flags.lanternOpen = true));
  messages.forEach((m) => toast(m));
  return fired;
}
