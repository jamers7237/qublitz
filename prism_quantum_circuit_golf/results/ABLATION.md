# What does PRISM's parity method contribute?

Costs use balanced `w1=1,w2=6,wd=0.2`. Lower is better.
These methods are ablations, not full competing commercial compilers.

| Test | Original | Adjacent cancellations | Exact local + affine | Full PRISM |
|---|---:|---:|---:|---:|
| L1-adjacent-HH | 2.4 | 0 | 0 | 0 |
| L1-phase-folding | 3.6 | 3.6 | 1.2 | 1.2 |
| L2-hidden-CX-Z-CX | 13.6 | 13.6 | 1.2 | 1.2 |
| L2-X-phase-global | 4.8 | 4.8 | 0 | 0 |
| L3-parity-echo | 27.2 | 27.2 | 0 | 0 |
| L3-H-conjugation | 3.6 | 3.6 | 1.2 | 1.2 |
| L3-remote-wire | 15.6 | 15.6 | 3.4 | 3.4 |
| L3-long-linear | 37.2 | 0 | 0 | 0 |
| L4-parallel-depth | 26.6 | 26.6 | 2.2 | 2.2 |
| L4-six-qubit-mixed | 42.4 | 42.4 | 3.2 | 3.2 |
| L4-weight-tradeoff | 13.6 | 13.6 | 2.2 | 2.2 |
| L3-nonlocal-parity-fingerprint | 70.2 | 70.2 | 45.2 | 43.2 |
| L3-parity-gauntlet-49-to-1 | 277.2 | 277.2 | 177.8 | 1.2 |

The 4-qubit `L3-nonlocal-parity-fingerprint` circuit is intentionally
constructed so the phase terms have the same input parity despite
an intervening nontrivial network of CNOTs. The exact local-only pass
cannot recognize that identity within its bounded two-wire window.
The symbolic parity pass can combine the two phase coefficients.

Important: Other local improvements may happen too. This comparison
demonstrates a useful specific mechanism, not a global superiority claim.
