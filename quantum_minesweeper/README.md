# Quantum Minesweeper — QUBLITZ 2026

> **Also in this repository:** the QUBLITZ 2026 **Magic State Verification** challenge (Theory / Algorithms). See [`magic_state_verification/`](../magic_state_verification/).

All four levels are implemented and verified in simulation. **Level 1 has also run successfully on real IQM Garnet hardware:** 16 circuits, 4,096 circuit-shots, 93.4% mean logical input survival with recovery versus 84.6% with recovery disabled. See [the hardware experiment](docs/HARDWARE_RESULTS.md). Levels 2–4 currently have simulation evidence only. The IQM runner compiles native circuits, runs local noise models, and submits/retrieves real Resonance jobs.

The design uses the stabilizer-Hamiltonian viewpoint from lattice field theory. Small repetition and error-detecting codes are the right tools for the specified error sets; no continuum field simulation is needed. See [the derivation](docs/THEORY.md), [file guide](docs/FILE_GUIDE.md), [hardware guide](docs/IQM.md), and [live-demo notes](docs/DEMO.md).

## Presentation and submission package

- [PDF presentation](output/pdf/Quantum_Minesweeper_Presentation.pdf): 19 main slides plus 11 appendices, with worked examples, logical circuits, real hardware results, and the actual native Garnet witness circuit.
- [Presenter guide](output/pdf/Presenter_Guide.pdf): speaker notes with embedded circuit diagrams and gate-by-gate explanations.
- [Submission report](output/pdf/Submission_Report.pdf): completed levels, verification, IQM observations, limitations, and a section 6/7 assessment crosswalk.
- [Editable submission text](docs/SUBMISSION.md) and [speaker notes](docs/PRESENTER_NOTES.md).

For a five-minute talk, use slides 1, 4, 7, 9, 12, 13, 15, 17, and 18, with the appendices ready for questions. The live demonstration can run offline and show the saved real QPU evidence. Run it from the `quantum_minesweeper/` project folder:

```sh
python scripts/live_demo.py --verify
# Add --pause to wait for Enter between demonstration steps.
```

The ideal recovery is deterministic under the specified single-fault model. Real gates, routing, storage, and readout introduce additional errors, so hardware survival is below 100%. Finite sampling adds uncertainty but cannot alone produce failures if the ideal success probability is exactly one.

To rebuild these PDFs, install the optional artifact dependencies and run `python scripts/export_native_circuit.py` followed by `python scripts/build_submission.py`. The artifact scripts do not submit a new QPU job.

## Run locally

Run all commands below from this project folder. From the repository root:

```sh
cd quantum_minesweeper
```

Python **3.11 or newer** is required. The checked environment uses Python 3.12, IQM client 36.0.0, Qiskit 2.1.2, and Aer 0.17.2. Python 3.9 selects an obsolete IQM distribution without the current adapter.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
python -m pytest -q
python -m quantum_minesweeper verify
python -m quantum_minesweeper simulate --controls
python -m quantum_minesweeper export
```

After installation, you can use `.venv/bin/python` directly without activating it. Paths in this README and the project documentation are relative to the `quantum_minesweeper/` project folder unless stated otherwise.

`verify` checks **703 exact-state cases**: all permitted error configurations, six Pauli eigenstates, twelve seeded random states, and a Bell pair with an untouched reference. It checks both three-qubit compact and five-qubit explicit recovery for levels 1–3, and six-qubit error-type detection for level 4. It also verifies the stabilizer Hamiltonians and the Knill–Laflamme condition numerically. The exact tests have unit fidelity within floating-point precision.

`simulate --controls` runs **222 ideal shot-based circuits**, including six input states, all permitted errors, and recovery-disabled controls for levels 1–3. Verification measurements are terminal: they deliberately consume the recovered output to estimate input-state survival. Recovery itself does not measure the protected logical information.

## Implemented levels

| Level | Allowed errors | Method | Data / total qubits |
|---|---|---|---|
| 1 | I, X0, X1, X2 | Three-qubit repetition code | 3 / 3 compact or 5 explicit |
| 2 | I, Z0, Z1, Z2 | Hadamard-rotated repetition code | 3 / 3 or 5 |
| 3 | I, Y0, Y1, Y2 | S-rotated repetition code | 3 / 3 or 5 |
| 4 | I and X/Y/Z at each of four sites | ZZZZ and XXXX checks on a [[4,2,2]] code, second logical fixed | 4 / 6 |

Level 4 identifies **type**, not location, and does not claim recovery. A detected errored state remains coherently encoded in an error-shifted sector. Three-qubit single-axis codes do not correct arbitrary single-qubit Pauli noise.

## IQM pilots

Local IQM noise simulation needs no credentials or credits:

```sh
python -m quantum_minesweeper iqm --backend fake-adonis --levels 1,2,3 \
  --states plus,plus_i --controls --shots 256 --output results/my-fake-pilot
python -m quantum_minesweeper iqm --backend fake-garnet --levels 4 \
  --states plus_i --shots 256 --output results/my-fake-level4
```

Use a fresh output directory each time. The included `results/fake-*` folders contain the actual local runs made during implementation. Fake results use representative noise, not current device calibration.

For Resonance, copy `.env.example` to `.env` and edit the token privately. Set the computer identifier to the exact name shown in your Resonance account. The examples below use `garnet`; availability is account-dependent. The CLI loads the current folder's `.env`, without overriding existing environment variables.

```sh
# Compile only. No job is submitted by this command.
python -m quantum_minesweeper iqm --backend garnet --levels 1 \
  --states plus,plus_i --controls --shots 256 --output results/iqm-pilot

# After inspecting the manifest and current Resonance pricing, submit saved circuits.
python -m quantum_minesweeper iqm-submit --output results/iqm-pilot
python -m quantum_minesweeper iqm-fetch --output results/iqm-pilot
```

The pilot is 16 circuits × 256 shots = **4,096 circuit-shots**. The runner enforces a 16,384 circuit-shot default ceiling per prepared suite; that is not a dollar ceiling. Your $250 credit budget cannot be translated into shots without current pricing. It saves the native circuit, layout, operation counts, SDK versions, backend topology, manifest, job ID, raw counts, and 95% Wilson intervals. A remote `:mock` backend produces random results and is not QPU evidence.

Full six-state/all-level hardware coverage, after a pilot, is 150 circuits × 256 shots = 38,400 circuit-shots without controls. This is available with `--levels 1,2,3,4 --states zero,one,plus,minus,plus_i,minus_i --max-total-shots 38400` on a backend supporting at least six data/ancilla wires. Review price and pilot behavior first. More circuits do not automatically improve the submission.

## Evidence and limitations

See [the recorded result summary](results/SUMMARY.md). Exact verification, ideal shot simulation, IQM noise simulation, and real QPU execution are different kinds of evidence. No result is postselected on a favorable syndrome. All logical survival estimates include every shot.

These are short demonstrations with deliberately injected faults between idealized stages. Extra faults during encoding, syndrome extraction, and recovery can defeat them. The circuits are not fault tolerant, do not demonstrate break-even protection against all hardware noise, and do not implement repeated syndrome rounds.

The challenge PDF supplied the problem specification. Its submission and presentation requirements are documented here as project requirements; it does not authorize publishing a repository, uploading credentials, or fabricating hardware evidence. The project, recorded hardware evidence, and presentation materials are published in this repository.
