"""Command-line entry points. Run with python -m quantum_minesweeper."""
import argparse
import json
import os
from pathlib import Path
from qiskit import transpile
from qiskit_aer import AerSimulator
from .codes import experiment
from .experiments import suite, save_json, versions, result_records, save_circuits


def report_summary(report):
    records = report["records"]
    for level in sorted({r["level"] for r in records}):
        subset = [r for r in records if r["level"] == level and r["correction"]]
        if not subset:
            continue
        syn = sum(r["metrics"]["syndrome_accuracy"] for r in subset) / len(subset)
        line = f"Level {level}: {len(subset)} circuits; mean syndrome accuracy {syn:.4f}"
        if level != 4:
            fidelity = sum(r["metrics"]["logical_fidelity_estimate"] for r in subset) / len(subset)
            line += f"; mean input-state survival {fidelity:.4f}"
        print(line)


def parse_list(value):
    return [s.strip() for s in value.split(",") if s.strip()]


def main(argv=None):
    from dotenv import load_dotenv
    load_dotenv(Path.cwd() / ".env", override=False)
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    verify = sub.add_parser("verify", help="exhaustive exact-state and Hamiltonian checks")
    verify.add_argument("--random-states", type=int, default=12)
    verify.add_argument("--output", default="results/verification.json")
    simulate = sub.add_parser("simulate", help="shot-based ideal Aer experiment suite")
    simulate.add_argument("--shots", type=int, default=1024)
    simulate.add_argument("--seed", type=int, default=2026)
    simulate.add_argument("--output", default="results/ideal.json")
    simulate.add_argument("--mode", choices=["compact", "explicit"], default="compact")
    simulate.add_argument("--controls", action="store_true")
    export = sub.add_parser("export", help="write representative circuit drawings and QASM")
    export.add_argument("--output", default="circuits")
    iqm = sub.add_parser("iqm", help="compile IQM suite; optionally submit or simulate locally")
    iqm.add_argument("--backend", default=os.environ.get("IQM_QUANTUM_COMPUTER", "fake-adonis"))
    iqm.add_argument("--url")
    iqm.add_argument("--levels", default="1")
    iqm.add_argument("--states", default="plus,plus_i")
    iqm.add_argument("--mode", choices=["compact", "explicit"], default="compact")
    iqm.add_argument("--controls", action="store_true")
    iqm.add_argument("--shots", type=int, default=256)
    iqm.add_argument("--max-total-shots", type=int, default=16384)
    iqm.add_argument("--output", required=True)
    iqm.add_argument("--execute", action="store_true", help="submit to remote IQM service; consumes credits on hardware")
    fetch = sub.add_parser("iqm-fetch", help="retrieve an already submitted IQM job")
    fetch.add_argument("--output", required=True)
    send = sub.add_parser("iqm-submit", help="submit exactly the saved compiled circuits, without recompiling")
    send.add_argument("--output", required=True)
    summary = sub.add_parser("report", help="summarize saved results into Markdown and SVG")
    summary.add_argument("--output", default="results/SUMMARY.md")
    args = parser.parse_args(argv)
    if args.command == "verify":
        from .verification import verify_all
        from .field_theory import analyze_theory
        if args.random_states < 0:
            parser.error("--random-states must be nonnegative")
        result = verify_all(random_states=args.random_states)
        result["theory"] = analyze_theory()
        result["versions"] = versions()
        save_json(args.output, result)
        print(json.dumps({k: v for k, v in result.items() if k not in ("records", "theory")}, indent=2))
        if not result["passed"]:
            raise SystemExit(1)
    elif args.command == "simulate":
        if args.shots < 1:
            parser.error("--shots must be positive")
        experiments = suite(mode=args.mode, controls=args.controls)
        backend = AerSimulator()
        circuits = transpile([e.circuit for e in experiments], backend, optimization_level=0, seed_transpiler=args.seed)
        job = backend.run(circuits, shots=args.shots, seed_simulator=args.seed)
        result = job.result()
        report = {"kind": "ideal-local-simulation", "seed": args.seed, "versions": versions(),
                  "records": result_records(experiments, [result.get_counts(i) for i in range(len(experiments))])}
        save_json(args.output, report)
        report_summary(report)
    elif args.command == "export":
        experiments = [experiment(level, "I" if level == 4 else {1: "X1", 2: "Z1", 3: "Y1"}[level],
                                  mode=mode)
                       for level in range(1, 5)
                       for mode in (["compact", "explicit"] if level < 4 else ["explicit"])]
        save_circuits(args.output, experiments)
        print(f"Exported {len(experiments)} representative circuits to {args.output}")
    elif args.command == "report":
        from .report import build_report
        print(build_report(args.output))
    elif args.command == "iqm":
        from .iqm_runner import prepare, submit, collect
        experiments = suite(tuple(int(x) for x in parse_list(args.levels)), parse_list(args.states), args.mode, args.controls)
        if not experiments:
            parser.error("choose at least one level and state")
        backend, compiled, manifest = prepare(experiments, args.backend, args.output, args.shots, args.max_total_shots, args.url)
        print(json.dumps({k: manifest[k] for k in ("kind", "backend", "total_shots", "compilation")}, indent=2))
        if manifest["kind"] == "iqm-local-fake-noise":
            # IQM's fake backend forwards shots only, not a simulator seed.
            job = backend.run(compiled, shots=args.shots)
            report_summary(collect(job, experiments, manifest, args.output))
        elif args.execute:
            submit(backend, compiled, experiments, manifest, args.output)
        else:
            print("Prepared only. To submit these exact circuits: python -m quantum_minesweeper iqm-submit --output '" + args.output + "'")
    elif args.command in ("iqm-fetch", "iqm-submit"):
        from .iqm_runner import backend_for, collect, submit
        out = Path(args.output)
        manifest = json.loads((out / "manifest.json").read_text())
        backend, _ = backend_for(manifest["backend"], manifest["server_url"])
        experiments = [experiment(m["level"], m["error"], m["state"], m["mode"], m["correction"])
                       for m in manifest["experiments"]]
        if args.command == "iqm-submit":
            from qiskit import qpy
            with (out / "compiled.qpy").open("rb") as f:
                compiled = qpy.load(f)
            submit(backend, compiled, experiments, manifest, out)
        else:
            saved = json.loads((out / "job.json").read_text())
            report_summary(collect(backend.retrieve_job(saved["job_id"]), experiments, manifest, out))


if __name__ == "__main__":
    main()
