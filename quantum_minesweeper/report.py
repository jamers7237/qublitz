"""Summarize saved evidence without inventing hardware observations."""
import json
from pathlib import Path
from xml.sax.saxutils import escape


def mean(records, metric):
    return sum(r["metrics"][metric] for r in records) / len(records)


def hardware_writeup(directory, output):
    directory, output = Path(directory), Path(output)
    report = json.loads((directory / "results.json").read_text())
    if report["kind"] != "iqm-hardware":
        raise ValueError("Hardware write-up requires actual hardware evidence")
    manifest = json.loads((directory / "manifest.json").read_text())
    snapshot = json.loads((directory / "backend_snapshot.json").read_text())
    records = report["records"]
    corrected = [r for r in records if r["correction"]]
    controls = [r for r in records if not r["correction"]]
    survival = mean(corrected, "logical_fidelity_estimate")
    control_survival = mean(controls, "logical_fidelity_estimate")
    by_key = {(r["state"], r["error"], r["correction"]): r for r in records}
    lines = ["# Actual IQM Garnet hardware experiment", "",
             f"The level-1 bit-flip correction pilot completed on **real IQM {report['backend']} hardware**. "
             f"Mean input-state survival was **{survival:.2%} with recovery** and **{control_survival:.2%} with recovery disabled** "
             f"across the same eight state/fault combinations. This is a targeted error-correction demonstration, not a fault-tolerance or break-even memory claim.", "",
             "## Execution evidence", "",
             f"- Job ID: `{report['job_id']}`.",
             f"- Prepared at: `{manifest['created_utc']}` (UTC), November 21, 2026 in New York.",
             f"- Backend: `{report['backend']}`; native target has {snapshot['num_qubits']} qubits. The code has three logical circuit wires; native routing can use additional physical qubits (see `native_resources.json`).",
             f"- Calibration set recorded at compilation: `{snapshot['calibration_set_id']}`.",
             f"- Workload: {len(records)} circuits × {manifest['shots_per_circuit']} shots = {manifest['total_shots']:,} circuit-shots, one hardware job.",
             "- Inputs: |+⟩ and |+i⟩; faults: I, X0, X1, X2; recovery enabled and disabled for each combination.",
             "- Raw counts and per-circuit metrics: `results/iqm-pilot/results.json`.",
             "- Job identity, compilation/layout, original circuits, native circuits, and topology: `results/iqm-pilot/`.", "",
             "## Circuit and measurement", "",
             "Prepare q0, encode with two CNOTs, inject the designated test fault, and decode using two CNOTs. The work bits q1,q2 hold a syndrome independent of the unknown logical amplitudes. Recovery is a Toffoli(q1,q2→q0); disabled controls omit that gate. Finally invert input preparation and measure q0. A zero is a successful input-state survival outcome. Both work bits are also measured to score the syndrome.", "",
             "Recovery uses the same fixed controlled gate for every hidden fault, never the injected error label. The compact syndrome is (s0,s1)=(q1,q2): I→00, X0→11, X1→10, X2→01. Qiskit count strings are printed s1 s0 logical. All reported survival values include every shot, with no syndrome postselection.", "",
             "Native compilation used 13 CZ gates and depth 27–28 per corrected circuit, versus 4 CZ gates and depth 10–11 per recovery-disabled circuit. This exposes the hardware cost of recovery. The saved native target and actual layouts were used; no assumption of mid-circuit classical feedback was needed.", "",
             "## Every measured configuration", "",
             "Intervals are individual 95% Wilson binomial intervals for input-state survival. Syndrome accuracy is reported for the recovery-enabled circuits.", "",
             "| Input | Injected fault | With recovery | 95% interval | Recovery disabled | 95% interval | Corrected syndrome accuracy |",
             "|---|---|---:|---|---:|---|---:|"]
    for state, error in dict.fromkeys((r["state"], r["error"]) for r in records):
        a = by_key[(state, error, True)]["metrics"]
        b = by_key[(state, error, False)]["metrics"]
        aci, bci = a["logical_ci95"], b["logical_ci95"]
        label = "|+⟩" if state == "plus" else "|+i⟩"
        lines.append(f"| {label} | {error} | {a['logical_fidelity_estimate']:.2%} | {aci[0]:.2%}–{aci[1]:.2%} | "
                     f"{b['logical_fidelity_estimate']:.2%} | {bci[0]:.2%}–{bci[1]:.2%} | {a['syndrome_accuracy']:.2%} |")
    lines += ["", "## Interpretation and limits", "",
              "The most informative case is |+i⟩ with X0: survival rises from **4.30% without recovery to 91.41% with recovery**. X maps |+i⟩ to the orthogonal |-i⟩, so this case tests a quantum phase-sensitive state. The analogous |+⟩ case cannot reveal a residual logical X because X|+⟩=|+⟩; it should not be used alone to demonstrate correction.", "",
              f"The mean corrected syndrome accuracy is **{mean(corrected, 'syndrome_accuracy'):.2%}**. Logical survival and syndrome correctness are different observables; a wrong recorded syndrome can coexist with an apparently successful logical verification.", "",
              "No-fault cases and faults on q1/q2 show the overhead cost: correction does not improve every circuit, and can reduce survival. Each circuit was compiled independently: corrected circuits used physical indices {0,1,3,4}, while controls used {3,4,8}. Thus layout, routing, and qubit-dependent preparation/readout noise also differ. The aggregate comparison is descriptive and does not isolate the recovery gate's causal contribution. The recovery-disabled circuit is not a matched-duration idle memory or a bare-qubit benchmark. Input preparation, terminal verification, and readout contribute to the reported hardware survival values.", "",
              "Hardware evidence here covers level 1 on two inputs and all its permitted error locations. Levels 2–4 and arbitrary-input/reference preservation have exact and/or noisy simulation evidence, not hardware verification. There are no repeated syndrome rounds or fault-tolerant syndrome gadgets.", "",
              "One hardware job was submitted. The dollar charge is not returned by this runner and has not been independently verified; check the Resonance credit history for actual spend. The shot ceiling is not a dollar spending cap. No larger hardware run was submitted.", "",
              "## Reproduce or inspect", "",
              "Run `python -m quantum_minesweeper report` to regenerate the summary and this write-up from the saved evidence. To fetch the same existing job again, use `python -m quantum_minesweeper iqm-fetch --output results/iqm-pilot`; fetching does not submit another job. Follow `docs/IQM.md` for a new paid run, using a fresh output directory."]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n")


def build_report(output="results/SUMMARY.md"):
    output = Path(output)
    root = output.parent
    rows = []
    lines = ["# Recorded challenge results", "",
             "These numbers are generated from saved raw data. Evidence labels distinguish ideal simulation, local IQM noise models, and actual IQM hardware.", ""]
    verification = root / "verification.json"
    if verification.exists():
        exact = json.loads(verification.read_text())
        lines += [f"Exact verification: **{exact['cases']} cases**, passed={exact['passed']}. "
                  f"Minimum fidelity {exact['minimum_fidelity']:.15f}; minimum expected syndrome probability "
                  f"{exact['minimum_syndrome_probability']:.15f}.", "",
                  "For levels 1–3 fidelity means recovered logical/reference fidelity; for level 4 it means preservation of the error-shifted encoded data/reference during syndrome extraction.", ""]
    lines += ["| Evidence | Level | Corrected/detection circuits | Mean syndrome accuracy | Mean logical survival | Recovery-disabled survival |",
              "|---|---:|---:|---:|---:|---:|"]
    files = [root / "ideal.json", root / "fake-adonis/results.json", root / "fake-garnet-level4/results.json"]
    files += sorted(root.glob("iqm-*/results.json"))
    hardware = []
    for file in files:
        if not file.exists():
            continue
        report = json.loads(file.read_text())
        label = report["kind"]
        if "backend" in report:
            label += " / " + report["backend"]
        if report["kind"] == "iqm-hardware":
            hardware.append((file, report))
        for level in sorted({r["level"] for r in report["records"]}):
            records = [r for r in report["records"] if r["level"] == level and r["correction"]]
            controls = [r for r in report["records"] if r["level"] == level and not r["correction"]]
            syn = mean(records, "syndrome_accuracy")
            logical = mean(records, "logical_fidelity_estimate") if level != 4 else None
            control = mean(controls, "logical_fidelity_estimate") if controls else None
            text_logical = f"{logical:.4%}" if logical is not None else "not measured"
            text_control = f"{control:.4%}" if control is not None else "—"
            lines.append(f"| {label} | {level} | {len(records)} | {syn:.4%} | {text_logical} | {text_control} |")
            rows.append((f"L{level} {report.get('backend', 'ideal')}", logical if logical is not None else syn))
    lines += ["", "![Simulation and hardware comparison](comparison.svg)", "",
              "The chart uses logical input-state survival for levels 1–3 and type/syndrome accuracy for level 4; these are distinct metrics. Values are unweighted circuit means (each recorded suite uses equal shots per circuit).", "",
              "The ideal suite uses all six cardinal states. The local IQM noisy levels 1–3 and the real Garnet level-1 pilot use |+⟩ and |+i⟩; noisy level 4 uses |+i⟩. These means therefore have different input coverage. All allowed locations and the no-error case are included in each reported level.", "",
              "Individual binomial confidence intervals, syndrome histograms, and raw counts are in the JSON files. No favorable-syndrome postselection is performed. Aggregate means are descriptive and have no confidence interval attached here.", "",
              "The local IQM fake backend uses representative gate/readout/relaxation noise and stochastic sampling. It does not use current live-machine calibration. Finite-shot values can vary across runs.", "",
              "Recovery-disabled controls retain encoding and decoding and omit the final recovery. They illustrate the targeted error model, not a bare-qubit memory benchmark. Extra recovery gates can reduce performance under native noise.", ""]
    if hardware:
        lines += ["## Actual IQM hardware jobs", ""]
        for file, report in hardware:
            lines.append(f"- Backend `{report['backend']}`, job `{report['job_id']}`: `{file}`.")
        lines += ["", "See `docs/HARDWARE_RESULTS.md` for the pilot's complete per-configuration comparison and limitations. Hardware evidence currently covers level 1; levels 2–4 are verified in simulation."]
    else:
        lines += ["**Hardware requirement remains open:** no real IQM job result has been collected. Configure a private token and follow `docs/IQM.md`. No QPU credits were spent to generate the included local evidence."]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n")
    width, row_height = 900, 43
    height = 105 + row_height * len(rows)
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Recorded logical survival and error type accuracy">',
           '<rect width="100%" height="100%" fill="#f6f8fc"/>',
           '<text x="24" y="30" font-family="sans-serif" font-size="20" fill="#182b49">Quantum Minesweeper — recorded results</text>',
           '<text x="24" y="54" font-family="sans-serif" font-size="12" fill="#465770">L1–3: logical input survival · L4: syndrome/type accuracy · local noise is simulation</text>']
    for i, (label, value) in enumerate(rows):
        y = 77 + i * row_height
        color = "#237d69" if "ideal" in label else ("#4369b2" if "fake" in label else "#a35d18")
        svg += [f'<text x="24" y="{y + 19}" font-family="sans-serif" font-size="14" fill="#182b49">{escape(label)}</text>',
                f'<rect x="240" y="{y}" width="560" height="26" rx="4" fill="#e1e7f1"/>',
                f'<rect x="240" y="{y}" width="{560 * value:.2f}" height="26" rx="4" fill="{color}"/>',
                f'<text x="812" y="{y + 19}" font-family="sans-serif" font-size="14" fill="#182b49">{value:.1%}</text>']
    svg.append('</svg>')
    output.with_name("comparison.svg").write_text("\n".join(svg) + "\n")
    pilot = root / "iqm-pilot"
    if (pilot / "results.json").exists():
        hardware_writeup(pilot, root.parent / "docs/HARDWARE_RESULTS.md")
    return output
