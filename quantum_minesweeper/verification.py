"""Exact state/channel checks, including entanglement with an untouched reference."""
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
from .codes import STATES, core, encoder, errors, expected_syndrome


def inputs(seed=2026, random_states=12):
    values = {name: np.array([np.cos(t / 2), np.exp(1j * p) * np.sin(t / 2)])
              for name, (t, p) in STATES.items()}
    rng = np.random.default_rng(seed)
    for i in range(random_states):
        v = rng.normal(size=2) + 1j * rng.normal(size=2)
        values[f"random_{i:02d}"] = v / np.linalg.norm(v)
    values["bell_reference"] = None
    return values


def check_case(level, error, mode, vector):
    body = core(level, error, mode)
    bell = vector is None
    n = body.num_qubits
    qc = QuantumCircuit(n + int(bell))
    if bell:
        qc.h(0)
        qc.cx(0, n)
    else:
        qc.initialize(vector, 0)
    prepared = qc.copy()
    qc.compose(body, range(n), inplace=True)
    final = Statevector.from_instruction(qc)
    if level == 4:
        # Detection must leave the error-shifted encoded data (and reference) intact.
        enc = encoder(4)
        prepared.compose(enc, range(4), inplace=True)
        if error != "I":
            getattr(prepared, error[0].lower())(int(error[1:]))
        expected = Statevector.from_instruction(prepared)
        keep = list(range(4)) + ([n] if bell else [])
        trace = [q for q in range(qc.num_qubits) if q not in keep]
        fidelity = state_fidelity(partial_trace(final, trace), partial_trace(expected, trace))
        anc = [4, 5]
    else:
        keep = [0, n] if bell else [0]
        target = Statevector([1 / np.sqrt(2), 0, 0, 1 / np.sqrt(2)]) if bell else Statevector(vector)
        fidelity = state_fidelity(partial_trace(final, [q for q in range(qc.num_qubits) if q not in keep]), target)
        anc = [1, 2] if mode == "compact" else [3, 4]
    syndrome = expected_syndrome(level, error, mode)
    probability = final.probabilities(anc)[syndrome[0] + 2 * syndrome[1]]
    return float(fidelity), float(probability)


def verify_all(seed=2026, random_states=12):
    records = []
    for level in range(1, 5):
        for mode in (["compact", "explicit"] if level < 4 else ["explicit"]):
            for error in errors(level):
                for name, vector in inputs(seed, random_states).items():
                    fidelity, probability = check_case(level, error, mode, vector)
                    records.append(dict(level=level, mode=mode, error=error, state=name,
                                        fidelity=fidelity, syndrome_probability=probability))
    minimum_fidelity = min(x["fidelity"] for x in records)
    minimum_syndrome = min(x["syndrome_probability"] for x in records)
    passed = minimum_fidelity > 1 - 1e-10 and minimum_syndrome > 1 - 1e-10
    return dict(passed=passed, method="exact statevector with partial trace; no noise",
                seed=seed, random_states=random_states, cases=len(records),
                minimum_fidelity=minimum_fidelity, minimum_syndrome_probability=minimum_syndrome,
                records=records)
