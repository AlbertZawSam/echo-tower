# ECHO TOWER

A two-floor, delayed-command 3D puzzle. A blue **explorer** walks the lower room. A violet **echo** in the upper room repeats your *previous* move, one turn late, on a different set of walls. Land both on their exits on the same turn.

## The hook

- **Delay.** The echo does what you did last turn.
- **Two floors, different walls.** A free move below may bump the echo above. The rooms are stacked on the same x/z grid, with vertical guide lines linking matching cells, so 3D is how you reason about the puzzle.
- **Echo Switch (`E`).** Arm it, then move: the echo's copy is reversed (↑↔↓, ←↔→). One use per level. Level 3 cannot be solved without it.

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move (echo repeats next turn) |
| Space | Wait one turn |
| E | Arm / disarm the Echo Switch (free) |
| R | Restart level |
| Tab | Focus layer: both / lower / upper |
| Z / X or drag | Rotate view |
| M · Esc | Mute · pause/help |

Win: both on their own exits after the same turn. Lose: you run out of turns. Bumping a wall still costs a turn.

## Levels

| # | Title | Teaches | Switch | Budget (par) |
|---|---|---|---|---|
| 1 | First Memory | one-turn delay, WAIT | locked | 15 (9) |
| 2 | Crossed Signals | different walls per floor | locked | 15 (13) |
| 3 | Broken Echo | Echo Switch is required | 1 charge | 13 (12) |

All par values come from a BFS solver (`tools/solver.mjs`). `npm test` checks that every level is solvable and that level 3 fails without the switch.

## Run it

```
npm install
npm run dev        # play
npm test           # rules + level verification
npm run submit     # after setting config.js
```

## Status (honest)

- Done and tested in Node: pure rules, all 3 levels, solver, 14 passing checks.
- Written and builds: 3D scene, HUD and overlays, audio, lifecycle.
- **Not yet verified in a browser.** An automated Chrome run found and fixed a layout bug where the canvas was 0px tall. I fixed it and rebuilt, but the re-run didn't finish. Next step: play levels 1–3 end to end, check the console, and review the screenshots.
- The Game Lab 3D starter kit was not in this folder. This is a standalone stand-in with the same layout, so adapt `index.js` and the registry to the real kit's API. See `CLAUDE.md`.
- `config.js` still has placeholder `studentId` / `studentName`, so `npm run submit` will refuse until you set them.

## Layout

```
src/games/echo-tower/   rules, levels, scene, ui, audio, main, index
src/games/index.js      game registry
config.js               studentId, studentName, startGame
tools/ tests/           solver, level finder, submit script, tests
CLAUDE.md               instructions for AI helpers
CREDITS.md              (to add) no external assets are used
```

## Credits

No downloaded assets. All visuals are three.js primitives and all sound is synthesized with WebAudio. The design blueprint is `Echo_Tower_Game_Design_and_Architecture.pdf`. As the exam requires, the final concept, rules and look must be your own, so adjust the theme and add your own rule tweak after playtesting.
