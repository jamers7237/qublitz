"""IQM compilation, local fake execution, and resumable real hardware jobs.

Preparing circuits and submitting jobs are separate CLI actions. No token values
are persisted. Backend mock environments are labeled and never called hardware.
"""
import os
from pathlib import Path
from datetime import datetime, timezone
from qiskit import transpile, qpy
from .experiments import save_json, versions, result_records, save_circuits


def backend_for(name, url=None):
    from iqm.qiskit_iqm import IQMProvider, IQMFakeAdonis
    from iqm.qiskit_iqm.fake_backends.fake_garnet import IQMFakeGarnet
    if name == "fake-adonis":
        return IQMFakeAdonis(), "iqm-local-fake-noise"
    if name == "fake-garnet":
        return IQMFakeGarnet(), "iqm-local-fake-noise"
    token = os.environ.get("IQM_TOKEN", "").strip()
    if not token or token in {"REPLACE_WITH_YOUR_TOKEN", "replace_locally_never_commit", "your_private_token"}:
        raise ValueError("Set IQM_TOKEN privately in the shell before connecting to Resonance.")
    backend = IQMProvider(url or os.environ.get("IQM_SERVER_URL", "https://resonance.iqm.tech"),
                          quantum_computer=name).get_backend()
    return backend, "iqm-remote-mock" if ":mock" in name else "iqm-hardware"


def compile_suite(backend, experiments, seeds=(1, 7, 19)):
    candidates = []
    for seed in seeds:
        compiled = transpile([e.circuit for e in experiments], backend,
                             optimization_level=1, seed_transpiler=seed)
        two_q = sum(sum(len(op.qubits) == 2 and op.operation.name != "barrier" for op in c.data)
                    for c in compiled)
        candidates.append((two_q, sum(c.depth() for c in compiled), seed, compiled))
    chosen = min(candidates, key=lambda x: x[:3])
    return chosen[3], {"seed": chosen[2], "two_qubit_gates_total": chosen[0],
                       "depth_total": chosen[1], "candidates": [list(c[:3]) for c in candidates]}


def prepare(experiments, backend_name, output, shots=256, max_total_shots=16384, url=None):
    if shots < 1 or len(experiments) * shots > max_total_shots:
        raise ValueError("Shot limit exceeded or invalid shots. Increase --max-total-shots deliberately.")
    output = Path(output)
    if (output / "manifest.json").exists():
        raise ValueError("Choose a fresh output directory; existing manifests are preserved.")
    backend, kind = backend_for(backend_name, url)
    compiled, compilation = compile_suite(backend, experiments)
    manifest = {"created_utc": datetime.now(timezone.utc).isoformat(), "kind": kind,
                "backend": backend_name, "server_url": url or os.environ.get("IQM_SERVER_URL", "https://resonance.iqm.tech"),
                "shots_per_circuit": shots, "total_shots": shots * len(experiments),
                "versions": versions(), "compilation": compilation,
                "experiments": [e.circuit.metadata for e in experiments],
                "circuits": [{"depth": c.depth(), "width": c.num_qubits,
                              "active_physical_qubits": sorted({c.find_bit(q).index for op in c.data
                                                               if op.operation.name not in ("barrier", "delay", "id")
                                                               for q in op.qubits}),
                              "operations": dict(c.count_ops()), "layout": str(c.layout)} for c in compiled],
                "pricing": "No dollar estimate: verify current pricing in Resonance before submission."}
    save_circuits(output / "logical_circuits", experiments)
    with (output / "compiled.qpy").open("wb") as f:
        qpy.dump(compiled, f)
    for i, c in enumerate(compiled):
        (output / f"compiled_{i:03d}.txt").write_text(str(c.draw(output="text", fold=140)) + "\n")
    # Public, non-secret topology evidence. IQM calibration/architecture IDs vary by SDK/backend.
    target = backend.target
    save_json(output / "backend_snapshot.json", {
        "name": backend.name, "num_qubits": backend.num_qubits,
        "operation_names": sorted(target.operation_names),
        "coupling_map": list(target.build_coupling_map().get_edges()) if target.build_coupling_map() else None,
        "calibration_set_id": str(getattr(backend, "_calibration_set_id", None)),
    })
    save_json(output / "manifest.json", manifest)
    return backend, compiled, manifest


def submit(backend, compiled, experiments, manifest, output):
    output = Path(output)
    # A saved submission blocks accidental repeat credit use. Retrieval is separate.
    if (output / "job.json").exists() or (output / "submission_started.json").exists():
        raise ValueError("Submission already attempted. Retrieve the saved job; do not submit again.")
    save_json(output / "submission_started.json", {"started_utc": datetime.now(timezone.utc).isoformat()})
    job = backend.run(compiled, shots=manifest["shots_per_circuit"])
    job_id = str(job.job_id())
    save_json(output / "job.json", {"job_id": job_id, "kind": manifest["kind"]})
    print(f"Saved job ID {job_id}. Retrieve later with: minesweeper iqm-fetch --output '{output}'", flush=True)
    return job_id


def collect(job, experiments, manifest, output):
    result = job.result()
    counts = [result.get_counts(i) for i in range(len(experiments))]
    report = {"kind": manifest["kind"], "backend": manifest["backend"],
              "job_id": str(job.job_id()), "versions": versions(),
              "records": result_records(experiments, counts)}
    save_json(Path(output) / "results.json", report)
    return report
