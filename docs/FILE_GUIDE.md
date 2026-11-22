# What each file does

| File | Purpose |
|---|---|
| `README.md` | Setup, commands, scope, evidence, and current status |
| `pyproject.toml` | Python package metadata, compatible dependencies, CLI entry point, pytest settings |
| `requirements.lock.txt` | Exact installed development environment for reproducing recorded runs |
| `.gitignore` | Excludes the virtual environment, Python caches, and private `.env` credentials; non-secret hardware evidence is included |
| `.env.example` | Template for privately configuring IQM; contains no real credentials |
| `.env` | Private local IQM settings; replace the placeholder with your token; excluded from Git |
| `quantum_minesweeper/__init__.py` | Package definition |
| `quantum_minesweeper/__main__.py` | Enables `python -m quantum_minesweeper` |
| `quantum_minesweeper/codes.py` | Encoders, deliberate fault injection, fixed syndrome extraction/decoding, coherent recovery, terminal verification circuits |
| `quantum_minesweeper/analysis.py` | Qiskit bit-order conversion, syndrome classification, unconditional logical survival, and binomial confidence intervals |
| `quantum_minesweeper/verification.py` | Exhaustive exact-state checks across every allowed fault; random inputs and entangled-reference preservation |
| `quantum_minesweeper/field_theory.py` | Builds finite stabilizer Hamiltonians, checks defects/ground sectors, and evaluates the Knill–Laflamme correction condition |
| `quantum_minesweeper/experiments.py` | Creates circuit suites and writes QASM/text, raw counts, JSON reports, and dependency versions |
| `quantum_minesweeper/iqm_runner.py` | Selects IQM backend, compares native compilations, saves artifacts, submits once, and retrieves results |
| `quantum_minesweeper/cli.py` | User commands: verify, simulate, export, iqm, iqm-submit, iqm-fetch, report |
| `quantum_minesweeper/report.py` | Regenerates the readable result summary and an SVG chart from actual saved results |
| `tests/test_codes.py` | Quantum-correctness, coherent-noise, bit-order, and expected-limit tests |
| `tests/test_iqm.py` | Native IQM compilation, QPY persistence, local simulation, and submission-guard tests |
| `docs/THEORY.md` | Mathematical derivation, field-theory connection, syndrome tables, and proof of quantum preservation |
| `docs/IQM.md` | Credentials, IQM commands, budget, persistence, and experimental interpretation |
| `docs/DEMO.md` | A short live-demo script and likely judging questions |
| `docs/HARDWARE_RESULTS.md` | Actual Garnet experiment: job ID, circuit design, all configurations, uncertainty, and interpretation |
| `docs/SUBMISSION.md` | Complete written submission and section 6/7 assessment crosswalk |
| `docs/PRESENTER_NOTES.md` | Editable speaking notes for every slide |
| `scripts/live_demo.py` | Offline walkthrough of circuits, successful cases, expected failures, and saved real QPU measurements |
| `scripts/export_native_circuit.py` | Reads the actual compiled QPY and exports the native phase-sensitive witness circuit |
| `scripts/presentation_content.py` | Editable main/appendix slide copy and speaker explanations |
| `scripts/build_submission.py` | Builds the PDF talk, guide with circuit images, and written report |
| `scripts/render_submission.py` | Renders every page and checks text stays within page boundaries |
| `output/pdf/Quantum_Minesweeper_Presentation.pdf` | The presentation for live judging |
| `output/pdf/Presenter_Guide.pdf` | Speaker guide with circuit diagrams, examples, and run instructions |
| `output/pdf/Submission_Report.pdf` | Written results and assessment evidence for submission |
| `circuits/*.txt` | Seven representative readable quantum circuit drawings |
| `circuits/*.qasm` | The same seven circuits as OpenQASM 3 |
| `results/verification.json` | All exact-state records and Hamiltonian/correction checks |
| `results/ideal.json` | All ideal shot-based data, including recovery-disabled controls |
| `results/fake-adonis/` | Actual local IQM noisy level 1–3 experiments; logical/native circuits, backend snapshot, counts, metrics |
| `results/fake-garnet-level4/` | Actual local IQM noisy type-detection experiments across all 13 configurations |
| `results/iqm-pilot/` | Real Garnet job ID, native circuits, calibration/topology snapshot, and all raw hardware counts |
| `results/SUMMARY.md` | Human-readable findings generated from saved evidence |
| `results/comparison.svg` | Chart of ideal and representative IQM noisy results |

`.venv/` is a local installed environment, not source to submit. The exact dependency lock includes PDF inspection tools used during development; the package itself only needs the dependencies in `pyproject.toml`.

The challenge PDF remains at the original supplied path; the repository does not silently copy or publish it. The code repository and documentation are ready for review, but no GitHub repository is created or published automatically.
