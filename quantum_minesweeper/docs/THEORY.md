# Why the circuits work

## The field-theory connection

A finite spin lattice has local operators G_a with eigenvalues ±1. Define the commuting stabilizer Hamiltonian

```text
H_code = Δ Σ_a (I - G_a)/2,      Δ > 0.
```

The code space is its zero-energy sector: G_a |ψ_L⟩ = |ψ_L⟩. An error E has syndrome s_a = 1 exactly when it anticommutes with G_a. Then G_a E|ψ_L⟩ = (-1)^s_a E|ψ_L⟩ and each violated check adds energy Δ. The syndrome is a pattern of defects, not a measurement of α or β. In the repetition code these defects are domain walls of a finite Ising chain. For example X on the middle site violates both adjacent ZZ checks.

This is the concrete finite-lattice viewpoint used to choose the checks and recovery. The stronger connection between topological QEC, gauge theories, and decoding transitions is developed in [Dennis, Kitaev, Landahl, and Preskill, *Topological quantum memory*](https://arxiv.org/abs/quant-ph/0110143). Our three- and four-qubit codes do not realize a continuum QFT, a toric code, anyon braiding, or topological fault tolerance. Calling these demonstrations full QFT solvers would overstate them.

`field_theory.py` actually constructs these Hamiltonians, checks the encoded states have zero energy, computes ground-space dimensions, and tests the error-correction criterion. This makes the viewpoint a verifiable part of the project, not just terminology. The correction protocol is an active gate circuit; no physical energy relaxation under H_code is assumed.

## Levels 1–3: rotate the error model into bit flips

Let V|ψ⟩ = α|000⟩ + β|111⟩. Its checks are G0=Z0Z1 and G1=Z1Z2. An explicit syndrome circuit copies these parities into two |0⟩ ancillas using data-to-ancilla CNOTs. Measuring the ancillas reveals a check eigenvalue while keeping each logical superposition intact.

Use the encoder V_U = U⊗3 V:

| Level | U | U X U† | Checks |
|---|---|---|---|
| 1 | I | X | Z0Z1, Z1Z2 |
| 2 | H | Z | X0X1, X1X2 |
| 3 | S = diag(1,i) | Y | Z0Z1, Z1Z2 |

For an allowed error P_j = U_j X_j U_j†,

```text
(U†)⊗3 P_j U⊗3 V|ψ⟩ = X_j V|ψ⟩.
```

Thus all three problems reduce to the same decoder. In level 3 the codewords are |000⟩ and -i|111⟩. A Y error carries a phase as well as a bit flip, but S† Y S = X removes that phase in the rotated frame. Applying a bit-flip recovery to the ordinary unrotated repetition code would leave a logical phase error; that incorrect approach is deliberately avoided.

For explicit extraction the syndrome order is **(s0,s1)**, where s0 checks sites (0,1) and s1 checks sites (1,2):

| Syndrome | Error location | Recovery |
|---|---|---|
| 00 | none | I |
| 10 | 0 | P0 |
| 11 | 1 | P1 |
| 01 | 2 | P2 |

The implementation uses fixed syndrome controls, not the test error label. It applies Toffolis in the rotated frame and finally decodes the corrected data. Before decoding, the explicit circuit has recovered the original encoded state.

## Compact three-qubit recovery

After undoing U, apply CNOT(0→1), CNOT(0→2). The data become a logical candidate on q0 and syndrome/work bits a=q1, b=q2. Their values are:

| Fault | a b | Logical candidate |
|---|---|---|
| I | 00 | |ψ⟩ |
| P0 | 11 | X|ψ⟩ |
| P1 | 10 | |ψ⟩ |
| P2 | 01 | |ψ⟩ |

A single Toffoli controlled by q1,q2 and targeted on q0 completes recovery. The work bits can then be measured; they carry no dependence on the unknown amplitudes. This protocol decodes and recovers the original qubit, rather than leaving it encoded for further storage. Its syndrome convention is different from the explicit circuit and is labeled in every result.

The explicit version uses five physical qubits and three syndrome-controlled Toffolis. The compact version uses three and one. A Toffoli must be decomposed into native one- and two-qubit gates; compare the compiled operation counts rather than treating it as a free primitive.

## Why deferred measurements preserve the logical qubit

After syndrome extraction, a correctable fault gives

```text
E_j|ψ_L⟩ |00⟩ → E_j|ψ_L⟩ |s(j)⟩.
```

Coherent controlled recovery applies the same operation that would be selected by a classical decoder after measuring the syndrome. It produces |ψ_L⟩|s(j)⟩, up to a global phase. The ancillas can be measured at the end. For a coherent superposition of correctable faults, the amplitudes are transferred to syndrome degrees of freedom and the logical qubit still factors out. Tests exercise coherent rotations as well as discrete Pauli faults.

This removes any need to assume that a particular Resonance machine supports mid-circuit measurement, resets, or classical feedback. It does not make the recovery gates fault tolerant.

## Knill–Laflamme check

For a code isometry V, a set of errors {E_i} is correctable iff

```text
V† E_i† E_j V = c_ij I_2    for every i,j.
```

The numerical verifier computes the deviation from a scalar identity for every pair of permitted errors. Levels 1–3 have residual zero to numerical precision. Four distinct syndrome sectors each have dimension two, filling the three-qubit Hilbert space, so the restricted four-error set fits exactly. A general arbitrary Pauli error has more possibilities than these codes can distinguish; its correction is not claimed.

## Level 4: detect type while retaining encoded information

Use the [[4,2,2]] code with stabilizers

```text
G0 = Z0 Z1 Z2 Z3
G1 = X0 X1 X2 X3.
```

They commute because they overlap on four sites. Their joint +1 space has dimension four (two logical qubits). We fix one logical degree of freedom and encode one unknown input as

```text
|0_L⟩ = (|0000⟩ + |1111⟩)/sqrt(2)
|1_L⟩ = (|0011⟩ + |1100⟩)/sqrt(2).
```

The displayed kets use Qiskit's q3 q2 q1 q0 order. The encoder is CNOT(0→1), H(2), CNOT(2→3), CNOT(2→0), CNOT(2→1). Both checks stabilize both codewords.

Measure ZZZZ with four data-to-ancilla CNOTs. Measure XXXX with a second ancilla prepared in |+⟩, ancilla-to-data CNOTs, and H before measuring that ancilla. Do not read out the data qubits during detection.

| (ZZZZ defect, XXXX defect) | Classified type |
|---|---|
| 00 | I |
| 10 | X |
| 01 | Z |
| 11 | Y |

The anticommutation signs are independent of location. A syndrome cannot tell which of four sites was hit. Our verifier compares the data/reference state before and after extraction, and finds it unchanged for each injected fault. This means extraction preserves the **error-shifted** encoded quantum information. It does not mean the fault has been corrected. The full error set fails the Knill–Laflamme correction test for our chosen encoded qubit, as expected.

## Honest verification and limitations

Six cardinal input states expose phase loss missed by tests on |0⟩ and |1⟩. Random states add coverage; preservation of half of a Bell pair directly checks entanglement preservation. In ideal theory, the channel is linear, so the analytic recovery proof and the channel/reference check are stronger than testing many classical examples alone.

Shot experiments invert the known input preparation on recovered q0 and measure whether it is zero. Its zero probability is fidelity with that pure input for an ideal verification apparatus. On hardware it also includes state-preparation and measurement errors; it is reported as input-state survival, not an isolated gate fidelity. The six-state average is not by itself evidence of fault tolerance.

Uncorrected controls use the same encoding, injected fault, syndrome/decoding steps, and verification, with recovery disabled. They expose the targeted effect, but are not a matched-duration idle-memory or bare-qubit benchmark. No break-even claim should be based on them. Multiple faults, errors of an unprotected axis, and gate faults are outside the promised ideal error models.
