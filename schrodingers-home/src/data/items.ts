import type { ItemId, KeyItemId } from '../state/types';

export interface ItemDef {
  id: ItemId;
  name: string;
  icon: string; // manifest id
  desc: string;
  foundIn: string;
  pickupObject: string;
  target: string; // interactable id where it can be used
}

export const ITEMS: Record<ItemId, ItemDef> = {
  prism: {
    id: 'prism', name: 'Small glass prism', icon: 'item.prism',
    desc: 'A thumb-sized triangular prism. Hold it to the lamp and it throws a tiny rainbow. Labelled, in J’s handwriting, "PROJECTOR (mine)".',
    foundIn: 'Left bedroom bookshelf', pickupObject: 'pickup.prism', target: 'projector',
  },
  cassette: {
    id: 'cassette', name: 'Red cassette tape', icon: 'item.cassette',
    desc: 'A red cassette. The label says "REFERENCE TAPE — FOR THE LISTENING DESK — DO NOT RECORD OVER (again)".',
    foundIn: 'Right bedroom dresser', pickupObject: 'pickup.cassette', target: 'listening',
  },
  metronomeKey: {
    id: 'metronomeKey', name: 'Brass wind-up key', icon: 'item.key',
    desc: 'A tiny brass winding key with a musical note stamped on the bow. It smells faintly of radiator.',
    foundIn: 'Left bedroom bedside box', pickupObject: 'pickup.key', target: 'metronome',
  },
};

export const KEY_ITEMS: Record<KeyItemId, { name: string; icon: string; desc: string }> = {
  notebook: { name: 'Survivor’s Notebook', icon: 'item.notebook', desc: 'It remembers what the house forgets. Press N to open.' },
  cartridge: { name: "Hadamard's Harmonics™", icon: 'item.cartridge', desc: 'Installed on the gramophone. Side Z: the usual question. Side X: the other one.' },
};

/** Archival reference recordings on J's cassette (not quantum measurements). */
export const TAPE_RECORDINGS = [0b10100010, 0b10110110];
