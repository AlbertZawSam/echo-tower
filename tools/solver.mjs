// Dev-only BFS solver. Not shipped in the game bundle.
import { initialState, resolveTurn, toggleSwitch } from '../src/games/echo-tower/rules.js';

const CMDS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'WAIT'];
const key = (s) => `${s.explorer.x}${s.explorer.z}${s.ghost.x}${s.ghost.z}${s.pendingEcho}${s.switchCharges}${s.switchArmed ? 1 : 0}`;

/** Shortest winning move list (strings, 'E+' prefix = armed first), or null. */
export function solve(level, { allowSwitch = true } = {}) {
  const big = { ...level, maxTurns: 999 };
  let frontier = [{ s: initialState(big), path: [] }];
  const seen = new Set([key(frontier[0].s)]);
  for (let depth = 1; depth <= level.maxTurns; depth++) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const armFirst of allowSwitch && s.switchCharges > 0 ? [false, true] : [false]) {
        for (const c of CMDS) {
          if (armFirst && c === 'WAIT') continue;
          const base = armFirst ? toggleSwitch(s) : s;
          const { state } = resolveTurn(base, c, big);
          if (state.phase === 'won') return [...path, (armFirst ? 'E+' : '') + c];
          const k = key(state);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ s: state, path: [...path, (armFirst ? 'E+' : '') + c] });
        }
      }
    }
    frontier = next;
  }
  return null;
}
