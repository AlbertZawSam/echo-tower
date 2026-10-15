// Dev-only: random search for levels matching a difficulty profile. Seeded, reproducible.
import { solve } from './solver.mjs';
let seed = Number(process.argv[2] ?? 7);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const ri = (n) => Math.floor(rnd() * n);
const N = 5;
function floor(nWalls, start, goal) {
  const walls = [];
  while (walls.length < nWalls) {
    const c = [ri(N), ri(N)];
    if ((c[0] === start[0] && c[1] === start[1]) || (c[0] === goal[0] && c[1] === goal[1])) continue;
    if (walls.some((w) => w[0] === c[0] && w[1] === c[1])) continue;
    walls.push(c);
  }
  return walls;
}
const profiles = {
  1: { walls: [3, 4], min: 6, max: 9, charges: 0, slack: 6, needSwitch: false },
  2: { walls: [6, 8], min: 9, max: 13, charges: 0, slack: 2, needSwitch: false },
  3: { walls: [6, 9], min: 9, max: 14, charges: 1, slack: 1, needSwitch: true },
};
const want = Number(process.argv[3] ?? 1);
const p = profiles[want];
for (let i = 0; i < 400000; i++) {
  const bs = [0, ri(N)], bg = [N - 1, ri(N)], ts = [ri(N), 0], tg = [ri(N), N - 1];
  const lvl = {
    id: want, size: N, switchCharges: p.charges, maxTurns: 30,
    bottom: { start: bs, goal: bg, walls: floor(p.walls[0] + ri(p.walls[1] - p.walls[0] + 1), bs, bg) },
    top: { start: ts, goal: tg, walls: floor(p.walls[0] + ri(p.walls[1] - p.walls[0] + 1), ts, tg) },
  };
  const sol = solve(lvl);
  if (!sol || sol.length < p.min || sol.length > p.max) continue;
  const usesSwitch = sol.some((m) => m.startsWith('E+'));
  const tight = { ...lvl, maxTurns: sol.length + p.slack };
  if (p.needSwitch) {
    if (!usesSwitch) continue;
    if (solve(tight, { allowSwitch: false })) continue; // must be impossible without switch in budget
  }
  // Floors should differ in a meaningful way: the no-delay-aware naive plan must not equal ghost path
  console.log(JSON.stringify({ ...tight, solution: sol }));
  if (--process.argv.length < 0) break;
  process.exit(0);
}
console.log('none found');
