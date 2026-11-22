# PRISM — reproducible experimentation

Generated using `python run_experiments.py` with fixed random seed 20261121.
All reported equivalence checks compare full unitaries up to global phase.
Results are for the local abstract cost function, **not** physical IQM error rates.

## Representative circuits (balanced weights)

| Test | 1q before→after | CX before→after | Depth before→after | Cost before→after | Reduction |
|---|---:|---:|---:|---:|---:|
| L1-adjacent-HH | 2→0 | 0→0 | 2→0 | 2.4→0 | 100% |
| L1-phase-folding | 3→1 | 0→0 | 3→1 | 3.6→1.2 | 66.67% |
| L2-hidden-CX-Z-CX | 1→1 | 2→0 | 3→1 | 13.6→1.2 | 91.18% |
| L2-X-phase-global | 4→0 | 0→0 | 4→0 | 4.8→0 | 100% |
| L3-parity-echo | 2→0 | 4→0 | 6→0 | 27.2→0 | 100% |
| L3-H-conjugation | 3→1 | 0→0 | 3→1 | 3.6→1.2 | 66.67% |
| L3-remote-wire | 3→3 | 2→0 | 3→2 | 15.6→3.4 | 78.21% |
| L3-long-linear | 0→0 | 6→0 | 6→0 | 37.2→0 | 100% |
| L4-parallel-depth | 2→2 | 4→0 | 3→1 | 26.6→2.2 | 91.73% |
| L4-six-qubit-mixed | 5→3 | 6→0 | 7→1 | 42.4→3.2 | 92.45% |
| L4-weight-tradeoff | 1→2 | 2→0 | 3→1 | 13.6→2.2 | 83.82% |
| L3-nonlocal-parity-fingerprint | 2→0 | 11→7 | 11→6 | 70.2→43.2 | 38.46% |
| L3-parity-gauntlet-49-to-1 | 5→1 | 44→0 | 41→1 | 277.2→1.2 | 99.57% |

## Generalization across random circuits

| Configuration | Instances | Improved | Mean cost reduction | Maximum runtime |
|---|---:|---:|---:|---:|
| balanced | 25 | 23 | 31.62% | 112.9 ms |
| CX-heavy | 25 | 23 | 31.30% | 114.9 ms |
| depth-heavy | 25 | 23 | 36.37% | 105.6 ms |
| single-heavy | 25 | 23 | 33.59% | 114.2 ms |

## Important limitations

- Hadamard gates break phase-polynomial segments; cross-H phase identities are found only by local search.
- Exact bounded local synthesis is not a global optimum guarantee.
- Random benchmarks are seeded synthetic instances, not organizer hidden tests.
- A successful computational-basis measurement comparison alone does not prove unitary equivalence.

## Reproduce

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python run_experiments.py
```
