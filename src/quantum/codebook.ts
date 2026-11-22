import { NUM_QUBITS } from './circuit';

export type InstrumentId = 'piano' | 'celesta' | 'cello' | 'pulse';

export const INSTRUMENTS: { code: string; id: InstrumentId; name: string; short: string }[] = [
  { code: '00', id: 'piano', name: 'Velvet felt piano', short: 'Felt piano' },
  { code: '01', id: 'celesta', name: 'Celestial music box', short: 'Music box' },
  { code: '10', id: 'cello', name: 'Pizzicato cello', short: 'Pizz. cello' },
  { code: '11', id: 'pulse', name: 'Retro pulse synth', short: 'Pulse synth' },
];

const midiFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export const PITCHES: { code: string; name: string; midi: number; freq: number }[] = [
  ['000', 'C3', 48],
  ['001', 'D3', 50],
  ['010', 'E3', 52],
  ['011', 'F3', 53],
  ['100', 'G3', 55],
  ['101', 'A3', 57],
  ['110', 'B♭3', 58],
  ['111', 'B3', 59],
].map(([code, name, midi]) => ({ code: code as string, name: name as string, midi: midi as number, freq: midiFreq(midi as number) }));

export const DURATIONS: { code: string; name: string; beats: number; seconds: number }[] = [
  { code: '00', name: 'Eighth note', beats: 0.5, seconds: 0.25 },
  { code: '01', name: 'Quarter note', beats: 1, seconds: 0.5 },
  { code: '10', name: 'Half note', beats: 2, seconds: 1.0 },
  { code: '11', name: 'Whole note', beats: 4, seconds: 2.0 },
];

export const BPM = 120;

/** 8-character displayed string CAT I1 I0 P2 P1 P0 T1 T0. */
export const toBits = (index: number): string => index.toString(2).padStart(NUM_QUBITS, '0');
export const fromBits = (bits: string): number => parseInt(bits, 2);

/** Bit at house address 1..8 (1 = leftmost = CAT). */
export const bitAt = (index: number, address: number): 0 | 1 => ((index >> (NUM_QUBITS - address)) & 1) as 0 | 1;
export const flipAddress = (index: number, address: number): number => index ^ (1 << (NUM_QUBITS - address));

export interface DecodedNote {
  index: number;
  bits: string;
  cat: 0 | 1;
  musicalBits: string;
  instrument: (typeof INSTRUMENTS)[number];
  pitch: (typeof PITCHES)[number];
  duration: (typeof DURATIONS)[number];
}

export function decode(index: number): DecodedNote {
  const bits = toBits(index);
  const instrument = INSTRUMENTS[parseInt(bits.slice(1, 3), 2)];
  const pitch = PITCHES[parseInt(bits.slice(3, 6), 2)];
  const duration = DURATIONS[parseInt(bits.slice(6, 8), 2)];
  return { index, bits, cat: bits[0] === '1' ? 1 : 0, musicalBits: bits.slice(1), instrument, pitch, duration };
}

export const noteLabel = (index: number): string => {
  const d = decode(index);
  return `${d.instrument.short} · ${d.pitch.name} · ${d.duration.name}`;
};

/** Developer-only: recover source bits A,B,C,D from a supported label. */
export function sourceBits(index: number): [0 | 1, 0 | 1, 0 | 1, 0 | 1] {
  return [bitAt(index, 2), bitAt(index, 3), bitAt(index, 4), bitAt(index, 5)];
}

/** Which musical property each address belongs to. */
export const PROPERTY_OF_ADDRESS: Record<number, 'cat' | 'voice' | 'height' | 'breath'> = {
  1: 'cat',
  2: 'voice',
  3: 'voice',
  4: 'height',
  5: 'height',
  6: 'height',
  7: 'breath',
  8: 'breath',
};
