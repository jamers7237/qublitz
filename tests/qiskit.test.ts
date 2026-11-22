import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { zDistribution, echoProbabilityZero, correctScore } from '../src/quantum/model';
import { toBits } from '../src/quantum/codebook';

// Cross-check against an independent Qiskit simulation (scripts/qiskit_reference.py).
const path = 'experiments/qiskit-reference.json';
const ref = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : null;

describe.skipIf(!ref)('Qiskit cross-check', () => {
  it('Z-basis probabilities match Qiskit for both phases', () => {
    for (const phase of [0, 1] as const) {
      const ours = zDistribution(phase);
      const theirs: Record<string, number> = ref[`z_phase${phase}`];
      expect(Object.keys(theirs)).toHaveLength(16);
      for (const [bits, p] of Object.entries(theirs)) expect(ours[parseInt(bits, 2)]).toBeCloseTo(p, 12);
    }
  });
  it('ascending order matches Qiskit', () => {
    expect(correctScore().map(toBits)).toEqual(ref.order_phase0);
    expect(correctScore().map(toBits)).toEqual(ref.order_phase1);
  });
  it('echo probabilities match Qiskit', () => {
    expect(echoProbabilityZero(0)).toBeCloseTo(ref.echo_p0_phase0, 12);
    expect(echoProbabilityZero(1)).toBeCloseTo(ref.echo_p0_phase1, 12);
  });
});
