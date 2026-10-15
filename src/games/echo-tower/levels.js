// Three authored levels. Every one was verified by tools/solver.mjs (see tests/rules.test.mjs).
// Coordinates are [x, z]; x grows RIGHT, z grows DOWN the screen (UP = z-1). Both floors share the frame.
// `par` = length of the shortest verified solution. `maxTurns` is the hard budget.
export const LEVELS = [
  {
    id: 1,
    title: 'First Memory',
    hint: 'The echo repeats your PREVIOUS move, one turn late. Use SPACE to let it catch up.',
    size: 5,
    switchCharges: 0,
    maxTurns: 15,
    par: 9,
    bottom: { start: [0, 1], goal: [4, 4], walls: [[3, 4], [2, 0], [3, 0]] },
    top: { start: [0, 0], goal: [2, 4], walls: [[4, 2], [0, 2], [2, 0]] },
  },
  {
    id: 2,
    title: 'Crossed Signals',
    hint: 'Each floor has its own walls. A free move below may bump the echo above, so plan for both.',
    size: 5,
    switchCharges: 0,
    maxTurns: 15,
    par: 13,
    bottom: { start: [0, 3], goal: [4, 2], walls: [[2, 2], [2, 3], [2, 1], [3, 3], [3, 1], [3, 2]] },
    top: { start: [1, 0], goal: [0, 4], walls: [[3, 0], [4, 0], [3, 4], [4, 4], [1, 2], [1, 4]] },
  },
  {
    id: 3,
    title: 'Broken Echo',
    hint: 'Press E, then move: the echo will do the OPPOSITE of that move. One charge, and the budget is tight.',
    size: 5,
    switchCharges: 1,
    maxTurns: 13,
    par: 12,
    bottom: { start: [0, 1], goal: [4, 1], walls: [[4, 0], [3, 0], [1, 3], [1, 1], [1, 2], [3, 1], [2, 3], [1, 0]] },
    top: { start: [1, 0], goal: [0, 4], walls: [[3, 0], [2, 0], [1, 4], [4, 3], [4, 0], [1, 3], [0, 1], [3, 4]] },
  },
];
