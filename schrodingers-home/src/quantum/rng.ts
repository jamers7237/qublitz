/** Deterministic seeded randomness so a saved game replays the same hidden state and shots. */
export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix several numbers/strings into a 32-bit seed (FNV-1a + avalanche). */
export function hashSeed(...parts: (number | string)[]): number {
  let h = 0x811c9dc5;
  const s = parts.map(String).join('␟');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Stream for one named purpose within a session (e.g. 'shot', timeline 7). */
export const streamRng = (seed: number, ...purpose: (number | string)[]): RNG => mulberry32(hashSeed(seed, ...purpose));

export function randomSeed(): number {
  try {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    return a[0] >>> 0;
  } catch {
    return (Math.random() * 2 ** 32) >>> 0;
  }
}
