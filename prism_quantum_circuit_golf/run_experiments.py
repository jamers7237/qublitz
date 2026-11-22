"""Reproducible challenge-level experiment runner with Markdown/CSV outputs.

Run: python run_experiments.py
"""

import csv
import json
import random
import time
from pathlib import Path

from submission import ONE, _equal_unitaries, _unitary, metrics, optimize, cost


ROOT = Path(__file__).resolve().parent
CONFIGS = {
    "balanced": {"w1": 1.0, "w2": 6.0, "wd": 0.2},
    "CX-heavy": {"w1": 0.2, "w2": 10.0, "wd": 0.1},
    "depth-heavy": {"w1": 0.1, "w2": 0.1, "wd": 10.0},
    "single-heavy": {"w1": 10.0, "w2": 1.0, "wd": 0.2},
}


def cases():
    with (ROOT / "experiments" / "circuits.json").open(encoding="utf-8") as f:
        data = json.load(f)
    # The Parity Gauntlet: a genuinely nonlocal 4-qubit CNOT network W is
    # repeated four times with alternating phase gates on a conserved parity.
    # W has order four; the long circuit reduces to a single T on qubit 1.
    seed = next(item for item in data if item["name"] == "L3-nonlocal-parity-fingerprint")
    w_network = seed["circuit"]["gates"][1:-1]
    gauntlet = []
    for k in range(4):
        gauntlet.append({"gate": "T" if k % 2 == 0 else "TDG", "qubits": [1]})
        gauntlet.extend(w_network)
    gauntlet.append({"gate": "T", "qubits": [1]})
    data.append({"name": "L3-parity-gauntlet-49-to-1",
                 "why": "49 gates, four rounds of a nonlocal reversible network; phase and linear algebra expose the hidden single-T equivalent",
                 "circuit": {"n_qubits": 4, "gates": gauntlet}})
    rng = random.Random(20261121)
    for n in (2, 3, 4, 5, 6):
        for i in range(5):
            gates = []
            for _ in range(14 + 4 * i):
                if rng.random() < .38:
                    a, b = rng.sample(range(n), 2)
                    gates.append({"gate": "CX", "qubits": [a, b]})
                else:
                    gates.append({"gate": rng.choice(ONE), "qubits": [rng.randrange(n)]})
            data.append({"name": f"random-{n}q-{i}", "why": "Unseen-style randomized mixed circuit",
                         "circuit": {"n_qubits": n, "gates": gates}})
    return data


def run():
    rows = []
    examples = []
    for example in cases():
        c = example["circuit"]
        n = c["n_qubits"]
        original_matrix = _unitary(c["gates"], n)
        for name, cfg in CONFIGS.items():
            start = time.perf_counter()
            out = optimize(c, cfg)
            elapsed = time.perf_counter() - start
            valid = _equal_unitaries(original_matrix, _unitary(out["gates"], n))
            before = cost(c["gates"], n, cfg)
            after = cost(out["gates"], n, cfg)
            if not valid or after > before + 1e-8:
                raise AssertionError(f"Invalid or regressive result: {example['name']}, {name}")
            a1, a2, ad = metrics(c["gates"], n)
            b1, b2, bd = metrics(out["gates"], n)
            row = {"case": example["name"], "config": name, "n_qubits": n,
                   "equivalent": valid, "before_cost": round(before, 6), "after_cost": round(after, 6),
                   "reduction_pct": round(100 * (before - after) / before, 2) if before else 0.0,
                   "before_1q": a1, "after_1q": b1, "before_CX": a2, "after_CX": b2,
                   "before_depth": ad, "after_depth": bd, "runtime_ms": round(1000 * elapsed, 2)}
            rows.append(row)
            if name == "balanced" and not example["name"].startswith("random"):
                examples.append((example, out, row))

    outdir = ROOT / "results"
    outdir.mkdir(exist_ok=True)
    with (outdir / "benchmark_results.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    with (outdir / "demo_outputs.json").open("w", encoding="utf-8") as f:
        json.dump([{"name": ex["name"], "why": ex["why"], "original": ex["circuit"],
                    "optimized": out, "metrics": row} for ex, out, row in examples], f, indent=2)

    lines = ["# PRISM — reproducible experimentation", "",
             "Generated using `python run_experiments.py` with fixed random seed 20261121.",
             "All reported equivalence checks compare full unitaries up to global phase.",
             "Results are for the local abstract cost function, **not** physical IQM error rates.", "",
             "## Representative circuits (balanced weights)", "",
             "| Test | 1q before→after | CX before→after | Depth before→after | Cost before→after | Reduction |",
             "|---|---:|---:|---:|---:|---:|"]
    for ex, out, row in examples:
        lines.append(f"| {ex['name']} | {row['before_1q']}→{row['after_1q']} | "
                     f"{row['before_CX']}→{row['after_CX']} | "
                     f"{row['before_depth']}→{row['after_depth']} | "
                     f"{row['before_cost']:g}→{row['after_cost']:g} | "
                     f"{row['reduction_pct']:g}% |")
    lines.extend(["", "## Generalization across random circuits", "",
                  "| Configuration | Instances | Improved | Mean cost reduction | Maximum runtime |",
                  "|---|---:|---:|---:|---:|"])
    for cfgname in CONFIGS:
        s = [r for r in rows if r["config"] == cfgname and r["case"].startswith("random")]
        lines.append(f"| {cfgname} | {len(s)} | "
                     f"{sum(r['reduction_pct'] > 0 for r in s)} | "
                     f"{sum(r['reduction_pct'] for r in s)/len(s):.2f}% | "
                     f"{max(r['runtime_ms'] for r in s):.1f} ms |")
    lines.extend(["", "## Important limitations", "",
                  "- Hadamard gates break phase-polynomial segments; cross-H phase identities are found only by local search.",
                  "- Exact bounded local synthesis is not a global optimum guarantee.",
                  "- Random benchmarks are seeded synthetic instances, not organizer hidden tests.",
                  "- A successful computational-basis measurement comparison alone does not prove unitary equivalence.",
                  "", "## Reproduce", "", "```bash", "python -m pip install -r requirements.txt",
                  "python -m unittest discover -s tests -v", "python run_experiments.py", "```", ""])
    (outdir / "EXPERIMENTS.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Verified {len(rows)} / {len(rows)} circuit/config pairs; wrote results/EXPERIMENTS.md")


if __name__ == "__main__":
    run()

