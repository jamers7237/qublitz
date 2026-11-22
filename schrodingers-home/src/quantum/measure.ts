import type { RNG } from './rng';
import type { StateVector } from './statevector';

/** Born-rule sampling of a basis index from a probability vector. */
export function sampleIndex(probs: ArrayLike<number>, rng: RNG): number {
  let total = 0;
  for (let i = 0; i < probs.length; i++) total += probs[i];
  let r = rng() * total;
  let last = -1;
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] <= 0) continue;
    last = i;
    r -= probs[i];
    if (r < 0) return i;
  }
  if (last < 0) throw new Error('Cannot sample from an all-zero distribution');
  return last; // floating point tail
}

/** Full projective Z-basis measurement of every qubit; collapses the state. */
export function measureAll(sv: StateVector, rng: RNG): number {
  const idx = sampleIndex(sv.probabilities(), rng);
  sv.collapseTo(idx);
  return idx;
}

/** Projective Z measurement of a single qubit; collapses and renormalises. */
export function measureQubit(sv: StateVector, q: number, rng: RNG): 0 | 1 {
  const p1 = sv.probOne(q);
  const bit: 0 | 1 = rng() < p1 ? 1 : 0;
  sv.collapse(q, bit);
  return bit;
}
