"""Measure the contribution of each algorithmic idea, not just total wins.

Run: python run_ablations.py
"""

import csv
from pathlib import Path

from run_experiments import CONFIGS, cases
from submission import _affine_pass, _local_pass, cost, optimize


ROOT = Path(__file__).resolve().parent


def adjacent_only(gates):
    inverses = {("H", "H"), ("X", "X"), ("Z", "Z"), ("CX", "CX"),
                ("S", "SDG"), ("SDG", "S"), ("T", "TDG"), ("TDG", "T")}
    stack = []
    for gate in gates:
        if stack and (stack[-1]["gate"], gate["gate"]) in inverses and stack[-1]["qubits"] == gate["qubits"]:
            stack.pop()
        else:
            stack.append(gate)
    return stack


def run():
    cfg = CONFIGS["balanced"]
    rows = []
    for ex in cases():
        c = ex["circuit"]
        n = c["n_qubits"]
        original = c["gates"]
        adjacent = adjacent_only(original)
        local = _local_pass(original, n, cfg)
        local = _affine_pass(local, n, cfg)
        full = optimize(c, cfg)["gates"]
        row = {"case": ex["name"],
               "original": round(cost(original, n, cfg), 4),
               "adjacent": round(cost(adjacent, n, cfg), 4),
               "local_plus_affine": round(cost(local, n, cfg), 4),
               "prism": round(cost(full, n, cfg), 4)}
        rows.append(row)

    outdir = ROOT / "results"
    outdir.mkdir(exist_ok=True)
    with (outdir / "ablation_results.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    featured = [r for r in rows if not r["case"].startswith("random")]
    lines = ["# What does PRISM's parity method contribute?", "",
             "Costs use balanced `w1=1,w2=6,wd=0.2`. Lower is better.",
             "These methods are ablations, not full competing commercial compilers.", "",
             "| Test | Original | Adjacent cancellations | Exact local + affine | Full PRISM |",
             "|---|---:|---:|---:|---:|"]
    for r in featured:
        lines.append(f"| {r['case']} | {r['original']:g} | {r['adjacent']:g} | "
                     f"{r['local_plus_affine']:g} | {r['prism']:g} |")
    lines.extend(["", "The 4-qubit `L3-nonlocal-parity-fingerprint` circuit is intentionally",
                  "constructed so the phase terms have the same input parity despite",
                  "an intervening nontrivial network of CNOTs. The exact local-only pass",
                  "cannot recognize that identity within its bounded two-wire window.",
                  "The symbolic parity pass can combine the two phase coefficients.", "",
                  "Important: Other local improvements may happen too. This comparison",
                  "demonstrates a useful specific mechanism, not a global superiority claim.", ""])
    (outdir / "ABLATION.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Ablations written for {len(rows)} circuits")


if __name__ == "__main__":
    run()

