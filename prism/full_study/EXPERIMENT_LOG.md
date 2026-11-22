# PRISM full experimental log

This is a record of the study executed at the timestamp in `study_manifest.json`.
It does not claim to reconstruct earlier, undocumented development attempts.

## Hypotheses (specified before evaluating this run)

- H1: The optimizer cancels elementary identities without affecting unitaries.
- H2: Hidden phase relationships benefit from parity tracking.
- H3: Gains vary across input structures and weight profiles.
- H4: Some H-heavy inputs expose limits of the global parity sweep.
- H5: Runtime rises with circuit size; long circuits remain practical up to six qubits.
- H6: Ablation identifies which gains are specific to PRISM's parity method.

## Method

- Fixed master random seed: `20261122`; each generated case also has a stored seed.
- 380 distinct input circuits, 7 cost profiles, 2660 individual runs.
- Reconstructed the full unitary for each optimized output; rejected any non-equivalent or cost-regressive output.
- Compared adjacent cancellation, exact local+affine synthesis, and full PRISM on identical input circuits.
- Logged raw circuits, metrics, timings, weights, and all outputs in files beside this log.

## Verified outcomes

- Full-unitary checks passed: 2660/2660.
- No-cost-regression checks passed: 2660/2660.
- Balanced configuration improved 378/380 circuits.
- Mean balanced-cost reduction: 63.92%.
- Median balanced-cost reduction: 75.56%.
- Positive phase incremental contributions relative to local+affine baseline: 184 cases.

## Reproducibility and limits

- This is a seeded synthetic study, **not** the organizers' private benchmark.
- Timings are from one computer and are sensitive to load and Python configuration.
- Dense H blocks can suppress our phase-polynomial pass; some circuits do not improve.
- The original input is returned when our selected optimizations do not reduce weighted cost.
- Formal symbolic equivalence and physical QPU fidelity are not inferred from this numerical test.
- Check `failure_cases.json` for unchanged circuits and `ablations.csv` for component comparisons.

## Raw artifacts

1. `cases.jsonl` - every input, hypothesis, ID, seed, and family.
2. `circuits.jsonl` - full input and output for **every** circuit/configuration pair.
3. `runs.csv` - all resource metrics and verification outcomes.
4. `ablations.csv` - per-circuit controlled comparisons.
5. `summary.json` - statistical summaries by family and weight profile.
6. `study_manifest.json` - environment, timestamp, seed, weights.
7. `failure_cases.json` - zero-improvement samples for diagnosis.
