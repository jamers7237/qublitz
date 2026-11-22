# The quantum mechanics of Schrödinger's Home

> **In one sentence:** the same Z-basis probabilities hide two possible phases. Our Hadamard experiment tells them apart.

This document is for judges. Everything below is implemented in `src/quantum/` (about 400 lines of TypeScript, no quantum libraries). The engine is checked by unit tests (`tests/quantum.test.ts`), by a generated experiment log (`EXPERIMENTS.md`), and against an **independent Qiskit 1.4.2 simulation** (`scripts/qiskit_reference.py`, `tests/qiskit.test.ts`). Qiskit agrees to 12 decimal places.

---

## 1. The register

Eight physical qubits, displayed left to right as

```
CAT | I1 I0 | P2 P1 P0 | T1 T0
 #1   #2 #3   #4 #5 #6   #7 #8      ← house address (= bedroom route in binary)
```

The engine stores 256 complex amplitudes in two `Float64Array`s. Qubit `q` of basis index `i` is `(i >> q) & 1`, and we choose `q = 8 − address`. So **the binary representation of the basis index, written MSB-first, is exactly the displayed string**. Sampling, sensors, audio decoding and vault scoring all share one helper (`bitAt(index, address)`), so there is no endianness mismatch anywhere. This matches Qiskit's little-endian convention, which is why the cross-check compares bitstrings directly.

Four **independent source qubits** live on I1, I0, P2, P1:

| Source | Qubit | Odds of 1 : 0 | P(1) |
|---|---|---|---|
| A | I1 (#2) | 2 : 1 | 2/3 |
| B | I0 (#3) | 3 : 1 | 3/4 |
| C | P2 (#4) | 5 : 1 | 5/6 |
| D | P1 (#5) | 7 : 1 | 7/8 |

## 2. The circuit (`src/quantum/circuit.ts`)

```
X(CAT)                                   # the cat is always |1⟩
RY(2·atan√2) A,  RY(2·atan√3) B,  RY(2·atan√5) C,  RY(2·atan√7) D
CZ(A, B)                                 # entangling gate on two superposed qubits
Z(A)            only if the hidden phase s = 1
CNOT A→P0, CNOT C→P0                     # P0 = A ⊕ C
CNOT B→T1, CNOT D→T1                     # T1 = B ⊕ D
CNOT A→T0, CNOT D→T0                     # T0 = A ⊕ D
```

`RY(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩`. With `θ = 2·atan√r` this gives `(|0⟩ + √r|1⟩)/√(1+r)`, so the odds are r : 1. Gates are applied as genuine 2×2 unitaries, or controlled unitaries, to the 256-amplitude vector (`statevector.ts`). Nothing is sampled until a measurement happens.

The final state is

$$
|\psi_s\rangle = |1\rangle_{CAT}\otimes\sum_{a,b,c,d\in\{0,1\}} (-1)^{ab+sa}\sqrt{\tfrac{2^a3^b5^c7^d}{576}}\;|a\,b\,c\,d\,,\;a\oplus c\,,\;b\oplus d\,,\;a\oplus d\rangle
$$

with `576 = (1+2)(1+3)(1+5)(1+7)`.

## 3. The Born rule and why only 16 notes exist

A full Z-basis measurement of all eight qubits returns the label `i` with probability `|⟨i|ψ_s⟩|²`. The signs `(−1)^{ab+sa}` vanish under `|·|²`, so

$$P(a,b,c,d) = \frac{2^a\,3^b\,5^c\,7^d}{576}.$$

The CNOTs are **reversible XOR encoders**. They copy parities into three target qubits and add no randomness. The 7 musical bits could form 2⁷ = 128 labels, but every label with non-zero amplitude satisfies

```
P0 = I1 ⊕ P2      T1 = I0 ⊕ P1      T0 = I1 ⊕ P1
```

so exactly **2⁴ = 16** labels are supported, and the other 240 of the 256 basis states have amplitude exactly 0. The weights are products of distinct primes, so all 16 probabilities are different (1, 2, 3, 5, 6, 7, 10, 14, 15, 21, 30, 35, 42, 70, 105, 210 out of 576). Sorting them gives the vault's melody. **The vault's answer is computed from the statevector at runtime** (`supportedEvents()` in `model.ts`), not from a hand-typed list. The spec's oracle table is used only as a test.

Across the 16 supported labels, all 4 instruments, all 8 pitches and all 4 durations occur (tested).

## 4. Entanglement, carefully

The `CZ(A,B)` acts on two qubits that are both in superposition. Looking at the sources right after the CZ (before any CNOT), for s = 0:

$$|\psi_{AB}\rangle=\tfrac{1}{\sqrt{12}}\left(|00\rangle+\sqrt3|01\rangle+\sqrt2|10\rangle-\sqrt6|11\rangle\right)$$

This state is not a product state. Its concurrence is `2|a₀₀a₁₁ − a₀₁a₁₀| = √6/3 ≈ 0.82`, and the purity of A's reduced state is

$$\mathrm{Tr}\,\rho_A^2 = \tfrac{2}{3}\ (\text{with CZ}) \quad\text{vs.}\quad 1\ (\text{without CZ}).$$

The engine computes exactly these numbers (`StateVector.reducedPurity`, tested, and shown in the debug panel).

**What we do *not* claim:** the parity rules seen in Z-basis measurements (the Tangled Switchboard puzzle) are correlations. A classical machine that copies bits would produce the same Z statistics. Z-basis correlations alone do **not** prove entanglement. The game says this explicitly in the notebook. The evidence for coherence is the X-basis interference experiment below.

## 5. The hidden phase and the Hadamard's Harmonics experiment

### Why Z measurements can never reveal `s`

`Z(A)` and `CZ` are diagonal: they change only signs of amplitudes. We prove (and test to 1e-15) that the Z-basis distribution is **identical** for s = 0 and s = 1. No number of ordinary notes can reveal the closing chord. The phase is real, though: the amplitude vectors differ (another test).

### The ECHO / SIDE X circuit

On an echo timeline, a **fresh copy** is prepared and then:

1. **Uncompute the parity network:** the six CNOTs are applied in reverse order, which returns P0, T1, T0 to |0⟩ (tested).
2. **Leave `CZ(A,B)` in place.**
3. Apply **H to A** and measure **only A** in Z. This is equivalent to measuring A in the X basis.

After uncomputation, A's reduced state has coherence

$$\rho_{01}=(-1)^s\sqrt{p_A(1-p_A)}\,(1-2p_B) = (-1)^{s+1}\tfrac{\sqrt2}{6},$$

and measuring after H gives `P(0) = ½ + Re ρ₀₁`:

$$P(\text{echo}=0\mid s)=\tfrac12-(-1)^s\tfrac{\sqrt2}{6}\;\Rightarrow\;0.264298\ (s=0),\quad 0.735702\ (s=1).$$

Both values match the engine and Qiskit to 1e-12. The phase `s` flips the sign of an off-diagonal (coherence) term, which only an interference measurement can see.

**Entanglement matters for the size of the signal.** CZ multiplies A's coherence by `(1 − 2p_B) = −½`. If B were exactly 50/50, CZ would erase A's coherence completely and the echo would be blind to `s`.

### Why the inverse CNOTs are essential

Before uncomputation, P0 = A ⊕ C and T0 = A ⊕ D carry **which-path information** about A. For every fixed C, flipping A flips P0, so the "A = 0" and "A = 1" branches are tied to orthogonal states of the other qubits. Tracing them out sets A's coherence to **exactly zero**, and H then gives 50/50 for both phases. The test `without uncomputation, the phase signal washes out` checks this. Uncomputing the labels erases the which-path record and restores interference.

### The no-double-measurement rule

Each fresh entry prepares one copy and runs **one** experiment: either the full 8-qubit Z measurement (one note) or the echo (one ghost tone). An echo timeline never also produces an 8-bit reading. The house sensors show an "unresolved" shimmer, the lever logs nothing ("The house has no new ordinary reading in this frequency."), and the journal keeps separate counts.

### How much evidence?

With p = 0.7357 for the majority echo, the exact binomial probability that the majority of n echoes points to the correct chord is 82.7% (n = 4), 91.5% (8), 95.6% (12), 97.6% (16) and 98.7% (20). This is why the game suggests about 8–20 echoes. A wrong guess just rewinds, with the same secret and all notes kept.

## 6. Partial measurement (Which-Path Lantern)

When the lantern is primed on switch k, the next fresh copy is measured in two steps:

1. Projectively measure qubit k alone (`measureQubit`): sample from its marginal, zero out the incompatible amplitudes, renormalise.
2. Sample the full register **from the collapsed state**.

The final 8-bit note always agrees with the lantern bit (10000/10000 in the experiment log). The marginals still follow the Born rule (P(#2 = 1) ≈ 2/3, tested). This is conditional sampling from a collapsed state, not a second independent draw.

## 7. The Polarity Cabinet (a separate reference qubit)

The calibration minigame runs its own 1-qubit statevector: `|0⟩ → [slot] → measure`. An empty slot always gives 0 (lamp off). `X` gives `X|0⟩ = |1⟩` (lamp on, with certainty). An optional `H` tile gives a genuine 50/50 outcome. This teaches the house's convention (absent/inactive = 0, present/active = 1) **without touching the 8-qubit song**.

## 8. Randomness, reproducibility, honesty

- Randomness comes from a seeded PRNG (mulberry32). Each fresh timeline uses its own stream keyed by `(seed, "timeline", index)`, so a saved game replays identically, and the toaster's four copies use four separate streams. This is pseudo-randomness on a classical computer, which is standard for simulation.
- **This is a classical simulation of a quantum circuit, not a quantum computer and not a speed-up.** 256 amplitudes are trivial to simulate exactly. The point is that the game's mechanics follow from real quantum rules (unitary evolution, the Born rule, collapse, interference), so players learn true things.
- The simulation is ideal: there is no noise, decoherence or readout error. Hardware would blur the 26/74 split toward 50/50.
- Narrative elements are fiction, not physics: the cat, the house "remembering", and the "Congratulations, JAMES" joke (which the game labels as a joke).

## 9. Where to look in the code

| Concept | File |
|---|---|
| Statevector, gates, collapse, purity | `src/quantum/statevector.ts`, `gates.ts`, `measure.ts` |
| The circuit and the echo circuit | `src/quantum/circuit.ts` |
| Born distribution, supported events, sampling, echo probability | `src/quantum/model.ts` |
| Codebook (instrument / pitch / duration) | `src/quantum/codebook.ts` |
| Self-checks shown in the debug panel | `src/quantum/validation.ts` |
| One copy per entry, rewind, toaster | `src/game/timeline.ts` |
| Tests | `tests/quantum.test.ts`, `tests/qiskit.test.ts` |
