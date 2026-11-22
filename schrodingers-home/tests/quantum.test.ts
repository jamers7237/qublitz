import { describe, expect, it } from 'vitest';
import { H, RY, X, Z, isUnitary, thetaForOdds } from '../src/quantum/gates';
import { echoGates, preparationGates, PARITY_GATES, runGates, SOURCE } from '../src/quantum/circuit';
import { bitAt, decode, toBits } from '../src/quantum/codebook';
import { correctScore, echoProbabilityZero, PARITY_RELATIONS, sampleEcho, sampleNormal, satisfiesParity, supportedEvents, zDistribution } from '../src/quantum/model';
import { mulberry32, streamRng } from '../src/quantum/rng';
import { runValidation, sourcePurityA } from '../src/quantum/validation';
import { StateVector } from '../src/quantum/statevector';

const ORACLE = [
  '10000000', '11000101', '10100010', '10010100', '11100111', '10001011', '11010001', '11001110',
  '10110110', '10101001', '11110011', '10011111', '11101100', '11011010', '10111101', '11111000',
];
const ORACLE_WEIGHTS = [1, 2, 3, 5, 6, 7, 10, 14, 15, 21, 30, 35, 42, 70, 105, 210];

describe('gates', () => {
  it('are unitary', () => {
    for (const m of [X, Z, H, RY(0.3), RY(thetaForOdds(7))]) expect(isUnitary(m)).toBe(true);
  });
  it('RY(2 atan sqrt r)|0> gives odds r:1', () => {
    for (const r of [2, 3, 5, 7]) {
      const sv = new StateVector(1).apply1(0, RY(thetaForOdds(r)));
      expect(sv.probOne(0) / (1 - sv.probOne(0))).toBeCloseTo(r, 12);
    }
  });
});

describe('8-qubit hidden state', () => {
  it('1. has unit norm for both phases', () => {
    for (const s of [0, 1] as const) expect(runGates(preparationGates(s)).norm2()).toBeCloseTo(1, 12);
  });
  it('2. CAT is always 1', () => {
    const p = zDistribution(0);
    for (let i = 0; i < 256; i++) if (p[i] > 1e-14) expect(bitAt(i, 1)).toBe(1);
  });
  it('3. has exactly 16 non-zero labels; all others are zero', () => {
    const p = zDistribution(0);
    const nz = [...p].filter((x) => x > 1e-14).length;
    expect(nz).toBe(16);
    for (let i = 0; i < 256; i++) if (!supportedEvents().some((e) => e.index === i)) expect(p[i]).toBeLessThan(1e-28);
  });
  it('4. every supported label satisfies the three XOR constraints', () => {
    for (const e of supportedEvents()) {
      const b = e.bits;
      const [, I1, I0, P2, P1, P0, T1, T0] = b.split('').map(Number);
      expect(P0).toBe(I1 ^ P2);
      expect(T1).toBe(I0 ^ P1);
      expect(T0).toBe(I1 ^ P1);
      expect(satisfiesParity(e.index)).toBe(true);
    }
    expect(PARITY_RELATIONS).toHaveLength(3);
  });
  it('5. covers 4 instruments, 8 pitches, 4 durations', () => {
    const d = supportedEvents().map((e) => decode(e.index));
    expect(new Set(d.map((x) => x.instrument.id)).size).toBe(4);
    expect(new Set(d.map((x) => x.pitch.name)).size).toBe(8);
    expect(new Set(d.map((x) => x.duration.name)).size).toBe(4);
  });
  it('6. Born probabilities equal 2^A 3^B 5^C 7^D / 576', () => {
    for (const e of supportedEvents()) {
      const [a, b, c, d] = [2, 3, 4, 5].map((ad) => bitAt(e.index, ad));
      expect(e.prob).toBeCloseTo((2 ** a * 3 ** b * 5 ** c * 7 ** d) / 576, 14);
    }
  });
  it('7. all 16 probabilities are distinct', () => {
    expect(new Set(supportedEvents().map((e) => e.weight)).size).toBe(16);
  });
  it('matches the developer oracle table (generated from the circuit, not hand-typed)', () => {
    expect(correctScore().map(toBits)).toEqual(ORACLE);
    expect(supportedEvents().map((e) => e.weight)).toEqual(ORACLE_WEIGHTS);
  });
  it('8. Z distribution is exactly invariant under the secret phase', () => {
    const p0 = zDistribution(0), p1 = zDistribution(1);
    for (let i = 0; i < 256; i++) expect(Math.abs(p0[i] - p1[i])).toBeLessThan(1e-15);
  });
  it('8b. but the amplitudes DO differ (the phase is real, just invisible in Z)', () => {
    const a = runGates(preparationGates(0)), b = runGates(preparationGates(1));
    let diff = 0;
    for (let i = 0; i < 256; i++) diff = Math.max(diff, Math.abs(a.re[i] - b.re[i]));
    expect(diff).toBeGreaterThan(0.1);
  });
});

describe('9. echo / SIDE X experiment', () => {
  it('uses the inverse parity network (reverse order) then H on A', () => {
    const g = echoGates(0);
    const prepLen = preparationGates(0).length;
    const uncompute = g.slice(prepLen, prepLen + PARITY_GATES.length);
    expect(uncompute.map((x) => JSON.stringify({ ...x, note: undefined }))).toEqual([...PARITY_GATES].reverse().map((x) => JSON.stringify({ ...x, note: undefined })));
    expect(g[g.length - 1]).toMatchObject({ op: 'H', q: SOURCE.A });
    expect(g.filter((x) => x.op === 'CZ')).toHaveLength(1); // CZ left in place
  });
  it('restores parity qubits to |0> before H', () => {
    const sv = runGates(echoGates(1));
    for (const ad of [6, 7, 8]) expect(sv.probOne(8 - ad)).toBeLessThan(1e-14);
  });
  it('has exact P(echo=0|s)', () => {
    expect(echoProbabilityZero(0)).toBeCloseTo(0.26429773960448416, 12);
    expect(echoProbabilityZero(1)).toBeCloseTo(0.7357022603955159, 12);
  });
  it('empirical echo frequencies approach the predictions', () => {
    for (const s of [0, 1] as const) {
      const rng = mulberry32(99 + s);
      let zeros = 0;
      const N = 20000;
      for (let i = 0; i < N; i++) if (sampleEcho(s, rng) === 0) zeros++;
      expect(Math.abs(zeros / N - echoProbabilityZero(s))).toBeLessThan(0.015);
    }
  });
  it('without uncomputation, the phase signal washes out (why the inverse CNOTs matter)', () => {
    const naive = (s: 0 | 1) => {
      const sv = runGates([...preparationGates(s), { op: 'H', q: SOURCE.A }]);
      return 1 - sv.probOne(SOURCE.A);
    };
    expect(Math.abs(naive(0) - naive(1))).toBeLessThan(1e-12);
  });
});

describe('10. entanglement', () => {
  it('CZ on superposed A,B produces a mixed reduced state for A', () => {
    expect(sourcePurityA(true)).toBeLessThan(0.99);
    expect(sourcePurityA(false)).toBeCloseTo(1, 12);
  });
  it('self-validation all passes', () => {
    for (const c of runValidation()) expect(c.pass, c.name).toBe(true);
  });
});

describe('sampling', () => {
  it('normal shots only produce supported labels and match Born frequencies', () => {
    const rng = mulberry32(7);
    const counts = new Map<number, number>();
    const N = 30000;
    for (let i = 0; i < N; i++) {
      const { outcome } = sampleNormal(0, rng);
      counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
    }
    for (const [o] of counts) expect(supportedEvents().some((e) => e.index === o)).toBe(true);
    for (const e of supportedEvents()) expect(Math.abs((counts.get(e.index) ?? 0) / N - e.prob)).toBeLessThan(0.01);
  });
  it('lantern partial measurement is consistent with the collapsed state', () => {
    for (let k = 0; k < 500; k++) {
      const r = sampleNormal(1, streamRng(5, 'lantern', k), 2 + (k % 7));
      expect(bitAt(r.outcome, r.lantern!.address)).toBe(r.lantern!.bit);
      expect(satisfiesParity(r.outcome)).toBe(true);
    }
  });
  it('lantern marginals still follow the Born rule (conditional, not independent)', () => {
    let ones = 0;
    const N = 20000;
    for (let k = 0; k < N; k++) if (sampleNormal(0, streamRng(11, 'l', k), 2).lantern!.bit) ones++;
    expect(ones / N).toBeCloseTo(2 / 3, 1);
  });
  it('seeded streams are reproducible', () => {
    const a = sampleNormal(0, streamRng(42, 'timeline', 3)).outcome;
    const b = sampleNormal(0, streamRng(42, 'timeline', 3)).outcome;
    expect(a).toBe(b);
  });
});
