"""Challenge correctness rather than snapshots of gate implementation."""
import numpy as np
import pytest
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
from quantum_minesweeper.codes import core, encoder, errors, expected_syndrome, experiment, AXIS
from quantum_minesweeper.verification import check_case, inputs
from quantum_minesweeper.field_theory import analyze_theory
from quantum_minesweeper.analysis import analyze


@pytest.mark.parametrize("level,mode", [(1, "compact"), (1, "explicit"), (2, "compact"),
                                        (2, "explicit"), (3, "compact"), (3, "explicit"), (4, "explicit")])
def test_every_error_and_quantum_input(level, mode):
    for error in errors(level):
        for vector in inputs(random_states=4).values():
            fidelity, syndrome = check_case(level, error, mode, vector)
            assert fidelity == pytest.approx(1, abs=1e-10), (level, error, mode)
            assert syndrome == pytest.approx(1, abs=1e-10)


@pytest.mark.parametrize("level", [1, 2, 3])
@pytest.mark.parametrize("mode", ["compact", "explicit"])
def test_coherent_error_not_just_pauli_injection(level, mode):
    # An arbitrary coherent rotation is a superposition of I and the permitted Pauli.
    # Rotate the encoded Bell pair, then use the SAME recovery regardless of location.
    for location in range(3):
        c = core(level, "I", mode)
        n = c.num_qubits
        qc = QuantumCircuit(n + 1)
        qc.h(0)
        qc.cx(0, n)
        for instruction in c.data:
            qc.append(instruction.operation, [c.find_bit(q).index for q in instruction.qubits])
            if instruction.operation.name == "barrier" and instruction.operation.label == "encoded":
                getattr(qc, "r" + AXIS[level].lower())(0.731, location)
        final = Statevector.from_instruction(qc)
        rho = partial_trace(final, [q for q in range(n) if q != 0])
        bell = Statevector([1 / np.sqrt(2), 0, 0, 1 / np.sqrt(2)])
        assert state_fidelity(rho, bell) == pytest.approx(1, abs=1e-10)


def test_knill_laflamme_and_lattice_constraints():
    theory = analyze_theory()
    for level in ("1", "2", "3", "4"):
        assert theory[level]["commutator_norm"] < 1e-12
        assert theory[level]["encoded_energy_norm"] < 1e-12
    for level in ("1", "2", "3"):
        assert theory[level]["full_correction_possible_for_error_set"]
        assert theory[level]["ground_space_dimension"] == 2
    assert theory["4"]["ground_space_dimension"] == 4
    assert not theory["4"]["full_correction_possible_for_error_set"]


def test_count_bit_order_and_no_postselection():
    e = experiment(1, "X0", "plus_i")  # compact: (1,1)
    r = analyze(e, {"110": 90, "111": 5, "000": 5})
    assert r["syndrome_accuracy"] == .95
    assert r["logical_fidelity_estimate"] == .95
    assert r["joint_success"] == .9
    assert r["decoded_syndrome_counts"]["0"] == 95
    e = experiment(4, "Z3")  # (0,1), printed '10'
    assert analyze(e, {"10": 100})["decoded_syndrome_counts"] == {"Z": 100}


def test_uncorrected_control_reveals_phase_information_loss():
    theta, phi = np.pi / 2, np.pi / 2
    c = core(1, "X0", correction=False)
    qc = QuantumCircuit(c.num_qubits)
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    qc.compose(c, inplace=True)
    rho = partial_trace(Statevector.from_instruction(qc), [1, 2])
    target = Statevector([1 / np.sqrt(2), 1j / np.sqrt(2)])
    assert state_fidelity(rho, target) < 1e-10


def test_outside_error_model_fails_as_expected():
    # Two bit flips are outside L1's promise: decoder applies a logical X.
    c = core(1, "I")
    qc = QuantumCircuit(3)
    for instruction in c.data:
        qc.append(instruction.operation, [c.find_bit(q).index for q in instruction.qubits])
        if instruction.operation.name == "barrier" and instruction.operation.label == "encoded":
            qc.x(0)
            qc.x(1)
    rho = partial_trace(Statevector.from_instruction(qc), [1, 2])
    assert state_fidelity(rho, Statevector([1, 0])) < 1e-10


def test_reject_invalid_error_configuration():
    with pytest.raises(ValueError):
        core(3, "X0")
