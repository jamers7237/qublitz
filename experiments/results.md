# Experiment results (generated)

Seed 2025, 20000 shots per experiment, generated 2026-11-22T08:47:30.488Z by `npm run experiments`.

## Validation

| Check | Result | Detail |
|---|---|---|
| State norm = 1 | PASS | 1.000000000000000 |
| CAT always 1 | PASS | every supported label starts with 1 |
| Exactly 16 supported labels | PASS | 16 non-zero of 256 |
| All parity relations hold | PASS | P0 = I1 ⊕ P2; T1 = I0 ⊕ P1; T0 = I1 ⊕ P1 |
| Codebook coverage 4/8/4 | PASS | 4 instruments, 8 pitches, 4 durations |
| Born probs = 2^A3^B5^C7^D/576 | PASS | max |err| = 6.94e-17 |
| All 16 probabilities distinct | PASS | 16 distinct weights |
| Z distribution phase-invariant | PASS | max |p(s=0)-p(s=1)| = 0.00e+0 |
| Echo P(0|s) matches theory | PASS | s=0: 0.2642977396, s=1: 0.7357022604 |
| CZ entangles superposed A,B | PASS | Tr(rho_A^2): with CZ 0.6667, without 1.0000 |

## Normal (Z-basis) shots vs Born rule

| # | Outcome | Weight | Theory | Empirical s=0 | Empirical s=1 |
|---:|:---:|---:|---:|---:|---:|
| 1 | `10000000` | 1 | 0.00174 | 0.00185 | 0.00135 |
| 2 | `11000101` | 2 | 0.00347 | 0.00335 | 0.00330 |
| 3 | `10100010` | 3 | 0.00521 | 0.00525 | 0.00470 |
| 4 | `10010100` | 5 | 0.00868 | 0.00810 | 0.00915 |
| 5 | `11100111` | 6 | 0.01042 | 0.01030 | 0.01080 |
| 6 | `10001011` | 7 | 0.01215 | 0.01175 | 0.01175 |
| 7 | `11010001` | 10 | 0.01736 | 0.01805 | 0.01675 |
| 8 | `11001110` | 14 | 0.02431 | 0.02255 | 0.02480 |
| 9 | `10110110` | 15 | 0.02604 | 0.02725 | 0.02590 |
| 10 | `10101001` | 21 | 0.03646 | 0.03725 | 0.03575 |
| 11 | `11110011` | 30 | 0.05208 | 0.05195 | 0.05070 |
| 12 | `10011111` | 35 | 0.06076 | 0.05765 | 0.06365 |
| 13 | `11101100` | 42 | 0.07292 | 0.07220 | 0.07245 |
| 14 | `11011010` | 70 | 0.12153 | 0.12160 | 0.11975 |
| 15 | `10111101` | 105 | 0.18229 | 0.18395 | 0.18430 |
| 16 | `11111000` | 210 | 0.36458 | 0.36695 | 0.36490 |

Chi-square (15 dof; 95% critical value 25.0): s=0 → 9.81, s=1 → 9.36. Zero unsupported labels were ever sampled.

## Echo (X-basis) experiment

| Phase | Theory P(echo=0) | Empirical | Std. error |
|---|---:|---:|---:|
| phase0 | 0.264298 | 0.267000 | ±0.0031 |
| phase1 | 0.735702 | 0.735700 | ±0.0031 |

## Lantern partial measurement

10000/10000 final notes agreed with the pre-measured bit (must be 100%).

## Entanglement witness

Purity of A's reduced state after source prep: with CZ 0.6667, without CZ 1.0000.

## How many echoes does a player need?

| Echoes | P(majority points to the right chord) |
|---:|---:|
| 4 | 82.7% |
| 8 | 91.5% |
| 12 | 95.6% |
| 16 | 97.6% |
| 20 | 98.7% |
| 30 | 99.7% |
