"""Controlled runtime scaling (separate from optimization-quality study).

Run after full_study.py: python study_scaling.py
"""

import csv
import json
import random
import statistics
import time
from pathlib import Path

from submission import _op, optimize, _equal_unitaries, _unitary, cost


OUT = Path(__file__).resolve().parent / "full_study"
WEIGHTS = {"w1": 1., "w2": 6., "wd": .2}


def run():
    OUT.mkdir(exist_ok=True)
    rows = []
    for n in range(1, 7):
        for length in (10, 25, 50, 100, 200, 400):
            for repeat in range(3):
                seed = 137000 + n * 10000 + length * 10 + repeat
                rng = random.Random(seed)
                operations = []
                for i in range(length):
                    if n > 1 and rng.random() < .42:
                        operations.append(_op("CX", *rng.sample(range(n), 2)))
                    else:
                        operations.append(_op(rng.choice(("H", "X", "Z", "S", "SDG", "T", "TDG")), rng.randrange(n)))
                circuit = {"n_qubits": n, "gates": operations}
                start = time.perf_counter()
                new = optimize(circuit, WEIGHTS)
                elapsed_ms = 1000 * (time.perf_counter() - start)
                equivalent = _equal_unitaries(_unitary(operations, n), _unitary(new["gates"], n))
                if not equivalent:
                    raise AssertionError((n, length, seed))
                old_cost = cost(operations, n, WEIGHTS)
                new_cost = cost(new["gates"], n, WEIGHTS)
                rows.append({"n_qubits": n, "length": length, "repeat": repeat, "seed": seed,
                             "runtime_ms": round(elapsed_ms, 4),
                             "cost_reduction_pct": round(100 * (old_cost - new_cost) / old_cost, 4),
                             "equivalent": True})
        print(f"Runtime scaling: finished n={n}/6", flush=True)

    with (OUT / "scaling.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    summary = []
    for n in range(1, 7):
        for length in (10, 25, 50, 100, 200, 400):
            matching = [row for row in rows if row["n_qubits"] == n and row["length"] == length]
            summary.append({"n_qubits": n, "length": length,
                            "median_runtime_ms": round(statistics.median(r["runtime_ms"] for r in matching), 4),
                            "max_runtime_ms": round(max(r["runtime_ms"] for r in matching), 4),
                            "median_reduction_pct": round(statistics.median(r["cost_reduction_pct"] for r in matching), 4)})
    (OUT / "scaling_summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Completed {len(rows)} runtime-scaling experiments")


if __name__ == "__main__":
    run()

