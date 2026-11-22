# Research review, method selection, and attribution

**First in intellectual interest:** general equality-saturation with e-graphs,
as exemplified by the 2026 Quasar paper. It explores broad equivalence spaces,
but implementing a trustworthy full system in ~24 hours has high risk.

**Second (selected):** **affine parity / phase-polynomial optimization**.
For the exact allowed gate set, the T/S/Z family contains quantized diagonal
phases and the CNOT/X family computes affine parity functions. This is a very
specific mathematical structure that we can exploit without relying on
templates or a large external quantum SDK. We combine it with bounded
automatically enumerated local unitary equivalences and GF(2) synthesis.

We did **not** implement a complete GraySynth parity-network synthesizer,
matroid partitioning, a general-purpose e-graph, or an exact global optimizer.
Phase collection is exact algebraically up to global phase, and phase
placement is explored across several deterministic choices.

## Relevant primary research

1. **Amy, Azimzadeh, Mosca**, *On the CNOT-complexity of CNOT-phase circuits*.
   Introduces parity networks and relates phase functions to CNOT optimization.
   https://www.mathstat.dal.ca/~mamy/Papers/xorrp.pdf
2. **Amy, Maslov, Mosca**, *Polynomial-Time T-Depth Optimization of Clifford+T
   Circuits Via Matroid Partitioning* (2014). Establishes techniques for
   optimization of Clifford+T phase structure.
   https://arxiv.org/abs/1303.2042
3. **Xu et al.**, *Quartz: Superoptimization of Quantum Circuits* (PLDI 2022).
   Automatically generates/verifies circuit rewrites, cost-based search.
   https://arxiv.org/abs/2204.09033
4. **Yang, Tao, and colleagues**, *Equality Saturation for Quantum Circuit
   Optimization* (Quasar, PLDI 2026). E-graphs and step-bounded search.
   https://www.quics.umd.edu/publications/equality-saturation-quantum-circuit-optimization
5. **Amy, Maslov, Mosca, Roetteler**, *A Meet-in-the-Middle Algorithm for Fast
   Synthesis of Depth-Optimal Quantum Circuits* (2012). Exact synthesis
   strategies for small Clifford+T circuits.
   https://arxiv.org/abs/1206.0758
6. **Webster and coauthors**, *Heuristic and Optimal Synthesis of CNOT and
   Clifford Circuits* (Quantum, 2026). Contemporary cost/count/depth tradeoffs.
   https://quantum-journal.org/papers/q-2026-09-21-2212/

## Other external resources

- Organizer-supplied *Quantum Circuit Golf* challenge, technical format PDF,
  and Python checker (not copied into optimizer).
- IQM, *Qiskit on IQM user guide*, 2026:
  https://docs.iqm.tech/iqm-client/user_guide_qiskit.html
- IBM Quantum, Qiskit circuit/transpilation documentation:
  https://quantum.cloud.ibm.com/docs/en/qiskit/construct-circuits

## AI attribution

This source code, test framework, and some files were designed and written with 
OpenAI ChatGPT assistance in November 2026. PRISM is an independently written 
implementation, not a copied research-code repository.

