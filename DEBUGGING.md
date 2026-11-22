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
