import { gameStore, initialUI, uiStore } from '../src/state/store';
import { newGameState, phaseFromSeed } from '../src/state/initial';
import { goToRoom, rewind } from '../src/game/timeline';
import { drainDialogue } from '../src/game/dialogueFlow';
import { addressToRoute } from '../src/game/navigationCipher';

export function reset(seed = 12345, name = 'Ada') {
  gameStore.set(newGameState(name, seed));
  uiStore.set({ ...initialUI(), screen: 'game' });
}

export function seedWithPhase(phase: 0 | 1, start = 1): number {
  for (let s = start; ; s++) if (phaseFromSeed(s) === phase) return s;
}

/** Step outside (if needed) and walk back in: exactly one fresh copy. */
export function freshTimeline() {
  const s = gameStore.get();
  if (s.timeline.status === 'active') rewind('door');
  drainDialogue();
  if (gameStore.get().room !== 'foyer') throw new Error('expected foyer');
  goToRoom('common', 'fromFoyer');
  drainDialogue();
}

/** Walk a bedroom route from the common room (enter bedroom, come back). */
export function walkRoute(route: string) {
  for (const ch of route) {
    goToRoom(ch === 'L' ? 'left' : 'right', 'fromCommon');
    goToRoom('common', ch === 'L' ? 'fromLeft' : 'fromRight');
  }
}

export const walkAddress = (a: number) => walkRoute(addressToRoute(a));

export function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}
