"""Experiment suites and reproducible artifact persistence."""
import json
from pathlib import Path
from importlib.metadata import version
from qiskit import qasm3
from .codes import experiment, errors, STATES
from .analysis import analyze


def suite(levels=(1, 2, 3, 4), states=None, mode="compact", controls=False):
    states = list(STATES) if states is None else states
    return [experiment(level, error, state, mode, correction)
            for level in levels for state in states for error in errors(level)
            for correction in ([True, False] if controls and level != 4 else [True])]


def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n")


def versions():
    return {p: version(p) for p in ("qiskit", "qiskit-aer", "iqm-client", "numpy")}


def save_circuits(directory, experiments):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    for i, exp in enumerate(experiments):
        prefix = directory / f"{i:03d}_{exp.circuit.name}"
        prefix.with_suffix(".qasm").write_text(qasm3.dumps(exp.circuit))
        prefix.with_suffix(".txt").write_text(str(exp.circuit.draw(output="text", fold=120)) + "\n")


def result_records(experiments, counts):
    return [{**exp.circuit.metadata, "counts": dict(c), "metrics": analyze(exp, c)}
            for exp, c in zip(experiments, counts)]
