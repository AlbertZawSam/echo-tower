// Pure, deterministic Echo Tower rules. No DOM, no three.js: safe to run in Node.
export const DIRS = {
  UP: { x: 0, z: -1 },
  DOWN: { x: 0, z: 1 },
  LEFT: { x: -1, z: 0 },
  RIGHT: { x: 1, z: 0 },
  WAIT: { x: 0, z: 0 },
};
const OPPOSITE = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

export const isDirection = (c) => c in OPPOSITE;
export const opposite = (c) => OPPOSITE[c] ?? c;

const hasWall = (floor, x, z) => floor.walls.some(([wx, wz]) => wx === x && wz === z);
const same = (p, g) => p.x === g[0] && p.z === g[1];

/** Attempt one grid move on a single floor. Returns { pos, moved, blocked, reason }. */
export function tryMove(pos, command, floor, size) {
  const d = DIRS[command];
  if (!d || command === 'WAIT') return { pos: { ...pos }, moved: false, blocked: false, waited: true };
  const nx = pos.x + d.x;
  const nz = pos.z + d.z;
  if (nx < 0 || nz < 0 || nx >= size || nz >= size) return { pos: { ...pos }, moved: false, blocked: true, reason: 'edge' };
  if (hasWall(floor, nx, nz)) return { pos: { ...pos }, moved: false, blocked: true, reason: 'wall' };
  return { pos: { x: nx, z: nz }, moved: true, blocked: false };
}

export function initialState(level) {
  return {
    level: level.id,
    phase: 'playing',
    turn: 0,
    explorer: { x: level.bottom.start[0], z: level.bottom.start[1] },
    ghost: { x: level.top.start[0], z: level.top.start[1] },
    pendingEcho: 'WAIT', // ghost's first turn is a WAIT
    pendingInverted: false,
    switchCharges: level.switchCharges,
    switchArmed: false,
    history: [],
  };
}

/** E key. Arms/disarms the switch. Costs no turn. Returns same state if impossible. */
export function toggleSwitch(state) {
  if (state.phase !== 'playing') return state;
  if (!state.switchArmed && state.switchCharges <= 0) return state;
  return { ...state, switchArmed: !state.switchArmed };
}

/**
 * One turn. Order: ghost runs the ALREADY queued command, explorer runs the new one,
 * then the new command (inverted if the switch is armed) is queued for the ghost.
 * Returns { state, events }.
 */
export function resolveTurn(state, command, level) {
  if (state.phase !== 'playing') return { state, events: [] };
  const ghost = tryMove(state.ghost, state.pendingEcho, level.top, level.size);
  const explorer = tryMove(state.explorer, command, level.bottom, level.size);

  let queued = command;
  let charges = state.switchCharges;
  let armed = state.switchArmed;
  let inverted = false;
  const events = [];
  if (armed && isDirection(command)) {
    queued = opposite(command);
    charges -= 1;
    armed = false;
    inverted = true;
    events.push({ type: 'switch-used', from: command, to: queued });
  }

  const turn = state.turn + 1;
  const bothAtGoals = same(explorer.pos, level.bottom.goal) && same(ghost.pos, level.top.goal);
  const phase = bothAtGoals ? 'won' : turn >= level.maxTurns ? 'lost' : 'playing';

  events.push({ type: 'explorer', command, ...explorer });
  events.push({ type: 'ghost', command: state.pendingEcho, ...ghost });
  if (same(explorer.pos, level.bottom.goal)) events.push({ type: 'explorer-on-goal' });
  if (same(ghost.pos, level.top.goal)) events.push({ type: 'ghost-on-goal' });
  events.push({ type: phase === 'playing' ? 'turn' : phase });

  const next = {
    ...state,
    explorer: explorer.pos,
    ghost: ghost.pos,
    pendingEcho: queued,
    pendingInverted: inverted,
    switchCharges: charges,
    switchArmed: armed,
    turn,
    phase,
    history: [...state.history, command].slice(-64),
  };
  return { state: next, events };
}

/** Pure helper for the HUD: where will the ghost go next turn? */
export function ghostPreview(state, level) {
  return tryMove(state.ghost, state.pendingEcho, level.top, level.size);
}
