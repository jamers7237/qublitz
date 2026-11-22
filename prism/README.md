# PRISM — Parity-Resolved Intelligent Synthesis and Minimization

**Qublitz 2026 | Quantum Circuit Golf**

An explainable, cost-aware, *equivalence-verified* optimizer for 1–6-qubit
Clifford+T circuits.  Built for the organizer's exact Python interface.

## Five-minute setup

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python run_experiments.py
python run_ablations.py
python verify_reference.py /path/to/organizer/CircuitHelp.py  # Optional external check
```

## Complete competition-ready study and teaching package

**New to the project? Start with `START_HERE.md`; it is a paced 15-minute
walkthrough of the code, evidence, and presentation.**

The competition entrypoint is **still only `submission.py` plus NumPy**. The
following independent files provide the submission report, complete experiment
ledger, figures, physical-hardware runbook, and judges' speaking preparation:

```bash
# All offline tests, including the phase-sensitive IQM probe math
python -m unittest discover -s tests -v

# Original curated experiment suite and organizer cross-check
python run_experiments.py
python run_ablations.py

# Full measured evidence suite: 380 circuits x 7 weights = 2660 runs
python full_study.py
python verify_full_study_external.py  # Recheck all stored pairs using provided organizer helper

# Additional controlled timing: 1-6 qubits x 6 sizes x 3 seeds = 108 trials
python study_scaling.py

# Install reporting tools and regenerate *all figures and the report* from CSV
python -m pip install -r requirements-reporting.txt
python create_study_visuals.py
python create_iqm_notebook.py
python create_experiment_notebook.py
python build_full_report.py

# Separately, regenerate the POST-report physical-hardware addendum
# from actual, completed IQM job results saved in results/iqm_evidence/.
python make_iqm_addendum.py

# No-hardware judge demonstrations
python demo_live.py
python demo_live.py --random-family mixed --seed 538812
```

Submission assets:

- **`PRISM_Competition_Report.pdf`** — data-driven OFFLINE challenge-compliance and results report, frozen before hardware execution.
- **`results/IQM_Emerald_Hardware_Addendum.pdf`** — later physical Emerald evidence, real job IDs, TVD uncertainty, calibration caveats, and native resource comparisons.
- **`results/IQM_Emerald_Hardware_Addendum.md`**, **`results/iqm_hardware_run_summary.csv`**,
  and **`results/iqm_evidence/`** — reproducible, independently rechecked completed QPU results. Add subsequent uniquely named IQM JSON files and rerun `make_iqm_addendum.py`.
- **`results/iqm_level3_compile_only.json`** — separately labeled Qiskit level-3 dry-run evidence; NOT a QPU execution.
- **`PRISM_Experiment_Replay.ipynb`** — interactive evidence replay and new-seed
  demos, with complete stored-circuit unitary checks.
- **`full_study/EXPERIMENT_LOG.md`** — verified execution summary; its raw
  `cases.jsonl`, `circuits.jsonl`, `runs.csv`, `ablations.csv`, `scaling.csv`,
  `study_manifest.json`, and `failure_cases.json` are the audit trail.
- **`full_study/organizer_rechecked_runs.csv`** — a SECOND implementation's
  equivalence and score assessment on every stored pair, using the supplied
  `CircuitHelp.py`; this is not the hidden organizer test set.
- **`visuals/`** — six charts generated from measured CSV files.
- **`UNDERSTAND_PRISM.md`** — detailed mathematics and code-level teaching.
- **`LIBRARIES_AND_QUANTUM_SDK.md`** — NumPy, Qiskit, IQM, Python standard
  library, and the original screenshot's code explained line-by-line.
- **`JUDGE_SCRIPT_FULL.md`** — word-for-word four-minute talk and Q&A.
- **`NOTEBOOK_DRAWINGS.md`** — exact sketches and lab-note templates.
- **`SUBMISSION_CHECKLIST.md`** — official requirement-by-requirement final audit.
- **`IQM_LIVE_RUNBOOK.md`** and **`IQM_Emerald_Demo.ipynb`** — safe IQM workflow;
  new physical execution remains explicit opt-in. One initial Emerald job pair is included in the newer hardware addendum.
- **`challenge_materials/`** — preserved organizer-provided PDFs and
  `CircuitHelp.py` for direct comparison; these are external reference inputs,
  **not** part of our authored optimizer.

The 49-to-1 example is intentionally constructed to reveal an invariant. The
full 380-circuit / seven-profile data, including unchanged cases and ablations,
is required to assess broader behavior. The 2660-run study is from local full-unitary tests,
**not** the organizers' unknown held-out benchmark or physical QPU runs.
Later physical IQM records are documented **separately** in the hardware addendum.

**To submit:** create/push a GitHub repository containing the contents of this
directory, verify the expected files are at its root, then submit the GitHub URL
under the organizers' instructions. A ZIP itself is not the required GitHub URL.

The organizers only need `submission.py` (and the declared NumPy dependency):

```python
from submission import optimize

circuit = {
    "n_qubits": 2,
    "gates": [
        {"gate": "CX", "qubits": [0, 1]},
        {"gate": "Z", "qubits": [0]},
        {"gate": "CX", "qubits": [0, 1]},
    ],
}
config = {"w1": 1.0, "w2": 6.0, "wd": 0.2}
print(optimize(circuit, config))
# {'n_qubits': 2, 'gates': [{'gate': 'Z', 'qubits': [0]}]}
```

## What distinguishes PRISM?

**Its core abstraction is not a list of neighboring gates. It is the parity
function carried by each qubit.** On Hadamard-free regions the circuit maps
each input bit string `x` to affine parities, and diagonal phases accumulate on
those parities. PRISM combines equal-parity phase terms even when separated by
X/CNOT networks, then places the reduced phases at legal points of the circuit.

It combines this with two other techniques:

1. **Automatically discovered local synthesis:** A bounded library of 1- and
   2-qubit unitary fingerprints is generated by enumeration, keeping
   nondominated gate-count/depth candidates. Interleaved disjoint-wire gates
   are transparent. Local replacements are selected using the *whole-circuit*
   weighted resource cost.
2. **GF(2) affine network rebuilding:** Pure X/CNOT segments are interpreted
   as a reversible binary linear transformation with an XOR offset, and
   candidate implementations are obtained by Gaussian elimination.
3. **Full-unitary safety net:** Every modified returned circuit is checked
   against the original using a separate amplitude-based matrix evolution,
   with equality up to global phase. If that check fails, return the original.

The optimizer *never* needs remote hardware, an API key, an ancilla, a gate
outside the permitted eight, or a hardcoded example. The input dictionaries
are not mutated. A strictly lower weighted cost is required before retaining
an optimization.

### What is original versus established?

Phase polynomials, GF(2) elimination, exact synthesis, and cost-based search
are established research techniques. PRISM's contribution is the practical,
lightweight **hybrid of parity tracking, alternative phase placements,
bounded exact local enumeration, and cost-aware candidate acceptance** tailored
to this challenge. We make **no claim** of inventing phase polynomials or
achieving global optimality.

## Competition requirements checklist

| Organizers' rule | PRISM implementation |
|---|---|
| `submission.py` exports `optimize(circuit, config)` | Yes |
| Output format identical to input | Yes |
| No mutation | Deep-copy output, immutable input processing |
| 1–6 qubits, exactly eight gates | Explicit format check, no extra operations |
| Exact unitary up to global phase | Independent full-unitary check + fallback |
| Changing resource weights | Whole-circuit `w1*N1q + w2*N2q + wd*depth` |
| Automatic unseen inputs | Circuit-independent rewrite and symbolic passes |
| Multiple levels of challenge | Cancellation, hidden parity, compilation, cost awareness |
| Reproducible experiments | `tests/`, `experiments/circuits.json`, `run_experiments.py` |
| Report with gains, equivalence, limitations | `results/EXPERIMENTS.md` |
| GitHub dependencies/instructions | This README + `requirements.txt` |
| Live demonstration | `results/demo_outputs.json` + `JUDGE_DEMO.md` |
| Third-party/AI attribution | `RESEARCH_AND_ATTRIBUTION.md` |

## Files

```text
submission.py                 Competition entrypoint (NumPy only)
requirements.txt              Minimal dependency
tests/test_optimizer.py        Deterministic + randomized correctness tests
experiments/circuits.json     Handcrafted Levels 1–4 demo circuits
run_experiments.py            Additional seeded random suite, CSV + report
run_ablations.py              Compare ablated optimizer stages
verify_reference.py           Optional check against organizers' own helper
results/benchmark_results.csv Machine-readable measured experiments
results/EXPERIMENTS.md        Concise report, benefits and limitations
results/ABLATION.md           Evidence of phase-method contribution
results/demo_outputs.json     Before/after examples for presentation
iqm_emerald_demo.py           Optional Qiskit/IQM translator and experiment
IQM_EMERALD.md                Hardware access and realistic claims
JUDGE_DEMO.md                 Presentation outline and questions
RESEARCH_AND_ATTRIBUTION.md  Papers, originality boundaries, AI assistance
```

## Limitations / known future improvements

- H gates partition the global phase-polynomial sweep (even a distant H).
- Exact local search is bounded to 1–2 wire subcircuits and short windows.
- Affine re-synthesis covers *pure* X/CNOT stretches, not arbitrary simultaneous
  phase-poly synthesis; this limits potential 2-qubit-gate savings.
- The best candidate under a local weighted cost is not necessarily globally
  optimal. Search-space expansions can improve results at a runtime cost.
- The automatic verifier is numerical at `1e-8`; unlike formal exact algebra,
  this is not a symbolic proof for arbitrarily long circuits.
- Qiskit/IQM's native gate costs differ from the challenge's logical costs;
  collect physical gate counts independently on the target backend.

## Research foundations

See [RESEARCH_AND_ATTRIBUTION.md](RESEARCH_AND_ATTRIBUTION.md). Authors' work
includes Amy–Azimzadeh–Mosca's parity-network synthesis and the Quartz and
Quasar rewrite-search compilers.

