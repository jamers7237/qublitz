# Actual IQM Garnet hardware experiment

The level-1 bit-flip correction pilot completed on **real IQM garnet hardware**. Mean input-state survival was **93.41% with recovery** and **84.57% with recovery disabled** across the same eight state/fault combinations. This is a targeted error-correction demonstration, not a fault-tolerance or break-even memory claim.

## Execution evidence

- Job ID: `01a1ffa5-97e8-77e2-ac14-9a55f2083731`.
- Prepared at: `2026-11-21T19:46:23.194992+00:00` (UTC), November 21, 2026 in New York.
- Backend: `garnet`; native target has 20 qubits. The code has three logical circuit wires; native routing can use additional physical qubits (see `native_resources.json`).
- Calibration set recorded at compilation: `ea681de1-9661-41e5-bd6f-cb524fa056a6`.
- Workload: 16 circuits × 256 shots = 4,096 circuit-shots, one hardware job.
- Inputs: |+⟩ and |+i⟩; faults: I, X0, X1, X2; recovery enabled and disabled for each combination.
- Raw counts and per-circuit metrics: `results/iqm-pilot/results.json`.
- Job identity, compilation/layout, original circuits, native circuits, and topology: `results/iqm-pilot/`.

## Circuit and measurement

Prepare q0, encode with two CNOTs, inject the designated test fault, and decode using two CNOTs. The work bits q1,q2 hold a syndrome independent of the unknown logical amplitudes. Recovery is a Toffoli(q1,q2→q0); disabled controls omit that gate. Finally invert input preparation and measure q0. A zero is a successful input-state survival outcome. Both work bits are also measured to score the syndrome.

Recovery uses the same fixed controlled gate for every hidden fault, never the injected error label. The compact syndrome is (s0,s1)=(q1,q2): I→00, X0→11, X1→10, X2→01. Qiskit count strings are printed s1 s0 logical. All reported survival values include every shot, with no syndrome postselection.

Native compilation used 13 CZ gates and depth 27–28 per corrected circuit, versus 4 CZ gates and depth 10–11 per recovery-disabled circuit. This exposes the hardware cost of recovery. The saved native target and actual layouts were used; no assumption of mid-circuit classical feedback was needed.

## Every measured configuration

Intervals are individual 95% Wilson binomial intervals for input-state survival. Syndrome accuracy is reported for the recovery-enabled circuits.

| Input | Injected fault | With recovery | 95% interval | Recovery disabled | 95% interval | Corrected syndrome accuracy |
|---|---|---:|---|---:|---|---:|
| |+⟩ | I | 93.36% | 89.62%–95.81% | 98.05% | 95.51%–99.16% | 91.41% |
| |+⟩ | X0 | 96.48% | 93.45%–98.14% | 94.53% | 91.03%–96.71% | 86.33% |
| |+⟩ | X1 | 94.14% | 90.56%–96.42% | 96.09% | 92.96%–97.86% | 87.89% |
| |+⟩ | X2 | 92.19% | 88.24%–94.89% | 97.66% | 94.98%–98.92% | 88.28% |
| |+i⟩ | I | 95.31% | 91.99%–97.30% | 94.92% | 91.51%–97.01% | 88.28% |
| |+i⟩ | X0 | 91.41% | 87.33%–94.26% | 4.30% | 2.42%–7.53% | 85.55% |
| |+i⟩ | X1 | 91.80% | 87.79%–94.57% | 96.48% | 93.45%–98.14% | 89.45% |
| |+i⟩ | X2 | 92.58% | 88.70%–95.20% | 94.53% | 91.03%–96.71% | 93.36% |

## Interpretation and limits

The most informative case is |+i⟩ with X0: survival rises from **4.30% without recovery to 91.41% with recovery**. X maps |+i⟩ to the orthogonal |-i⟩, so this case tests a quantum phase-sensitive state. The analogous |+⟩ case cannot reveal a residual logical X because X|+⟩=|+⟩; it should not be used alone to demonstrate correction.

The mean corrected syndrome accuracy is **88.82%**. Logical survival and syndrome correctness are different observables; a wrong recorded syndrome can coexist with an apparently successful logical verification.

No-fault cases and faults on q1/q2 show the overhead cost: correction does not improve every circuit, and can reduce survival. Each circuit was compiled independently: corrected circuits used physical indices {0,1,3,4}, while controls used {3,4,8}. Thus layout, routing, and qubit-dependent preparation/readout noise also differ. The aggregate comparison is descriptive and does not isolate the recovery gate's causal contribution. The recovery-disabled circuit is not a matched-duration idle memory or a bare-qubit benchmark. Input preparation, terminal verification, and readout contribute to the reported hardware survival values.

Hardware evidence here covers level 1 on two inputs and all its permitted error locations. Levels 2–4 and arbitrary-input/reference preservation have exact and/or noisy simulation evidence, not hardware verification. There are no repeated syndrome rounds or fault-tolerant syndrome gadgets.

One hardware job was submitted. The dollar charge is not returned by this runner and has not been independently verified; check the Resonance credit history for actual spend. The shot ceiling is not a dollar spending cap. No larger hardware run was submitted.

## Reproduce or inspect

Run `python -m quantum_minesweeper report` to regenerate the summary and this write-up from the saved evidence. To fetch the same existing job again, use `python -m quantum_minesweeper iqm-fetch --output results/iqm-pilot`; fetching does not submit another job. Follow `docs/IQM.md` for a new paid run, using a fresh output directory.
