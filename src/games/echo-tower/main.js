// Echo Tower lifecycle: wires input -> pure rules -> renderer / HUD / audio. Returns { dispose }.
import { LEVELS } from './levels.js';
import { initialState, resolveTurn, toggleSwitch } from './rules.js';
import { createScene } from './scene.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';

const KEYMAP = {
  ArrowUp: 'UP', KeyW: 'UP', ArrowDown: 'DOWN', KeyS: 'DOWN', ArrowLeft: 'LEFT', KeyA: 'LEFT', ArrowRight: 'RIGHT', KeyD: 'RIGHT', Space: 'WAIT',
};
const SETTLE = 0.27; // input lock (s) while both actors animate
const FOCUS = ['both', 'bottom', 'top'];
const ARROW = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };

export function mount(container) {
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const view = createScene(container);
  const ui = createUI(container);
  const audio = createAudio();

  let li = 0; let level = LEVELS[0]; let state = initialState(level);
  let mode = 'menu'; // menu | play | pause | result
  let lockUntil = 0; let focusIdx = 0; let seenStart = false; let timer = 0; let raf = 0; let last = performance.now(); let disposed = false;

  function loadLevel(i) {
    clearTimeout(timer);
    li = i; level = LEVELS[i]; state = initialState(level); lockUntil = 0;
    view.buildLevel(level); view.snap(state);
    ui.setLevelInfo(level, LEVELS.length); ui.updateHud(state, level); ui.hideOverlay();
    mode = 'play';
  }
  function act(cmd) {
    if (mode !== 'play' || performance.now() < lockUntil || state.phase !== 'playing') return;
    const { state: next, events } = resolveTurn(state, cmd, level);
    state = next; lockUntil = performance.now() + SETTLE * 1000;
    view.setState(state, events); ui.updateHud(state, level);
    const ex = events.find((e) => e.type === 'explorer'); const gh = events.find((e) => e.type === 'ghost');
    if (cmd === 'WAIT') audio.wait(); else if (ex.blocked) audio.bump(); else audio.move();
    audio.echo(gh.moved); if (gh.blocked && gh.command !== 'WAIT') setTimeout(() => !disposed && audio.bump(), 90);
    const used = events.find((e) => e.type === 'switch-used');
    if (used) { audio.zap(); ui.toast(`Echo Switch! Echo will do ${ARROW[used.to]} instead of ${ARROW[used.from]}`, 'echo'); }
    else if (ex.blocked && gh.blocked) ui.toast('Both bumped into walls (turn still spent)');
    else if (ex.blocked) ui.toast('Explorer bumped a wall (turn still spent)');
    else if (gh.blocked && gh.command !== 'WAIT') ui.toast('The echo bumped into a wall above');
    if (events.some((e) => e.type === 'explorer-on-goal') && !events.some((e) => e.type === 'ghost-on-goal') && state.phase === 'playing') audio.goal();
    if (state.phase === 'won') {
      mode = 'result'; audio.win(); view.celebrate();
      timer = setTimeout(() => ui.showResult({ kind: 'won', level, turns: state.turn, par: level.par, last: li === LEVELS.length - 1 }), 1500);
    } else if (state.phase === 'lost') {
      mode = 'result'; audio.lose(); view.fail();
      timer = setTimeout(() => ui.showResult({ kind: 'lost', level }), 900);
    }
  }
  function armSwitch() {
    if (mode !== 'play' || state.phase !== 'playing') return;
    if (level.switchCharges === 0) { audio.deny(); ui.toast('The Echo Switch unlocks in level 3', 'info'); return; }
    if (state.switchCharges === 0) { audio.deny(); ui.toast('Echo Switch already spent this level', 'info'); return; }
    state = toggleSwitch(state); ui.updateHud(state, level); view.setState(state, []);
    if (state.switchArmed) { audio.arm(); ui.toast('Echo Switch ARMED: your next move will be reversed for the echo', 'echo'); } else { audio.disarm(); ui.toast('Echo Switch disarmed', 'info'); }
  }
  const restart = () => { audio.unlock(); loadLevel(li); };
  const pause = () => { if (mode === 'play') { mode = 'pause'; ui.showPause(); } };
  const resume = () => { if (mode === 'pause') { ui.hideOverlay(); mode = 'play'; } };
  const cycleFocus = () => { focusIdx = (focusIdx + 1) % FOCUS.length; view.setFocus(FOCUS[focusIdx]); ui.setFocusLabel(FOCUS[focusIdx]); };

  ui.on('start', () => { audio.unlock(); seenStart = true; loadLevel(li); });
  ui.on('resume', resume);
  ui.on('restart', restart);
  ui.on('next', () => { audio.unlock(); loadLevel(Math.min(li + 1, LEVELS.length - 1)); });
  ui.on('replayAll', () => loadLevel(0));
  ui.on('howto', () => { ui.showStart('Resume'); mode = 'pause'; });
  ui.on('help', () => { if (mode === 'play') { mode = 'pause'; ui.showStart('Resume'); } });
  ui.on('focus', cycleFocus);
  ui.on('mute', () => ui.setMuted(audio.toggleMute()));

  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    audio.unlock();
    if (e.code === 'Escape') { e.preventDefault(); mode === 'play' ? pause() : mode === 'pause' && resume(); return; }
    if (e.code === 'KeyM') { ui.setMuted(audio.toggleMute()); return; }
    if (e.code === 'KeyZ') { view.rotate(-1); return; }
    if (e.code === 'KeyX') { view.rotate(1); return; }
    if (e.code === 'Tab') { e.preventDefault(); if (mode !== 'menu') cycleFocus(); return; }
    if (mode === 'menu') { if (e.code === 'Enter') { e.preventDefault(); ui.hideOverlay(); loadLevel(li); } return; }
    if (mode === 'pause') { if (e.code === 'Enter') { e.preventDefault(); resume(); } return; }
    if (e.code === 'KeyR') { e.preventDefault(); restart(); return; }
    if (mode === 'result') { if (e.code === 'Enter') ui.overlayOpen && document.querySelector('.et-overlay .primary')?.click(); return; }
    if (e.code === 'KeyE') { if (!e.repeat) armSwitch(); return; }
    const cmd = KEYMAP[e.code];
    if (cmd) { e.preventDefault(); if (!e.repeat) act(cmd); }
  };
  window.addEventListener('keydown', onKey);

  function loop(now) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    view.frame(dt, mode === 'menu' ? null : state);
    raf = requestAnimationFrame(loop);
  }
  // Menu backdrop: show level 1 behind the start card.
  view.buildLevel(level); view.snap(state); ui.setLevelInfo(level, LEVELS.length); ui.updateHud(state, level);
  ui.showStart('Start');
  raf = requestAnimationFrame(loop);

  return {
    // exposed for automated testing / debugging only
    debug: { get state() { return state; }, get mode() { return mode; }, get level() { return level; }, loadLevel, act, armSwitch, get seenStart() { return seenStart; } },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); clearTimeout(timer);
      window.removeEventListener('keydown', onKey); ui.dispose(); view.dispose();
    },
  };
}
