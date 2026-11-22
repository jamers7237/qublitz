# Magic State Verification — QUBLITZ 2026

**Theory / Algorithms Challenge.** How accurately can we verify the magic state
$|T\rangle = \cos\frac{\pi}{8}|0\rangle + \sin\frac{\pi}{8}|1\rangle$ using limited Pauli measurements?

All four levels are solved in one notebook, [`magic_state_verification.ipynb`](magic_state_verification.ipynb).
Each level has the same structure: the idea, the math, the code, experiments, and takeaways that include failure modes.
A bonus section runs the same estimators, unchanged, on single-shot data from a real IQM quantum computer.

## Results at a glance

| Level | Method | Main result |
|---|---|---|
| 1. Reconstruct $\rho$ | Pauli tomography, then radial projection onto the Bloch ball (closest physical state) | Error scales as $1/\sqrt n$ and matches theory. Raw estimates of pure states are unphysical about half the time at every budget. The projection always fixes that, and never increases the error. |
| 2. Estimate $F_T$ | Measure only $X$ and $Z$, because $F_T = \frac12\left(1 + \frac{r_x + r_z}{\sqrt2}\right)$ doesn't depend on $Y$ | 1.5× fewer shots than full tomography for the same accuracy (about 3,000 shots for RMSE 0.01). 95% intervals cover the truth about 95% of the time from about 50 shots. |
| 3. Noisy readout | Asymmetric readout model $\langle P\rangle_\text{obs} = \eta\langle P\rangle + \beta$, calibrated on $\lvert 0\rangle$ and $\lvert 1\rangle$, then inverted; calibration noise propagated with the delta method | Removes a −0.02 to −0.03 bias near $F_T = 1$. Error bars stay honest (about 95% coverage from 400 calibration shots) because calibration uncertainty is included. |
| 4. Certify $F_T \ge 0.95$ | Choose $X$ or $Z$ at random for each shot, which turns every shot into one biased coin; then an anytime-valid confidence sequence (Beta-mixture martingale and Ville's inequality) | Safe under optional stopping: re-checking an ordinary interval every 50 shots falsely PASSes 43% of threshold states, against 1.6% for ours. Wrong decisions occur at most 3% of the time, below the 5% bound. Level 4b adds conservative Clopper–Pearson readout calibration. |
| Bonus: hardware | The same code on 110,000 shots from IQM Emerald (qubit QB1) | Measured readout errors $e_0 = 0.32\%$, $e_1 = 0.56\%$. $\lvert T\rangle$ PASSes in 2,300 shots, and a state with nominal $F = 0.90$ FAILs in 350. A state with nominal $F = 0.97$ measured about 0.960 and is correctly INCONCLUSIVE. Tomography reveals a 1.4–1.9° coherent over-rotation. |

## States, budgets and noise models

- **Test states:**
  - depolarized $|T\rangle$ (incoherent noise);
  - coherently tilted pure states;
  - general noisy states (tilt, rotation out of the X–Z plane, depolarization);
  - uniformly random states.
- **Estimators never see the true state.** They only receive $\pm1$ outcomes from a simulated `Lab` object. The true density matrix is used only afterwards, to score the estimate.
- **Shot budgets:**
  - Level 1: 10–10,000 shots per basis;
  - Level 2: 20–10,000 total shots;
  - Level 3: 4,000 shots on the state plus 40–20,000 calibration shots;
  - Level 4: up to 30,000 shots, checked every 50.
- **Readout errors:** $e_0 = 3\%$ and $e_1 = 5\%$, the same channel for every basis. A 2% error in preparing the reference states is used to demonstrate the SPAM failure mode.
- **Reproducibility:** all randomness is seeded, so a fresh "Run All" reproduces every number in the notebook.

## How to run

Python 3.11 is recommended (tested with 3.11.15).

```sh
cd magic_state_verification
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m ipykernel install --user --name msv --display-name "Python (magic state verification)"
```

Open `magic_state_verification.ipynb`, select that kernel, and run all cells from top to bottom. A full run takes about a minute on a laptop.

Levels 1–4 need only `numpy`, `scipy` and `matplotlib`. The bonus section also needs `qiskit`, `qiskit-aer` and `iqm-client`, all listed in `requirements.txt`.

### Bonus section: hardware data

By default, the bonus section **replays the saved hardware data** in [`hardware_data/magic_state_hardware.json`](hardware_data/magic_state_hardware.json). This file holds the per-shot outcomes plus the job ID and calibration set. Replaying it is free and needs no account. There are two other modes:

- **Local IQM noise model (free):** if the data file is absent, the section collects the same data from IQM's Garnet noise model on your machine.
- **Real hardware (uses IQM Resonance credits):**
  1. Copy `.env.example` to `.env` and fill in your Resonance API token.
  2. Delete the data file.
  3. Set `RUN_ON_HARDWARE = True` in the hardware config cell.

  One job runs 11 circuits × 10,000 shots, about 55 tokens on Emerald. Never commit `.env`; the repository's `.gitignore` excludes it.

## Files

| File | Contents |
|---|---|
| `magic_state_verification.ipynb` | Full solution: methods, experiments with outputs, takeaways, limitations, references |
| `hardware_data/magic_state_hardware.json` | Raw single-shot data from IQM Emerald (job `01a201b6-34b1-7255-b07e-e9d1dabd7814`) |
| `requirements.txt` | Pinned dependencies |
| `.env.example` | Template for IQM Resonance credentials (bonus section only) |

## Limitations and failure modes

Each is demonstrated in the notebook:
- **Small budgets:** normal-approximation error bars under-cover with tens of shots, or with fewer than a few hundred calibration shots.
- **SPAM ambiguity:** errors in preparing the reference states look like readout errors, so they bias the corrected fidelity **upward**.
- **Near-threshold states are expensive:** INCONCLUSIVE is the honest outcome there.
- **Fidelity is one number:** it can't tell coherent from incoherent errors, as the hardware over-rotation shows.
- **Assumptions:** shots are independent and identically distributed (no drift), and one readout channel applies to all bases.

## Attribution

- **Published methods,** cited inline in the notebook as [1]–[11]:
  - Bravyi–Kitaev (magic states);
  - Gidney–Shutty–Jones (magic-state cultivation);
  - Smolin–Gambetta–Smith (physical projection);
  - Flammia–Liu (direct fidelity estimation);
  - Clopper–Pearson (exact binomial bounds);
  - Ville; Robbins; Howard–Ramdas–McAuliffe–Sekhon; Waudby-Smith–Ramdas (anytime-valid inference);
  - IQM Resonance and `iqm-client` (hardware access).
- **AI assistance:** the code and explanations were drafted with the help of Claude (Anthropic), as allowed by the challenge rules. The team verified and understood all of the concepts and code.
