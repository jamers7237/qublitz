# Quantum Minesweeper submission

Repository: [github.com/jamers7237/qublitz](https://github.com/jamers7237/qublitz)

Project folder: `quantum_minesweeper/`. Run commands from this folder. Paths below are relative to this project folder.

## 1. Project and completed levels

We protect one unknown logical qubit against the challenge's specified error sets. Levels 1-3 correct one physical error along a known Pauli axis at an unknown location. Level 4 identifies an unknown single-qubit Pauli error's type without measuring individual data values. We implement established stabilizer codes and compare an explicit syndrome circuit with a compact coherent decoder.

| Level | Allowed configurations | Implementation | Verified evidence |
|---|---|---|---|
| 1 | I, X0, X1, X2 | Repetition encoding and syndrome-controlled X recovery | Exact simulation, ideal shots, IQM noise model, real Garnet/Sirius/Emerald |
| 2 | I, Z0, Z1, Z2 | H-rotated repetition encoding | Exact simulation, ideal shots, IQM noise model |
| 3 | I, Y0, Y1, Y2 | S-rotated repetition encoding | Exact simulation, ideal shots, IQM noise model |
| 4 | I and X/Y/Z at each of four sites | ZZZZ and XXXX check extraction | Exact simulation, ideal shots, IQM noise model |

Level 4 provides type detection, not location identification or full correction. Actual hardware evidence currently covers level 1 on two inputs and every permitted configuration. We do not describe levels 2-4 as hardware verified.

## 2. Encoding, faults, syndrome, and recovery

Level 1 encodes alpha|0>+beta|1> as alpha|000>+beta|111> using CNOT(0,1), CNOT(0,2). The logical information resides in joint amplitudes. This does not create three independent copies of the input.

The explicit circuit adds two helpers to extract Z0Z1 and Z1Z2. Their syndrome order is (s0,s1). The four cases I, X0, X1, X2 give 00, 10, 11, 01, respectively. Checks act identically on both logical codewords, so they reveal the fault without learning the unknown amplitudes. The recovery applies the Pauli at the syndrome's identified location using coherent controls, then decodes.

The compact circuit instead applies inverse encoding to place the logical candidate on q0 and work bits on q1,q2. Its distinct syndrome convention is I:00, X0:11, X1:10, X2:01. Only syndrome 11 leaves an X on the candidate, so Toffoli(1,2,0) completes recovery. The same fixed circuit handles every allowed location. The compact circuit returns a decoded logical qubit, while the explicit design first restores the encoded state.

For level 2, H on each encoded data qubit gives the phase-code frame and HZH=X maps the physical fault into the shared decoder. For level 3 use S=diag(1,i), since S-dagger Y S=X. The S rotation accounts for Y's phase component as well as its bit flip. These are restricted single-axis codes, not a universal three-qubit code for arbitrary Pauli noise.

The test harness injects an allowed X, Z, or Y after the encoding barrier. The error label determines the test and expected score, never the recovery gate. Barriers keep the deliberately introduced fault stage distinct during compilation.

## 3. Level-4 check circuits and a worked example

The code uses the parent [[4,2,2]] stabilizer space, fixing one logical degree of freedom to encode a single unknown qubit. Our codewords are (0000+1111)/sqrt(2) and (0011+1100)/sqrt(2). ZZZZ and XXXX stabilize both. Two commuting checks on four data qubits define a four-dimensional parent space.

ZZZZ means Z tensor Z tensor Z tensor Z on separate qubits, a 16-by-16 operator. It measures even or odd parity in the zero/one basis. A helper initialized to zero receives four data-to-helper CNOTs and then a measurement. Even parity gives helper 0, odd gives 1. We do not measure individual data bits.

XXXX is the same construction in the plus/minus basis. Prepare the second helper with H, apply four helper-to-data CNOTs, apply H again, then measure. Its zero branch leaves the data unchanged and its one branch applies the global bit flip. A definite operator sign becomes a relative phase on the helper and then a classical bit. This is an interference measurement, not a comparison of before/after snapshots.

| Fault type | ZZZZ helper | XXXX helper |
|---|---:|---:|
| I | 0 | 0 |
| X | 1 | 0 |
| Z | 0 | 1 |
| Y | 1 | 1 |

For the example (0000+1111)/sqrt(2), X on the first displayed position gives (1000+0111)/sqrt(2). Both components now have odd parity but retain positive global-flip symmetry, giving syndrome 10. A Z error instead gives (0000-1111)/sqrt(2), retaining even parity but changing the XXXX sign, giving 01. The same type at any site gives the same syndrome. The detector preserves the error-shifted data, rather than returning the unerrored state.

## 4. Simulation and quantum-preservation evidence

The exact verifier covers six cardinal inputs, twelve seeded random states, and one Bell-reference input. Levels 1-3 each cover four faults and both compact/explicit designs. Level 4 covers thirteen configurations. The count is 3*2*4*19 + 13*19 = 703 cases. Every case passes. The minimum logical/data-preservation fidelity is 0.999999999999996, consistent with one within floating-point precision.

For levels 1-3 the Bell-reference test checks that recovery preserves entanglement with an untouched reference, not merely classical probabilities. For level 4 it checks that syndrome extraction preserves the already-errored data and reference correlations. We also test representative coherent rotations about each protected axis and numerically verify the Knill-Laflamme correction condition for all allowed error pairs. The level-4 full error set fails the correction criterion, as expected for our detection-only claim.

The ideal shot experiment contains 222 circuits with recovery-disabled controls and 1,024 shots per circuit. All corrected/detection circuits produce the expected syndrome and successful ideal logical verification. The controls have 83.33% mean survival for each of levels 1-3 across the six-state suite. The local IQM noise models give about 83-85% mean logical survival for levels 1-3 on two inputs, and 73.32% type accuracy for level 4 on one input. These representative noise models are not current device calibration, and their input coverage differs from the ideal suite.

All individual records are in results/verification.json, results/ideal.json, results/fake-adonis/results.json, and results/fake-garnet-level4/results.json. The automated suite contains 23 tests, all passing in the checked environment.

## 5. Real IQM hardware implementation

The Python client uses IQMProvider to authenticate to Resonance and fetch Garnet's live target. Qiskit transpiles the logical circuit into native rotations and CZ gates, including routing. We compare three seeded compilations using total two-qubit gate count, then depth. The provider serializes and submits the native circuit batch. The service runs repeated shots and returns counts associated with a saved job ID.

| Hardware record | Value |
|---|---|
| Computer | IQM Garnet, 20-qubit native target |
| Job ID | 01a1ffa5-97e8-77e2-ac14-9a55f2083731 |
| Calibration recorded at compilation | ea681de1-9661-41e5-bd6f-cb524fa056a6 |
| Inputs | plus and plus-i |
| Faults | I, X0, X1, X2 |
| Recovery settings | Enabled and disabled |
| Workload | 16 circuits, 256 shots each, 4,096 circuit-shots |
| Mean corrected logical survival | 93.41% |
| Mean recovery-disabled survival | 84.57% |
| Mean corrected syndrome accuracy | 88.82% |

For plus-i with X0, 234/256 shots pass verification with recovery, or 91.41% with a 95% Wilson interval of 87.33%-94.26%. The disabled control gives 11/256, or 4.30%, interval 2.42%-7.53%. A logical X leaves plus unchanged but maps plus-i to its orthogonal partner, making the latter an informative quantum witness.

Verification applies the inverse input preparation and measures whether q0 returns zero. With ideal preparation and measurement, this probability equals overlap with the intended pure state. On hardware it includes preparation, inverse-preparation, and readout errors, so we call it input-state survival. We include all shots and do not postselect favorable syndromes.

All eight input/fault comparisons, per-case confidence intervals, and discussion are in docs/HARDWARE_RESULTS.md. Raw counts, native QPY, calibration/topology snapshot, job identity, and circuit text are in results/iqm-pilot/. The exported native witness JSON and circuit appendix describe the actual plus-i/X0 corrected circuit, not an invented native decomposition.

## 6. Why physical outcomes are below 100%

The ideal correction guarantee assumes a restricted fault at a particular stage with perfect remaining operations. A real processor can introduce additional errors during encoding, routing, recovery, waiting, and readout. The pilot does not separately measure each mechanism. A deterministic ideal verification gives zero failures even with finite shots. Finite sampling creates uncertainty in a nontrivial physical success probability; it is not the sole explanation for physical failures.

The original Garnet corrected circuits contain 13 CZ gates and depth 27-28, versus 4 CZ gates and depth 10-11 for controls. Native routing uses four physical qubits for corrected circuits and three for controls. Corrected layouts use indices {0,1,3,4}, controls {3,4,8}. These placement and resource differences confound a pure recovery-gate comparison. We report a targeted recovery signal, not fault tolerance or memory break-even.

The ideal level-1 code also fails outside its promise: two bit flips can trigger the wrong single-fault recovery and enact a logical X, and an unprotected Z error can corrupt phase without failing ZZ checks. The offline live demo explicitly shows those expected failures. More shots alone cannot remove gate errors or systematic readout mistakes.

## 7. Deliverables for section 6

| Required item | Submission artifact |
|---|---|
| Code repository | GitHub repository, pyproject.toml, source, tests, circuits, README |
| Challenge results | results/SUMMARY.md, exact/shot JSON, this report |
| IQM implementation and observations | docs/HARDWARE_RESULTS.md and results/iqm-pilot/ |
| Live-demonstration presentation | output/pdf/Quantum_Minesweeper_Presentation.pdf |
| Presenter preparation | output/pdf/Presenter_Guide.pdf, with circuit diagrams and explanations |
| Reproducible offline demonstration | scripts/live_demo.py --verify |

The team still needs to rehearse and deliver the actual presentation. The package supplies the materials and evidence for that task.

## 8. Assessment mapping for section 7

| Assessment area | Concrete evidence and explanation |
|---|---|
| Encoding and logical-state protection | Repetition-code circuit and arbitrary-amplitude worked example |
| Syndrome correctness | Explicit and compact tables, level-4 helper circuits, count-order decoder |
| Recovery selection | Same coherent Toffoli across all compact fault locations |
| Quantum information preservation | Six-state, random-state, Bell-reference, and correction-condition checks |
| Experimentation and verification | All permitted configurations, no-fault cases, controls, uncertainty, expected failures |
| Challenge progression | All four levels in simulation, one real-hardware demonstration |
| Creativity and circuit design | Shared basis-transformed decoder and compact/explicit resource comparison |
| Hardware understanding | Native gates, actual job/counts, routing overhead, layout confounds |
| Reproducibility and demonstration | Fresh-install instructions, source circuits, saved evidence, offline demo, speaker guide |

## 9. Creativity and additional levels

Additional levels refers to attempting more of the four listed challenge levels. A new fifth level is not required. Existing codes are explicitly permitted. We already cover all four in simulation, so useful extensions should answer a scientific question or improve the experiment.

Our next priority is matched physical mappings and better control of routing/duration differences, followed by interleaved corrected/control runs, all six cardinal inputs on hardware, and additional hardware levels if budget and time justify them. A stronger multi-axis code or repeated-round experiment would be a new project extension, not something already demonstrated here. No additional paid run is necessary to present the completed recorded pilot.

## 10. Running the project

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
python -m pytest -q
python scripts/live_demo.py --verify
python -m quantum_minesweeper verify
python -m quantum_minesweeper simulate --controls
python -m quantum_minesweeper report
```

For a new real run, privately configure .env and use a fresh output directory:

```sh
python -m quantum_minesweeper iqm --backend garnet --levels 1 \
  --states plus,plus_i --controls --shots 256 --output results/iqm-new-pilot
python -m quantum_minesweeper iqm-submit --output results/iqm-new-pilot
python -m quantum_minesweeper iqm-fetch --output results/iqm-new-pilot
```

The first command compiles only. iqm-submit spends credits on a real backend. iqm-fetch retrieves the saved job rather than resubmitting. The default shot ceiling is not a dollar cap. Actual account charges must be checked in Resonance's credit history. The private token is excluded from Git and from the submission bundle.

To rebuild the PDF materials in a normal development environment:

```sh
python -m pip install -e '.[artifacts]'
python scripts/export_native_circuit.py
python scripts/build_submission.py
```

## 11. Scientific references and provenance

- Challenge specification: ErrorCorrectionChallenge.pdf supplied by the team, sections 1-7. The original PDF is not redistributed in this repository.
- IQM Qiskit integration and execution modes: https://docs.iqm.tech/iqm-client/user_guide_qiskit.html
- Knill and Laflamme, A Theory of Quantum Error-Correcting Codes: https://arxiv.org/abs/quant-ph/9604034
- Dennis, Kitaev, Landahl, and Preskill, Topological quantum memory: https://arxiv.org/abs/quant-ph/0110143
- Project-specific numerical evidence comes from the checked-in JSON and native circuit artifacts, not from external literature.

The field-theory connection is a finite stabilizer-Hamiltonian description of defects. The hardware performs active gate recovery, not passive relaxation or topological protection. The project uses established QEC ideas and does not claim a newly invented code.

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
