"""An offline demonstration of circuits, promised errors, limits, and saved QPU evidence.

Run from the repository: python scripts/live_demo.py --verify
This script never connects to IQM or submits a hardware job.
"""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
from quantum_minesweeper.codes import core, errors, expected_syndrome, STATES
from quantum_minesweeper.verification import check_case, verify_all


def outside_model(faults, state):
    """Insert faults at the same encoded-stage boundary used by the test harness."""
    body = core(1, "I")
    qc = QuantumCircuit(3)
    theta, phi = STATES[state]
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    for instruction in body.data:
        qc.append(instruction.operation, [body.find_bit(q).index for q in instruction.qubits])
        if instruction.operation.name == "barrier" and instruction.operation.label == "encoded":
            for axis, location in faults:
                getattr(qc, axis)(location)
    rho = partial_trace(Statevector.from_instruction(qc), [1, 2])
    target = Statevector([np.cos(theta / 2), np.exp(1j * phi) * np.sin(theta / 2)])
    return float(state_fidelity(rho, target))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="also run all 703 exact-state cases")
    parser.add_argument("--pause", action="store_true", help="wait for Enter between demonstration steps")
    args = parser.parse_args()

    def section(title):
        if args.pause:
            input("\nPress Enter for the next step...")
        print("\n" + title + "\n" + "=" * len(title))

    section("1. The same recovery circuit handles every permitted fault")
    print(core(1, "X0").draw(output="text", fold=110))
    print("Encoding: CX(0,1), CX(0,2). Fault: X0. Decode: CX(0,1), CX(0,2).")
    print("Recovery: CCX(1,2,0). The fault label does not choose the recovery gate.")

    section("2. Every permitted fault preserves a phase-sensitive input")
    vector = np.array([1, 1j]) / np.sqrt(2)
    for level in (1, 2, 3):
        for error in errors(level):
            fidelity, probability = check_case(level, error, "compact", vector)
            print(f"Level {level}, {error:2s}: syndrome={expected_syndrome(level,error)}, "
                  f"logical fidelity={fidelity:.12f}, syndrome probability={probability:.12f}")
    print("L2 uses H to transform Z into X. L3 uses S to transform Y into X.")

    section("3. Level 4 classifies type and preserves the error-shifted data")
    for error in errors(4):
        fidelity, probability = check_case(4, error, "explicit", vector)
        print(f"{error:2s}: (ZZZZ,XXXX) defects={expected_syndrome(4,error)}, "
              f"data-preservation fidelity={fidelity:.12f}")
    print("Locations with the same Pauli type have the same two-bit syndrome. No full recovery is claimed.")

    section("4. The limits are testable")
    phase = outside_model([("z", 0)], "plus")
    double = outside_model([("x", 0), ("x", 1)], "zero")
    print(f"L1, unprotected Z0 on |+>: recovered-input fidelity={phase:.12f} (expected failure)")
    print(f"L1, two bit flips on |0>: recovered-input fidelity={double:.12f} (expected failure)")

    section("5. Previously collected real IQM Garnet measurements")
    evidence = json.loads((ROOT / "results/iqm-pilot/results.json").read_text())
    print("Execution kind:", evidence["kind"], "Job:", evidence["job_id"])
    for r in evidence["records"]:
        if r["state"] == "plus_i" and r["error"] == "X0":
            m = r["metrics"]
            print(f"Recovery={r['correction']}: {m['logical_fidelity_estimate']:.2%} survival, "
                  f"95% interval {m['logical_ci95'][0]:.2%} to {m['logical_ci95'][1]:.2%}")
            print("Raw counts:", r["counts"])
    print("These are SAVED hardware results. This demonstration submits no new paid job.")
    print("Corrected/control physical layouts differ. Preparation and readout contribute to survival.")

    if args.verify:
        section("6. Full ideal verification, including entangled references")
        result = verify_all()
        print(json.dumps({k: v for k, v in result.items() if k != "records"}, indent=2))
        if not result["passed"]:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
