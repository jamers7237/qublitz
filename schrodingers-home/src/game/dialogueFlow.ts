import { uiStore } from '../state/store';
import { shiftDialogue } from '../state/uiActions';
import { handleChoice } from './interactions';

/** Advance the dialogue queue; dispatches a line's `then` action or the chosen option. */
export function advanceDialogue(choiceId?: string) {
  const line = uiStore.get().dialogue[0];
  if (!line) return;
  if (line.choices?.length && !choiceId) return; // must choose
  shiftDialogue();
  if (choiceId) handleChoice(choiceId);
  else if (line.then) handleChoice(line.then);
}

/** Test/automation helper: dismiss every queued line, choosing the first option where asked. */
export function drainDialogue(pick: (ids: string[]) => string = (ids) => ids[0], max = 200) {
  for (let i = 0; i < max && uiStore.get().dialogue.length; i++) {
    const l = uiStore.get().dialogue[0];
    advanceDialogue(l.choices?.length ? pick(l.choices.map((c) => c.id)) : undefined);
  }
}
