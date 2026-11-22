"""PRISM comprehensive, reproducible Qublitz study.

Run: python full_study.py

Writes full_study/{cases.jsonl, runs.csv, circuits.jsonl, ablations.csv,
summary.json, failure_cases.json, study_manifest.json, EXPERIMENT_LOG.md}.
Every trial has a stable ID, a deterministic seed and the *full* circuit.
No external hardware access or private Qublitz test cases are used.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import platform
import random
import statistics
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from run_experiments import cases as original_cases
from run_ablations import adjacent_only
from submission import (
    ONE, _affine_pass, _equal_unitaries, _local_pass, _op,
    _unitary, cost, metrics, optimize,
)


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "full_study"
MASTER_SEED = 20261122
WEIGHTS = {
    "balanced": {"w1": 1.0, "w2": 6.0, "wd": 0.2},
    "CX_heavy": {"w1": 0.2, "w2": 10.0, "wd": 0.1},
    "single_heavy": {"w1": 10.0, "w2": 1.0, "wd": 0.2},
    "depth_heavy": {"w1": 0.1, "w2": 0.1, "wd": 10.0},
    "equal": {"w1": 1.0, "w2": 1.0, "wd": 1.0},
    "CX_only": {"w1": 0.0, "w2": 1.0, "wd": 0.0},
    "depth_only": {"w1": 0.0, "w2": 0.0, "wd": 1.0},
}
INVERSES = {"H": "H", "X": "X", "Z": "Z", "S": "SDG", "SDG": "S",
            "T": "TDG", "TDG": "T", "CX": "CX"}
FAMILIES = {
    "curated": "Publicly documented reference cases, plus the 49-to-1 construction",
    "cancellation": "Injected, mathematically guaranteed inverse pairs and phase sums",
    "hidden": "CNOT commutation, target-phase conjugation, and disjoint-wire interleavings",
    "parity": "Four-qubit parity-preserving CNOT networks with multiple phase placements",
    "affine": "Pure X/CX circuits implementing affine GF(2) transformations",
    "mixed": "Random mixed Clifford+T circuits, no deliberately inserted identities",
    "Hadamard_heavy": "Mixed circuits containing many H barriers",
    "long_random": "Longer random circuits with varying gate composition",
}


def stable_seed(family, index):
    h = hashlib.sha256(f"{MASTER_SEED}:{family}:{index}".encode()).hexdigest()
    return int(h[:12], 16)


def draw_gate(rng, n, mix="mixed"):
    p = rng.random()
    if n > 1 and p < (0.68 if mix == "affine" else 0.30 if mix == "Hadamard_heavy" else 0.40):
        return _op("CX", *rng.sample(range(n), 2))
    if mix == "affine":
        return _op("X", rng.randrange(n))
    if mix == "Hadamard_heavy":
        name = rng.choices(["H", "T", "TDG", "S", "X", "Z"], weights=[8, 2, 2, 1, 1, 1])[0]
    elif mix == "phase":
        name = rng.choice(["T", "TDG", "S", "SDG", "Z", "X"])
    else:
        name = rng.choice(ONE)
    return _op(name, rng.randrange(n))


def ensure_valid_instance(n, gates):
    assert 1 <= n <= 6
    return {"n_qubits": n, "gates": gates}


def generated_case(family, i, seed):
    rng = random.Random(seed)
    n = 1 + (i % 6)
    if family == "cancellation":
        gates = []
        for _ in range(5 + i % 9):
            g = draw_gate(rng, n)
            gates.extend((g, _op(INVERSES[g["gate"]], *g["qubits"])))
            if rng.random() < 0.35:
                gates.extend((_op("T", rng.randrange(n)), _op("TDG", rng.randrange(n))))
    elif family == "hidden":
        n = max(n, 2)
        c, t = rng.sample(range(n), 2)
        kind = i % 4
        center = _op("Z", c) if kind == 0 else _op("X", t) if kind == 1 else _op("Z", t)
        gates = [_op("CX", c, t), center, _op("CX", c, t)]
        # Disjoint spectator operations are inserted to obscure adjacency.
        spectators = [q for q in range(n) if q not in (c, t)]
        if spectators:
            gates.insert(1, _op("H", spectators[0]))
            gates.insert(-1, _op("T", spectators[0]))
        if kind == 3:
            gates = gates + [_op("H", c), _op("H", c)]
    elif family == "parity":
        n = 4 + i % 3
        # A fixed, nontrivial CNOT network with W^4=I and conserved q1.
        seed_ops = [(3, 2), (3, 1), (2, 3), (3, 1), (2, 1), (0, 2),
                    (2, 0), (0, 2), (1, 0), (1, 3), (2, 0)]
        selected = rng.sample(range(n), 4)
        network = [_op("CX", selected[c], selected[t]) for c, t in seed_ops]
        q = selected[1]
        rounds = 1 + (i % 5)
        gates = []
        for k in range(rounds):
            gates.append(_op("T" if k % 2 == 0 else "TDG", q))
            gates.extend(network)
        gates.append(_op("TDG" if rounds % 2 else "T", q))
        # Isolated H operations on additional wires demonstrate independence.
        if n > 4 and i % 3 == 0:
            extra = next(x for x in range(n) if x not in selected)
            gates.insert(3, _op("H", extra))
            gates.insert(-2, _op("H", extra))
    elif family == "affine":
        length = [12, 25, 45, 70, 100, 140][i % 6]
        gates = [draw_gate(rng, n, "affine") for _ in range(length)]
        # Some trials contain reversibly embedded identities; others do not.
        if i % 3 == 0:
            segment = [draw_gate(rng, n, "affine") for _ in range(8)]
            pos = len(gates) // 2
            gates[pos:pos] = segment + list(reversed(segment))
    elif family == "mixed":
        length = [15, 30, 50, 80, 120, 160][i % 6]
        gates = [draw_gate(rng, n) for _ in range(length)]
    elif family == "Hadamard_heavy":
        length = [16, 32, 55, 80, 120, 150][i % 6]
        gates = [draw_gate(rng, n, "Hadamard_heavy") for _ in range(length)]
    elif family == "long_random":
        length = [45, 65, 90, 115, 160, 210][i % 6]
        gates = [draw_gate(rng, n, "phase" if i % 2 == 0 else "mixed")
                 for _ in range(length)]
    else:
        raise ValueError(f"Unknown family {family}")
    return ensure_valid_instance(n, gates)


def cases():
    out = []
    for i, ex in enumerate(original_cases()):
        out.append({"case_id": f"curated-{i:03d}", "family": "curated",
                    "label": ex["name"], "hypothesis": ex["why"],
                    "seed": None, "circuit": ex["circuit"]})
    counts = {"cancellation": 36, "hidden": 42, "parity": 48, "affine": 48,
              "mixed": 72, "Hadamard_heavy": 48, "long_random": 48}
    for family, ncases in counts.items():
        for i in range(ncases):
            seed = stable_seed(family, i)
            out.append({"case_id": f"{family}-{i:03d}", "family": family,
                        "label": f"{family} #{i}", "hypothesis": FAMILIES[family],
                        "seed": seed, "circuit": generated_case(family, i, seed)})
    return out


def distribution_stats(values):
    if not values:
        return {}
    values = sorted(values)
    return {"count": len(values), "mean": round(statistics.mean(values), 4),
            "median": round(statistics.median(values), 4),
            "p10": round(float(np.percentile(values, 10)), 4),
            "p90": round(float(np.percentile(values, 90)), 4),
            "p95": round(float(np.percentile(values, 95)), 4),
            "min": round(values[0], 4), "max": round(values[-1], 4)}


def _atomic_print(msg):
    print(msg, flush=True)


def run():
    OUT.mkdir(exist_ok=True)
    all_cases = cases()
    with (OUT / "cases.jsonl").open("w", encoding="utf-8") as f:
        for case in all_cases:
            f.write(json.dumps(case, separators=(",", ":")) + "\n")

    run_columns = ["run_id", "case_id", "family", "config", "n_qubits",
                   "input_length", "output_length", "in_1q", "out_1q", "in_CX", "out_CX",
                   "in_depth", "out_depth", "before_cost", "after_cost", "reduction_pct",
                   "improved", "equivalent", "input_unchanged", "runtime_ms"]
    ablation_columns = ["case_id", "family", "input_cost", "adjacent_cost",
                        "local_affine_cost", "full_cost", "phase_incremental_gain"]
    runs = []
    ablations = []
    start_all = time.perf_counter()
    with (OUT / "runs.csv").open("w", newline="", encoding="utf-8") as rfile, \
         (OUT / "circuits.jsonl").open("w", encoding="utf-8") as cfile, \
         (OUT / "ablations.csv").open("w", newline="", encoding="utf-8") as afile:
        rwriter = csv.DictWriter(rfile, fieldnames=run_columns)
        awriter = csv.DictWriter(afile, fieldnames=ablation_columns)
        rwriter.writeheader()
        awriter.writeheader()
        for i, case in enumerate(all_cases):
            c = case["circuit"]
            n, original = c["n_qubits"], c["gates"]
            original_snapshot = json.dumps(c, sort_keys=True)
            input_matrix = _unitary(original, n)
            for cfg_name, cfg in WEIGHTS.items():
                before = cost(original, n, cfg)
                tic = time.perf_counter()
                optimized = optimize(c, cfg)
                milliseconds = 1000 * (time.perf_counter() - tic)
                out = optimized["gates"]
                equivalent = _equal_unitaries(input_matrix, _unitary(out, n))
                immutable = json.dumps(c, sort_keys=True) == original_snapshot
                after = cost(out, n, cfg)
                if not equivalent or not immutable or after > before + 1e-8:
                    raise AssertionError(f"INVALID RUN: {case['case_id']}/{cfg_name}")
                ai, bi, di = metrics(original, n)
                ao, bo, do = metrics(out, n)
                row = {"run_id": f"{case['case_id']}:{cfg_name}",
                       "case_id": case["case_id"], "family": case["family"],
                       "config": cfg_name, "n_qubits": n, "input_length": len(original),
                       "output_length": len(out), "in_1q": ai, "out_1q": ao,
                       "in_CX": bi, "out_CX": bo, "in_depth": di, "out_depth": do,
                       "before_cost": round(before, 8), "after_cost": round(after, 8),
                       "reduction_pct": round(100 * (before - after) / before, 6) if before else 0.,
                       "improved": after < before - 1e-10, "equivalent": equivalent,
                       "input_unchanged": immutable, "runtime_ms": round(milliseconds, 4)}
                runs.append(row)
                rwriter.writerow(row)
                cfile.write(json.dumps({"run_id": row["run_id"],
                                        "original": c, "optimized": optimized},
                                       separators=(",", ":")) + "\n")

            balanced = WEIGHTS["balanced"]
            adjacent = adjacent_only(original)
            local = _affine_pass(_local_pass(original, n, balanced), n, balanced)
            full_cost = next(x["after_cost"] for x in runs[-len(WEIGHTS):]
                             if x["config"] == "balanced")
            # All ablated results are equivalence-checked too.
            for candidate in (adjacent, local):
                if not _equal_unitaries(input_matrix, _unitary(candidate, n)):
                    raise AssertionError(f"INVALID ABLATION: {case['case_id']}")
            row = {"case_id": case["case_id"], "family": case["family"],
                   "input_cost": round(cost(original, n, balanced), 6),
                   "adjacent_cost": round(cost(adjacent, n, balanced), 6),
                   "local_affine_cost": round(cost(local, n, balanced), 6),
                   "full_cost": round(full_cost, 6),
                   "phase_incremental_gain": round(cost(local, n, balanced) - full_cost, 6)}
            ablations.append(row)
            awriter.writerow(row)
            if (i + 1) % 40 == 0 or (i + 1) == len(all_cases):
                _atomic_print(f"PRISM study: {i + 1}/{len(all_cases)} circuits, "
                              f"{len(runs)} equivalent runs")

    grouped = defaultdict(list)
    for row in runs:
        grouped[(row["family"], row["config"])].append(row)
    by_group = []
    for (family, configuration), group in sorted(grouped.items()):
        by_group.append({"family": family, "config": configuration,
                         "circuit_count": len(group),
                         "improved_fraction": round(sum(r["improved"] for r in group) / len(group), 4),
                         "reduction_pct": distribution_stats([r["reduction_pct"] for r in group]),
                         "runtime_ms": distribution_stats([r["runtime_ms"] for r in group])})
    balanced_runs = [r for r in runs if r["config"] == "balanced"]
    failures = sorted((r for r in balanced_runs if not r["improved"]),
                      key=lambda r: (-r["input_length"], r["case_id"]))[:12]
    case_by_id = {c["case_id"]: c for c in all_cases}
    failure_records = [{"trial": r, "example": case_by_id[r["case_id"]],
                        "interpretation": "No improvement under this cost. May be locally irreducible, H-separated, or beyond bounded search; cause requires inspection."}
                       for r in failures]
    with (OUT / "failure_cases.json").open("w", encoding="utf-8") as f:
        json.dump(failure_records, f, indent=2)

    summary = {"case_count": len(all_cases), "configuration_count": len(WEIGHTS),
               "run_count": len(runs), "equivalence_passed": sum(r["equivalent"] for r in runs),
               "nonregressive_runs": sum(r["after_cost"] <= r["before_cost"] + 1e-8 for r in runs),
               "balanced_improved": sum(r["improved"] for r in balanced_runs),
               "balanced_reduction_pct": distribution_stats([r["reduction_pct"] for r in balanced_runs]),
               "balanced_runtime_ms": distribution_stats([r["runtime_ms"] for r in balanced_runs]),
               "groups": by_group, "weight_profiles": WEIGHTS,
               "ablation_phase_positive_cases": sum(r["phase_incremental_gain"] > 1e-8 for r in ablations),
               "ablation_phase_total_gain": round(sum(max(0, r["phase_incremental_gain"]) for r in ablations), 4)}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    manifest = {"project": "PRISM / Qublitz 2026", "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "seed": MASTER_SEED, "python": sys.version.split()[0], "numpy": np.__version__,
                "platform": platform.platform(), "profiles": WEIGHTS,
                "total_elapsed_seconds": round(time.perf_counter() - start_all, 3),
                "test_provenance": "Team-generated, non-organizer-secret circuits",
                "checker": "Full 2^n-by-2^n numerical unitary equality up to global phase, 1e-8 tolerance"}
    (OUT / "study_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    lines = ["# PRISM full experimental log", "",
             "This is a record of the study executed at the timestamp in `study_manifest.json`.",
             "It does not claim to reconstruct earlier, undocumented development attempts.", "",
             "## Hypotheses (specified before evaluating this run)", "",
             "- H1: The optimizer cancels elementary identities without affecting unitaries.",
             "- H2: Hidden phase relationships benefit from parity tracking.",
             "- H3: Gains vary across input structures and weight profiles.",
             "- H4: Some H-heavy inputs expose limits of the global parity sweep.",
             "- H5: Runtime rises with circuit size; long circuits remain practical up to six qubits.",
             "- H6: Ablation identifies which gains are specific to PRISM's parity method.", "",
             "## Method", "",
             f"- Fixed master random seed: `{MASTER_SEED}`; each generated case also has a stored seed.",
             f"- {len(all_cases)} distinct input circuits, {len(WEIGHTS)} cost profiles, {len(runs)} individual runs.",
             "- Reconstructed the full unitary for each optimized output; rejected any non-equivalent or cost-regressive output.",
             "- Compared adjacent cancellation, exact local+affine synthesis, and full PRISM on identical input circuits.",
             "- Logged raw circuits, metrics, timings, weights, and all outputs in files beside this log.", "",
             "## Verified outcomes", "",
             f"- Full-unitary checks passed: {summary['equivalence_passed']}/{len(runs)}.",
             f"- No-cost-regression checks passed: {summary['nonregressive_runs']}/{len(runs)}.",
             f"- Balanced configuration improved {summary['balanced_improved']}/{len(all_cases)} circuits.",
             f"- Mean balanced-cost reduction: {summary['balanced_reduction_pct']['mean']:.2f}%.",
             f"- Median balanced-cost reduction: {summary['balanced_reduction_pct']['median']:.2f}%.",
             f"- Positive phase incremental contributions relative to local+affine baseline: {summary['ablation_phase_positive_cases']} cases.", "",
             "## Reproducibility and limits", "",
             "- This is a seeded synthetic study, **not** the organizers' private benchmark.",
             "- Timings are from one computer and are sensitive to load and Python configuration.",
             "- Dense H blocks can suppress our phase-polynomial pass; some circuits do not improve.",
             "- The original input is returned when our selected optimizations do not reduce weighted cost.",
             "- Formal symbolic equivalence and physical QPU fidelity are not inferred from this numerical test.",
             "- Check `failure_cases.json` for unchanged circuits and `ablations.csv` for component comparisons.", "",
             "## Raw artifacts", "",
             "1. `cases.jsonl` - every input, hypothesis, ID, seed, and family.",
             "2. `circuits.jsonl` - full input and output for **every** circuit/configuration pair.",
             "3. `runs.csv` - all resource metrics and verification outcomes.",
             "4. `ablations.csv` - per-circuit controlled comparisons.",
             "5. `summary.json` - statistical summaries by family and weight profile.",
             "6. `study_manifest.json` - environment, timestamp, seed, weights.",
             "7. `failure_cases.json` - zero-improvement samples for diagnosis.", ""]
    (OUT / "EXPERIMENT_LOG.md").write_text("\n".join(lines), encoding="utf-8")
    _atomic_print(f"Completed {len(runs)} verified runs in {manifest['total_elapsed_seconds']}s")


if __name__ == "__main__":
    run()

