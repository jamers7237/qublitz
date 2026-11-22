# Debugging guide

## Open the debug / judge overlay

Add `?debug=1` to the URL: `http://localhost:5173/?debug=1`. The overlay never appears in normal play. It has five tabs:

| Tab | What you get |
|---|---|
| **session** | seed, hidden phase `s` (and the chord it implies), timeline index / status / mode, the measured 8-bit string or echo bit, next mode, lantern, **route buffer and its parsed address**, revealed addresses, the state of all eight household sensors. Buttons: restart with the same seed, new random seed, simulate a rewind, **copy bug-report JSON**. |
| **quantum** | the live self-validation checks, echo expectations vs. observed echoes, all 16 supported labels with **amplitude, Born probability and the journal's observed frequency**, a separate **unlogged** 4000-shot simulation, and the full gate list. |
| **world** | hovered/focused object ID, its texture ID and **file path** (or "procedural"), asset load report, hitbox toggle (also the `` ` `` key), teleport to any room (test only). |
| **progress** | every unlock predicate, all flags, the player's House Manual hypotheses (with VERIFIED markers), inventory, recent actions. |
| **tools** | labelled demo checkpoints (prologue / midpoint / late / vault), grant or clear Roommate Exchange items, **reset one minigame**, reset the save slot (asks for confirmation). |

Debug actions are deliberately side-effect-free for the story. Teleporting writes no route symbols and starts no timeline. The unlogged simulation never touches the journal. Checkpoint data is labelled `ARCHIVE`.

## Reproduce a particular seed

- `?seed=12345` pins the seed for the **next New Game** (combine with `&debug=1`).
- Debug → session → **restart same seed** restarts the current seed from scratch.
- Every fresh timeline uses its own random stream keyed by `(seed, "timeline", index)`, so timeline #7 of seed 12345 always produces the same note, on any machine. Reloading a save continues the same sequence. The toaster uses `(seed, "toaster", activation, slot)`.
- `npm run experiments -- <shots> <seed>` reproduces engine statistics offline.

## Bug reports

Debug → session → **copy bug report JSON** copies: version, build hash, seed and phase, nickname (the only personal field), room, hovered/focused object and its texture path, route buffer, timeline, flags, puzzle state, inventory, counts, the last 20 actions and the asset load report. Paste it into the issue.

## View collisions and hotspots

Press `` ` `` (backtick) in debug mode, or use the world tab:

- red = wall collision, orange = furniture footprint (`solid`), yellow = clickable hitbox (`hit`), faint teal = keyboard reach, cyan = door trigger, white = player feet.

All of these come from `src/data/roomLayouts.ts`.

## Reset one puzzle without losing progress

Debug → tools → *Reset one minigame* → `calibration` / `listening` / `switchboard` / `mirror` / `ledger` / `toaster` / `vault`. This restores that puzzle's initial state only. The journal, House Manual, inventory and other puzzles are untouched. Flags already granted by later milestones stay; use a checkpoint if you need a clean slice.

## Recover a corrupted save

The save lives in `localStorage["schrodingers-home/save/v1"]` (settings in `…/settings/v1`).

- If it fails validation, the title screen says so and offers **Copy raw save** and **Discard it**. The game never crashes on a bad save.
- To hand-repair: copy the raw JSON, fix it, then in the console run `localStorage.setItem('schrodingers-home/save/v1', '<json>')` and reload.
- Nuclear option: debug → tools → reset save slot, or `localStorage.clear()`.

## Normal vs. echo measurements (how to read them)

| | NORMAL / SIDE Z | ECHO / SIDE X |
|---|---|---|
| Copies prepared | 1 per entry from the hallway | 1 per entry from the hallway |
| What is measured | all 8 qubits in Z | only qubit A, after the parity network is uncomputed and H(A) is applied |
| Result | one 8-bit string → one note; all 8 household sensors resolve | one bit → hollow (0) or bright (1) ghost tone |
| Household sensors | physical states from that string | "unresolved" shimmer (the window stays open: CAT is constant) |
| Brass lever | reveals the measured state at an address | "The house has no new ordinary reading in this frequency." Nothing logged. |
| Journal | `journal.shots` (`source: timeline / toaster / archive`) | `journal.echoes` (kept separate) |
| Phase dependence | none: identical distributions for s=0/1 | P(0) = 0.264 (s=0) vs 0.736 (s=1) |

The mode chosen at the gramophone applies to the **next** fresh entry only. It never changes a note that has already been measured.

## Common issues

| Symptom | Cause / fix |
|---|---|
| No sound | Browsers start audio only after a click; the title buttons unlock it. Check Settings → Mute and the volume sliders. |
| Clicking an object does nothing | A dialogue/panel is open, a rewind animation (1.3 s) is playing, or you are mid-room-transition. All are intentional input locks. |
| Pressing E right after closing a dialogue does nothing | The 180 ms keyboard debounce stops the same key press from re-triggering the object. |
| A replaced PNG does not show | Check the exact path in the manifest; the world tab shows the resolved file; `loadReport.failed` lists decode failures. |
| A sprite is offset | Its anchor is bottom-centre at the layout's `x, y`. Adjust the coordinates in `roomLayouts.ts`, not the gameplay code. |
| Blank screen | The error boundary shows the stack and a "Reload in debug mode" button. Asset failures fall back to procedural art and are logged as `[assets] …` warnings. |
| Tests | `npm test` (logic and quantum, no browser), `npm run smoke` (drives the real game in Chrome; screenshots in `smoke-screenshots/`). |

## Quick play and complete solutions (spoilers)

Open `http://localhost:5173/?debug=1&seed=2025`, choose New Game, enter a name,
and begin. The seed applies to New Game; Continue preserves the saved seed.
WASD/arrows move; E/Space or click interacts; N opens the notebook; Esc closes panels.

For a quick ending: DEBUG → tools → **Quick finale · fill correct score**.
This loads a clearly labelled archived checkpoint, fills the correct melody/chord,
and teleports to the vault. Advance the checkpoint dialogue, collapse DEBUG with ▼,
click the vault, and submit. For room exploration use DEBUG → world → teleport.
Teleporting does not write route symbols or prepare a fresh measurement.

### Routes and House Manual

Start each route with an empty buffer. Enter a bedroom and return to common for
each L/R symbol, then pull the brass lever to commit and clear the route.

| Address | Route | Object | Zero | One | Property |
|---|---|---|---|---|---|
| 1 | R | Window | closed (never sampled) | open | cat |
| 2 | RL | Left closet | latched | ajar | voice |
| 3 | RR | Trash | empty | full | voice |
| 4 | RLL | Couch | clean | stained | height |
| 5 | RLR | Clock | stopped | ticking | height |
| 6 | RRL | Lamp | dark | lit | height |
| 7 | RRR | Juice bottle | sealed | spilled | breath |
| 8 | RLLL | Radiator | cold | warm | breath |

### Puzzle solutions

- Notebook: match the first recorded note. Candidate positions depend on the seed;
  replay the first recording and the three candidate sounds.
- Cabinet: measure with an **empty slot**, then insert **X** and measure again.
- Listening: **2–3 voice; 4–6 height; 7–8 breath**.
- Switchboard: target **6**, inputs **2,4**; target **7**, inputs **3,5**;
  target **8**, inputs **2,5**.
- Mirror: final orientations **╲, ╱, ╱** (`[2,0,0]`). From the untouched puzzle,
  click shard 1 once, shard 2 once, shard 3 three times.
- Cartridge: after the mirror, open the hatch under the gramophone and install it.
- Ledger: **2 → 2:1; 3 → 3:1; 4 → 5:1; 5 → 7:1**.
- Toaster: choose the higher observed count, then **evidence, not certainty**.
- Lantern: optional; any address is valid. No secret code.
- Optional exchange: **prism → right projector; cassette → left Listening Desk;
  wind-up key → right metronome**.
- Ending: open the box and choose **Alive**. Dead is a fake-reset joke.

### Vault order (least to most probable)

Labels are `CAT I1 I0 P2 P1 P0 T1 T0`. The order is the same for every seed.

| # | Label | Weight | Note |
|---|---|---|---|
| 1 | 10000000 | 1 | Felt piano · C3 · eighth |
| 2 | 11000101 | 2 | Pizz. cello · D3 · quarter |
| 3 | 10100010 | 3 | Music box · C3 · half |
| 4 | 10010100 | 5 | Felt piano · A3 · eighth |
| 5 | 11100111 | 6 | Pulse synth · D3 · whole |
| 6 | 10001011 | 7 | Felt piano · E3 · whole |
| 7 | 11010001 | 10 | Pizz. cello · G3 · quarter |
| 8 | 11001110 | 14 | Pizz. cello · F3 · half |
| 9 | 10110110 | 15 | Music box · A3 · half |
| 10 | 10101001 | 21 | Music box · E3 · quarter |
| 11 | 11110011 | 30 | Pulse synth · G3 · whole |
| 12 | 10011111 | 35 | Felt piano · B3 · whole |
| 13 | 11101100 | 42 | Pulse synth · F3 · eighth |
| 14 | 11011010 | 70 | Pizz. cello · B♭3 · half |
| 15 | 10111101 | 105 | Music box · B3 · quarter |
| 16 | 11111000 | 210 | Pulse synth · B♭3 · eighth |

Chord: **C major for phase 0; C minor for phase 1**. New-game seed **2025 = C major**.
DEBUG → session reveals the exact phase of your current save. Without debug, a
SIDE X hollow (0) majority suggests minor; a bright (1) majority suggests major.
This is statistical evidence, so small samples can mislead you.

Existing saves migrate the old address-7 dry/dripping notebook entries to sealed/spilled (including earlier leaking-bottle entries).
The legacy internal object ID `sink` is retained only for save compatibility.
