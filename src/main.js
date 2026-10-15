import config from '../config.js';
import { games, gameList } from './games/index.js';

const app = document.getElementById('app');
const id = games[config.startGame] ? config.startGame : gameList[0].id;
games[id].start(app);

// Build ID badge (bottom-left). Must match Build ID in the submitted SUBMISSION.txt.
const badge = document.createElement('div');
badge.textContent = `Build ${__BUILD_ID__}`;
badge.style.cssText = 'position:fixed;left:8px;bottom:6px;font:11px ui-monospace,monospace;color:#6f82b8;z-index:99;pointer-events:none';
document.body.appendChild(badge);
