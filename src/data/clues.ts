import type { GameState, PuzzleId } from '../state/types';

export interface HintLadder {
  id: PuzzleId;
  title: string;
  tiers: [string, string, string]; // poetic, targeted, explicit
  active: (s: GameState) => boolean;
  done: (s: GameState) => boolean;
}

const has = (s: GameState, k: string) => !!s.flags[k];

export const HINTS: HintLadder[] = [
  {
    id: 'prologue', title: 'The Wrong Song',
    tiers: [
      'The back of the suite is louder than the front.',
      'There is a heavy door north of the common room. See what it wants.',
      'Walk north from the common room into the vault room and interact with the vault door.',
    ],
    active: () => true, done: (s) => has(s, 'firstRewind'),
  },
  {
    id: 'notebook', title: 'The Survivor’s Notebook',
    tiers: [
      'Something remembers what the house forgets. It is hiding low, in your room.',
      'Look under the desk in the LEFT bedroom.',
      'Interact with the notebook under the left desk, replay the remembered note, and pick the waveform that matches it.',
    ],
    active: (s) => has(s, 'firstRewind'), done: (s) => s.inventory.keyItems.includes('notebook'),
  },
  {
    id: 'routes', title: 'The Language of Doors',
    tiers: [
      'Two rooms, more addresses than doors. The order you visit them in is a word.',
      'Each bedroom you enter writes one symbol. The brass lever by the gramophone reads the whole word. Did you notice the two different clicks?',
      'Left writes zero; right writes one; do not begin an address with zero. RIGHT alone is address 1. RIGHT then LEFT is 10 = address 2. Then pull the lever.',
    ],
    active: (s) => s.inventory.keyItems.includes('notebook'), done: (s) => Object.keys(s.journal.routes).length >= 8,
  },
  {
    id: 'calibration', title: 'The Polarity Cabinet',
    tiers: [
      'A switch is not a guess. Turn it once, and absence becomes presence.',
      'Measure the cabinet’s empty circuit first. Then put a gate in the slot that flips |0⟩ and measure again.',
      'Measure with the slot empty (lamp off = 0). Place the X tile in the slot and measure: X|0⟩ = |1⟩ lights the lamp. Absent/inactive = 0, present/active = 1.',
    ],
    active: (s) => s.inventory.keyItems.includes('notebook') && s.journal.observations.length > 0, done: (s) => s.puzzles.calibration.solved,
  },
  {
    id: 'manual', title: 'The House Manual',
    tiers: [
      'The manual’s rows are numbered like the addresses. Row #k listens to address k.',
      'For each address the lever has revealed, write its route, choose the object, and choose which of its two conditions means 0.',
      'Row #k: route = k in binary with L=0/R=1 (e.g. #6 = R·R·L). Object = the one the lever focused. Zero = the absent/inactive condition (closed, latched, empty, clean, stopped, dark, dry, cold).',
    ],
    active: (s) => s.inventory.keyItems.includes('notebook') && Object.keys(s.journal.routes).length > 0, done: (s) => !!s.flags.manualTwo,
  },
  {
    id: 'listening', title: 'The Listening Desk',
    tiers: [
      'A voice, a height, a breath. One of the eight lights makes no sound at all.',
      'Use "flip one wire" to change a single light of a recording and hear which quality changes. The first light (#1) never changes the sound.',
      'Wires #2–#3 change the instrument (voice), #4–#6 change the pitch (height), #7–#8 change the duration (breath).',
    ],
    active: (s) => s.puzzles.calibration.solved, done: (s) => s.puzzles.listening.solved,
  },
  {
    id: 'switchboard', title: 'The Tangled Switchboard',
    tiers: [
      'Some switches are only shadows of others. A shadow is the XOR of two lights.',
      'Pick a lamp and two other wires. The board checks the rule "lamp = wire1 XOR wire2" against every recording you have. Try lamps #6, #7 and #8.',
      'Lamp #6 = #2 XOR #4. Lamp #7 = #3 XOR #5. Lamp #8 = #2 XOR #5.',
    ],
    active: (s) => !!s.flags.impressions, done: (s) => s.puzzles.switchboard.solved.length >= 3,
  },
  {
    id: 'mirror', title: 'The Fractured Mirror',
    tiers: [
      'Light bends twice before it learns to fall.',
      'The beam travels right. The first shard must send it down; the next must send it left; the last must send it down onto the latch.',
      'Shard 1 = ╲, Shard 2 = ╱, Shard 3 = ╱.',
    ],
    active: (s) => s.puzzles.switchboard.solved.length >= 3, done: (s) => s.puzzles.mirror.solved,
  },
  {
    id: 'cartridge', title: 'Beneath the Record Player',
    tiers: [
      'The mirror’s light went somewhere. Follow it home.',
      'Check the brass panel underneath the gramophone in the common room. It also wants you to understand what the notes are made of.',
      'Solve the Mirror and the Listening Desk, then interact with the panel under the gramophone and install the cartridge.',
    ],
    active: (s) => s.puzzles.mirror.solved, done: (s) => s.inventory.keyItems.includes('cartridge'),
  },
  {
    id: 'echo', title: 'Major or Minor?',
    tiers: [
      'The record never lied. You were simply asking the wrong question.',
      'Set the gramophone to ECHO / SIDE X, then step outside and come back in. Repeat. Count the hollow and bright echoes.',
      'Mostly BRIGHT echoes (about 74%) → C major. Mostly HOLLOW echoes (about 74%) → C minor. 10–20 echoes usually make it clear.',
    ],
    active: (s) => s.inventory.keyItems.includes('cartridge'), done: (s) => s.journal.echoes.length >= 12,
  },
  {
    id: 'ledger', title: 'The Prime Ledger',
    tiers: [
      'Every free switch carries a weight. Look closely at the objects of the four free switches.',
      'The closet, trash bin, couch and clock each hide a ratio (inspect them again). Free switches are #2, #3, #4, #5.',
      '#2 closet → 2, #3 trash → 3, #4 couch → 5, #5 clock → 7.',
    ],
    active: (s) => s.puzzles.ledger.found, done: (s) => s.puzzles.ledger.solved,
  },
  {
    id: 'toaster', title: 'The Many-Worlds Toaster',
    tiers: [
      'One coincidence proves very little.',
      'Answer the toaster’s quiz using your own tallies. Then think about what a tally can and cannot prove.',
      'Pick the outcome with more tally marks, then answer that frequency is evidence, not certainty.',
    ],
    active: (s) => s.inventory.keyItems.includes('cartridge'), done: (s) => s.puzzles.toaster.unlocked,
  },
  {
    id: 'vault', title: 'The Sixteen Grooves',
    tiers: [
      'The rarest voice begins. The most inevitable voice finishes.',
      'Order the sixteen cards by their ledger weight, smallest first. Then pick the chord your echoes pointed to.',
      'Weight = product of the odds of every free switch (#2–#5) that is ON. Sort ascending: 1, 2, 3, 5, 6, 7, 10, 14, 15, 21, 30, 35, 42, 70, 105, 210.',
    ],
    active: (s) => s.puzzles.ledger.solved, done: (s) => s.puzzles.vault.opened,
  },
  {
    id: 'roommate', title: 'The Roommate Exchange (optional)',
    tiers: [
      'Things that belong elsewhere tend to glint.',
      'A prism (left bookshelf), a cassette (right dresser) and a key (left bedside box). Each belongs in the other bedroom.',
      'Prism → right projector. Cassette → left Listening Desk. Key → right metronome. Select the item in the inventory, choose Use, then interact with the target.',
    ],
    active: (s) => !!s.flags.sideQuest, done: (s) => s.inventory.delivered.length >= 3,
  },
  {
    id: 'lantern', title: 'The Which-Path Lantern (optional)',
    tiers: [
      'Looking first changes what is left to find.',
      'Pick one switch for the lantern, then come in from outside. It measures that switch first, then the record measures the rest.',
      'The final note always agrees with the lantern’s bit, because the rest of the register was sampled from the collapsed state.',
    ],
    active: (s) => !!s.flags.lanternOpen, done: (s) => !!s.flags.lanternUsed,
  },
];
