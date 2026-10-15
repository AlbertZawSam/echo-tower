import assert from 'node:assert/strict';
import { initialState, resolveTurn, toggleSwitch } from '../src/games/echo-tower/rules.js';
import { LEVELS } from '../src/games/echo-tower/levels.js';
import { solve } from '../tools/solver.mjs';

const L = { id: 0, size: 4, maxTurns: 6, switchCharges: 1,
  bottom: { start: [0, 0], goal: [3, 3], walls: [[1, 0]] }, top: { start: [0, 0], goal: [3, 3], walls: [[0, 1]] } };
const turn = (s, c, l = L) => resolveTurn(s, c, l).state;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('first input: explorer moves, ghost stays', () => {
  const s = turn(initialState(L), 'DOWN');
  assert.deepEqual(s.explorer, { x: 0, z: 1 }); assert.deepEqual(s.ghost, { x: 0, z: 0 });
});
t('second input: ghost executes the FIRST command', () => {
  let s = turn(initialState(L), 'DOWN'); s = turn(s, 'WAIT');
  assert.equal(s.pendingEcho, 'WAIT'); // ghost tried DOWN into its own top wall (0,1) -> blocked
  assert.deepEqual(s.ghost, { x: 0, z: 0 });
  let r = turn(turn(initialState(L), 'RIGHT'), 'WAIT'); // explorer blocked by bottom wall (1,0); ghost moves right
  assert.deepEqual(r.ghost, { x: 1, z: 0 }); assert.deepEqual(r.explorer, { x: 0, z: 0 });
});
t('blocked move consumes a turn and is still queued', () => {
  const s = turn(initialState(L), 'RIGHT');
  assert.equal(s.turn, 1); assert.equal(s.pendingEcho, 'RIGHT');
});
t('walls are per floor', () => {
  const s = turn(turn(initialState(L), 'DOWN'), 'WAIT'); // explorer free below, ghost bumps above
  assert.deepEqual(s.explorer, { x: 0, z: 1 }); assert.deepEqual(s.ghost, { x: 0, z: 0 });
});
t('switch inverts one directional command and is spent', () => {
  let s = toggleSwitch(initialState(L)); assert.equal(s.switchArmed, true);
  s = turn(s, 'DOWN');
  assert.equal(s.pendingEcho, 'UP'); assert.equal(s.switchCharges, 0); assert.equal(s.switchArmed, false);
  assert.deepEqual(s.explorer, { x: 0, z: 1 }); // explorer used the original
  assert.equal(toggleSwitch(s).switchArmed, false); // no charge left
});
t('WAIT does not consume the switch', () => {
  let s = turn(toggleSwitch(initialState(L)), 'WAIT');
  assert.equal(s.switchArmed, true); assert.equal(s.switchCharges, 1); assert.equal(s.pendingEcho, 'WAIT');
});
t('toggle again disarms; no turn spent', () => {
  const s = toggleSwitch(toggleSwitch(initialState(L)));
  assert.equal(s.switchArmed, false); assert.equal(s.turn, 0);
});
t('budget: loss at limit, input ignored afterwards', () => {
  let s = initialState(L); for (let i = 0; i < 6; i++) s = turn(s, 'WAIT');
  assert.equal(s.phase, 'lost'); assert.equal(turn(s, 'DOWN'), s);
});
t('win needs BOTH at their own goals simultaneously', () => {
  const l = { ...L, bottom: { start: [0, 0], goal: [1, 0], walls: [] }, top: { start: [0, 0], goal: [2, 0], walls: [] } };
  let s = turn(initialState(l), 'RIGHT', l); assert.equal(s.phase, 'playing'); // explorer on goal, ghost not
  s = turn(s, 'RIGHT', l); assert.equal(s.phase, 'playing'); // explorer overshoots
  s = turn(s, 'LEFT', l); assert.equal(s.phase, 'won'); // ghost lands on its exit as explorer returns to its own
});
for (const lvl of LEVELS) {
  t(`level ${lvl.id}: solvable in budget; par matches solver`, () => {
    const sol = solve(lvl); assert.ok(sol, 'solvable'); assert.equal(sol.length, lvl.par);
    assert.ok(lvl.maxTurns >= lvl.par);
    // replay solution through the real rules
    let s = initialState(lvl);
    for (const m of sol) { if (m.startsWith('E+')) s = toggleSwitch(s); s = turn(s, m.replace('E+', ''), lvl); }
    assert.equal(s.phase, 'won');
  });
}
t('level 3 CANNOT be solved without the switch', () => assert.equal(solve(LEVELS[2], { allowSwitch: false }), null));
t('levels 1-2 solvable without a switch', () => { assert.ok(solve(LEVELS[0], { allowSwitch: false })); assert.ok(solve(LEVELS[1], { allowSwitch: false })); });
console.log(`\n${n} checks passed`);
