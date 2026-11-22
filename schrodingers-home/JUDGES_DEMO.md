# Judges' demo (about 5 minutes)

**One line to say out loud:**
> "The same Z-basis probabilities hide two possible phases. Our Hadamard experiment distinguishes them."

## Setup (before you present)

```bash
npm install && npm run dev
```

Open two tabs:

1. `http://localhost:5173/?seed=2025`: a **fresh** game for the live shot.
2. `http://localhost:5173/?debug=1&seed=2025`: the demo tab. Start a game, then debug → tools → **late** checkpoint.

Turn the volume up. Every note is synthesized live.

> **Honesty rule:** checkpoint data is *archived* and is labelled **DEMO CHECKPOINT · ARCHIVED DATA** on screen and **ARCHIVE** in the notebook. Never present it as live. The live part is walking in from the hallway.

## Script

| Time | Show | Say |
|---|---|---|
| 0:00 | Title screen (tab 1) → New Game → name | "Schrödinger's Home is a pixel escape room running on a real 8-qubit statevector simulator we wrote: 256 complex amplitudes, unitary gates, the Born rule, collapse." |
| 0:30 | Walk north into the common room. One note plays. | "**That is a live measurement.** Walking in from the hallway prepares one fresh copy of the same hidden state and measures all eight qubits once. One note per copy. Walking between bedrooms never re-samples." |
| 0:50 | Hover the window (white outline), click it; click the clock. | "Every household object is one measured qubit: window, closet, trash, couch, clock, lamp, sink, radiator. The window never closes. That qubit is the cat, and it is always 1." |
| 1:10 | Switch to tab 2 (late checkpoint). Point at the banner. | "This tab is an **archived** mid-game checkpoint, clearly labelled, so we can skip 40 minutes of play." |
| 1:20 | Notebook (N) → **House Manual** | "Players discover which object is which qubit by walking the bedrooms: left writes 0, right writes 1, and the brass lever reads the route as a binary address. Going left first is address zero, which gets only a quiet knock. They fill in this editable manual themselves." |
| 1:50 | Notebook → **Sound Comparison** and **Parity Notes** | "Two bits pick the instrument, three the pitch, two the length. Seven musical bits could make 128 notes, but three XOR constraints from CNOT gates leave exactly sixteen. We also tell players that these correlations alone do **not** prove entanglement." |
| 2:30 | Notebook → **Phase / Echo** (archived echo tally) | "Here's the twist. A CZ entangles two superposed qubits, and a secret Z gate may flip a phase. Ordinary notes have **identical** probabilities either way: you could listen forever and never learn it." |
| 3:00 | Walk to the gramophone → ECHO / SIDE X. Step outside via the front door, come back in. A ghost tone plays. | "Hadamard's Harmonics uncomputes the parity labels, keeps the CZ, applies a Hadamard and measures one qubit. That's an interference experiment. Hollow echoes come up 26% of the time in one phase and 74% in the other. **That fresh echo is live.** Its majority decides C major or C minor." |
| 3:40 | Debug → quantum tab | "Judges can check: norm 1, exactly 16 non-zero labels, Born probabilities equal 2^A 3^B 5^C 7^D/576, Z invariant under the phase, echo 0.2643 / 0.7357. Qiskit independently reproduces all of it." |
| 4:10 | Debug → tools → **vault** checkpoint → the vault → sequencer | "The vault wants all sixteen notes from rarest to likeliest, derived from prime odds, including notes you've never heard, plus the right chord. Wrong answers rewind to the same secret, keeping your notebook." |
| 4:40 | Submit → open the box → **Alive** | "And the qubit that was always 1... was the cat." (Click *Dead* first for the fake reset gag if time allows.) |

## If something goes wrong

- No sound: click anything first (browser autoplay rule), then check Settings → volume.
- Lost? Debug → world → teleport.
- Need a clean slate: debug → session → restart same seed.

## Rubric mapping (for Q&A)

- **Quantum connection (25%):** every mechanic comes from the circuit: one copy, one measurement, collapse, phase-invisible Z statistics, X-basis interference, partial measurement (lantern).
- **Technical understanding (25%):** derivations in `QUANTUM_EXPLANATION.md`; 56 tests including a Qiskit cross-check; the debug quantum tab.
- **Creativity (25%):** the house as a measurement device, routes as binary addresses, prime-weighted melody, the cat qubit.
- **Functionality (15%):** full golden path tested for both phases; 32-check browser smoke test.
- **UX (5%):** hints with three tiers, keyboard/mouse/touch, reduced motion, readable fonts, colour-blind-safe sensor text.
- **Docs (5%):** README, this script, EXPERIMENTS, ART_REPLACEMENT_GUIDE, DEBUGGING.
