import { D } from '../data/dialogue';
import { interactableById } from '../data/interactables';
import { ITEMS, TAPE_RECORDINGS } from '../data/items';
import { sensorById, sensorByAddress, sensorStateKey } from '../data/sensors';
import { bitAt } from '../quantum/codebook';
import { audio } from '../sound/audioEngine';
import { gameStore, logAction, uiStore } from '../state/store';
import type { DialogueLine, ItemId, MinigameId } from '../state/types';
import { openMinigame, openPhoto, say, toast } from '../state/uiActions';
import { bus } from './bus';
import { parseRoute } from './navigationCipher';
import { P, syncProgress } from './progression';
import { goToRoom, rewind } from './timeline';
import { goToEnding } from './puzzles';

const LEDGER_CLUE: Record<string, { clue: string; line: DialogueLine[] }> = {
  closet: { clue: 'hooks', line: D.oddsHooks },
  trash: { clue: 'trash', line: D.oddsTrash },
  couch: { clue: 'couch', line: D.oddsCouch },
  clock: { clue: 'clock', line: D.oddsClock },
};

export function addLedgerClue(clue: string) {
  gameStore.update((s) => {
    if (!s.puzzles.ledger.clues.includes(clue)) s.puzzles.ledger.clues.push(clue);
  });
}

/** Dispatcher for every in-world interaction (keyboard E, click, tap all land here). */
export function interact(objectId: string) {
  const def = interactableById(objectId);
  const s = gameStore.get();
  if (!def) return;
  if (def.visible && !def.visible(s)) return;
  logAction(`interact ${objectId}`);

  const held = uiStore.get().heldItem;
  if (held && def.kind !== 'door') {
    useItemOn(held, objectId);
    return;
  }

  switch (def.kind) {
    case 'sensor':
      return inspectSensor(objectId);
    case 'door':
      return useDoor(objectId);
    case 'lever':
      pullLever();
      return;
    case 'pickup':
      if (objectId === 'notebook') {
        say([...D.notebookWhisper, { text: 'You reach for it.', then: 'open:notebookMatch' }]);
        return;
      }
      return pickUp(objectId);
  }

  switch (objectId) {
    case 'gramophone':
      return openMinigame('gramophone');
    case 'hatch':
      if (P.cartridgeInstalled(s)) return say([{ text: 'The compartment is empty now. The cartridge is on the stylus arm.' }]);
      if (P.cartridgeAvailable(s)) return openMinigame('cartridge');
      if (P.mirrorSolved(s)) return say([{ text: 'The panel clicks but will not open. Engraved on it: "UNDERSTAND WHAT A NOTE IS MADE OF." (The Listening Desk, perhaps?)' }]);
      return say(D.hatchLocked);
    case 'sleeves':
      if (s.puzzles.ledger.found) return openMinigame('ledger');
      if (P.ledgerAvailable(s)) {
        gameStore.update((g) => void (g.puzzles.ledger.found = true));
        syncProgress();
        return say([...D.ledgerFound, { text: '(Inspect the four free switches’ objects again for their weights.)', then: 'open:ledger' } as DialogueLine]);
      }
      return say(P.parityDone(s) ? D.sleevesParity : D.sleevesEarly);
    case 'cabinet':
      if (!P.calibrationAvailable(s)) return say(D.cabinetLocked);
      if (!s.flags.cabinetIntro) {
        gameStore.update((g) => void (g.flags.cabinetIntro = true));
        return say(D.cabinetIntro.map((l) => ({ ...l, then: 'open:calibration' })));
      }
      return openMinigame('calibration');
    case 'listening':
      if (!P.listeningAvailable(s)) return say([...D.listeningLocked, { text: listeningStatus() }]);
      if (!s.flags.impressions) {
        gameStore.update((g) => void (g.flags.impressions = true));
        syncProgress();
        return say([...D.listeningImpressions.map((l, i, a) => (i === a.length - 1 ? { ...l, then: 'open:listening' } : l))] as DialogueLine[]);
      }
      return openMinigame('listening');
    case 'switchboard':
      if (!P.switchboardAvailable(s)) return say(D.switchboardLocked);
      if (!s.flags.switchboardIntro) {
        gameStore.update((g) => void (g.flags.switchboardIntro = true));
        return say(D.switchboardIntro.map((l) => ({ ...l, then: 'open:switchboard' })) as DialogueLine[]);
      }
      return openMinigame('switchboard');
    case 'mirror':
      if (!P.mirrorAvailable(s)) return say(D.mirrorLocked);
      return openMinigame('mirror');
    case 'toaster':
      if (!P.toasterChallengeAvailable(s) && !s.puzzles.toaster.unlocked) {
        const extra: DialogueLine[] = P.cartridgeInstalled(s) && P.parityDone(s) ? [{ text: `(It seems to want a little more echo evidence first: ${s.journal.echoes.length}/3 ghost echoes.)` }] : [];
        return say([...D.toasterLocked, ...extra]);
      }
      return openMinigame('toaster');
    case 'lantern':
      if (!P.lanternAvailable(s)) return say(D.lanternLocked);
      return openMinigame('lantern');
    case 'vault':
      return useVault();
    case 'plaque':
      return say(D.plaque);
    case 'jnote':
      if (!s.flags.sideQuest) {
        gameStore.update((g) => void (g.flags.sideQuest = true));
        syncProgress();
        return say(D.jNote);
      }
      return say(D.jNoteAgain);
    case 'photo.left':
      return openPhoto('leftPhoto');
    case 'clipping':
      return say(D.clipping.map((l) => ({ ...l, then: 'photo:clipping' })) as DialogueLine[]);
    case 'portrait':
      return say(D.photoRight.map((l) => ({ ...l, then: 'photo:james' })) as DialogueLine[]);
    case 'poster':
      return openPhoto('poster');
    case 'sticky':
      return say(D.addressZeroNote.map((l, i, a) => (i === a.length - 1 ? { ...l, then: 'photo:sticky' } : l)) as DialogueLine[]);
    case 'projector':
      if (s.inventory.delivered.includes('prism')) return say(D.projectorFixed.map((l) => ({ ...l, then: 'photo:projector' })) as DialogueLine[]);
      return say(D.projectorBroken);
    case 'metronome':
      if (s.inventory.delivered.includes('metronomeKey')) {
        if (s.puzzles.ledger.found) addLedgerClue('clock');
        return say(D.metronomeFixed);
      }
      return say(D.metronomeBroken);
    case 'bookshelf':
      return say(P.sideQuest(s) && !s.inventory.picked.includes('prism') ? D.bookshelfPrism : D.bookshelf);
    case 'dresser':
      return say(P.sideQuest(s) && !s.inventory.picked.includes('cassette') ? [...D.dresser, { text: 'On top: a red cassette tape.' }] : D.dresser);
    case 'bedsideBox':
      return say(P.sideQuest(s) && !s.inventory.picked.includes('metronomeKey') ? [{ text: 'A little wooden box. Inside, a brass key glints.' }] : D.bedsideBox);
    case 'desk':
      if (s.flags.firstRewind && !P.notebook(s)) return interact('notebook');
      return say(D.desk);
    case 'bed.left':
      return say(D.bedLeft);
    case 'bed.right':
      return say(D.bedRight);
    case 'coatrack':
      return say(D.coatRack);
    case 'mailbox':
      return say(D.mailbox);
  }
}

function listeningStatus(): string {
  const s = gameStore.get();
  const rows = P.verifiedRows(s);
  return `(Needs: the Polarity Cabinet solved${s.puzzles.calibration.solved ? ' ✓' : ''}, 3 recordings (${Math.min(3, s.journal.shots.length)}/3), and 2 verified House Manual rows (${Math.min(2, rows)}/2).)`;
}

function useDoor(id: string) {
  const s = gameStore.get();
  switch (id) {
    case 'door.foyer.north':
      return goToRoom('common', 'fromFoyer');
    case 'door.common.south':
      return goToRoom('foyer', 'fromCommon');
    case 'door.common.west':
      return goToRoom('left', 'fromCommon');
    case 'door.common.east':
      return goToRoom('right', 'fromCommon');
    case 'door.common.north':
      return goToRoom('vault', 'fromCommon');
    case 'door.left.east':
      return goToRoom('common', 'fromLeft');
    case 'door.right.west':
      return goToRoom('common', 'fromRight');
    case 'door.vault.south':
      return goToRoom('common', 'fromVault');
    case 'frontdoor':
      if (!s.flags.firstRewind) return say(D.frontDoorLocked);
      return say(D.frontDoorAsk);
  }
}

export function inspectSensor(id: string) {
  const s = gameStore.get();
  const sensor = sensorById(id)!;
  const lines: DialogueLine[] = [];
  if (s.timeline.mode === 'normal' && s.timeline.outcome !== null) {
    const bit = bitAt(s.timeline.outcome, sensor.address);
    const st = bit ? sensor.one : sensor.zero;
    lines.push({ text: st.desc }, { text: `(${st.colorBlind}.) What it means is less obvious.` });
    const prior = s.journal.observations.filter((o) => o.objectId === id && o.timeline !== s.timeline.index);
    gameStore.update((g) => {
      if (!g.journal.observations.some((o) => o.timeline === g.timeline.index && o.objectId === id))
        g.journal.observations.push({ timeline: g.timeline.index, objectId: id, state: st.key, via: 'inspect' });
    });
    if (!s.flags.firstStrange && prior.some((o) => o.state !== st.key)) {
      gameStore.update((g) => void (g.flags.firstStrange = true));
      lines.push(...D.firstStrange.slice(1));
    }
    // the player's OWN hypothesis, never the truth
    const rowIdx = s.manual.findIndex((r) => r.object === id && r.zero);
    if (rowIdx >= 0) {
      const inferred = s.manual[rowIdx].zero === st.key ? 0 : 1;
      lines.push({ text: `Your House Manual (row #${rowIdx + 1}) would call this a ${inferred}.` });
    }
  } else if (s.timeline.mode === 'echo') {
    lines.push({ text: sensor.unresolved });
    if (sensor.address !== 1) lines.push(...D.leverEcho.slice(0, 1));
  } else {
    lines.push({ text: 'Nothing about it has been decided yet tonight.' });
  }
  const lc = LEDGER_CLUE[id];
  if (lc && s.puzzles.ledger.found) {
    addLedgerClue(lc.clue);
    lines.push(...lc.line);
  }
  say(lines);
  syncProgress();
}

export type LeverResult = 'knock' | 'click' | 'first' | 'pending' | 'echo' | { address: number };

/** The brass lever commits the hidden route buffer as a binary address. */
export function pullLever(): LeverResult {
  const s = gameStore.get();
  const route = s.route;
  gameStore.update((g) => {
    g.route = '';
    g.counters.leverPulls++;
  });
  bus.emit('lever');
  audio.sfx('lever');
  const r = parseRoute(route);
  // SPECIAL: a route starting with LEFT (binary 0...) -> only a muted mechanical knock. No popup. No focus.
  if (r.kind === 'zero') {
    audio.sfx('knock');
    logAction('lever: knock');
    return 'knock';
  }
  if (r.kind === 'empty') {
    if (!s.flags.leverFirst) {
      gameStore.update((g) => void (g.flags.leverFirst = true));
      say(D.leverFirst);
      syncProgress();
      return 'first';
    }
    audio.sfx('click');
    return 'click';
  }
  if (r.kind === 'invalid') {
    audio.sfx('click');
    return 'click';
  }
  if (s.timeline.status !== 'active') {
    say(D.leverPending);
    return 'pending';
  }
  if (s.timeline.mode === 'echo') {
    say(D.leverEcho);
    return 'echo';
  }
  return revealAddress(r.address);
}

/** Reveal (never change!) the already-measured bit at an address in the current timeline. */
export function revealAddress(address: number): { address: number } {
  const s = gameStore.get();
  const sensor = sensorByAddress(address)!;
  const bit = bitAt(s.timeline.outcome!, address);
  const state = sensorStateKey(sensor, bit);
  const firstRoute = Object.keys(s.journal.routes).length === 0;
  gameStore.update((g) => {
    if (!g.timeline.revealed.includes(address)) g.timeline.revealed.push(address);
    if (!g.journal.routes[address]) g.journal.routes[address] = { objectId: sensor.id, timeline: g.timeline.index };
    if (!g.journal.observations.some((o) => o.timeline === g.timeline.index && o.objectId === sensor.id && o.via === 'lever'))
      g.journal.observations.push({ timeline: g.timeline.index, objectId: sensor.id, state, via: 'lever' });
  });
  logAction(`lever: address ${address} -> ${sensor.id} (${state})`);
  bus.emit('focusObject', { objectId: sensor.id });
  audio.sfx('unlock');
  say([...D.leverReveal(sensor.name, state, sensor.room), ...(firstRoute ? D.routeLesson : [])]);
  syncProgress();
  return { address };
}

/** Notebook shortcut: re-commit a route you have already discovered (only in the common room). */
export function shortcutRoute(address: number) {
  const s = gameStore.get();
  if (s.room !== 'common' || !s.journal.routes[address]) return;
  if (s.timeline.mode === 'echo') return say(D.leverEcho);
  if (s.timeline.status !== 'active') return say(D.leverPending);
  bus.emit('lever');
  audio.sfx('lever');
  gameStore.update((g) => void g.counters.leverPulls++);
  revealAddress(address);
}

function pickUp(objectId: string) {
  const entry = Object.values(ITEMS).find((i) => i.pickupObject === objectId);
  if (!entry) return;
  const s = gameStore.get();
  if (s.inventory.picked.includes(entry.id)) return;
  gameStore.update((g) => {
    g.inventory.items.push(entry.id);
    g.inventory.picked.push(entry.id);
  });
  audio.sfx('pickup');
  say([{ text: `You pick up the ${entry.name.toLowerCase()}.` }, ...D.pickup, { text: entry.desc }]);
  syncProgress();
}

/** Use a held inventory item on a hotspot. Wrong targets never consume the item. */
export function useItemOn(item: ItemId, objectId: string): boolean {
  uiStore.update((u) => void (u.heldItem = null));
  const def = ITEMS[item];
  const s = gameStore.get();
  if (!s.inventory.items.includes(item)) return false;
  if (def.target !== objectId) {
    audio.sfx('error');
    say(D.wrongUse);
    return false;
  }
  gameStore.update((g) => {
    g.inventory.items = g.inventory.items.filter((i) => i !== item);
    g.inventory.delivered.push(item);
    if (item === 'cassette') g.journal.tapes = [...TAPE_RECORDINGS];
  });
  audio.sfx('deliver');
  logAction(`deliver ${item}`);
  if (item === 'prism') say(D.prismReturned.map((l) => ({ ...l, then: 'photo:projector' })) as DialogueLine[]);
  if (item === 'cassette') say(D.cassetteReturned);
  if (item === 'metronomeKey') {
    if (gameStore.get().puzzles.ledger.found) addLedgerClue('clock');
    say(D.metronomeRepaired);
  }
  const done = gameStore.get().inventory.delivered.length >= 3;
  syncProgress();
  if (done) say(D.allDelivered);
  return true;
}

function useVault() {
  const s = gameStore.get();
  if (!s.flags.firstRewind) {
    return say(D.vaultProloguePlaque.map((l, i, a) => (i === a.length - 1 ? { ...l, then: 'rewind:vault' } : l)) as DialogueLine[]);
  }
  if (P.vaultReady(s)) {
    if (!s.flags.vaultReadySeen) {
      gameStore.update((g) => void (g.flags.vaultReadySeen = true));
      return say(D.vaultReady.map((l, i, a) => (i === a.length - 1 ? { ...l, then: 'open:vault' } : l)) as DialogueLine[]);
    }
    return openMinigame('vault');
  }
  return say(P.parityDone(s) ? D.vaultMid : D.vaultEarly);
}

/** Dialogue choice / continuation dispatcher. */
export function handleChoice(id: string) {
  logAction(`choice ${id}`);
  if (id === 'cancel') return;
  if (id === 'rewind:door') return rewind('door');
  if (id === 'rewind:vault') {
    audio.sfx('static');
    return rewind('vault-prologue');
  }
  if (id.startsWith('open:')) return openMinigame(id.slice(5) as MinigameId);
  if (id.startsWith('photo:')) return openPhoto(id.slice(6));
  if (id.startsWith('toast:')) return toast(id.slice(6));
  if (id === 'ending') return goToEnding();
}
