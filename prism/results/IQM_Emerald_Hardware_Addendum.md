# PRISM: IQM Emerald hardware evidence addendum

This addendum supplements the previously finalized **offline** report.
It contains completed IQM `backend.run()` results from user-supplied job JSON files.
The original competition PDF predates these hardware results.

Verified hardware comparison pairs: **3**. Each pair has an original and PRISM job.
Every count total, ideal normalization, TVD, and full logical unitary were rechecked.

## Executed native resources and measurement quality

| Actual pair | Shots / arm | Native R before -> after | Native CZ before -> after | Native depth before -> after | TVD before -> after |
|---|---:|---:|---:|---:|---:|
| mixed_level0_run1.json | 256 | 333 -> 282 | 74 -> 77 | 236 -> 178 | 0.2664 -> 0.2001 |
| mixed_level3_run1.json | 512 | 72 -> 59 | 41 -> 39 | 74 -> 63 | 0.1975 -> 0.1469 |
| mixed_level3_run2.json | 512 | 71 -> 62 | 41 -> 39 | 77 -> 66 | 0.1421 -> 0.1648 |

## Statistical uncertainty (exploratory)

Difference is `TVD(original)-TVD(PRISM)`; positive favors PRISM. Bootstrap intervals are approximate.
Permutation tests use the null of equal measured distributions; they do not estimate quantum process fidelity.

| Pair | Difference | 95% bootstrap interval | Two-sided permutation p |
|---|---:|---:|---:|
| mixed_level0_run1.json | +0.0663 | [-0.0104, +0.1430] | 0.101 |
| mixed_level3_run1.json | +0.0507 | [-0.0123, +0.0975] | 0.053 |
| mixed_level3_run2.json | -0.0227 | [-0.0687, +0.0391] | 0.419 |

## Separate Qiskit level-3 compile-only evidence

The following counts are not physical job measurements:

| Compiled operations | Original | PRISM |
|---|---:|---:|
| R | 72 | 62 |
| CZ | 41 | 39 |
| Native depth | 74 | 65 |

## Interpretation and caveats

- Do **not** claim that a single 256-shot run proves better physical fidelity or statistical significance.
- On the first level-0 executed pair, PRISM used **three more CZ gates** despite fewer R gates and a shorter circuit. Report all three.
- A server default calibration-set change warning was displayed on the first run; the saved JSON has no calibration identifier. Reinitialize the backend before comparisons.
- The adapter retranspiles each run, with potentially different physical-qubit placements; calibration and layout variations can confound measured improvement.
- Hardware shots on one initial state cannot prove full-unitary equivalence; the separate full-matrix checker does that numerically.
- Fixed-layout/fixed-seed, counterbalanced, repeated paired jobs would strengthen causal hardware claims.
- The original 380-circuit / 2660-configuration study was synthetic offline evidence, not physical IQM execution.

## Raw job provenance

### mixed_level0_run1.json

- UTC: `2026-11-22T13:59:32.045836+00:00`; backend: `emerald`; optimization level: 0; shots per arm: 256.
- Original job ID: `01a2038d-f96f-7620-8a68-bd55ff898205`.
- PRISM job ID: `01a2038e-06b7-74d5-9a19-183c1aa7a5fa`.
- SHA-256 of original JSON: `4b54e61204915dbf155167e0a43c2eccbde626309fbd7023d0a554e264154c88`.
- Logical gates: 80 -> 56; logical weighted cost: 249.6 -> 192.2.

### mixed_level3_run1.json

- UTC: `2026-11-22T14:21:09.125517+00:00`; backend: `emerald`; optimization level: 3; shots per arm: 512.
- Original job ID: `01a203a1-b1e6-72c2-a2e9-cec47bfa9015`.
- PRISM job ID: `01a203a1-cd00-7676-bfda-6d563adbd70d`.
- SHA-256 of original JSON: `1679ea03144529044d320e385ad5cd55a2303b7db7b42cc4d22005f063ce6253`.
- Logical gates: 80 -> 56; logical weighted cost: 249.6 -> 192.2.

### mixed_level3_run2.json

- UTC: `2026-11-22T14:24:35.026921+00:00`; backend: `emerald`; optimization level: 3; shots per arm: 512.
- Original job ID: `01a203a4-e9cc-72e3-85fa-45f5833a0dc9`.
- PRISM job ID: `01a203a4-f6f7-7179-bbfa-719ecbf19a1e`.
- SHA-256 of original JSON: `f8799b30a26c27a41515c277ddef62c4d2932d35568516b4e29797b728b65961`.
- Logical gates: 80 -> 56; logical weighted cost: 249.6 -> 192.2.

## Reproduce and extend

1. Copy each **completed** `iqm_hardware_results.json` into `results/iqm_evidence/` with a unique name; do not overwrite the previous trial.
2. Run `python make_iqm_addendum.py` from the repository root; it revalidates every stored pair and regenerates the summary and PDF.
3. Commit the raw JSON, aggregated CSV, this Markdown, graph and PDF. Never commit IQM tokens, environment files or auth objects.
