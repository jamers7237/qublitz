"""Optional independent cross-check of the game's circuit with Qiskit (NOT needed to play).

    python scripts/qiskit_reference.py   # writes experiments/qiskit-reference.json

Qiskit's little-endian convention matches the game's: qubit q is bit (i >> q) & 1,
so Qiskit's bitstring keys equal the displayed strings CAT I1 I0 P2 P1 P0 T1 T0
(qubit 7 = CAT ... qubit 0 = T0).
"""
import json, math, os
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

CAT, I1, I0, P2, P1, P0, T1, T0 = 7, 6, 5, 4, 3, 2, 1, 0
A, B, C, D = I1, I0, P2, P1
ODDS = [2, 3, 5, 7]
PARITY = [(A, P0), (C, P0), (B, T1), (D, T1), (A, T0), (D, T0)]


def prep(phase: int) -> QuantumCircuit:
    qc = QuantumCircuit(8)
    qc.x(CAT)
    for q, r in zip([A, B, C, D], ODDS):
        qc.ry(2 * math.atan(math.sqrt(r)), q)
    qc.cz(A, B)
    if phase:
        qc.z(A)
    for c, t in PARITY:
        qc.cx(c, t)
    return qc


def echo(phase: int) -> QuantumCircuit:
    qc = prep(phase)
    for c, t in reversed(PARITY):
        qc.cx(c, t)
    qc.h(A)
    return qc


out = {"qiskit_version": __import__("qiskit").__version__}
for phase in (0, 1):
    probs = Statevector(prep(phase)).probabilities_dict()
    support = sorted(((str(k), float(v)) for k, v in probs.items() if v > 1e-12), key=lambda kv: kv[1])
    out[f"z_phase{phase}"] = dict(support)
    out[f"order_phase{phase}"] = [k for k, _ in support]  # explicit (JS reorders integer-like keys)
    p_a = Statevector(echo(phase)).probabilities([A])
    out[f"echo_p0_phase{phase}"] = float(p_a[0])

os.makedirs("experiments", exist_ok=True)
with open("experiments/qiskit-reference.json", "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps({k: (v if not isinstance(v, dict) else f"{len(v)} supported labels") for k, v in out.items()}, indent=2))
print("ascending order:", out["order_phase0"])
