"""OPTIONAL real-hardware comparison on an existing Qiskit/IQM backend.

Never submits a job unless ``execute=True``.  No secrets are stored in code.
The optimizer's exact unitary equivalence is established locally; hardware
measurement histograms are an additional *noisy* empirical comparison only.

Notebook usage when your hackathon environment supplies ``backend``:
    from iqm_emerald_demo import compare_on_backend
    compare_on_backend(my_circuit, backend, execute=False)  # free dry-run
    compare_on_backend(my_circuit, backend, execute=True)   # spends shots

Direct IQM connection, ONLY if organizers give direct IQM Resonance access:
    backend = connect_iqm_from_environment()

Install optional dependencies: pip install 'qiskit[visualization]' 'iqm-client[qiskit]'
"""

import json
import os
from pathlib import Path
from datetime import datetime, timezone
import numpy as np

from submission import metrics, optimize, _unitary, _op, _equal_unitaries


DEFAULT_WEIGHTS = {"w1": 1.0, "w2": 6.0, "wd": 0.2}


def to_qiskit(circuit, measure=True, probe_qubit=None):
    from qiskit import QuantumCircuit

    n = circuit["n_qubits"]
    qc = QuantumCircuit(n)
    if probe_qubit is not None:
        if not 0 <= probe_qubit < n:
            raise ValueError("Probe qubit outside circuit range")
        qc.h(n - 1 - probe_qubit)
    # Crucial endian conversion: challenge q0 is MSB, Qiskit q0 is LSB.
    for item in circuit["gates"]:
        name = item["gate"]
        qubits = [n - 1 - q for q in item["qubits"]]
        if name == "CX":
            qc.cx(*qubits)
        elif name == "SDG":
            qc.sdg(qubits[0])
        elif name == "TDG":
            qc.tdg(qubits[0])
        else:
            getattr(qc, name.lower())(qubits[0])
    if probe_qubit is not None:
        qc.h(n - 1 - probe_qubit)
    if measure:
        qc.measure_all()
    return qc


def ideal_probabilities(circuit, probe_qubit=None):
    """Full statevector measurement probabilities after optional H...H probe."""
    n = circuit["n_qubits"]
    gates = list(circuit["gates"])
    if probe_qubit is not None:
        gates = [_op("H", probe_qubit)] + gates + [_op("H", probe_qubit)]
    psi = _unitary(gates, n)[:, 0]
    probabilities = np.abs(psi) ** 2
    return {format(i, f"0{n}b"): float(p) for i, p in enumerate(probabilities) if p > 1e-10}


def total_variation(counts, ideal, shots):
    """Measurement-distribution distance, NOT full gate or process fidelity."""
    bitstrings = set(counts) | set(ideal)
    return 0.5 * sum(abs(counts.get(s, 0) / shots - ideal.get(s, 0)) for s in bitstrings)


def connect_iqm_from_environment():
    """Direct IQM route, not required when notebook already has `backend`."""
    from iqm.qiskit_iqm import IQMProvider

    server = os.environ.get("IQM_SERVER_URL")
    computer = os.environ.get("IQM_QUANTUM_COMPUTER", "emerald")
    token = os.environ.get("IQM_TOKEN")
    if not server or not token:
        raise RuntimeError("Set IQM_SERVER_URL and IQM_TOKEN, or reuse the hackathon's provided backend")
    return IQMProvider(server, quantum_computer=computer, token=token).get_backend()


def compare_on_backend(circuit, backend, config=None, *, shots=1024,
                       optimization_level=0, execute=False, use_timeslot=None,
                       probe_qubit=None, save_results=True):
    """Compile both circuits on one hardware target; optionally execute both.

    `use_timeslot` is ONLY passed if provided explicitly; it's non-standard.
    Qiskit compiler optimization can erase differences between input/PRISM,
    so distinguish abstract improvements from transpiled-native metrics.
    """
    from qiskit import transpile

    cfg = config if config is not None else DEFAULT_WEIGHTS
    optimized = optimize(circuit, cfg)
    if not _equal_unitaries(_unitary(circuit["gates"], circuit["n_qubits"]),
                            _unitary(optimized["gates"], circuit["n_qubits"])):
        raise RuntimeError("Refusing to submit: numerical unitary check failed")
    ideal = ideal_probabilities(circuit, probe_qubit)
    compiled = []
    for label, source in (("original", circuit), ("prism", optimized)):
        logical = to_qiskit(source, probe_qubit=probe_qubit)
        physical = transpile(logical, backend=backend, optimization_level=optimization_level)
        compiled.append((label, physical))
        one, two, depth = metrics(source["gates"], source["n_qubits"])
        print(f"{label}: abstract 1q={one}, CX={two}, depth={depth}")
        print(f"{label}: native ops={dict(physical.count_ops())}, native depth={physical.depth()}")

    if not execute:
        print("DRY RUN: no hardware jobs or tokens spent. Set execute=True to submit.")
        print(f"Ideal measurement probabilities: {ideal}")
        return {"optimized": optimized, "compiled": compiled, "counts": None,
                "ideal": ideal}

    results = {}
    job_ids = {}
    tvd = {}
    for label, physical in compiled:
        kwargs = {"shots": shots}
        if use_timeslot is not None:
            kwargs["use_timeslot"] = use_timeslot
        job = backend.run(physical, **kwargs)
        try:
            job_ids[label] = str(job.job_id())
        except (AttributeError, TypeError):
            job_ids[label] = "not_exposed"
        results[label] = job.result().get_counts()
        print(f"{label} counts: {results[label]}")
        observed_shots = sum(results[label].values())
        tvd[label] = total_variation(results[label], ideal, observed_shots)
        print(f"{label} TVD from ideal: {tvd[label]:.4f} (not process fidelity)")

    try:
        from qiskit.visualization import plot_histogram
        fig = plot_histogram([results["original"], results["prism"]],
                             legend=["Original", "PRISM"])
        fig.savefig("iqm_comparison.png", dpi=180, bbox_inches="tight")
        print("Saved iqm_comparison.png")
    except ImportError:
        print("Install matplotlib to save the optional histogram.")

    outcome = {"original": circuit, "optimized": optimized, "counts": results, "ideal": ideal,
               "tvd": tvd, "shots": shots, "probe_qubit": probe_qubit,
               "job_ids": job_ids, "config": cfg,
               "optimization_level": optimization_level,
               "timestamp_utc": datetime.now(timezone.utc).isoformat(),
               "backend_name": str(getattr(backend, "name", "unnamed_backend")),
               "native_operations": {label: dict(qc.count_ops()) for label, qc in compiled},
               "native_depth": {label: qc.depth() for label, qc in compiled}}
    if save_results:
        filename = Path("iqm_hardware_results.json")
        filename.write_text(json.dumps(outcome, indent=2), encoding="utf-8")
        print(f"Saved {filename} (no token or credentials included)")
    return {**outcome, "compiled": compiled}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PRISM IQM dry-run or opt-in hardware test")
    parser.add_argument("--case", default="L2-hidden-CX-Z-CX")
    parser.add_argument("--execute", action="store_true", help="Actually spend hardware shots")
    parser.add_argument("--shots", type=int, default=1024)
    args = parser.parse_args()
    filepath = Path(__file__).resolve().parent / "experiments" / "circuits.json"
    cases = json.loads(filepath.read_text(encoding="utf-8"))
    example = next((item["circuit"] for item in cases if item["name"] == args.case), None)
    if example is None:
        raise SystemExit(f"Unknown case {args.case}; see experiments/circuits.json")
    backend = connect_iqm_from_environment()
    compare_on_backend(example, backend, execute=args.execute, shots=args.shots)

