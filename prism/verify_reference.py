"""Cross-check against organizers' supplied CircuitHelp.py (when available).

Usage: python verify_reference.py /path/to/CircuitHelp.py
"""

import importlib.util
import json
import sys
from pathlib import Path

from run_experiments import CONFIGS, cases
from submission import optimize


def run(helper_path):
    path = Path(helper_path)
    if not path.is_file():
        raise FileNotFoundError("Specify the actual organizer starter .py file")
    spec = importlib.util.spec_from_file_location("qublitz_organizer_starter", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    count = 0
    for ex in cases():
        original = ex["circuit"]
        for config in CONFIGS.values():
            output = optimize(original, config)
            module.validate_circuit(output)
            evaluation = module.evaluate_optimization(original, output, config)
            if not evaluation["equivalent"] or evaluation["cost_reduction"] < -1e-7:
                raise AssertionError((ex["name"], config, evaluation))
            count += 1
    outcome = {"checked": count, "all_equivalent": True,
               "no_cost_regressions": True, "checker": path.name}
    destination = Path(__file__).resolve().parent / "results" / "organizer_crosscheck.json"
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(outcome, indent=2) + "\n", encoding="utf-8")
    print(f"Organizers' independent checker: {count}/{count} passed")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python verify_reference.py /path/to/CircuitHelp.py")
    run(sys.argv[1])

