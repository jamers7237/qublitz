"""Export the recorded native Garnet witness circuit, without any IQM connection."""
import json
from pathlib import Path
from qiskit import qpy

ROOT = Path(__file__).resolve().parents[1]
directory = ROOT / "results/iqm-pilot"
manifest = json.loads((directory / "manifest.json").read_text())
index = next(i for i, m in enumerate(manifest["experiments"])
             if m["state"] == "plus_i" and m["error"] == "X0" and m["correction"])
with (directory / "compiled.qpy").open("rb") as f:
    circuit = qpy.load(f)[index]
instructions = []
for item in circuit.data:
    instructions.append({"name": item.operation.name,
                         "qubits": [circuit.find_bit(q).index for q in item.qubits],
                         "clbits": [circuit.find_bit(c).index for c in item.clbits],
                         "params": [float(p) for p in item.operation.params],
                         "label": item.operation.label})
data = {"source": "results/iqm-pilot/compiled.qpy", "circuit_index": index,
        "experiment": manifest["experiments"][index], "depth": circuit.depth(),
        "operation_counts": dict(circuit.count_ops()), "global_phase_radians": float(circuit.global_phase),
        "active_physical_qubits": sorted({q for x in instructions if x["name"] != "barrier" for q in x["qubits"]}),
        "instructions": instructions}
(directory / "native_witness.json").write_text(json.dumps(data, indent=2) + "\n")
print({k: v for k, v in data.items() if k not in ("instructions", "experiment")})
