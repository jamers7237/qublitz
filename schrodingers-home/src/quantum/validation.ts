import { preparationGates, runGates, SOURCE, ODDS, NUM_QUBITS } from './circuit';
import { bitAt, decode } from './codebook';
import { PARITY_RELATIONS, satisfiesParity, supportedEvents, zDistribution, echoProbabilityZero } from './model';

export interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

/** Self-checks used by tests, the debug overlay and the experiment script. */
export function runValidation(): Check[] {
  const checks: Check[] = [];
  const sv0 = runGates(preparationGates(0));
  const sv1 = runGates(preparationGates(1));
  checks.push({ name: 'State norm = 1', pass: Math.abs(sv0.norm2() - 1) < 1e-12 && Math.abs(sv1.norm2() - 1) < 1e-12, detail: `${sv0.norm2().toFixed(15)}` });
  const p0 = zDistribution(0);
  const p1 = zDistribution(1);
  let catOk = true;
  for (let i = 0; i < p0.length; i++) if (p0[i] > 1e-12 && bitAt(i, 1) !== 1) catOk = false;
  checks.push({ name: 'CAT always 1', pass: catOk, detail: catOk ? 'every supported label starts with 1' : 'violation' });
  const sup = supportedEvents();
  checks.push({ name: 'Exactly 16 supported labels', pass: sup.length === 16, detail: `${sup.length} non-zero of ${1 << NUM_QUBITS}` });
  checks.push({ name: 'All parity relations hold', pass: sup.every((e) => satisfiesParity(e.index)), detail: PARITY_RELATIONS.map((r) => r.text).join('; ') });
  const inst = new Set(sup.map((e) => decode(e.index).instrument.code));
  const pit = new Set(sup.map((e) => decode(e.index).pitch.code));
  const dur = new Set(sup.map((e) => decode(e.index).duration.code));
  checks.push({ name: 'Codebook coverage 4/8/4', pass: inst.size === 4 && pit.size === 8 && dur.size === 4, detail: `${inst.size} instruments, ${pit.size} pitches, ${dur.size} durations` });
  let maxErr = 0;
  for (const e of sup) {
    const [a, b, c, d] = [2, 3, 4, 5].map((ad) => bitAt(e.index, ad));
    const expected = (Math.pow(2, a) * Math.pow(3, b) * Math.pow(5, c) * Math.pow(7, d)) / 576;
    maxErr = Math.max(maxErr, Math.abs(expected - e.prob));
  }
  checks.push({ name: 'Born probs = 2^A3^B5^C7^D/576', pass: maxErr < 1e-12, detail: `max |err| = ${maxErr.toExponential(2)}` });
  const uniq = new Set(sup.map((e) => e.weight));
  checks.push({ name: 'All 16 probabilities distinct', pass: uniq.size === 16, detail: `${uniq.size} distinct weights` });
  let phaseDiff = 0;
  for (let i = 0; i < p0.length; i++) phaseDiff = Math.max(phaseDiff, Math.abs(p0[i] - p1[i]));
  checks.push({ name: 'Z distribution phase-invariant', pass: phaseDiff < 1e-12, detail: `max |p(s=0)-p(s=1)| = ${phaseDiff.toExponential(2)}` });
  const e0 = echoProbabilityZero(0);
  const e1 = echoProbabilityZero(1);
  const t0 = 0.5 - Math.SQRT2 / 6;
  const t1 = 0.5 + Math.SQRT2 / 6;
  checks.push({ name: 'Echo P(0|s) matches theory', pass: Math.abs(e0 - t0) < 1e-12 && Math.abs(e1 - t1) < 1e-12, detail: `s=0: ${e0.toFixed(10)}, s=1: ${e1.toFixed(10)}` });
  checks.push({ name: 'CZ entangles superposed A,B', pass: sourcePurityA(true) < 0.99 && Math.abs(sourcePurityA(false) - 1) < 1e-12, detail: `Tr(rho_A^2): with CZ ${sourcePurityA(true).toFixed(4)}, without ${sourcePurityA(false).toFixed(4)}` });
  return checks;
}

/** Purity of qubit A's reduced state right after source prep (+CZ), before any parity CNOT. */
export function sourcePurityA(withCZ: boolean): number {
  const gates = preparationGates(0).filter((g) => g.op !== 'CNOT' && (withCZ || g.op !== 'CZ'));
  return runGates(gates).reducedPurity(SOURCE.A);
}

export const ODDS_TOTAL = ODDS.reduce((a, r) => a * (1 + r), 1);
