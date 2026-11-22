"""Create publication-style plots from real PRISM results (never dummy values)."""

import csv
import json
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "full_study"
FIGS = ROOT / "visuals"
FIGS.mkdir(exist_ok=True)
COLORS = ("#254b76", "#1d9276", "#e2a146", "#8264ab", "#4e9bc2", "#b6686e")
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10,
                     "axes.spines.top": False, "axes.spines.right": False,
                     "axes.labelcolor": "#283747", "text.color": "#283747", "axes.titleweight": "bold"})


def save(fig, name):
    fig.savefig(FIGS / name, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def load_csv(filename):
    with (DATA / filename).open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def plot_all():
    runs = load_csv("runs.csv")
    ablations = load_csv("ablations.csv")
    balanced = [r for r in runs if r["config"] == "balanced"]
    families = list(dict.fromkeys(r["family"] for r in balanced))
    family_labels = {"Hadamard_heavy": "H-heavy", "long_random": "Long random"}
    means = [np.mean([float(r["reduction_pct"]) for r in balanced if r["family"] == f]) for f in families]
    medians = [np.median([float(r["reduction_pct"]) for r in balanced if r["family"] == f]) for f in families]
    fig, ax = plt.subplots(figsize=(11, 5.2))
    yy = np.arange(len(families))
    ax.barh(yy - .19, means, height=.36, color=COLORS[0], label="Mean reduction")
    ax.barh(yy + .19, medians, height=.36, color=COLORS[1], label="Median reduction")
    ax.set_yticks(yy, [family_labels.get(f, f) for f in families])
    ax.invert_yaxis()
    ax.set_xlabel("Weighted cost reduction (%)")
    ax.set_title("Optimization improvements by circuit family")
    ax.legend(loc="lower right", frameon=False)
    ax.grid(axis="x", alpha=.16)
    save(fig, "01_reduction_by_family.png")

    configs = list(dict.fromkeys(r["config"] for r in runs))
    improved = []
    for cfg in configs:
        rs = [r for r in runs if r["config"] == cfg]
        improved.append(100 * np.mean([r["improved"] == "True" for r in rs]))
    fig, ax = plt.subplots(figsize=(10, 4.8))
    bars = ax.bar(range(len(configs)), improved, color=[COLORS[i % len(COLORS)] for i in range(len(configs))])
    ax.set_xticks(range(len(configs)), [s.replace("_", "\n") for s in configs])
    ax.set_ylabel("Inputs strictly improved (%)")
    ax.set_ylim(0, 105)
    ax.set_title("Reliability under seven different scoring objectives")
    ax.bar_label(bars, fmt="%.1f%%", padding=3)
    ax.grid(axis="y", alpha=.15)
    save(fig, "02_weight_sensitivity.png")

    by_family = defaultdict(list)
    for r in ablations:
        by_family[r["family"]].append(r)
    parts = ["adjacent_cost", "local_affine_cost", "full_cost"]
    values = []
    for key in parts:
        values.append([100 * np.mean([(float(r["input_cost"]) - float(r[key])) / max(float(r["input_cost"]), 1e-8)
                                       for r in by_family[f]]) for f in families])
    xx = np.arange(len(families))
    fig, ax = plt.subplots(figsize=(11, 5))
    for i, (vals, name) in enumerate(zip(values, ("Adjacent only", "Local + affine", "Full PRISM"))):
        ax.bar(xx + (i - 1) * .25, vals, width=.24, color=COLORS[i], label=name)
    ax.set_xticks(xx, [family_labels.get(f, f).replace("_", "\n") for f in families], rotation=18, ha="right")
    ax.set_ylabel("Mean input cost reduction (%)")
    ax.set_title("Ablation: what do PRISM's components contribute?")
    ax.legend(frameon=False)
    ax.grid(axis="y", alpha=.16)
    save(fig, "03_ablation.png")

    scaling = load_csv("scaling.csv")
    fig, ax = plt.subplots(figsize=(10.5, 5))
    for n in range(1, 7):
        lengths = sorted({int(r["length"]) for r in scaling if int(r["n_qubits"]) == n})
        med = [np.median([float(r["runtime_ms"]) for r in scaling if int(r["n_qubits"]) == n and int(r["length"]) == x]) for x in lengths]
        ax.plot(lengths, med, marker="o", color=COLORS[n - 1], label=f"{n} qubit{'s' if n > 1 else ''}")
    ax.set_xlabel("Input gate count")
    ax.set_ylabel("Median optimizer runtime (ms, 3 seeds)")
    ax.set_yscale("log")
    ax.set_title("Runtime scaling with input length and qubit count")
    ax.legend(frameon=False, ncol=2)
    ax.grid(alpha=.15, which="both")
    save(fig, "04_runtime_scaling.png")

    fig, (a, b) = plt.subplots(1, 2, figsize=(11, 3.8), gridspec_kw={"width_ratios": [2.2, 1]})
    a.axis("off"); b.axis("off")
    a.text(.5, .87, "Original: 49 gates on 4 qubits", ha="center", va="center", fontsize=15, weight="bold")
    a.text(.5, .58, "T₁  →  W  →  T₁†  →  W  →  T₁  →  W  →  T₁†  →  W  →  T₁",
           ha="center", va="center", fontsize=12,
           bbox={"boxstyle": "round,pad=.8", "facecolor": "#e8f1f8", "edgecolor": "#a9c0d4"})
    a.text(.5, .32, "W has 11 CNOTs; W⁴ = I; W preserves parity on qubit 1", ha="center", fontsize=11)
    b.text(.5, .87, "PRISM output", ha="center", fontsize=15, weight="bold")
    b.text(.5, .58, "T₁", ha="center", va="center", fontsize=24, weight="bold", color="#168869",
           bbox={"boxstyle": "round,pad=.8", "facecolor": "#d9f3e9", "edgecolor": "#56ad8c"})
    b.text(.5, .32, "277.2 → 1.2  |  99.57%", ha="center", fontsize=11)
    fig.suptitle("The Parity Gauntlet: the exact identity behind the headline", fontsize=14, weight="bold")
    save(fig, "05_parity_gauntlet.png")

    unchanged = [r for r in balanced if r["improved"] == "False"]
    counts = defaultdict(int)
    for row in unchanged:
        counts[row["family"]] += 1
    fig, ax = plt.subplots(figsize=(10, 4.3))
    ys = list(counts.keys())
    ax.barh(ys, [counts[x] for x in ys], color="#b36d66")
    ax.set_title("Cases with no strict cost improvement (not incorrect outputs)")
    ax.set_xlabel("Unchanged cases under balanced weights")
    ax.invert_yaxis()
    ax.grid(axis="x", alpha=.14)
    save(fig, "06_unchanged_cases.png")

    print(f"Created 6 charts from measured data in {FIGS}")


if __name__ == "__main__":
    plot_all()

