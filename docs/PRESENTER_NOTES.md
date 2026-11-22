# Presenter notes

Full circuit images are embedded in output/pdf/Presenter_Guide.pdf.

## Slide 1: Quantum Minesweeper

Our project protects one unknown logical qubit against the error sets specified by the challenge. We implement all four levels in simulation and one level on actual IQM hardware. The work combines an explicit five-qubit syndrome circuit with a compact three-qubit recovery circuit. Our hardware claim is deliberately specific: a level-1 pilot on two input states and every permitted fault location. We preserve quantum phase information in ideal tests and use a phase-sensitive input in the real experiment. The headline 93.4% is average input-state survival on the corrected hardware circuits, not a universal accuracy or a fault-tolerance threshold.

Evidence: Repository: github.com/jamers7237/qublitz

## Slide 2: Why hardware did not score 100%

The circuit can be mathematically correct without perfect experimental outcomes. Its ideal guarantee assumes one specified error after encoding, with ideal recovery operations. Actual superconducting hardware also introduces gate errors, relaxation, dephasing, unwanted interactions, and readout mistakes. Our pilot does not separately identify the contribution of each mechanism. A shot repeats the whole experiment, including preparation and readout. Finite sampling makes an estimated probability uncertain, but sampling alone cannot turn an exactly deterministic ideal success into failures: if success probability were exactly one, all shots would succeed. Our exact tests are effectively 100%; the hardware estimates reflect a different, noisier experiment. The code is not a fault-tolerant implementation that corrects arbitrary faults occurring anywhere inside itself.

Evidence: results/verification.json; results/iqm-pilot/results.json

## Slide 3: Reading the quantum notation

Read |psi> as ket psi. The bracket identifies a quantum state vector, rather than an ordinary bit. Alpha and beta are amplitudes. Their squared magnitudes give zero and one probabilities, but amplitudes also contain relative phase. Ket plus and ket minus both give equal zero/one probabilities, although they are orthogonal. A gate written to the left of a ket acts on it. X|0>=|1>, while Z|1>=-|1>. The minus sign matters relative to another component of a superposition. A global sign on the whole state is unobservable. Tensor product means separate systems or operations on separate qubits. Appendix slides give the actual matrices and explain the helper interference measurement.

Evidence: docs/THEORY.md; quantum_minesweeper/codes.py

## Slide 4: Challenge coverage

Level 1 corrects I or one X fault on three data qubits. Level 2 corrects I or one Z fault. Level 3 corrects I or one Y fault, with the guarantee that X and Z are not independently injected at different locations. Level 4 classifies I, X, Y, or Z on one of four data qubits and does not require full recovery. Compact levels 1-3 use three circuit wires. Explicit syndrome extraction uses two additional ancillas. Level 4 uses four data and two helpers. All levels have exact-state simulation evidence. Only level 1 has actual QPU evidence. The local fake backends are noise simulations and the remote mock environments are integration checks, not real hardware evidence.

Evidence: Challenge levels 1-4; results/verification.json

## Slide 5: Encoding one logical qubit

A CNOT flips its target when its control is one, acting coherently on superpositions. With q0 controlling q1 and q2, the zero component becomes 000 and the one component becomes 111. This is an encoding, not cloning: three copies of alpha|0>+beta|1> would have eight product terms, unlike the two-term encoded state. In the displayed three-qubit examples, we write the digits as q0 q1 q2 for intuition. Qiskit displays bitstrings in the reverse order. Real code indexes gates explicitly, and the analysis reverses printed count keys before interpretation. The encoding protects only the specified error axis. Individual data measurements can reveal logical information and destroy its coherence.

Evidence: codes.py: encoder(); circuits/000_L1_X1_compact_correct_plus_i.qasm

## Slide 6: Explicit syndrome extraction

A syndrome is a pattern of failed consistency checks. To measure Z0Z1, start a helper at zero and apply CNOT from q0 to the helper and from q1 to the helper. The helper receives their parity, not their individual values. Both 000 and 111 give the same parity, so the helper does not learn alpha or beta. Repeat for Z1Z2. In this explicit convention I gives 00, a fault on q0 gives 10, q1 gives 11, and q2 gives 01. For levels 2 and 3 the circuit first moves into the appropriate frame. The measured or coherently stored syndrome selects a fixed recovery. Never use this table interchangeably with the compact decoder's table.

Evidence: codes.py: extract(), EXPLICIT_LOCATION

## Slide 7: Compact recovery on three qubits

This is the recovery used in the real pilot. The first two CNOTs encode. A test X is injected after an encoding barrier. The next two CNOTs decode. The output q0 is already correct for I, X1, and X2. Only X0 produces work bits 11 and leaves the candidate q0 flipped. One Toffoli controlled by q1 and q2 repairs it. The work bits contain error information and no dependence on the logical amplitudes. Their compact syndrome table is I:00, X0:11, X1:10, X2:01. This circuit returns a decoded logical qubit. The five-qubit version first recovers the encoded state and then decodes. The actual experiment adds known state preparation, inverse preparation, and final measurements to evaluate survival.

Evidence: codes.py: core(mode='compact'); actual Garnet pilot

## Slide 8: Worked example: a hidden X0 fault

Read the displayed kets in q0 q1 q2 order. Encoding gives alpha|000>+beta|111>. A hidden X0 gives alpha|100>+beta|011>. Inverse encoding gives (alpha|1>+beta|0>)|11>: the candidate logical state is flipped and the two work bits are 11. Toffoli flips q0 again, returning (alpha|0>+beta|1>)|11>. The same fixed gate also behaves correctly in the other three syndrome cases because its controls are not both one. The harness knows the injected fault only to score the result. The recovery has no error-location parameter. For the phase-sensitive input alpha=1/sqrt(2), beta=i/sqrt(2), the uncorrected logical X sends the input to an orthogonal state, making failure visible.

Evidence: codes.py: core(); tests/test_codes.py

## Slide 9: Phase and Y faults share the decoder

H is the Hadamard. HZH=X, so a physical Z becomes a bit flip in the rotated frame. The phase-code state is alpha|+++>+beta|--->. For level 3 use S=diag(1,i), since S-dagger Y S=X. Applying S to all three repetition-code qubits changes the logical phase: the codeword for one is -i|111>. Undoing that frame after the fault maps Y to X and accounts for its phase component. The level-3 code occupies the same physical subspace as the repetition code, with a different logical phase convention. This is a unified implementation of established codes, not a new universal three-qubit code. It does not correct arbitrary X, Y, Z faults simultaneously.

Evidence: codes.py: frame(), AXIS; docs/THEORY.md

## Slide 10: Level 4: the ZZZZ check

The level-4 encoded zero is (0000+1111)/sqrt(2), and encoded one is (0011+1100)/sqrt(2). Each component has even parity. The parent [[4,2,2]] space contains two logical qubits; we fix one logical degree of freedom to encode our single unknown input. Four CNOTs from the data to helper q4 compute parity coherently. An X on the first data position changes the example to (1000+0111)/sqrt(2). Both components now have odd parity, so helper q4 returns one. The helper cannot distinguish the two logical codewords because both have the same check value. We measure one combined observable, not each individual data bit.

Evidence: codes.py: encoder(4), extract(level=4)

## Slide 11: Level 4: the XXXX check

The direction of the CNOTs reverses for this check. Prepare q5 in ket plus using H. In its zero branch, the data are unchanged. In its one branch, the four controlled X gates flip every data qubit. If the data are a +1 eigenstate of XXXX, the two helper branches have the same sign, leaving the helper in plus. If the data are a -1 eigenstate, the one branch gains a minus sign, leaving the helper in minus. The final H maps plus to zero and minus to one. We do not compare snapshots of the data. A global minus sign becomes an observable relative sign between the helper branches. On a general state, the check measurement projects into an eigenspace. The promised Pauli faults give definite check eigenvalues.

Evidence: codes.py: extract(level=4); controlled-Pauli measurement

## Slide 12: Error type comes from two check bits

The check order is ZZZZ defect first, XXXX defect second. No error gives 00. X anticommutes with the Z check and gives 10. Z anticommutes with the X check and gives 01. Y violates both and gives 11. The two checks commute because they overlap with X/Z anticommutation at four sites, producing four minus signs that cancel. Type detection does not identify location and therefore does not generally determine a safe recovery. The simulator checks that extracting the syndrome leaves E|psi_L> and its reference correlations intact. It does not compare to the original unerrored state. If a judge asks about correction, explain that applying the wrong location's Pauli can enact a logical error.

Evidence: codes.py: TYPE; verification.py: check_case(level=4)

## Slide 13: Evidence of quantum-state preservation

There are 19 inputs in the exact verifier: six cardinal pure states, twelve seeded random pure states, and one Bell-reference case. Levels 1-3 use two designs and four faults each, giving 3*2*4*19=456 cases. Level 4 has 13 configurations times 19 inputs, giving 247. Total 703. Minimum fidelity is 0.999999999999996, consistent with one within floating-point precision. Preserving half of a Bell pair checks quantum correlations that a classical measure-and-reprepare procedure would destroy. A numerical Knill-Laflamme check verifies the correctability condition for every permitted error pair in levels 1-3. We also test representative coherent rotations about the protected axis. These ideal results do not establish perfect physical-device performance.

Evidence: results/verification.json; verification.py; field_theory.py

## Slide 14: How Python reaches the IQM processor

Python is a classical client, not a program running directly inside the chip. The SDK fetches the computer's target and calibration identity. Qiskit transpiles our abstract CNOT and Toffoli circuit into supported rotations and CZ gates and routes it across available couplings. We compare three transpiler seeds by total two-qubit count then depth. The provider serializes native circuits and submits the batch over authenticated HTTPS. The remote service schedules the processor, performs repeated shots, and returns measurements. The saved job ID makes the execution auditable and retrievable without resubmitting. Prepare, submit, and fetch are separate commands. The real pilot used Garnet, not a local fake or a remote mock. The private token remains excluded from Git.

Evidence: iqm_runner.py; docs.iqm.tech/iqm-client/user_guide_qiskit.html

## Slide 15: Real Garnet recovery signal

The real job contains two input states, four fault cases, and recovery on/off: 16 circuits, each with 256 shots, for 4096 circuit-shots. For plus-i with X0, recovery gives 91.41% input survival with an individual 95% Wilson interval of 87.33%-94.26%. The control gives 4.30%, interval 2.42%-7.53%. Plus is a weaker witness of a logical X because X|+>=|+>. Plus-i is phase sensitive: X maps it to the orthogonal minus-i state, up to an overall phase. Across all eight corrected configurations, average survival is 93.41%, versus 84.57% for controls. These are descriptive averages over two inputs, not an average gate fidelity over arbitrary states. Different physical layouts limit causal interpretation of the comparison.

Evidence: results/iqm-pilot/results.json; job 01a1ffa5-97e8-77e2-ac14-9a55f2083731

## Slide 16: Every configuration in the real pilot

Show every row rather than only the most favorable case. Without recovery, a q0 fault produces a logical X. Plus is unchanged by that logical X, whereas plus-i fails strongly. For faults on q1 or q2, inverse encoding can already leave q0 correct, so the Toffoli can mainly add noise. Even a no-fault corrected circuit can score below its control because recovery is physically imperfect. Syndrome accuracy and logical survival are distinct: an incorrect syndrome readout can accompany a successful logical verification. All displayed means include every shot. Per-row confidence intervals and raw count strings are available in the hardware report and JSON. We do not claim to have experimentally identified each individual noise mechanism.

Evidence: results/iqm-pilot/results.json; docs/HARDWARE_RESULTS.md

## Slide 17: Circuit overhead and experimental limits

Our pilot establishes a real targeted recovery demonstration, with explicit limitations. Corrected and control circuits were compiled independently and differ in physical placement, routing, duration, and operation count. Their difference does not isolate the recovery gate alone. Preparation, inverse preparation, and readout also contribute. We have not demonstrated fault tolerance, repeated syndrome rounds, or memory break-even against a matched bare-qubit baseline. The three-qubit code also fails outside its promised model: two bit flips can be miscorrected into a logical flip, and an unprotected phase error can pass its Z parity checks while corrupting phase information. The offline demo shows both expected failures. These limits strengthen understanding rather than invalidate the specified single-fault solution.

Evidence: manifest.json; native_resources.json; tests/test_codes.py

## Slide 18: Live demonstration and reproducibility

Run from the repository root with the existing virtual environment activated, or prefix python with .venv/bin/python. The new live_demo script prints the real compact circuit, verifies all allowed protected-axis errors for a phase-sensitive input, shows all level-4 syndromes, demonstrates two expected out-of-model failures, and reads the saved real IQM counts. With --verify it runs the full exact suite. It never connects to IQM or spends credits. For a fresh setup install Python 3.11 or newer and pip install -e '.[test]'. Hardware compile-only, paid submission, and retrieval commands are documented in the appendix and guide. A live queue should be optional during judging, since a completed job with raw evidence is reproducible and auditable.

Evidence: scripts/live_demo.py; README.md; docs/IQM.md

## Slide 19: Design choices and next experiments

The challenge encourages attempting more of its four levels. We already implement all four in simulation, so inventing a level 5 is not necessary. Creativity can be an efficient circuit, a more informative test, or a disciplined investigation of a limitation. A strong next experiment uses matched input/output physical mappings, audits routing, and interleaves corrected/control execution to reduce drift. Then expand to all six cardinal inputs and consider hardware coverage of additional levels if credits and time justify it. More shots reduce statistical uncertainty but do not remove systematic gate or readout errors. A completely new code is optional. The most defensible contributions are coherent compact recovery, the unified implementation, complete error coverage, and transparent experimental evidence.

Evidence: Challenge assessment; implementation design decisions

## Slide 20: Appendix: the matrices behind the checks

A qubit is a two-entry column of amplitudes. Z is the 2x2 matrix with diagonal 1,-1. X has zero diagonal and ones off diagonal. Both are operators and observables with eigenvalues plus or minus one. A single-qubit gate returns a vector, not an ordinary scalar. ZZZZ is Z tensor Z tensor Z tensor Z, a 16x16 operator, not Z multiplied by itself four times on one qubit. Its eigenvalue on a computational-basis product is the product of the four Z signs. XXXX has the same structure in the plus/minus basis. For a definite -1 eigenstate, simply applying the whole operator gives an unobservable global sign. Controlled application makes that sign relative between helper branches, allowing measurement through interference.

Evidence: Operator definitions; level-4 circuit

## Slide 21: Appendix: the field-theory connection

For the repetition code, G0=Z0Z1 and G1=Z1Z2. Each -1 check contributes energy Delta. I has zero defects, an end-site X has one, and a middle-site X has two. Energy alone cannot locate an error because the two end faults have equal energy. The full syndrome pattern carries the useful location information. This is a finite spin-chain or stabilizer-Hamiltonian description. Topological codes have a deeper connection to lattice gauge theory, discussed by Dennis, Kitaev, Landahl, and Preskill. Our implementation is not a continuum QFT, toric code, anyon experiment, or demonstration of topological fault tolerance. field_theory.py builds the matrices, verifies zero encoded energy and commuting checks, and computes the correction-condition residuals.

Evidence: field_theory.py; arxiv.org/abs/quant-ph/0110143

## Slide 22: Appendix: three different success metrics

The count key is s1 s0 logical for levels 1-3. Expected compact syndrome for X0 is 11. The raw key 110 occurs 211 times and passes both conditions. Key 100 passes logical verification but has an unexpected syndrome. Key 111 has the expected syndrome but fails logical verification. Summing every key with final logical bit zero gives 234 successful shots, or 91.41%. Summing 110 and 111 gives syndrome accuracy 219/256=85.55%. Joint success is 211/256=82.42%. These metrics answer different questions. We report unconditional survival and never discard unfavorable syndrome shots. Wilson intervals quantify finite-shot uncertainty under a binomial model; they do not account for drift or systematic calibration errors.

Evidence: analysis.py; actual plus_i / X0 raw counts

## Slide 23: Appendix: a new IQM execution

The exact commands appear in the presenter guide and docs/IQM.md. Use a fresh results directory for a new pilot. The compile command chooses level 1, plus and plus-i, controls, and 256 shots. The default circuit-shot ceiling is not a dollar cap. Do not print or commit the token. The paid submit command saves a submission-start marker and then the job ID to prevent accidental repeat spending. Retrieval can be repeated without resubmitting. The included real pilot is already complete, so no new paid job is necessary for the live explanation. The public pricing model bills processor use, and the actual charge must be checked in the account credit history. This package does not claim an independently verified dollar spend.

Evidence: cli.py; iqm_runner.py; docs/IQM.md

## Slide 24: Appendix: submission and assessment evidence

Section 6 asks for four deliverables, all included in the package. Section 7 evaluates the correctness and understanding behind them. For encoding and syndrome interpretation, use the circuit and worked-example slides. For recovery selection, show the fixed Toffoli and both syndrome conventions. For evidence of quantum preservation, use the Bell-reference and cardinal-state tests. For experimentation, show every permitted error including I, hardware controls, per-case uncertainty, and expected failures. For creativity, explain basis unification and resource tradeoffs without claiming a new code. For implementation, use the reproducible commands and saved native job artifacts. The team still needs to rehearse and deliver the live talk; this package prepares that requirement but cannot perform it on the team's behalf.

Evidence: docs/SUBMISSION.md; output/pdf/Submission_Report.pdf

## Slide 25: Appendix: actual Garnet circuit (1/2)

This is an exact gate-sequence rendering of circuit index 10 in the saved compiled QPY file. It uses native physical indices 0,1,3,4, labeled QB1,QB2,QB4,QB5 using IQM names. The 26 R gates, 13 CZ gates, four barriers, and three measurements come from the real submitted witness circuit. Each R number points to its theta/phi parameter in the next appendix. CZ dots denote a controlled phase, unlike a CNOT target. The diagram spreads operations sequentially for legibility; actual independent gates can share layers, giving circuit depth 28. Barriers are compilation boundaries. The saved global phase is irrelevant to observed counts. Follow the actual measured classical-bit labels to locate logical verification c0 and syndrome c1,c2.

Evidence: results/iqm-pilot/native_witness.json; compiled.qpy, circuit 10

## Slide 26: Appendix: actual Garnet circuit (2/2)

This is an exact gate-sequence rendering of circuit index 10 in the saved compiled QPY file. It uses native physical indices 0,1,3,4, labeled QB1,QB2,QB4,QB5 using IQM names. The 26 R gates, 13 CZ gates, four barriers, and three measurements come from the real submitted witness circuit. Each R number points to its theta/phi parameter in the next appendix. CZ dots denote a controlled phase, unlike a CNOT target. The diagram spreads operations sequentially for legibility; actual independent gates can share layers, giving circuit depth 28. Barriers are compilation boundaries. The saved global phase is irrelevant to observed counts. Follow the actual measured classical-bit labels to locate logical verification c0 and syndrome c1,c2.

Evidence: results/iqm-pilot/native_witness.json; compiled.qpy, circuit 10

## Slide 27: Appendix: native rotation parameters

An R(theta,phi) gate rotates a qubit by theta about an axis in the XY plane with azimuth phi. The table shows radians, rounded to five decimal places for presentation. The machine-readable JSON and compiled QPY preserve the source parameters. These are not manually chosen pulse amplitudes or durations. The SDK and hardware compiler implement the native instructions. Reproducing a fresh run can yield different layouts, native sequences, and calibration parameters, so the actual saved artifact is the record for this experiment.

Evidence: native_witness.json: exact parameters; table rounds to five decimals

## Slide 28: Appendix: the level-2 circuit

Follow left to right. Two CNOTs first encode the input as a repetition-code state. Apply H to all three data qubits. A Z fault then acts at an unknown site; this diagram illustrates site 1. Apply H to all three again, converting that Z into X. The inverse-encoding CNOTs place the syndrome on q1 and q2. The fixed Toffoli repairs q0 if and only if the work bits are 11. A location-1 fault produces compact syndrome 10, so q0 is already correct and the Toffoli does not fire. Known inverse input preparation and measurements belong to the terminal experiment, after this recovery block. This circuit has simulation evidence only.

Evidence: codes.py: encoder(2), frame(2), core(2)

## Slide 29: Appendix: the level-3 circuit

Follow the same stages as level 2, replacing H with S during encoding and S-dagger when undoing the frame. A Y fault becomes X because S-dagger Y S=X. Both the bit and phase components are handled by this transformation. The same inverse-encoding CNOTs and one Toffoli then recover q0. The initial S rotations change the logical phase of the encoded one codeword to -i times 111, and their inverses restore the original logical convention. Merely applying ordinary X recovery to an unrotated repetition state hit by Y would leave a phase error. An alternative valid implementation could directly apply syndrome-selected Y recovery. Our frame version reuses one decoder. This circuit has simulation evidence only.

Evidence: codes.py: encoder(3), frame(3), core(3)

## Slide 30: Appendix: explicit syndrome-selected recovery

The two ancillas already store the explicit extraction syndrome. The first controlled operation flips q0 only for syndrome 10, the second flips q1 only for 11, and the third flips q2 only for 01. Syndrome 00 triggers no recovery. A hollow control means the operation is enabled when that qubit is zero. In the source code, X gates temporarily invert such controls around an ordinary Toffoli, then restore them. Because the logical state is recovered for every error sector, the ancillas can be measured at the end. The last two CNOTs decode the corrected repetition state. For levels 2 and 3, the source moves the data into and out of the corresponding basis around this same controlled-X block. These diagrams explain the compact-versus-explicit resource tradeoff.

Evidence: codes.py: recover(); EXPLICIT_LOCATION
