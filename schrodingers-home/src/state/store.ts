import { useSyncExternalStore } from 'react';
import type { GameState, Settings, UIState } from './types';
import { newGameState } from './initial';

export interface Store<T> {
  get(): T;
  set(next: T): void;
  update(fn: (draft: T) => void): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    get: () => state,
    set(next) {
      state = next;
      emit();
    },
    update(fn) {
      const draft = structuredClone(state);
      fn(draft);
      state = draft;
      emit();
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.45,
  sfx: 0.7,
  notes: 0.9,
  muted: false,
  reducedMotion: false,
  textSpeed: 'normal',
  showTouchControls: 'auto',
};

export const initialUI = (): UIState => ({
  screen: 'title',
  dialogue: [],
  panel: null,
  notebookPage: 'loops',
  heldItem: null,
  prompt: null,
  toast: null,
  effect: null,
  lastClosedAt: 0,
  debug: false,
  debugHitboxes: false,
  hovered: null,
  recentActions: [],
});

export const gameStore = createStore<GameState>(newGameState('Wanderer', 1));
export const uiStore = createStore<UIState>(initialUI());
export const settingsStore = createStore<Settings>({ ...DEFAULT_SETTINGS });

export const useGame = (): GameState => useSyncExternalStore(gameStore.subscribe, gameStore.get, gameStore.get);
export const useUI = (): UIState => useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);
export const useSettings = (): Settings => useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);

/** True when an overlay owns the keyboard and the world should freeze. */
export function isUIBlocking(ui: UIState = uiStore.get()): boolean {
  return ui.screen !== 'game' || ui.dialogue.length > 0 || ui.panel !== null || ui.effect?.kind === 'rewind';
}

export function logAction(text: string) {
  uiStore.update((u) => {
    u.recentActions.push(`${new Date().toISOString().slice(11, 19)} ${text}`);
    if (u.recentActions.length > 40) u.recentActions.splice(0, u.recentActions.length - 40);
  });
}
