"""Exercise actual IQM native compilation locally; remote submission is mocked."""
import json
import numpy as np
import pytest
from qiskit import qpy, transpile
from qiskit_aer import AerSimulator
from quantum_minesweeper.codes import experiment
from quantum_minesweeper.iqm_runner import prepare, submit, collect, backend_for
from quantum_minesweeper.analysis import analyze


def test_iqm_native_compilation_roundtrip_and_logical_semantics(tmp_path):
    experiments = [experiment(1, "X0", "plus_i"), experiment(3, "Y2", "minus_i")]
    backend, compiled, manifest = prepare(experiments, "fake-adonis", tmp_path, shots=64)
    assert manifest["kind"] == "iqm-local-fake-noise"
    assert manifest["total_shots"] == 128
    assert json.loads((tmp_path / "backend_snapshot.json").read_text())["num_qubits"] == 5
    with (tmp_path / "compiled.qpy").open("rb") as f:
        reloaded = qpy.load(f)
    # Ideal evaluation of native compiled circuits verifies layouts/measurement maps
    # and that injected faults were not optimized away, independently of noisy results.
    aer = AerSimulator()
    native = transpile(reloaded, aer, optimization_level=0)
    result = aer.run(native, shots=64, seed_simulator=42).result()
    for i, e in enumerate(experiments):
        metrics = analyze(e, result.get_counts(i))
        assert metrics["logical_fidelity_estimate"] == 1
        assert metrics["syndrome_accuracy"] == 1
    noisy = backend.run(compiled, shots=64)
    saved = collect(noisy, experiments, manifest, tmp_path)
    assert saved["kind"] == "iqm-local-fake-noise"
    assert len(saved["records"]) == 2
    assert all(r["metrics"]["shots"] == 64 for r in saved["records"])
    with pytest.raises(ValueError, match="fresh output"):
        prepare(experiments, "fake-adonis", tmp_path, shots=64)


def test_native_level4_preserves_type_syndrome(tmp_path):
    experiments = [experiment(4, error) for error in ("I", "X0", "Y2", "Z3")]
    _, compiled, _ = prepare(experiments, "fake-garnet", tmp_path, shots=16)
    aer = AerSimulator(max_parallel_threads=1)
    compiled = transpile(compiled, aer, optimization_level=0)
    result = aer.run(compiled, shots=16, seed_simulator=42).result()
    assert all(analyze(e, result.get_counts(i))["syndrome_accuracy"] == 1 for i, e in enumerate(experiments))


def test_shot_cap_is_checked_before_connecting(tmp_path):
    with pytest.raises(ValueError, match="Shot limit"):
        prepare([experiment(1)], "remote-never-contact", tmp_path, shots=100, max_total_shots=99)


def test_placeholder_is_rejected_before_connecting(monkeypatch):
    monkeypatch.setenv("IQM_TOKEN", "REPLACE_WITH_YOUR_TOKEN")
    with pytest.raises(ValueError, match="Set IQM_TOKEN"):
        backend_for("remote-never-contact")


def test_submission_is_persisted_and_not_accidentally_repeated(tmp_path):
    class Job:
        def job_id(self):
            return "unit-test-job-not-a-real-job"
    class Backend:
        calls = 0
        def run(self, circuits, shots):
            self.calls += 1
            return Job()
    backend = Backend()
    manifest = {"shots_per_circuit": 16, "kind": "unit-test"}
    submit(backend, [], [], manifest, tmp_path)
    assert json.loads((tmp_path / "job.json").read_text())["job_id"] == "unit-test-job-not-a-real-job"
    with pytest.raises(ValueError, match="already attempted"):
        submit(backend, [], [], manifest, tmp_path)
    assert backend.calls == 1
