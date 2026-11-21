"""Finite lattice stabilizer Hamiltonians and the Knill–Laflamme condition.

This is the finite spin/stabilizer bridge to lattice field theory, not a claim
that these few-qubit repetition codes are topological quantum field theories.
"""
import numpy as np
from qiskit.quantum_info import Pauli, Statevector
from qiskit import QuantumCircuit
from .codes import encoder, errors

STABILIZERS = {1: ("IZZ", "ZZI"), 2: ("IXX", "XXI"),
               3: ("IZZ", "ZZI"), 4: ("ZZZZ", "XXXX")}


def error_matrix(error, n):
    label = ["I"] * n
    if error != "I":
        label[n - 1 - int(error[1:])] = error[0]
    return Pauli("".join(label)).to_matrix()


def isometry(level):
    enc = encoder(level)
    columns = []
    for bit in (0, 1):
        qc = QuantumCircuit(enc.num_qubits)
        if bit:
            qc.x(0)
        qc.compose(enc, inplace=True)
        columns.append(Statevector.from_instruction(qc).data)
    return np.column_stack(columns)


def analyze_theory():
    result = {}
    for level, labels in STABILIZERS.items():
        n = 4 if level == 4 else 3
        eye = np.eye(2 ** n)
        checks = [Pauli(s).to_matrix() for s in labels]
        # A defect (check eigenvalue -1) costs one energy unit.
        hamiltonian = sum((eye - s) / 2 for s in checks)
        v = isometry(level)
        energy = float(np.linalg.norm(hamiltonian @ v))
        matrices = [error_matrix(e, n) for e in errors(level)]
        residual = 0.0
        for a in matrices:
            for b in matrices:
                compressed = v.conj().T @ a.conj().T @ b @ v
                scalar = np.trace(compressed) / 2
                residual = max(residual, float(np.linalg.norm(compressed - scalar * np.eye(2))))
        eigen = np.linalg.eigvalsh(hamiltonian)
        result[str(level)] = {
            "stabilizers_qiskit_order": labels,
            "commutator_norm": float(np.linalg.norm(checks[0] @ checks[1] - checks[1] @ checks[0])),
            "encoded_energy_norm": energy,
            "ground_space_dimension": int(np.count_nonzero(np.abs(eigen) < 1e-10)),
            "knill_laflamme_residual_for_all_permitted_errors": residual,
            "full_correction_possible_for_error_set": residual < 1e-10,
        }
    return result
