import type { GameState, Settings } from './types';
import { DEFAULT_SETTINGS, gameStore, settingsStore, uiStore } from './store';

const SAVE_KEY = 'schrodingers-home/save/v1';
const SETTINGS_KEY = 'schrodingers-home/settings/v1';

const storage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

export function hasSave(): boolean {
  return !!storage()?.getItem(SAVE_KEY);
}

export function saveGame(state: GameState = gameStore.get()): boolean {
  try {
    storage()?.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('[save] failed', e);
    return false;
  }
}

export type LoadResult = { ok: true; state: GameState } | { ok: false; reason: 'none' | 'corrupt'; raw?: string };

export function validateSave(s: unknown): s is GameState {
  if (!s || typeof s !== 'object') return false;
  const g = s as GameState;
  return (
    g.version === 1 &&
    typeof g.seed === 'number' &&
    (g.phase === 0 || g.phase === 1) &&
    Array.isArray(g.manual) &&
    g.manual.length === 8 &&
    !!g.journal &&
    Array.isArray(g.journal.shots) &&
    !!g.puzzles &&
    !!g.inventory &&
    !!g.timeline
  );
}

export function loadGame(): LoadResult {
  const raw = storage()?.getItem(SAVE_KEY);
  if (!raw) return { ok: false, reason: 'none' };
  try {
    const parsed = JSON.parse(raw);
    if (!validateSave(parsed)) return { ok: false, reason: 'corrupt', raw };
    return { ok: true, state: parsed };
  } catch {
    return { ok: false, reason: 'corrupt', raw };
  }
}

export function deleteSave() {
  storage()?.removeItem(SAVE_KEY);
}

export function loadSettings(): Settings {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings) {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let installed = false;
/** Debounced autosave while a game is in progress. */
export function installAutosave() {
  if (installed) return;
  installed = true;
  gameStore.subscribe(() => {
    const screen = uiStore.get().screen;
    if (screen === 'title' || screen === 'name') return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => saveGame(), 400);
  });
  settingsStore.subscribe(() => saveSettings(settingsStore.get()));
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => {
    const screen = uiStore.get().screen;
    if (screen !== 'title' && screen !== 'name') saveGame();
  });
}
