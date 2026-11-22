# IQM Resonance execution

## Local configuration

The current SDK uses `from iqm.qiskit_iqm import IQMProvider`. Install `iqm-client[qiskit]`, not the deprecated standalone `qiskit-iqm`. The project pins IQM client 36.0.0 and a compatible Qiskit range; the actual adapter was imported and exercised locally.

Create a private `.env` in the project root:

```text
IQM_SERVER_URL=https://resonance.iqm.tech
IQM_QUANTUM_COMPUTER=garnet
IQM_TOKEN=your_private_token
```

The CLI loads it automatically. Keep this file private. For the `iqm` command, `--backend` is the explicit computer choice, and takes priority over the `.env` computer setting. Without that flag, the configured `IQM_QUANTUM_COMPUTER` is used, or `fake-adonis` if none is configured. Use the exact computer identifier from your Resonance dashboard.

The runner calls `IQMProvider(url, quantum_computer=name).get_backend()`, compiles against its native target, and submits with `backend.run(circuits, shots=...)`. Native gate families and topology come from the live backend. Backend-specific scheduling handles resonator requirements when applicable; the runner does not hard-code a CZ-only topology or assume access to mid-circuit feedback.

Reference: [IQM's Qiskit user guide](https://docs.iqm.tech/iqm-client/user_guide_qiskit.html).

## Three execution modes

| Backend choice | What happens | Counts as hardware evidence? |
|---|---|---|
| `fake-adonis`, `fake-garnet` | Fully local IQM noise model and native compilation | No |
| A Resonance `:mock` computer | Remote integration checker; random outputs | No |
| An actual Resonance computer | Real paid quantum execution | Yes |

No facade backend is used. IQM's local fake backend does not forward a simulator seed in this SDK, so the recorded noisy counts are a stochastic snapshot. Ideal simulation and random-state generation are seeded.

## A small real pilot

Start with level 1's compact recovery on |+⟩ and |+i⟩, all four faults, and recovery-disabled controls. This is 16 circuits and 4,096 circuit-shots at 256 shots/circuit. The phase-sensitive input helps expose a recovery that only restores computational-basis information.

```sh
python -m quantum_minesweeper iqm --backend garnet --levels 1 \
  --states plus,plus_i --controls --shots 256 --output results/iqm-pilot
```

This connects to retrieve the backend and compiles, but **does not submit** a remote job. The compiler compares three seeded layouts using aggregate two-qubit gate count, then depth. This is a simple routing heuristic, not calibration-aware optimization. Inspect `manifest.json`, `backend_snapshot.json`, and the `compiled_*.txt` drawings.

Then submit those saved compiled circuits, avoiding a recompile between inspection and execution:

```sh
python -m quantum_minesweeper iqm-submit --output results/iqm-pilot
python -m quantum_minesweeper iqm-fetch --output results/iqm-pilot
```

Alternatively add `--execute` to the original `iqm` command for immediate submission. Submission returns after the remote job ID is saved; fetching waits for its result. If fetching is interrupted, fetch again using the same output directory. Do not submit the suite again.

The submission-start marker prevents accidental duplicate submissions. In the unusual case of failure before a job ID is received, inspect Resonance's job history before deciding whether to retry; a network failure does not establish that the server rejected the job.

## Credit budget

The authorized budget is $250. Current Resonance pricing and available credits must be checked in the account before expanding the pilot. The software enforces a circuit-shot ceiling, not a dollar cap. It cannot infer dollars from a shot count or guarantee account-level spending limits.

Once the pilot is useful, a good next experiment is level 4 on a backend with at least six qubit wires:

```sh
python -m quantum_minesweeper iqm --backend garnet --levels 4 \
  --states plus_i --shots 256 --output results/iqm-level4
python -m quantum_minesweeper iqm-submit --output results/iqm-level4
python -m quantum_minesweeper iqm-fetch --output results/iqm-level4
```

That covers all 13 allowed configurations for one genuinely quantum input. The complete six-state/all-error suite is available if results, time, and credits justify it. There is no reason to spend the whole budget automatically.

## What is saved

Each output directory contains a manifest, original circuit text/QASM, compiled QPY, native circuit drawings, backend topology, SDK versions, transpilation seeds and scores, and per-circuit depth and operation counts. A submitted job adds `submission_started.json` and `job.json`; fetching adds `results.json` with raw counts, syndrome/type accuracy, logical survival where applicable, joint success, and 95% Wilson intervals.

Bit ordering is explicit: for levels 1–3 classical bit 0 is the terminal logical verification, and classical bits 1 and 2 are s0 and s1. Qiskit prints these as `s1 s0 logical`. For level 4 it prints `s1 s0`. The decoder reverses the printed string before interpretation. The injected fault label is used to score results, never to choose recovery.

## Reading the experiment

Compare corrected and control results by input state and fault location. In the compact circuit, a fault on q1 or q2 may already leave decoded q0 correct without the final Toffoli; the informative contrast is often a q0 fault on |+i⟩ or computational-basis inputs. Report all configurations rather than choosing only the favorable case.

Noisy hardware may have weaker logical survival with recovery enabled because decomposing the Toffoli adds native entangling gates. That is a legitimate observation. Report native two-qubit counts, routing overhead, input dependence, and uncertainty. A wrong syndrome can coexist with an apparently correct logical output, so syndrome accuracy and logical survival are separate metrics.

For level 4, a hardware type-classification score alone does not experimentally prove that all logical coherences survived: the on-device circuit intentionally measures only ancillas. The ideal reference-preservation tests establish the circuit property. Full experimental verification of preservation would require additional data/reference tomography or another dedicated validation experiment.

The submission must include actual hardware job IDs, counts, the target computer, and an honest discussion of results. Local fake-backend data cannot replace them.

## Recorded real run

The Garnet pilot is now complete. See `docs/HARDWARE_RESULTS.md` for the actual job identity, raw evidence, all 16 measurements, and interpretation. Its corrected and control circuits were routed to different physical layouts, so the comparison includes layout-dependent noise. No further hardware run has been submitted. The actual account charge must be read from Resonance's credit history; this SDK runner does not return billing information.
