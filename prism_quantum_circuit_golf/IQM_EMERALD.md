# Optional experiment on IQM Emerald / organizer-supplied IBM notebook

The competition itself requires only `submission.py` and the exact logical
gate-set unitary. **No QPU is necessary for official scoring.** IQM Emerald is
useful for *demonstrating physical transpilation and noisy gate behavior*.

## Option A — use the already-initialized hackathon `backend` (recommended)

If the organizer's IBM/Qiskit notebook has created `backend`, do **not**
create a second provider or paste tokens into Python code.

```python
from iqm_emerald_demo import compare_on_backend
from submission import optimize

example = {
  "n_qubits": 2,
  "gates": [
    {"gate": "CX", "qubits": [0, 1]},
    {"gate": "Z", "qubits": [0]},
    {"gate": "CX", "qubits": [0, 1]},
  ],
}

# Inspect abstract and *hardware-native transpiled* gate costs first.
comparison = compare_on_backend(example, backend, execute=False)

# Only once you have checked access, timeslot, and quota:
comparison = compare_on_backend(example, backend,
                                shots=1024, execute=True)
```

If your notebook specifically requires `use_timeslot=False` as in your
screenshot, supply `use_timeslot=False` explicitly. For a reserved slot, follow
the organizer's instructions. Do **not** assume that flag is supported by all
backends.

## Option B — direct IQM Resonance credentials (only if provided)

```bash
python -m pip install 'qiskit[visualization]' 'iqm-client[qiskit]'
# Configure IQM_SERVER_URL, IQM_QUANTUM_COMPUTER=emerald, IQM_TOKEN
# using environment settings. Never put tokens in a committed script.
python iqm_emerald_demo.py --case L2-hidden-CX-Z-CX     # dry-run
python iqm_emerald_demo.py --case L2-hidden-CX-Z-CX --execute
```

**Important:** IQM Emerald uses its own device-native gate set/connectivity.
Qiskit transpilation can decompose CNOTs, map qubits, and change depth and
counts. Compare *both* the hackathon abstract metrics and the transpiled
native gate counts. A lower abstract score does not guarantee better physical
fidelity or a shorter hardware schedule.

The importer reverses qubit indices (`physical_q = n - 1 - challenge_q`),
because the challenge defines q0 as MSB while Qiskit uses little-endian
bitstring indexing. This maintains the intended full unitary.

Also, agreement in computational-basis counts does **not** establish full
unitary equivalence (relative phases can be invisible); unitary validation is
done separately by the provided Python checker and PRISM safety check.

**Limits:** This package was not executed on a live Emerald backend: no
credentials, access URL, or quota were supplied. The code is ready to use with
your backend after the organizer's actual connection method is confirmed.

Official IQM Qiskit adapter guidance:
https://docs.iqm.tech/iqm-client/user_guide_qiskit.html

