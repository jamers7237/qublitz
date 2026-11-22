"""Circuit construction. Recovery never reads the injected error label.

Qubit 0 holds the input. Ancilla syndrome tuples are always (s0, s1),
in increasing qubit/classical-bit order, not Qiskit's printed bit order.
"""
from dataclasses import dataclass
import numpy as np
from qiskit import QuantumCircuit

STATES = {
    "zero": (0.0, 0.0), "one": (np.pi, 0.0),
    "plus": (np.pi / 2, 0.0), "minus": (np.pi / 2, np.pi),
    "plus_i": (np.pi / 2, np.pi / 2), "minus_i": (np.pi / 2, -np.pi / 2),
}
AXIS = {1: "X", 2: "Z", 3: "Y"}
EXPLICIT_LOCATION = {(0, 0): None, (1, 0): 0, (1, 1): 1, (0, 1): 2}
COMPACT_LOCATION = {(0, 0): None, (1, 1): 0, (1, 0): 1, (0, 1): 2}
TYPE = {(0, 0): "I", (1, 0): "X", (0, 1): "Z", (1, 1): "Y"}


def errors(level):
    if level not in (1, 2, 3, 4):
        raise ValueError("level must be 1, 2, 3, or 4")
    return ["I"] + [f"{p}{q}" for p in ("XYZ" if level == 4 else AXIS[level])
                      for q in range(4 if level == 4 else 3)]


def expected_syndrome(level, error, mode="compact"):
    if error not in errors(level):
        raise ValueError(f"{error} is not permitted in level {level}")
    if level == 4:
        return next(s for s, p in TYPE.items() if p == error[0])
    location = None if error == "I" else int(error[1:])
    table = COMPACT_LOCATION if mode == "compact" else EXPLICIT_LOCATION
    return next(s for s, q in table.items() if q == location)


def frame(qc, level, inverse=False):
    """Local U with U X U† equal to the level's error axis."""
    for q in range(3):
        if level == 2:
            qc.h(q)
        elif level == 3:
            (qc.sdg if inverse else qc.s)(q)


def encoder(level):
    qc = QuantumCircuit(4 if level == 4 else 3, name=f"encode_L{level}")
    qc.cx(0, 1)
    if level == 4:
        qc.h(2)
        qc.cx(2, 3)
        qc.cx(2, 0)
        qc.cx(2, 1)
    else:
        qc.cx(0, 2)
        frame(qc, level)
    return qc


def extract(qc, level):
    if level == 4:
        for q in range(4):
            qc.cx(q, 4)  # ZZZZ
        qc.h(5)
        for q in range(4):
            qc.cx(5, q)  # XXXX
        qc.h(5)
    else:
        frame(qc, level, inverse=True)
        for data, anc in [(0, 3), (1, 3), (1, 4), (2, 4)]:
            qc.cx(data, anc)
        frame(qc, level)


def recover(qc, level):
    """Coherent version of measuring syndrome then applying its Pauli recovery."""
    frame(qc, level, inverse=True)
    for syndrome, target in EXPLICIT_LOCATION.items():
        if target is None:
            continue
        for a, value in zip((3, 4), syndrome):
            if value == 0:
                qc.x(a)
        qc.ccx(3, 4, target)
        for a, value in zip((3, 4), syndrome):
            if value == 0:
                qc.x(a)
    frame(qc, level)


@dataclass
class Experiment:
    circuit: QuantumCircuit
    level: int
    error: str
    mode: str
    correction: bool
    state: str


def core(level, error="I", mode="compact", correction=True):
    """No preparation or measurement. Output q0 is decoded for levels 1–3.

    L4 leaves encoded data untouched after extracting the two check bits.
    Barriers keep deliberately injected faults from canceling at compilation.
    """
    if error not in errors(level):
        raise ValueError(f"invalid error {error} for level {level}")
    if mode not in ("compact", "explicit"):
        raise ValueError("mode must be compact or explicit")
    n = 6 if level == 4 else (3 if mode == "compact" else 5)
    qc = QuantumCircuit(n, name=f"L{level}_{error}_{mode}_{'correct' if correction else 'control'}")
    enc = encoder(level)
    qc.compose(enc, range(enc.num_qubits), inplace=True)
    qc.barrier(label="encoded")
    if error != "I":
        getattr(qc, error[0].lower())(int(error[1:]))
    qc.barrier(label="hidden_fault")
    if level == 4:
        extract(qc, level)
    elif mode == "compact":
        frame(qc, level, inverse=True)
        qc.cx(0, 1)
        qc.cx(0, 2)
        qc.barrier(label="syndrome")
        if correction:
            qc.ccx(1, 2, 0)
    else:
        extract(qc, level)
        qc.barrier(label="syndrome")
        if correction:
            recover(qc, level)
        qc.compose(enc.inverse(), range(3), inplace=True)
    return qc


def experiment(level, error="I", state="plus_i", mode="compact", correction=True):
    if state not in STATES:
        raise ValueError(f"unknown state {state}")
    body = core(level, error, mode, correction)
    qc = QuantumCircuit(body.num_qubits, 2 if level == 4 else 3, name=body.name + "_" + state)
    theta, phi = STATES[state]
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    qc.compose(body, inplace=True)
    qc.barrier(label="verification")
    if level == 4:
        qc.measure(4, 0)
        qc.measure(5, 1)
    else:
        # Inverse preparation measures fidelity with the intended pure input.
        qc.rz(-phi, 0)
        qc.ry(-theta, 0)
        qc.measure(0, 0)
        a, b = (1, 2) if mode == "compact" else (3, 4)
        qc.measure(a, 1)
        qc.measure(b, 2)
    qc.metadata = {"level": level, "error": error, "state": state,
                   "mode": mode, "correction": correction,
                   "expected_syndrome": list(expected_syndrome(level, error, mode))}
    return Experiment(qc, level, error, mode, correction, state)
