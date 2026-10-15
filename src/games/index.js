// Game registry. Add new games here (R1).
import echoTower from './echo-tower/index.js';

export const games = { [echoTower.id]: echoTower };
export const gameList = Object.values(games);
