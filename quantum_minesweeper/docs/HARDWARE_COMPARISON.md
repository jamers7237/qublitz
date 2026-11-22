# Original-circuit hardware comparison

## 12. Additional IQM hardware runs: Sirius and Emerald

We repeated the original level-1 compact Toffoli recovery on real IQM Sirius and Emerald. The algorithm, input preparation, injected fault cases, and terminal verification are unchanged.

Each device ran the same 16 configurations: plus and plus-i inputs, I/X0/X1/X2 faults, recovery enabled and disabled, and 256 shots per circuit. The new runs add 8,192 circuit-shots. Including the original Garnet pilot, the report now includes three real jobs, 48 circuits, and 12,288 circuit-shots.

Logical QASM is byte-identical across all three devices. Native compilation differs. The comparison JSON records the verified circuit-suite digest.

### Three-device comparison

The values below are descriptive averages over the same eight corrected or eight control circuits on each device. Every shot is included. They are not average gate fidelities, a fault-tolerance threshold, or a calibrated ranking of device quality.

| Device | Corrected survival | Disabled survival | Corrected syndrome accuracy |
|---|---:|---:|---:|
| Garnet | 93.41% | 84.57% | 88.82% |
| Sirius | 78.61% | 81.20% | 72.71% |
| Emerald | 95.46% | 85.35% | 94.58% |

### The phase-sensitive X0 case

X leaves plus unchanged but takes plus-i to an orthogonal state up to an overall phase. The plus-i/X0 case is therefore an informative witness of logical recovery.

| Device | With recovery | Recovery disabled |
|---|---:|---:|
| Garnet | 91.41% | 4.30% |
| Sirius | 72.66% | 6.64% |
| Emerald | 94.14% | 3.52% |

### Sirius execution evidence

Job ID: `01a20232-ba40-74f0-9633-3d669a73cf7b`. Prepared at `2026-11-22T07:39:25.110985+00:00` UTC. Calibration recorded at compilation: `eb78d04e-a0cb-46d7-b863-dbd251927884`.

Evidence directory: `results/iqm-sirius/`. It contains the original logical QASM/text, compiled QPY, native circuit drawings, manifest, topology/calibration snapshot, job ID, raw counts, and per-circuit metrics. The mode is `compact`, matching the original pilot.

Individual 95% Wilson intervals appear beside each logical survival estimate. No favorable-syndrome postselection is used.

| Input | Fault | Recovery | 95% interval | Disabled | 95% interval | Syndrome |
|---|---|---:|---|---:|---|---:|
| plus | I | 87.11% | 82.45%-90.67% | 94.53% | 91.03%-96.71% | 90.62% |
| plus | X0 | 77.73% | 72.25%-82.40% | 91.02% | 86.88%-93.94% | 60.55% |
| plus | X1 | 80.47% | 75.18%-84.86% | 88.28% | 83.76%-91.67% | 67.97% |
| plus | X2 | 74.61% | 68.94%-79.55% | 90.62% | 86.43%-93.62% | 73.83% |
| plus-i | I | 81.64% | 76.44%-85.90% | 94.53% | 91.03%-96.71% | 82.42% |
| plus-i | X0 | 72.66% | 66.89%-77.75% | 6.64% | 4.19%-10.38% | 62.50% |
| plus-i | X1 | 78.12% | 72.67%-82.75% | 91.80% | 87.79%-94.57% | 69.53% |
| plus-i | X2 | 76.56% | 71.00%-81.34% | 92.19% | 88.24%-94.89% | 74.22% |

Native circuit resources:

| Recovery | CZ gates | MOVE gates | Circuit depth |
|---|---:|---:|---|
| Enabled | 10 | 12 | 26-27 |
| Disabled | 4 | 4 | 11-12 |

### Emerald execution evidence

Job ID: `01a20234-8532-73f6-90dc-f3a025d72609`. Prepared at `2026-11-22T07:39:25.199167+00:00` UTC. Calibration recorded at compilation: `7d7ebe74-3674-4b32-baa2-fa0117ecbef9`.

Evidence directory: `results/iqm-emerald/`. It contains the original logical QASM/text, compiled QPY, native circuit drawings, manifest, topology/calibration snapshot, job ID, raw counts, and per-circuit metrics. The mode is `compact`, matching the original pilot.

Individual 95% Wilson intervals appear beside each logical survival estimate. No favorable-syndrome postselection is used.

| Input | Fault | Recovery | 95% interval | Disabled | 95% interval | Syndrome |
|---|---|---:|---|---:|---|---:|
| plus | I | 96.48% | 93.45%-98.14% | 98.05% | 95.51%-99.16% | 94.92% |
| plus | X0 | 94.92% | 91.51%-97.01% | 97.27% | 94.46%-98.67% | 91.80% |
| plus | X1 | 95.70% | 92.47%-97.58% | 97.66% | 94.98%-98.92% | 93.75% |
| plus | X2 | 95.70% | 92.47%-97.58% | 97.27% | 94.46%-98.67% | 94.53% |
| plus-i | I | 97.27% | 94.46%-98.67% | 98.44% | 96.05%-99.39% | 96.48% |
| plus-i | X0 | 94.14% | 90.56%-96.42% | 3.52% | 1.86%-6.55% | 95.70% |
| plus-i | X1 | 95.31% | 91.99%-97.30% | 93.75% | 90.09%-96.12% | 93.75% |
| plus-i | X2 | 94.14% | 90.56%-96.42% | 96.88% | 93.96%-98.41% | 95.70% |

Native circuit resources:

| Recovery | CZ gates | MOVE gates | Circuit depth |
|---|---:|---:|---|
| Enabled | 13 | 0 | 27-28 |
| Disabled | 4 | 0 | 10-11 |

### Interpretation and limitations

Emerald's corrected mean survival was 95.46% in this run, compared with 93.41% for the earlier Garnet pilot and 78.61% for Sirius. This is a workload-specific observation from one job per device and different calibrations/dates, not a general performance ranking. We did not isolate gate, decoherence, or readout contributions.

Sirius uses resonator-mediated operations in the recorded native circuit. Its corrected circuits contain 10 CZ and 12 MOVE operations, compared with 4 CZ and 4 MOVE operations in controls. The active indices include three data-qubit locations and the resonator at compiled index 16. A CZ-only count therefore understates its interaction overhead. MOVE and CZ counts are not interchangeable error or duration measures, and the observed performance gap cannot be attributed solely to MOVE operations.

Sirius still shows the targeted recovery signal: the plus-i/X0 case rises from 6.64% without recovery to 72.66% with recovery. Its overall corrected mean, however, is lower than the disabled-control mean (78.61% versus 81.20%). Most configurations do not require a logical output flip after inverse encoding, while recovery adds noisy operations in every case. We report the lower aggregate result as well as the informative successful case.

Emerald's plus-i/X0 survival rises from 3.52% to 94.14%. Its corrected circuits use 13 CZ gates and depth 27-28; controls use 4 CZ gates and depth 10-11. The recorded active physical sets differ between corrected {0,1,4} and control {4,5,10} circuits. Thus placement, routing, duration, preparation, and measurement differences limit causal interpretation. The same caution applies to the original Garnet comparison.

All three devices execute the original ideal-correct circuit. Their sub-100% outcomes reflect the physical experiment's broader error sources and do not change the original 703-case ideal verification result. No claim of repeated-round error correction, fault tolerance, or memory break-even is made. Hardware evidence continues to cover level 1 on two inputs; levels 2-4 remain simulation verified.

The submission report now has hardware evidence from Garnet, Sirius, and Emerald. The presentation and presenter guide remain the original Garnet-focused materials. The original circuits and noise models were not changed. Actual account charges must be checked in Resonance's credit history; the runner does not return dollar billing information.

### Reproduce the report or retrieve the same jobs

Run these commands inside the quantum_minesweeper project folder. The first command reads local saved evidence only. The fetch commands contact IQM but do not submit another job.

```sh
python scripts/extend_hardware_report.py
python -m quantum_minesweeper iqm-fetch --output results/iqm-sirius
python -m quantum_minesweeper iqm-fetch --output results/iqm-emerald
```
