import { echoGates, preparationGates, runGates, SOURCE, qubitOfAddress, ODDS } from './circuit';
import { bitAt, toBits } from './codebook';
import { measureAll, measureQubit } from './measure';
import type { RNG } from './rng';
import type { StateVector } from './statevector';

/** XOR relations among addresses (each triple XORs to 0 on every supported label). */
export const PARITY_RELATIONS: { id: string; addresses: [number, number, number]; text: string }[] = [
  { id: 'r1', addresses: [2, 4, 6], text: 'P0 = I1 ⊕ P2' },
  { id: 'r2', addresses: [3, 5, 7], text: 'T1 = I0 ⊕ P1' },
  { id: 'r3', addresses: [2, 5, 8], text: 'T0 = I1 ⊕ P1' },
];

export const satisfiesParity = (index: number): boolean =>
  PARITY_RELATIONS.every((r) => (bitAt(index, r.addresses[0]) ^ bitAt(index, r.addresses[1]) ^ bitAt(index, r.addresses[2])) === 0);

const stateCache = new Map<number, StateVector>();
export function preparedState(phase: 0 | 1): StateVector {
  let s = stateCache.get(phase);
  if (!s) {
    s = runGates(preparationGates(phase));
    stateCache.set(phase, s);
  }
  return s.clone();
}

export function zDistribution(phase: 0 | 1): Float64Array {
  return preparedState(phase).probabilities();
}

export interface SupportedEvent {
  index: number;
  bits: string;
  prob: number;
  /** relative weight 2^A 3^B 5^C 7^D recovered from the Born probability */
  weight: number;
}

let supportCache: SupportedEvent[] | null = null;
/** All basis labels with non-zero Born probability, ascending by probability. Derived from the circuit. */
export function supportedEvents(): SupportedEvent[] {
  if (supportCache) return supportCache;
  const p = zDistribution(0);
  const total = ODDS.reduce((acc, r) => acc * (1 + r), 1); // 576
  const out: SupportedEvent[] = [];
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 1e-12) out.push({ index: i, bits: toBits(i), prob: p[i], weight: Math.round(p[i] * total) });
  }
  out.sort((a, b) => a.prob - b.prob);
  supportCache = out;
  return out;
}

/** The accepted vault melody: supported events from least to most probable. */
export const correctScore = (): number[] => supportedEvents().map((e) => e.index);

/** Odds-product weight from ledger assignments (address -> odds). */
export function weightFromOdds(index: number, oddsByAddress: Record<number, number>): number {
  let w = 1;
  for (const a of [2, 3, 4, 5]) if (bitAt(index, a)) w *= oddsByAddress[a] ?? 1;
  return w;
}

/** Exact P(echo = 0 | phase), computed from the circuit statevector. */
export function echoProbabilityZero(phase: 0 | 1): number {
  const sv = runGates(echoGates(phase));
  return 1 - sv.probOne(SOURCE.A);
}

export interface NormalShot {
  outcome: number;
  lantern?: { address: number; bit: 0 | 1 };
}

/**
 * One fresh copy, one full Z measurement.
 * With the lantern, one chosen qubit is projectively measured FIRST, and the
 * remaining register is then sampled from the collapsed (conditional) state.
 */
export function sampleNormal(phase: 0 | 1, rng: RNG, lanternAddress?: number | null): NormalShot {
  const sv = preparedState(phase);
  if (lanternAddress) {
    const bit = measureQubit(sv, qubitOfAddress(lanternAddress), rng);
    const outcome = measureAll(sv, rng);
    if (bitAt(outcome, lanternAddress) !== bit) throw new Error('Quantum assertion failed: lantern collapse inconsistent');
    return { outcome, lantern: { address: lanternAddress, bit } };
  }
  return { outcome: measureAll(sv, rng) };
}

/** One fresh copy, echo circuit, measure only A. No 8-bit Z reading exists for this copy. */
export function sampleEcho(phase: 0 | 1, rng: RNG): 0 | 1 {
  const sv = runGates(echoGates(phase));
  return measureQubit(sv, SOURCE.A, rng);
}
