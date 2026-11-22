"""Rebuild the QPU evidence addendum from ACTUAL saved IQM run JSON files.

1. Put each completed `iqm_hardware_results.json` in results/iqm_evidence/
   under a unique descriptive filename, for example mixed_level3_run1.json.
2. Run: python make_iqm_addendum.py
3. Commit the source JSON, generated CSV/Markdown/PDF, and chart.

Does not connect to IQM or submit jobs. Rejects malformed/incomplete records.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import os
from pathlib import Path

import numpy as np

from submission import _equal_unitaries, _unitary, cost, metrics


BASE = Path(__file__).resolve().parent
OUT = BASE / "results"
INPUT = OUT / "iqm_evidence"
SECRET_KEYS = ("token", "password", "secret", "authorization", "cookie", "api_key")


def check_no_secrets(value, prefix="root"):
    if isinstance(value, dict):
        for k, v in value.items():
            if any(marker in str(k).lower() for marker in SECRET_KEYS):
                raise ValueError(f"Possible credential field in record: {prefix}.{k}")
            check_no_secrets(v, prefix + "." + str(k))
    elif isinstance(value, list):
        for i, v in enumerate(value):
            check_no_secrets(v, f"{prefix}[{i}]")


def stats_for(path):
    raw = path.read_bytes()
    d = json.loads(raw)
    check_no_secrets(d)
    for key in ("original", "optimized", "counts", "ideal", "native_operations", "native_depth",
                "tvd", "job_ids", "shots", "backend_name", "timestamp_utc", "config"):
        if key not in d:
            raise ValueError(f"{path.name}: missing {key}; only completed actual hardware jobs qualify")

    n = d["original"]["n_qubits"]
    if n != d["optimized"]["n_qubits"]:
        raise ValueError("Qubit counts differ")
    if not _equal_unitaries(_unitary(d["original"]["gates"], n),
                            _unitary(d["optimized"]["gates"], n)):
        raise AssertionError("Stored outputs are not full-unitary-equivalent")
    shots = d["shots"]
    if type(shots) is not int or shots <= 0:
        raise ValueError("Only positive-shot completed hardware runs belong in this folder")
    if any(sum(d["counts"][which].values()) != shots for which in ("original", "prism")):
        raise ValueError("Count totals do not match requested shots")
    if not all(d["job_ids"].get(which) for which in ("original", "prism")):
        raise ValueError("Missing QPU job identifiers")

    alphabet = sorted(set(d["ideal"]) | set(d["counts"]["original"]) | set(d["counts"]["prism"]))
    ideal = np.array([d["ideal"].get(k, 0) for k in alphabet], dtype=float)
    if not np.isclose(ideal.sum(), 1, atol=1e-8):
        raise ValueError("Ideal distribution is not normalized")
    counts_original = np.array([d["counts"]["original"].get(k, 0) for k in alphabet], dtype=int)
    counts_prism = np.array([d["counts"]["prism"].get(k, 0) for k in alphabet], dtype=int)

    def tvd(p):
        return .5 * np.abs(p - ideal).sum(axis=-1)

    measured_orig = float(tvd(counts_original / shots))
    measured_prism = float(tvd(counts_prism / shots))
    if abs(measured_orig - d["tvd"]["original"]) > 1e-7 or abs(measured_prism - d["tvd"]["prism"]) > 1e-7:
        raise ValueError("TVD values fail independent recomputation")

    # Deterministic exploratory uncertainty analysis from the observed finite-shot counts.
    rng = np.random.default_rng(20261122)
    b = 40000
    draws_original = rng.multinomial(shots, counts_original / shots, size=b)
    draws_prism = rng.multinomial(shots, counts_prism / shots, size=b)
    delta = tvd(draws_original / shots) - tvd(draws_prism / shots)
    ci = np.percentile(delta, [2.5, 97.5])
    # Permutation tests the equal-output-distributions null, not full process fidelity.
    total = counts_original + counts_prism
    permutations = rng.multivariate_hypergeometric(total, shots, size=b)
    null = tvd(permutations / shots) - tvd((total - permutations) / shots)
    observed = measured_orig - measured_prism
    p_two_sided = (float(np.count_nonzero(np.abs(null) >= abs(observed))) + 1) / (b + 1)
    old_metrics = metrics(d["original"]["gates"], n)
    new_metrics = metrics(d["optimized"]["gates"], n)
    native_old = d["native_operations"]["original"]
    native_new = d["native_operations"]["prism"]
    return {
        "file": path.name,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "timestamp_utc": d["timestamp_utc"],
        "backend": d["backend_name"],
        "shots_each": shots,
        "optimization_level": d["optimization_level"],
        "probe_qubit": d["probe_qubit"],
        "original_job_id": str(d["job_ids"]["original"]),
        "prism_job_id": str(d["job_ids"]["prism"]),
        "n_qubits": n,
        "original_gates": len(d["original"]["gates"]),
        "prism_gates": len(d["optimized"]["gates"]),
        "original_1q": old_metrics[0], "prism_1q": new_metrics[0],
        "original_CX": old_metrics[1], "prism_CX": new_metrics[1],
        "original_logical_depth": old_metrics[2], "prism_logical_depth": new_metrics[2],
        "original_cost": round(cost(d["original"]["gates"], n, d["config"]), 5),
        "prism_cost": round(cost(d["optimized"]["gates"], n, d["config"]), 5),
        "original_r": native_old.get("r", 0), "prism_r": native_new.get("r", 0),
        "original_cz": native_old.get("cz", 0), "prism_cz": native_new.get("cz", 0),
        "original_native_depth": d["native_depth"]["original"],
        "prism_native_depth": d["native_depth"]["prism"],
        "original_tvd": round(measured_orig, 8),
        "prism_tvd": round(measured_prism, 8),
        "tvd_difference_original_minus_prism": round(observed, 8),
        "tvd_difference_bootstrap_ci95_lower": round(float(ci[0]), 8),
        "tvd_difference_bootstrap_ci95_upper": round(float(ci[1]), 8),
        "permutation_p_two_sided": round(p_two_sided, 6),
    }


def plot(rows):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    labels = [p["file"].replace(".json", "") for p in rows]
    x = np.arange(len(rows))
    fig, ax = plt.subplots(figsize=(max(7.5, 2.2 * len(rows)), 4.3))
    a = ax.bar(x - .19, [p["original_tvd"] for p in rows], width=.36,
               label="Original", color="#285780")
    b = ax.bar(x + .19, [p["prism_tvd"] for p in rows], width=.36,
               label="PRISM", color="#16876d")
    ax.bar_label(a, fmt="%.3f", padding=4, fontsize=9)
    ax.bar_label(b, fmt="%.3f", padding=4, fontsize=9)
    ax.set_xticks(x, labels, rotation=12, ha="right")
    ax.set_ylabel("TVD from ideal (smaller is better)")
    ax.set_ylim(0, max(.33, max(max(p["original_tvd"], p["prism_tvd"]) for p in rows) * 1.35))
    ax.legend(frameon=False)
    ax.set_title("Measured IQM output-distribution distances")
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", alpha=.15)
    fig.tight_layout()
    target = OUT / "iqm_evidence" / "tvd_experiment_comparison.png"
    fig.savefig(target, dpi=190, facecolor="white")
    plt.close(fig)
    return target


def markdown(rows, dryrun):
    lines = ["# PRISM: IQM Emerald hardware evidence addendum", "",
             "This addendum supplements the previously finalized **offline** report.",
             "It contains completed IQM `backend.run()` results from user-supplied job JSON files.",
             "The original competition PDF predates these hardware results.", "",
             f"Verified hardware comparison pairs: **{len(rows)}**. Each pair has an original and PRISM job.",
             "Every count total, ideal normalization, TVD, and full logical unitary were rechecked.", "",
             "## Executed native resources and measurement quality", "",
             "| Actual pair | Shots / arm | Native R before -> after | Native CZ before -> after | Native depth before -> after | TVD before -> after |",
             "|---|---:|---:|---:|---:|---:|"]
    for x in rows:
        lines.append(f"| {x['file']} | {x['shots_each']} | {x['original_r']} -> {x['prism_r']} | "
                     f"{x['original_cz']} -> {x['prism_cz']} | "
                     f"{x['original_native_depth']} -> {x['prism_native_depth']} | "
                     f"{x['original_tvd']:.4f} -> {x['prism_tvd']:.4f} |")
    lines += ["", "## Statistical uncertainty (exploratory)", "",
              "Difference is `TVD(original)-TVD(PRISM)`; positive favors PRISM. Bootstrap intervals are approximate.",
              "Permutation tests use the null of equal measured distributions; they do not estimate quantum process fidelity.", "",
              "| Pair | Difference | 95% bootstrap interval | Two-sided permutation p |",
              "|---|---:|---:|---:|"]
    for x in rows:
        lines.append(f"| {x['file']} | {x['tvd_difference_original_minus_prism']:+.4f} | "
                     f"[{x['tvd_difference_bootstrap_ci95_lower']:+.4f}, "
                     f"{x['tvd_difference_bootstrap_ci95_upper']:+.4f}] | "
                     f"{x['permutation_p_two_sided']:.3f} |")
    lines += ["", "## Separate Qiskit level-3 compile-only evidence", "",
              "The following counts are not physical job measurements:", "",
              "| Compiled operations | Original | PRISM |",
              "|---|---:|---:|",
              f"| R | {dryrun['original']['r']} | {dryrun['prism']['r']} |",
              f"| CZ | {dryrun['original']['cz']} | {dryrun['prism']['cz']} |",
              f"| Native depth | {dryrun['original']['native_depth']} | {dryrun['prism']['native_depth']} |",
              "", "## Interpretation and caveats", "",
              "- Do **not** claim that a single 256-shot run proves better physical fidelity or statistical significance.",
              "- On the first level-0 executed pair, PRISM used **three more CZ gates** despite fewer R gates and a shorter circuit. Report all three.",
              "- A server default calibration-set change warning was displayed on the first run; the saved JSON has no calibration identifier. Reinitialize the backend before comparisons.",
              "- The adapter retranspiles each run, with potentially different physical-qubit placements; calibration and layout variations can confound measured improvement.",
              "- Hardware shots on one initial state cannot prove full-unitary equivalence; the separate full-matrix checker does that numerically.",
              "- Fixed-layout/fixed-seed, counterbalanced, repeated paired jobs would strengthen causal hardware claims.",
              "- The original 380-circuit / 2660-configuration study was synthetic offline evidence, not physical IQM execution.",
              "", "## Raw job provenance", ""]
    for x in rows:
        lines += [f"### {x['file']}", "",
                  f"- UTC: `{x['timestamp_utc']}`; backend: `{x['backend']}`; optimization level: {x['optimization_level']}; shots per arm: {x['shots_each']}.",
                  f"- Original job ID: `{x['original_job_id']}`.",
                  f"- PRISM job ID: `{x['prism_job_id']}`.",
                  f"- SHA-256 of original JSON: `{x['sha256']}`.",
                  f"- Logical gates: {x['original_gates']} -> {x['prism_gates']}; logical weighted cost: {x['original_cost']} -> {x['prism_cost']}.", ""]
    lines += ["## Reproduce and extend", "",
              "1. Copy each **completed** `iqm_hardware_results.json` into `results/iqm_evidence/` with a unique name; do not overwrite the previous trial.",
              "2. Run `python make_iqm_addendum.py` from the repository root; it revalidates every stored pair and regenerates the summary and PDF.",
              "3. Commit the raw JSON, aggregated CSV, this Markdown, graph and PDF. Never commit IQM tokens, environment files or auth objects.", ""]
    (OUT / "IQM_Emerald_Hardware_Addendum.md").write_text("\n".join(lines), encoding="utf-8")


def pdf(rows, chart):
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Image

    target = OUT / "IQM_Emerald_Hardware_Addendum.pdf"
    doc = SimpleDocTemplate(str(target), pagesize=(8.5*inch, 11*inch),
                            leftMargin=.65*inch, rightMargin=.65*inch,
                            topMargin=.57*inch, bottomMargin=.57*inch,
                            title="PRISM: IQM Emerald physical-hardware evidence addendum")
    regular = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    bold = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    if not (regular.is_file() and bold.is_file()) and os.environ.get("WINDIR"):
        fonts = Path(os.environ["WINDIR"]) / "Fonts"
        regular, bold = fonts / "arial.ttf", fonts / "arialbd.ttf"
    if regular.is_file() and bold.is_file():
        pdfmetrics.registerFont(TTFont("EvidenceSans", str(regular)))
        pdfmetrics.registerFont(TTFont("EvidenceSansBold", str(bold)))
        pdfmetrics.registerFontFamily("EvidenceSans", normal="EvidenceSans", bold="EvidenceSansBold")
        face, boldface = "EvidenceSans", "EvidenceSansBold"
    else:
        face, boldface = "Helvetica", "Helvetica-Bold"
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name="AddTitle", parent=base["Title"], fontName=boldface,
                            fontSize=17, leading=22, textColor=colors.HexColor("#18394e"), spaceAfter=12))
    base.add(ParagraphStyle(name="AddBody", parent=base["BodyText"], fontName=face,
                            fontSize=8.6, leading=13.5, spaceAfter=8))
    base.add(ParagraphStyle(name="AddSmall", parent=base["BodyText"], fontName=face,
                            fontSize=7.5, leading=11, spaceAfter=5))
    base.add(ParagraphStyle(name="AddHeading", parent=base["Heading3"], fontName=boldface,
                            fontSize=10, leading=14, spaceBefore=8, spaceAfter=7))
    def p(s, name="AddBody"):
        import html
        return Paragraph(html.escape(str(s)), base[name])
    story = [p("PRISM - IQM Emerald hardware evidence", "AddTitle"),
             p("Supplement to the offline competition report. All following QPU results are sourced from completed user-provided IQM job JSON files."),
             p(f"Completed hardware pairs: {len(rows)}. These are measurement experiments, not full process tomography."),
             Image(str(chart), width=6.65*inch, height=3.5*inch),
             Spacer(1, 8)]
    tab = [["Experiment", "Shots", "R before / after", "CZ before / after", "Depth before / after", "TVD before / after"]]
    for x in rows:
        tab.append([x["file"].replace(".json", ""), str(x["shots_each"]),
                    f"{x['original_r']} / {x['prism_r']}", f"{x['original_cz']} / {x['prism_cz']}",
                    f"{x['original_native_depth']} / {x['prism_native_depth']}",
                    f"{x['original_tvd']:.4f} / {x['prism_tvd']:.4f}"])
    table = Table([[p(cell, "AddSmall") for cell in row] for row in tab],
                  colWidths=[1.35*inch, .55*inch, 1.18*inch, 1.18*inch, 1.36*inch, 1.25*inch])
    table.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
                               ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#e8f0f4")),
                               ("LINEBELOW",(0,0),(-1,0),1,colors.HexColor("#45758d")),
                               ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#f7fafb")]),
                               ("LEFTPADDING",(0,0),(-1,-1),5),
                               ("RIGHTPADDING",(0,0),(-1,-1),5)]))
    story.append(table)
    story.append(Spacer(1, 8))
    for x in rows:
        story += [p(f"{x['file']}: TVD difference {x['tvd_difference_original_minus_prism']:+.4f}; "
                    f"exploratory 95% bootstrap interval "
                    f"[{x['tvd_difference_bootstrap_ci95_lower']:+.4f}, "
                    f"{x['tvd_difference_bootstrap_ci95_upper']:+.4f}]; "
                    f"two-sided permutation p={x['permutation_p_two_sided']:.3f}.", "AddSmall")]
    story += [p("Integrity and limitations", "AddHeading"),
              p("The first level-0 run showed fewer R gates and reduced depth, but 3 MORE native CZ gates. "
                "A default calibration-set change warning was observed. Finite-shot TVD differences do not establish process fidelity or causal improvement. "
                "Original/PRISM qubit layouts may differ, and the published offline benchmark is not an independent organizer-held-out test."),
              p("Every saved pair passed a fresh full-unitary check, shot-total validation and independent TVD recomputation. "
                "Raw job JSON and hashes are in results/iqm_evidence and IQM_Emerald_Hardware_Addendum.md.", "AddSmall")]
    doc.build(story)
    print(f"Created {target}")


def main():
    paths = sorted(INPUT.glob("*.json"))
    if not paths:
        raise FileNotFoundError("No completed IQM JSON in results/iqm_evidence")
    rows = [stats_for(path) for path in paths]
    summary_file = OUT / "iqm_hardware_run_summary.csv"
    with summary_file.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    dryrun = json.loads((OUT / "iqm_level3_compile_only.json").read_text(encoding="utf-8"))
    chart = plot(rows)
    markdown(rows, dryrun)
    pdf(rows, chart)
    print(f"Rechecked {len(rows)} paired QPU experiments and saved independent analysis")


if __name__ == "__main__":
    main()
