import type { DialogueLine, MinigameId, Panel } from './types';
import { uiStore, logAction } from './store';

let lineId = 1;
export function say(lines: DialogueLine[]) {
  if (!lines.length) return;
  uiStore.update((u) => {
    u.dialogue.push(...lines.map((l) => ({ ...l, id: lineId++ })));
  });
}

let toastId = 1;
export function toast(text: string) {
  uiStore.update((u) => {
    u.toast = { text, id: toastId++ };
  });
}

export function openPanel(p: Panel) {
  logAction(`open ${typeof p === 'object' && p ? `${p.kind}:${p.id}` : p}`);
  uiStore.update((u) => {
    u.panel = p;
  });
}

export const openMinigame = (id: MinigameId) => openPanel({ kind: 'minigame', id });
export const openPhoto = (id: string) => openPanel({ kind: 'photo', id });

export function closePanel() {
  uiStore.update((u) => {
    u.panel = null;
    u.lastClosedAt = now();
  });
}

export function shiftDialogue(): DialogueLine | undefined {
  const first = uiStore.get().dialogue[0];
  uiStore.update((u) => {
    u.dialogue.shift();
    if (u.dialogue.length === 0) u.lastClosedAt = now();
  });
  return first;
}

let fxId = 1;
export function playEffect(kind: 'rewind' | 'static' | 'vaultOpen' | 'echo') {
  uiStore.update((u) => {
    u.effect = { kind, id: fxId++ };
  });
}
export function clearEffect() {
  uiStore.update((u) => {
    u.effect = null;
    u.lastClosedAt = now();
  });
}

export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
