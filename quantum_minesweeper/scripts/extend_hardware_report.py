"""Add the original-circuit Sirius/Emerald runs to the written submission.

Reads saved measurements only. This script never connects to IQM or submits jobs.
"""
import json
import hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FOLDERS=("iqm-pilot","iqm-sirius","iqm-emerald")
MARKER="\n## 12. Additional IQM hardware runs: Sirius and Emerald\n"


def average(rows,key):
    return sum(r["metrics"][key] for r in rows)/len(rows)


def interval(values):
    return f"{values[0]:.2%}-{values[1]:.2%}"


def main():
    runs=[]
    reference=None
    reference_qasm=None
    for folder in FOLDERS:
        path=ROOT/"results"/folder
        report=json.loads((path/"results.json").read_text())
        manifest=json.loads((path/"manifest.json").read_text())
        snapshot=json.loads((path/"backend_snapshot.json").read_text())
        assert report["kind"]=="iqm-hardware"
        signature=[(r["level"],r["state"],r["error"],r["mode"],r["correction"]) for r in report["records"]]
        if reference is None: reference=signature
        assert signature==reference, "Device workloads differ"
        assert len(signature)==16 and manifest["shots_per_circuit"]==256
        assert all(r["metrics"]["shots"]==256 for r in report["records"])
        qasm=hashlib.sha256()
        for file in sorted((path/"logical_circuits").glob("*.qasm")):
            qasm.update(file.name.encode()+b"\0"+file.read_bytes())
        if reference_qasm is None: reference_qasm=qasm.hexdigest()
        assert qasm.hexdigest()==reference_qasm, "Original logical circuit suites differ"
        corrected=[r for r in report["records"] if r["correction"]]
        controls=[r for r in report["records"] if not r["correction"]]
        native=[]
        for correction in [True,False]:
            circuits=[c for c,e in zip(manifest["circuits"],manifest["experiments"]) if e["correction"]==correction]
            native.append({"correction":correction,
                           "cz_counts":sorted({c["operations"].get("cz",0) for c in circuits}),
                           "move_counts":sorted({c["operations"].get("move",0) for c in circuits}),
                           "depth_range":[min(c["depth"] for c in circuits),max(c["depth"] for c in circuits)]})
        witness={r["correction"]:r["metrics"] for r in report["records"] if r["state"]=="plus_i" and r["error"]=="X0"}
        runs.append({"folder":folder,"backend":report["backend"],"job_id":report["job_id"],
                     "prepared_utc":manifest["created_utc"],"calibration_set_id":snapshot["calibration_set_id"],
                     "logical_qasm_suite_sha256":qasm.hexdigest(),
                     "target_num_qubits":snapshot["num_qubits"],"shots":manifest["total_shots"],
                     "mean_corrected_survival":average(corrected,"logical_fidelity_estimate"),
                     "mean_control_survival":average(controls,"logical_fidelity_estimate"),
                     "mean_corrected_syndrome_accuracy":average(corrected,"syndrome_accuracy"),
                     "witness_corrected_survival":witness[True]["logical_fidelity_estimate"],
                     "witness_control_survival":witness[False]["logical_fidelity_estimate"],
                     "native":native,"records":report["records"]})
    lines=[MARKER.strip(),"",
           "We repeated the original level-1 compact Toffoli recovery on real IQM Sirius and Emerald. The algorithm, input preparation, injected fault cases, and terminal verification are unchanged.","",
           "Each device ran the same 16 configurations: plus and plus-i inputs, I/X0/X1/X2 faults, recovery enabled and disabled, and 256 shots per circuit. The new runs add 8,192 circuit-shots. Including the original Garnet pilot, the report now includes three real jobs, 48 circuits, and 12,288 circuit-shots.","",
           "Logical QASM is byte-identical across all three devices. Native compilation differs. The comparison JSON records the verified circuit-suite digest.","",
           "### Three-device comparison","",
           "The values below are descriptive averages over the same eight corrected or eight control circuits on each device. Every shot is included. They are not average gate fidelities, a fault-tolerance threshold, or a calibrated ranking of device quality.","",
           "| Device | Corrected survival | Disabled survival | Corrected syndrome accuracy |",
           "|---|---:|---:|---:|"]
    for r in runs:
        lines.append(f"| {r['backend'].capitalize()} | {r['mean_corrected_survival']:.2%} | {r['mean_control_survival']:.2%} | {r['mean_corrected_syndrome_accuracy']:.2%} |")
    lines += ["","### The phase-sensitive X0 case","",
              "X leaves plus unchanged but takes plus-i to an orthogonal state up to an overall phase. The plus-i/X0 case is therefore an informative witness of logical recovery.","",
              "| Device | With recovery | Recovery disabled |","|---|---:|---:|"]
    for r in runs:
        lines.append(f"| {r['backend'].capitalize()} | {r['witness_corrected_survival']:.2%} | {r['witness_control_survival']:.2%} |")
    for run in runs[1:]:
        path=ROOT/"results"/run["folder"]
        lines += ["",f"### {run['backend'].capitalize()} execution evidence","",
                  f"Job ID: `{run['job_id']}`. Prepared at `{run['prepared_utc']}` UTC. Calibration recorded at compilation: `{run['calibration_set_id']}`.","",
                  f"Evidence directory: `results/{run['folder']}/`. It contains the original logical QASM/text, compiled QPY, native circuit drawings, manifest, topology/calibration snapshot, job ID, raw counts, and per-circuit metrics. The mode is `compact`, matching the original pilot.","",
                  "Individual 95% Wilson intervals appear beside each logical survival estimate. No favorable-syndrome postselection is used.","",
                  "| Input | Fault | Recovery | 95% interval | Disabled | 95% interval | Syndrome |",
                  "|---|---|---:|---|---:|---|---:|"]
        by_key={(r["state"],r["error"],r["correction"]):r["metrics"] for r in run["records"]}
        for state in ["plus","plus_i"]:
            for error in ["I","X0","X1","X2"]:
                a,b=by_key[(state,error,True)],by_key[(state,error,False)]
                lines.append(f"| {'plus' if state=='plus' else 'plus-i'} | {error} | {a['logical_fidelity_estimate']:.2%} | {interval(a['logical_ci95'])} | {b['logical_fidelity_estimate']:.2%} | {interval(b['logical_ci95'])} | {a['syndrome_accuracy']:.2%} |")
        lines += ["","Native circuit resources:","","| Recovery | CZ gates | MOVE gates | Circuit depth |","|---|---:|---:|---|"]
        for n in run["native"]:
            lines.append(f"| {'Enabled' if n['correction'] else 'Disabled'} | {','.join(map(str,n['cz_counts']))} | {','.join(map(str,n['move_counts']))} | {n['depth_range'][0]}-{n['depth_range'][1]} |")
    lines += ["","### Interpretation and limitations","",
              "Emerald's corrected mean survival was 95.46% in this run, compared with 93.41% for the earlier Garnet pilot and 78.61% for Sirius. This is a workload-specific observation from one job per device and different calibrations/dates, not a general performance ranking. We did not isolate gate, decoherence, or readout contributions.","",
              "Sirius uses resonator-mediated operations in the recorded native circuit. Its corrected circuits contain 10 CZ and 12 MOVE operations, compared with 4 CZ and 4 MOVE operations in controls. The active indices include three data-qubit locations and the resonator at compiled index 16. A CZ-only count therefore understates its interaction overhead. MOVE and CZ counts are not interchangeable error or duration measures, and the observed performance gap cannot be attributed solely to MOVE operations.","",
              "Sirius still shows the targeted recovery signal: the plus-i/X0 case rises from 6.64% without recovery to 72.66% with recovery. Its overall corrected mean, however, is lower than the disabled-control mean (78.61% versus 81.20%). Most configurations do not require a logical output flip after inverse encoding, while recovery adds noisy operations in every case. We report the lower aggregate result as well as the informative successful case.","",
              "Emerald's plus-i/X0 survival rises from 3.52% to 94.14%. Its corrected circuits use 13 CZ gates and depth 27-28; controls use 4 CZ gates and depth 10-11. The recorded active physical sets differ between corrected {0,1,4} and control {4,5,10} circuits. Thus placement, routing, duration, preparation, and measurement differences limit causal interpretation. The same caution applies to the original Garnet comparison.","",
              "All three devices execute the original ideal-correct circuit. Their sub-100% outcomes reflect the physical experiment's broader error sources and do not change the original 703-case ideal verification result. No claim of repeated-round error correction, fault tolerance, or memory break-even is made. Hardware evidence continues to cover level 1 on two inputs; levels 2-4 remain simulation verified.","",
              "The submission report now has hardware evidence from Garnet, Sirius, and Emerald. The presentation and presenter guide remain the original Garnet-focused materials. The original circuits and noise models were not changed. Actual account charges must be checked in Resonance's credit history; the runner does not return dollar billing information.","",
              "### Reproduce the report or retrieve the same jobs","",
              "Run these commands inside the quantum_minesweeper project folder. The first command reads local saved evidence only. The fetch commands contact IQM but do not submit another job.","",
              "```sh","python scripts/extend_hardware_report.py",
              "python -m quantum_minesweeper iqm-fetch --output results/iqm-sirius",
              "python -m quantum_minesweeper iqm-fetch --output results/iqm-emerald","```",""]
    section="\n".join(lines).rstrip()
    report_path=ROOT/"docs/SUBMISSION.md"
    original=report_path.read_text().split(MARKER)[0].rstrip()
    report_path.write_text(original+"\n\n"+section+"\n")
    (ROOT/"docs/HARDWARE_COMPARISON.md").write_text("# Original-circuit hardware comparison\n\n"+section+"\n")
    (ROOT/"results/hardware_comparison.json").write_text(json.dumps({"kind":"actual-iqm-hardware-comparison",
        "algorithm":"original compact Toffoli recovery","runs":runs},indent=2)+"\n")
    for r in runs:
        print(r["backend"],f"corrected={r['mean_corrected_survival']:.2%}",f"control={r['mean_control_survival']:.2%}",r["job_id"])


if __name__=="__main__": main()
