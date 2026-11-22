# Quantum Minesweeper submission

Repository: [github.com/jamers7237/qublitz](https://github.com/jamers7237/qublitz)

## 1. Project and completed levels

We protect one unknown logical qubit against the challenge's specified error sets. Levels 1-3 correct one physical error along a known Pauli axis at an unknown location. Level 4 identifies an unknown single-qubit Pauli error's type without measuring individual data values. We implement established stabilizer codes and compare an explicit syndrome circuit with a compact coherent decoder.

| Level | Allowed configurations | Implementation | Verified evidence |
|---|---|---|---|
| 1 | I, X0, X1, X2 | Repetition encoding and syndrome-controlled X recovery | Exact simulation, ideal shots, IQM noise model, real Garnet |
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

The corrected circuits contain 13 CZ gates and depth 27-28, versus 4 CZ gates and depth 10-11 for controls. Native routing uses four physical qubits for corrected circuits and three for controls. Corrected layouts use indices {0,1,3,4}, controls {3,4,8}. These placement and resource differences confound a pure recovery-gate comparison. We report a targeted recovery signal, not fault tolerance or memory break-even.

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
