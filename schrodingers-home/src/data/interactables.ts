import { sensorById } from './sensors';
import { bitAt } from '../quantum/codebook';
import type { GameState, RoomId } from '../state/types';
import { P } from '../game/progression';

export type InteractableKind = 'sensor' | 'gadget' | 'pickup' | 'photo' | 'door' | 'flavor' | 'lever';

export interface InteractableDef {
  id: string;
  name: string;
  room: RoomId;
  kind: InteractableKind;
  verb: string;
  /** Texture/asset id for the current game state (variants per physical state). */
  asset: (s: GameState) => string;
  visible?: (s: GameState) => boolean;
  /** Locked gadgets stay inspectable but render dim with a lock prompt. */
  locked?: (s: GameState) => boolean;
}

/** Sensor texture: measured physical state in NORMAL timelines, unresolved shimmer otherwise. */
export function sensorAsset(id: string) {
  return (s: GameState): string => {
    const def = sensorById(id)!;
    if (s.timeline.mode === 'normal' && s.timeline.outcome !== null) {
      const bit = bitAt(s.timeline.outcome, def.address);
      return `${def.assetBase}.${bit ? def.one.key : def.zero.key}`;
    }
    if (def.address === 1) return `${def.assetBase}.${def.one.key}`; // CAT window is constant
    return `${def.assetBase}.unresolved`;
  };
}

const fixed = (a: string) => () => a;
const sensor = (id: string, room: RoomId): InteractableDef => ({ id, name: sensorById(id)!.name, room, kind: 'sensor', verb: 'Inspect', asset: sensorAsset(id) });
const door = (id: string, room: RoomId, name: string, asset = 'obj.door.side'): InteractableDef => ({ id, name, room, kind: 'door', verb: 'Go', asset: fixed(asset) });

export const INTERACTABLES: InteractableDef[] = [
  // ---- foyer
  door('door.foyer.north', 'foyer', 'Common room', 'obj.door.top'),
  { id: 'frontdoor', name: 'Front door', room: 'foyer', kind: 'door', verb: 'Use', asset: fixed('obj.door.front') },
  { id: 'coatrack', name: 'Coat rack', room: 'foyer', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.coatrack') },
  { id: 'mailbox', name: 'Mail slot', room: 'foyer', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.mailbox') },
  // ---- common room
  door('door.common.south', 'common', 'Hallway (foyer)', 'obj.door.bottom'),
  door('door.common.west', 'common', 'Left bedroom'),
  door('door.common.east', 'common', 'Right bedroom'),
  door('door.common.north', 'common', 'Vault room', 'obj.door.vault'),
  sensor('window', 'common'),
  sensor('trash', 'common'),
  sensor('couch', 'common'),
  sensor('clock', 'common'),
  sensor('lamp', 'common'),
  sensor('sink', 'common'),
  sensor('radiator', 'common'),
  { id: 'gramophone', name: 'Gramophone', room: 'common', kind: 'gadget', verb: 'Use', asset: (s) => (P.cartridgeInstalled(s) ? 'obj.gramophone.harmonics' : 'obj.gramophone') },
  { id: 'lever', name: 'Brass lever', room: 'common', kind: 'lever', verb: 'Pull', asset: fixed('obj.lever') },
  {
    id: 'hatch', name: 'Brass panel (under the record player)', room: 'common', kind: 'gadget', verb: 'Inspect',
    asset: (s) => (P.cartridgeAvailable(s) ? 'obj.hatch.open' : 'obj.hatch.closed'),
    locked: (s) => !P.cartridgeAvailable(s),
  },
  { id: 'sleeves', name: 'Record sleeves', room: 'common', kind: 'gadget', verb: 'Inspect', asset: fixed('obj.sleeves') },
  // ---- left bedroom
  door('door.left.east', 'left', 'Common room'),
  sensor('closet', 'left'),
  { id: 'bed.left', name: 'Your bed', room: 'left', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.bed.left') },
  { id: 'desk', name: 'Desk', room: 'left', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.desk') },
  { id: 'notebook', name: 'Notebook under the desk', room: 'left', kind: 'pickup', verb: 'Pick up', asset: fixed('obj.notebook'), visible: (s) => !!s.flags.firstRewind && !P.notebook(s) },
  { id: 'jnote', name: 'Folded note from J', room: 'left', kind: 'photo', verb: 'Read', asset: fixed('obj.jnote'), visible: (s) => P.notebook(s) },
  {
    id: 'cabinet', name: 'Polarity Cabinet', room: 'left', kind: 'gadget', verb: 'Use',
    asset: (s) => (s.puzzles.calibration.solved ? 'obj.cabinet.solved' : P.calibrationAvailable(s) ? 'obj.cabinet.unlocked' : 'obj.cabinet.locked'),
    locked: (s) => !P.calibrationAvailable(s),
  },
  {
    id: 'listening', name: 'Listening Desk', room: 'left', kind: 'gadget', verb: 'Use',
    asset: (s) => (P.listeningAvailable(s) ? 'obj.listening.unlocked' : 'obj.listening.locked'),
    locked: (s) => !P.listeningAvailable(s),
  },
  { id: 'bookshelf', name: 'Bookshelf', room: 'left', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.bookshelf') },
  { id: 'pickup.prism', name: 'Small glass prism', room: 'left', kind: 'pickup', verb: 'Pick up', asset: fixed('item.prism'), visible: (s) => P.sideQuest(s) && !s.inventory.picked.includes('prism') },
  { id: 'bedsideBox', name: 'Bedside box', room: 'left', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.bedsidebox') },
  { id: 'pickup.key', name: 'Brass wind-up key', room: 'left', kind: 'pickup', verb: 'Pick up', asset: fixed('item.key'), visible: (s) => P.sideQuest(s) && !s.inventory.picked.includes('metronomeKey') },
  { id: 'photo.left', name: 'Move-in day photo', room: 'left', kind: 'photo', verb: 'Examine', asset: fixed('obj.photo.small') },
  { id: 'clipping', name: 'Scorched clipping', room: 'left', kind: 'photo', verb: 'Read', asset: fixed('obj.clipping') },
  {
    id: 'lantern', name: 'Which-Path Lantern', room: 'left', kind: 'gadget', verb: 'Use',
    asset: (s) => (P.lanternAvailable(s) ? 'obj.lantern.unlocked' : 'obj.lantern.locked'),
    locked: (s) => !P.lanternAvailable(s),
  },
  // ---- right bedroom
  door('door.right.west', 'right', 'Common room'),
  { id: 'bed.right', name: 'J’s bed', room: 'right', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.bed.right') },
  { id: 'portrait', name: 'Framed portrait', room: 'right', kind: 'photo', verb: 'Examine', asset: fixed('obj.portrait') },
  { id: 'poster', name: 'Concert poster', room: 'right', kind: 'photo', verb: 'Examine', asset: fixed('obj.poster') },
  {
    id: 'switchboard', name: 'Tangled Switchboard', room: 'right', kind: 'gadget', verb: 'Use',
    asset: (s) => (P.parityDone(s) ? 'obj.switchboard.solved' : P.switchboardAvailable(s) ? 'obj.switchboard.unlocked' : 'obj.switchboard.locked'),
    locked: (s) => !P.switchboardAvailable(s),
  },
  {
    id: 'mirror', name: 'Fractured Mirror', room: 'right', kind: 'gadget', verb: 'Use',
    asset: (s) => (s.puzzles.mirror.solved ? 'obj.mirror.solved' : P.mirrorAvailable(s) ? 'obj.mirror.unlocked' : 'obj.mirror.locked'),
    locked: (s) => !P.mirrorAvailable(s),
  },
  { id: 'sticky', name: 'Sticky note', room: 'right', kind: 'photo', verb: 'Read', asset: fixed('obj.stickynote') },
  {
    id: 'toaster', name: 'Many-Worlds Toaster', room: 'right', kind: 'gadget', verb: 'Use',
    asset: (s) => (s.puzzles.toaster.unlocked ? 'obj.toaster.unlocked' : 'obj.toaster.locked'),
    locked: (s) => !P.toasterChallengeAvailable(s),
  },
  { id: 'dresser', name: 'Dresser', room: 'right', kind: 'flavor', verb: 'Inspect', asset: fixed('obj.dresser') },
  { id: 'pickup.cassette', name: 'Red cassette tape', room: 'right', kind: 'pickup', verb: 'Pick up', asset: fixed('item.cassette'), visible: (s) => P.sideQuest(s) && !s.inventory.picked.includes('cassette') },
  { id: 'projector', name: 'Slide projector', room: 'right', kind: 'gadget', verb: 'Use', asset: (s) => (s.inventory.delivered.includes('prism') ? 'obj.projector.fixed' : 'obj.projector.broken') },
  { id: 'metronome', name: 'Metronome', room: 'right', kind: 'gadget', verb: 'Use', asset: (s) => (s.inventory.delivered.includes('metronomeKey') ? 'obj.metronome.fixed' : 'obj.metronome.broken') },
  // ---- vault
  door('door.vault.south', 'vault', 'Common room', 'obj.door.bottom'),
  { id: 'vault', name: 'Vault door', room: 'vault', kind: 'gadget', verb: 'Use', asset: (s) => (P.vaultReady(s) ? 'obj.vault.ready' : 'obj.vault.locked') },
  { id: 'plaque', name: 'Brass plaque', room: 'vault', kind: 'flavor', verb: 'Read', asset: fixed('obj.plaque') },
];

export const interactableById = (id: string) => INTERACTABLES.find((d) => d.id === id);
