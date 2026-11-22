"""Recheck ALL stored trial outputs with the organizer's original Python helper.

No optimizer re-execution, no hardware, and no secret benchmark access.
This test's matrix implementation is independent from `submission.py`.
"""

import csv
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

from full_study import WEIGHTS


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "full_study"
HELPER = ROOT / "challenge_materials" / "CircuitHelp.py"


def main():
    if not HELPER.is_file():
        raise FileNotFoundError("Original organizer's CircuitHelp.py is needed")
    spec = importlib.util.spec_from_file_location("qublitz_provided_checker", HELPER)
    source = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(source)

    data_path = DATA / "circuits.jsonl"
    columns = ["run_id", "equivalent_via_organizer", "non_regressive_via_organizer",
               "original_cost_via_organizer", "output_cost_via_organizer"]
    rows = []
    with data_path.open(encoding="utf-8") as f:
        for k, line in enumerate(f, 1):
            trial = json.loads(line)
            name = trial["run_id"].rsplit(":", 1)[1]
            weights = WEIGHTS[name]
            source.validate_circuit(trial["original"])
            source.validate_circuit(trial["optimized"])
            r = source.evaluate_optimization(trial["original"], trial["optimized"], weights)
            row = {"run_id": trial["run_id"],
                   "equivalent_via_organizer": bool(r["equivalent"]),
                   "non_regressive_via_organizer": bool(r["cost_reduction"] >= -1e-7),
                   "original_cost_via_organizer": round(r["input_cost"], 8),
                   "output_cost_via_organizer": round(r["output_cost"], 8)}
            if not row["equivalent_via_organizer"] or not row["non_regressive_via_organizer"]:
                raise AssertionError(f"Organizer checker rejects trial: {trial['run_id']}")
            rows.append(row)
            if k % 400 == 0:
                print(f"Independent organizer helper: {k} trials checked", flush=True)
    if len(rows) != 2660:
        raise AssertionError(f"Expected all 2660 trial rows, got {len(rows)}")
    with (DATA / "organizer_rechecked_runs.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    summary = {"completed_utc": datetime.now(timezone.utc).isoformat(),
               "checker_source": "challenge_materials/CircuitHelp.py (original organizer-supplied file)",
               "pairs_verified": len(rows), "equivalence_passes": len(rows),
               "cost_regression_passes": len(rows),
               "important_note": "Organizer's public local checker, not its independent hidden evaluation set"}
    (DATA / "organizer_recheck_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Independent organizer helper: {len(rows)}/{len(rows)} equivalence and cost checks passed")


if __name__ == "__main__":
    main()
