# CLAUDE.md — Echo Tower (Game Lab 3D practical exam)

You are helping a student build **Echo Tower**, a 3D puzzle game, for an individual exam.
The student is the designer and reviewer. Concept, rules and look are theirs and are what is marked. Implement what they describe, and don't invent new rules silently.

## Scoring priorities (work in this order)

1. **Concept & creativity (30)** — the hook is *delayed echo + one-use Echo Switch on two stacked floors*. 3D must be essential: the player compares the lower and upper rooms through aligned cells. Don't dilute this.
2. **Mechanics (30)** — rules clear and learnable from the start screen, real decisions, difficulty that grows, no exploits. Every level must be solver-verified. Level 3 must be impossible without the switch.
3. **Visuals & feel (25)** — readable state, feedback on every action (move, bump, switch, win, lose), sound, a distinct win/lose moment. Do this only after rules and levels work.
4. Completeness R1–R8 (10) and submission (5) — keep the buffer (about 60 min) for these.

## Hard rules (from the exam paper)

- Game lives in `src/games/echo-tower/` and is registered in `src/games/index.js` (R1).
- Offline only. No network calls at runtime, no servers, accounts or tracking.
- Do **not** add npm packages. `three` and `vite` are the only dependencies. They stand in for the real kit.
- Never touch `settings.json` or `guard.mjs` if they exist. Tampering counts as misconduct.
- Any downloaded asset must be listed in `CREDITS.md`. Currently there are none: all visuals are primitives and all sound is synthesized.
- No console errors during normal play (R7).
- Set `studentId`, `studentName`, `startGame` in `config.js` before `npm run submit`.

## Important caveat: the starter kit was not available

The Game Lab 3D starter kit (`src/engine/`, `guard.mjs`, `DEPLOY.md`, the kit's own `CLAUDE.md`) was **not in this folder**. This project is a standalone stand-in with the same layout. When the real kit is present:
- Read its `CLAUDE.md`, then adapt `src/games/echo-tower/index.js` and the registry to the kit's real API.
- Prefer kit services (`src/engine/` audio, UI, look presets) over `audio.js` / `ui.js` where they fit.
- `rules.js` and `levels.js` are engine-independent and should move over unchanged.

## Architecture

```
src/games/echo-tower/
  rules.js    pure turn logic (no DOM/three). Single source of truth for gameplay
  levels.js   3 authored levels (par = verified shortest solution)
  scene.js    three.js renderer: two floors, actors, arrow, particles, camera. Draws state only
  ui.js       DOM overlay: start/help, HUD, toasts, win/lose/pause
  audio.js    WebAudio synth, no files
  main.js     lifecycle + input -> rules -> view/HUD/audio; returns { dispose }
  index.js    registration object { id, title, start(container) }
tools/        dev-only: solver.mjs (BFS), find-levels.mjs (level search), submit.mjs
tests/        rules.test.mjs (acceptance tests + level verification)
```

Rules logic never touches rendering. Animations never change logical coordinates.

## Gameplay rules (do not change without the student's say-so)

- Turn order: ghost runs its *already queued* command, explorer runs the new command, then the new command is queued for the ghost. The ghost's first command is WAIT.
- Commands: UP/DOWN/LEFT/RIGHT/WAIT. A blocked move still costs a turn and is still queued. WAIT costs a turn.
- Each floor has its own walls (explorer = bottom, ghost = top). Same x/z frame.
- Echo Switch: `E` arms (no turn cost). The next *directional* move is queued inverted (U↔D, L↔R). The explorer uses the original. WAIT does not spend it. Charges: 0, 0, 1 for levels 1–3.
- Win: both on their own exits after the same resolved turn. Lose: turn count reaches `maxTurns`.
- Input is locked about 0.27s while actors animate, and key repeat is ignored.

## Commands

```
npm run dev       # vite dev server
npm test          # rules + level verification (must pass before any commit)
npm run build     # production build to dist/
npm run submit    # test, build with Build ID, write SUBMISSION.txt, zip
```

After ANY level edit: run `npm test`. It re-solves each level, checks par, and checks that level 3 fails without the switch. To design new levels, use `node tools/find-levels.mjs <seed> <1|2|3>`.

## Working agreements

- Play every change in the browser before calling it done. Report test failures plainly.
- Keep the diff small, and match the existing style.
- If you edit anything after `npm run submit`, re-run submit and redeploy so Build IDs match.
