/**
 * Generates the machine-readable experiment log from the REAL quantum engine.
 *   npm run experiments            (default 20000 shots per experiment, seed 2025)
 *   npm run experiments -- 50000 7 (shots, seed)
 * Writes experiments/sample-log.json and experiments/results.md
 */
import fs from 'node:fs';
import { preparationGates, echoGates, describeGate } from '../src/quantum/circuit';
import { noteLabel, bitAt } from '../src/quantum/codebook';
import { supportedEvents, echoProbabilityZero, sampleNormal, sampleEcho, zDistribution, satisfiesParity } from '../src/quantum/model';
import { streamRng } from '../src/quantum/rng';
import { runValidation, sourcePurityA } from '../src/quantum/validation';

const N = Number(process.argv[2] ?? 20000);
const SEED = Number(process.argv[3] ?? 2025);

const checks = runValidation();

// 1. Normal Z-basis shots for both phases
const normal: Record<string, { counts: Record<string, number>; chi2: number; dof: number }> = {};
for (const phase of [0, 1] as const) {
  const rng = streamRng(SEED, 'experiment-normal', phase);
  const counts = new Map<number, number>();
  let unsupported = 0;
  for (let i = 0; i < N; i++) {
    const { outcome } = sampleNormal(phase, rng);
    if (!satisfiesParity(outcome)) unsupported++;
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  }
  if (unsupported) throw new Error('unsupported outcome sampled');
  let chi2 = 0;
  for (const e of supportedEvents()) {
    const exp = e.prob * N;
    chi2 += ((counts.get(e.index) ?? 0) - exp) ** 2 / exp;
  }
  normal[`phase${phase}`] = { counts: Object.fromEntries(supportedEvents().map((e) => [e.bits, counts.get(e.index) ?? 0])), chi2, dof: 15 };
}

// 2. Echo / X experiment
const echo: Record<string, { zeros: number; shots: number; empirical: number; theory: number; stderr: number }> = {};
for (const phase of [0, 1] as const) {
  const rng = streamRng(SEED, 'experiment-echo', phase);
  let zeros = 0;
  for (let i = 0; i < N; i++) if (sampleEcho(phase, rng) === 0) zeros++;
  const theory = echoProbabilityZero(phase);
  echo[`phase${phase}`] = { zeros, shots: N, empirical: zeros / N, theory, stderr: Math.sqrt((theory * (1 - theory)) / N) };
}

// 3. Lantern (partial measurement) consistency
let lanternAgree = 0;
const L = Math.min(N, 10000);
for (let i = 0; i < L; i++) {
  const r = sampleNormal(i % 2 as 0 | 1, streamRng(SEED, 'lantern', i), 2 + (i % 7));
  if (bitAt(r.outcome, r.lantern!.address) === r.lantern!.bit) lanternAgree++;
}

// 4. How many echoes does a player need? exact binomial P(majority points to the right chord)
const p = echoProbabilityZero(1); // P(hollow | minor); symmetric for major
const binom = (n: number, k: number) => { let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i; return c; };
const majorityCorrect = (n: number) => {
  let s = 0;
  for (let k = 0; k <= n; k++) {
    const pk = binom(n, k) * p ** k * (1 - p) ** (n - k);
    if (k > n / 2) s += pk;
    else if (k === n / 2) s += pk / 2;
  }
  return s;
};
const echoBudget = [4, 8, 12, 16, 20, 30].map((n) => ({ echoes: n, pMajorityCorrect: majorityCorrect(n) }));

const log = {
  generatedAt: new Date().toISOString(),
  engine: 'in-browser TypeScript statevector (src/quantum)',
  seed: SEED,
  shotsPerExperiment: N,
  circuitPhase0: preparationGates(0).map(describeGate),
  echoCircuitTail: echoGates(0).slice(preparationGates(0).length).map(describeGate),
  validation: checks,
  theory: supportedEvents().map((e) => ({ bits: e.bits, weight: e.weight, prob: e.prob, label: noteLabel(e.index) })),
  zDistributionPhaseDifference: Math.max(...Array.from(zDistribution(0), (x, i) => Math.abs(x - zDistribution(1)[i]))),
  normal,
  echo,
  lantern: { shots: L, agreements: lanternAgree },
  entanglement: { purityA_withCZ: sourcePurityA(true), purityA_withoutCZ: sourcePurityA(false) },
  echoBudget,
};
fs.mkdirSync('experiments', { recursive: true });
fs.writeFileSync('experiments/sample-log.json', JSON.stringify(log, null, 2));

const md: string[] = [];
md.push(`# Experiment results (generated)\n\nSeed ${SEED}, ${N} shots per experiment, generated ${log.generatedAt} by \`npm run experiments\`.\n`);
md.push('## Validation\n\n| Check | Result | Detail |\n|---|---|---|');
for (const c of checks) md.push(`| ${c.name} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.detail} |`);
md.push(`\n## Normal (Z-basis) shots vs Born rule\n\n| # | Outcome | Weight | Theory | Empirical s=0 | Empirical s=1 |\n|---:|:---:|---:|---:|---:|---:|`);
supportedEvents().forEach((e, i) => md.push(`| ${i + 1} | \`${e.bits}\` | ${e.weight} | ${e.prob.toFixed(5)} | ${(normal.phase0.counts[e.bits] / N).toFixed(5)} | ${(normal.phase1.counts[e.bits] / N).toFixed(5)} |`));
md.push(`\nChi-square (15 dof; 95% critical value 25.0): s=0 → ${normal.phase0.chi2.toFixed(2)}, s=1 → ${normal.phase1.chi2.toFixed(2)}. Zero unsupported labels were ever sampled.`);
md.push(`\n## Echo (X-basis) experiment\n\n| Phase | Theory P(echo=0) | Empirical | Std. error |\n|---|---:|---:|---:|`);
for (const k of ['phase0', 'phase1']) md.push(`| ${k} | ${echo[k].theory.toFixed(6)} | ${echo[k].empirical.toFixed(6)} | ±${echo[k].stderr.toFixed(4)} |`);
md.push(`\n## Lantern partial measurement\n\n${lanternAgree}/${L} final notes agreed with the pre-measured bit (must be 100%).`);
md.push(`\n## Entanglement witness\n\nPurity of A's reduced state after source prep: with CZ ${sourcePurityA(true).toFixed(4)}, without CZ ${sourcePurityA(false).toFixed(4)}.`);
md.push(`\n## How many echoes does a player need?\n\n| Echoes | P(majority points to the right chord) |\n|---:|---:|`);
for (const b of echoBudget) md.push(`| ${b.echoes} | ${(b.pMajorityCorrect * 100).toFixed(1)}% |`);
fs.writeFileSync('experiments/results.md', md.join('\n') + '\n');
console.log(md.join('\n'));
