# Live demonstration notes

## Five-minute walkthrough

1. State the promise: one unknown fault, from the level's specified set, after encoding. Arbitrary logical input must survive. Level 4 asks for type detection rather than recovery.
2. Show `circuits/000_L1_X1_compact_correct_plus_i.txt`. Identify input preparation, encoding, deliberate test fault, inverse encoding, syndrome/work bits, the Toffoli recovery, and terminal verification. The fault label belongs to the test harness; the decoder uses only syndrome controls.
3. Run `python -m quantum_minesweeper verify`. Explain that the 703 cases include all fault locations, twelve random inputs, all six cardinal inputs, and a reference-entangled Bell pair. A recovered classical bit alone would not pass the reference tests.
4. Show level 3's S-rotated code. Explain S†YS=X and why ordinary bit-flip recovery on an unrotated repetition code misses Y's phase component.
5. Show level 4's two check ancillas. Use the table 00→I, 10→X, 01→Z, 11→Y in (s0,s1) order. Explain that all four locations share the same type syndrome, so location is unavailable.
6. Open `results/SUMMARY.md` and compare ideal, representative noise, and the actual Garnet pilot. Show `docs/HARDWARE_RESULTS.md`, `results/iqm-pilot/manifest.json`, `job.json`, and `results.json`. Highlight the |+i⟩ input with an X0 fault: recovery improved survival from 4.3% to 91.4%. Also show the no-fault and other-location cases where recovery adds noise. Say explicitly which plots are simulation and which are real hardware.

## The field-theory explanation in thirty seconds

Our finite code Hamiltonian is H=ΔΣ(I-G)/2. Its protected states have no violated checks. A local fault creates a syndrome pattern, analogous to local defects on a spin lattice. We infer the defect from commuting check measurements and undo it while preserving the logical amplitudes. Lattice gauge theory provides a deeper connection for topological codes; these small challenge codes use the same stabilizer language without claiming topological protection.

## Questions to be ready for

**Why not measure the data?** A measurement of individual data bits can reveal logical information and destroy coherence. Stabilizer checks have the same eigenvalue on both logical codewords; they reveal the fault sector instead.

**Why coherent feedback?** It implements syndrome-selected correction with unitary controls and final syndrome measurements, avoiding a dependency on hardware support for real-time classical feedback. It adds gate overhead.

**Does a known injected location make this cheating?** We know it only to score the test. The recovery circuit is fixed across every location. It has no argument that selects a Pauli recovery based on the injected label.

**Can three qubits correct X, Y, and Z?** These codes protect a single known error axis. Arbitrary single-site Pauli correction would require a stronger code, such as the five-qubit perfect code; it is outside the four levels' requested recovery tasks.

**Why can level 4 identify type without location?** X anticommutes with the Z check, Z with the X check, and Y with both. These signs are the same at every site. The two checks give four outcomes, sufficient for four types including identity, not thirteen distinct error locations/types.

**What did the Bell-pair test establish?** Recovering a qubit entangled with an untouched reference verifies preservation of quantum correlations. For level 4 we instead check that extracting the syndrome leaves the error-shifted data/reference state unchanged.

**What if correction is worse on IQM?** The native implementation has noisy entangling gates, routing, and readout. A fault-correction circuit with ideal discrete faults is not automatically a net improvement against all physical noise. We report controls and counts, not only a best-case score.

**What remains before submission?** Publish the reviewed repository and prepare the team's live explanation. Simulation evidence covers all four levels; actual hardware evidence currently covers level 1 with two input states. Further hardware runs are optional, not required to claim the recorded level-1 demonstration. Do not describe simulation-only levels as hardware verified.
