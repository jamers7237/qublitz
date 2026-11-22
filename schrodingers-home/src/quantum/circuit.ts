import { H, RY, X, Z, thetaForOdds, type Mat2 } from './gates';
import { StateVector } from './statevector';

export const NUM_QUBITS = 8;

/**
 * House addresses 1..8 = displayed positions left->right: CAT I1 I0 P2 P1 P0 T1 T0.
 * Internal qubit index q = 8 - address, so the basis index written in binary
 * (MSB first) is exactly the displayed 8-character string.
 */
export const ADDR = { CAT: 1, I1: 2, I0: 3, P2: 4, P1: 5, P0: 6, T1: 7, T0: 8 } as const;
export const qubitOfAddress = (address: number): number => NUM_QUBITS - address;
export const addressOfQubit = (q: number): number => NUM_QUBITS - q;

export const Q = {
  CAT: qubitOfAddress(ADDR.CAT),
  I1: qubitOfAddress(ADDR.I1),
  I0: qubitOfAddress(ADDR.I0),
  P2: qubitOfAddress(ADDR.P2),
  P1: qubitOfAddress(ADDR.P1),
  P0: qubitOfAddress(ADDR.P0),
  T1: qubitOfAddress(ADDR.T1),
  T0: qubitOfAddress(ADDR.T0),
} as const;

/** Independent source qubits A,B,C,D live on I1, I0, P2, P1. */
export const SOURCE = { A: Q.I1, B: Q.I0, C: Q.P2, D: Q.P1 } as const;
export const SOURCE_ORDER = [SOURCE.A, SOURCE.B, SOURCE.C, SOURCE.D] as const;
/** Odds r:1 of reading 1 vs 0 for A,B,C,D. */
export const ODDS = [2, 3, 5, 7] as const;

export type Gate =
  | { op: 'RY'; q: number; theta: number; note?: string }
  | { op: 'X' | 'Z' | 'H'; q: number; note?: string }
  | { op: 'CNOT'; c: number; t: number; note?: string }
  | { op: 'CZ'; a: number; b: number; note?: string };

/** Reversible parity encoding: P0 = A^C, T1 = B^D, T0 = A^D. */
export const PARITY_GATES: Gate[] = [
  { op: 'CNOT', c: SOURCE.A, t: Q.P0 },
  { op: 'CNOT', c: SOURCE.C, t: Q.P0 },
  { op: 'CNOT', c: SOURCE.B, t: Q.T1 },
  { op: 'CNOT', c: SOURCE.D, t: Q.T1 },
  { op: 'CNOT', c: SOURCE.A, t: Q.T0 },
  { op: 'CNOT', c: SOURCE.D, t: Q.T0 },
];

/** Full preparation of the hidden song state for secret phase s. */
export function preparationGates(phase: 0 | 1): Gate[] {
  const gates: Gate[] = [{ op: 'X', q: Q.CAT, note: 'CAT := |1>' }];
  SOURCE_ORDER.forEach((q, k) =>
    gates.push({ op: 'RY', q, theta: thetaForOdds(ODDS[k]), note: `odds ${ODDS[k]}:1` }),
  );
  gates.push({ op: 'CZ', a: SOURCE.A, b: SOURCE.B, note: 'entangle A,B' });
  if (phase === 1) gates.push({ op: 'Z', q: SOURCE.A, note: 'secret phase' });
  gates.push(...PARITY_GATES);
  return gates;
}

/**
 * ECHO / SIDE X experiment: same preparation, then the parity network is
 * uncomputed in reverse order (CZ is left in place), then H on A.
 * Measuring A in Z afterwards == measuring A in the X basis.
 */
export function echoGates(phase: 0 | 1): Gate[] {
  return [
    ...preparationGates(phase),
    ...[...PARITY_GATES].reverse().map((g) => ({ ...g, note: 'uncompute' })),
    { op: 'H', q: SOURCE.A, note: 'ask the X question' },
  ];
}

const MATS: Record<'X' | 'Z' | 'H', Mat2> = { X, Z, H };

export function applyGate(sv: StateVector, g: Gate): void {
  switch (g.op) {
    case 'RY':
      sv.apply1(g.q, RY(g.theta));
      break;
    case 'X':
    case 'Z':
    case 'H':
      sv.apply1(g.q, MATS[g.op]);
      break;
    case 'CNOT':
      sv.cnot(g.c, g.t);
      break;
    case 'CZ':
      sv.cz(g.a, g.b);
      break;
  }
}

export function runGates(gates: Gate[], n = NUM_QUBITS): StateVector {
  const sv = new StateVector(n);
  for (const g of gates) applyGate(sv, g);
  return sv;
}

const NAMES = ['T0', 'T1', 'P0', 'P1', 'P2', 'I0', 'I1', 'CAT'];
export const qubitName = (q: number): string => NAMES[q] ?? `q${q}`;

export function describeGate(g: Gate): string {
  const n = qubitName;
  switch (g.op) {
    case 'RY':
      return `RY(${g.theta.toFixed(4)}) ${n(g.q)}${g.note ? `  # ${g.note}` : ''}`;
    case 'X':
    case 'Z':
    case 'H':
      return `${g.op} ${n(g.q)}${g.note ? `  # ${g.note}` : ''}`;
    case 'CNOT':
      return `CNOT ${n(g.c)} -> ${n(g.t)}${g.note ? `  # ${g.note}` : ''}`;
    case 'CZ':
      return `CZ ${n(g.a)}, ${n(g.b)}${g.note ? `  # ${g.note}` : ''}`;
  }
}
