// DOM overlay for Echo Tower: start/help, HUD, toasts, result overlays. No libraries.
const ARROW = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', WAIT: '⏸' };
const css = `
.et-root{position:absolute;inset:0;pointer-events:none;font-family:ui-rounded,'Segoe UI',system-ui,sans-serif;color:#e8eeff;user-select:none}
.et-root *{box-sizing:border-box}
.et-hud{position:absolute;top:0;left:0;right:0;display:flex;gap:10px;align-items:stretch;justify-content:center;flex-wrap:wrap;padding:12px 16px}
.et-pill{pointer-events:auto;background:rgba(10,16,40,.78);border:1px solid rgba(120,150,255,.28);border-radius:12px;padding:7px 14px;backdrop-filter:blur(6px);min-width:96px}
.et-pill small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8ea2d8}
.et-pill b{font-size:20px;line-height:1.15}
.et-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:4px;overflow:hidden}
.et-bar i{display:block;height:100%;background:linear-gradient(90deg,#22e6ff,#b36bff);transition:width .2s}
.et-bar i.warn{background:linear-gradient(90deg,#ffb347,#ff5d8f)}
.et-echo b{font-size:26px}
.et-echo.inv{border-color:#ff5d8f;box-shadow:0 0 14px rgba(255,93,143,.55)}.et-echo.inv b{color:#ff5d8f}
.et-sw.armed{border-color:#ff5d8f;box-shadow:0 0 18px rgba(255,93,143,.7);animation:etp 0.8s infinite alternate}
.et-sw.spent,.et-sw.locked{opacity:.5}
@keyframes etp{to{box-shadow:0 0 30px rgba(255,93,143,1)}}
.et-btns{display:flex;gap:6px;align-items:center;pointer-events:auto}
.et-btn{pointer-events:auto;cursor:pointer;border:1px solid rgba(120,150,255,.4);background:rgba(20,30,70,.85);color:#e8eeff;border-radius:10px;padding:9px 14px;font:inherit;font-size:14px}
.et-btn:hover{background:rgba(60,80,170,.9)}.et-btn:focus-visible{outline:2px solid #22e6ff}
.et-btn.primary{background:linear-gradient(135deg,#22e6ff,#8a5bff);color:#06101e;font-weight:700;border:0;padding:12px 26px;font-size:16px}
.et-title{position:absolute;left:16px;bottom:40px;font-size:13px;color:#8ea2d8;max-width:46vw;pointer-events:none;line-height:1.4}
.et-title b{color:#e8eeff;font-size:16px;display:block}
.et-keys{position:absolute;right:14px;bottom:14px;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:62vw;font-size:12px;color:#8ea2d8}
.et-keys kbd{background:rgba(20,30,70,.85);border:1px solid rgba(120,150,255,.35);border-radius:6px;padding:2px 7px;color:#e8eeff;font:inherit}
.et-toast{position:absolute;left:50%;top:92px;transform:translate(-50%,-8px);opacity:0;transition:.18s;background:rgba(10,16,40,.9);border:1px solid #ff3b4d;border-radius:10px;padding:8px 16px;font-size:15px;pointer-events:none}
.et-toast.show{opacity:1;transform:translate(-50%,0)}.et-toast.info{border-color:#22e6ff}.et-toast.echo{border-color:#ff5d8f}
.et-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(7,11,29,.55),rgba(7,11,29,.93));pointer-events:auto;padding:16px;overflow:auto}
.et-card{max-width:620px;width:100%;background:rgba(12,20,48,.94);border:1px solid rgba(120,150,255,.35);border-radius:20px;padding:26px 30px;box-shadow:0 20px 80px rgba(0,0,0,.6);animation:etin .35s}
@keyframes etin{from{opacity:0;transform:translateY(14px) scale(.98)}}
.et-card h1{margin:0 0 2px;font-size:44px;letter-spacing:.14em;background:linear-gradient(90deg,#22e6ff,#b36bff 60%,#ffb347);-webkit-background-clip:text;background-clip:text;color:transparent}
.et-card h2{margin:0 0 6px;font-size:28px}
.et-card .sub{color:#8ea2d8;margin:0 0 16px}
.et-card p{line-height:1.5;margin:8px 0}
.et-grid{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:12px 0;font-size:14px;color:#c6d2f5}
.et-grid kbd{background:rgba(20,30,70,.85);border:1px solid rgba(120,150,255,.35);border-radius:6px;padding:1px 7px}
.et-dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:-1px}
.et-row{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
.et-stat{font-size:42px;font-weight:800}
@media(max-width:640px){.et-title{display:none}.et-card{padding:18px}.et-card h1{font-size:32px}}
`;

export function createUI(container) {
  const style = document.createElement('style'); style.textContent = css; container.appendChild(style);
  const root = document.createElement('div'); root.className = 'et-root'; container.appendChild(root);
  root.innerHTML = `
    <div class="et-hud">
      <div class="et-pill"><small>Level</small><b data-k="level">1/3</b></div>
      <div class="et-pill"><small>Turns</small><b data-k="turns">0 / 0</b><div class="et-bar"><i data-k="bar"></i></div></div>
      <div class="et-pill et-echo" data-k="echo"><small>Echo does next</small><b data-k="arrow">⏸</b></div>
      <div class="et-pill et-sw" data-k="sw"><small>Echo Switch <kbd style="font:inherit">E</kbd></small><b data-k="swtxt">Locked</b></div>
      <div class="et-btns">
        <button class="et-btn" data-a="focus" title="Tab">Layer: both</button>
        <button class="et-btn" data-a="restart" title="R">↺ Restart</button>
        <button class="et-btn" data-a="help" title="Esc">? Help</button>
        <button class="et-btn" data-a="mute" title="M">♪</button>
      </div>
    </div>
    <div class="et-title"><b data-k="name"></b><span data-k="hint"></span></div>
    <div class="et-keys"><span><kbd>WASD</kbd>/<kbd>↑↓←→</kbd> move</span><span><kbd>Space</kbd> wait</span><span><kbd>E</kbd> switch</span><span><kbd>R</kbd> restart</span><span><kbd>Tab</kbd> layer</span><span><kbd>Z</kbd><kbd>X</kbd> / drag: rotate</span></div>
    <div class="et-toast" data-k="toast"></div>`;
  const $ = (k) => root.querySelector(`[data-k="${k}"]`);
  let overlay = null; let toastTimer = 0; const handlers = {};

  root.addEventListener('click', (e) => { const a = e.target.closest?.('[data-a]')?.dataset.a; if (a) { e.target.blur?.(); handlers[a]?.(); } });

  function setOverlay(html) {
    hideOverlay(); overlay = document.createElement('div'); overlay.className = 'et-overlay'; overlay.innerHTML = `<div class="et-card" role="dialog" aria-modal="true">${html}</div>`;
    root.appendChild(overlay); overlay.querySelector('.primary')?.focus();
  }
  function hideOverlay() { overlay?.remove(); overlay = null; }

  return {
    on(name, fn) { handlers[name] = fn; },
    get overlayOpen() { return !!overlay; },
    hideOverlay,
    showStart(startLabel = 'Start') {
      setOverlay(`<h1>ECHO TOWER</h1><p class="sub">A two-floor, delayed-command puzzle</p>
        <p><b>Goal.</b> Guide the <span class="et-dot" style="background:#22e6ff"></span><b>explorer</b> (lower floor) to the <span class="et-dot" style="background:#19f0b0"></span>teal exit, and the
        <span class="et-dot" style="background:#b36bff"></span><b>echo</b> (upper floor) to the <span class="et-dot" style="background:#ffb347"></span>amber exit, <b>on the same turn</b>.</p>
        <p><b>The twist.</b> Every move you make is copied by the echo <b>one turn later</b>, on a different floor with different walls. Plan ahead, and use Wait to line things up.</p>
        <div class="et-grid"><span><kbd>WASD</kbd> <kbd>↑↓←→</kbd></span><span>Move the explorer (the echo repeats it next turn)</span>
          <span><kbd>Space</kbd></span><span>Wait one turn (costs a turn)</span>
          <span><kbd>E</kbd></span><span>Arm the Echo Switch, then move: the echo's copy is <b style="color:#ff5d8f">reversed</b> (↑↔↓, ←↔→). One use per level, from level 3</span>
          <span><kbd>R</kbd> · <kbd>Tab</kbd> · <kbd>Z</kbd><kbd>X</kbd></span><span>Restart · focus a floor · rotate view (or drag)</span></div>
        <p><span style="color:#19f0b0"><b>Win:</b></span> both stand on their own exits after the same turn. <span style="color:#ff5d8f"><b>Lose:</b></span> you run out of turns. Bumping a wall still costs a turn.</p>
        <div class="et-row"><button class="et-btn primary" data-a="start">${startLabel} ▶</button></div>`);
    },
    showPause() {
      setOverlay(`<h2>Paused</h2><p class="sub">Your puzzle is waiting.</p><div class="et-row"><button class="et-btn primary" data-a="resume">Resume ▶</button>
        <button class="et-btn" data-a="restart">↺ Restart level</button><button class="et-btn" data-a="howto">How to play</button></div>`);
    },
    showResult({ kind, level, turns, par, last }) {
      if (kind === 'won') {
        const perfect = turns <= par;
        setOverlay(`<h2 style="color:#19f0b0">${last ? 'TOWER ECHOED!' : 'Level complete'}</h2>
          <p class="sub">${level.title}</p><div class="et-stat">${turns} <span style="font-size:18px;color:#8ea2d8">turns · par ${par}</span></div>
          <p>${perfect ? '★ Optimal solution. The echo is proud.' : `Solved! The shortest known path is ${par} turns. Can you beat your time?`}</p>
          <div class="et-row"><button class="et-btn primary" data-a="${last ? 'replayAll' : 'next'}">${last ? 'Play again from level 1' : 'Next level ▶'}</button>
          <button class="et-btn" data-a="restart">↺ Replay level</button></div>`);
      } else {
        setOverlay(`<h2 style="color:#ff5d8f">Out of turns</h2><p class="sub">${level.title}</p>
          <p>The tower's memory faded after ${level.maxTurns} turns. Remember: the echo is always one move behind${level.switchCharges ? ', and the Echo Switch can make that count' : ''}.</p>
          <div class="et-row"><button class="et-btn primary" data-a="restart">Retry ↺</button></div>`);
      }
    },
    setLevelInfo(level, count) {
      $('level').textContent = `${level.id}/${count}`; $('name').textContent = `${level.id}. ${level.title}`; $('hint').textContent = level.hint;
    },
    updateHud(state, level) {
      $('turns').textContent = `${state.turn} / ${level.maxTurns}`;
      const frac = state.turn / level.maxTurns; const bar = $('bar'); bar.style.width = `${Math.min(100, frac * 100)}%`; bar.classList.toggle('warn', level.maxTurns - state.turn <= 3);
      $('arrow').textContent = ARROW[state.pendingEcho]; $('echo').classList.toggle('inv', !!state.pendingInverted);
      const sw = $('sw'); sw.classList.remove('armed', 'spent', 'locked');
      let txt = 'Ready';
      if (level.switchCharges === 0) { txt = 'Locked'; sw.classList.add('locked'); }
      else if (state.switchArmed) { txt = 'ARMED'; sw.classList.add('armed'); }
      else if (state.switchCharges === 0) { txt = 'Spent'; sw.classList.add('spent'); }
      $('swtxt').textContent = txt;
    },
    setFocusLabel(f) { root.querySelector('[data-a="focus"]').textContent = `Layer: ${f}`; },
    setMuted(m) { root.querySelector('[data-a="mute"]').textContent = m ? '♪̸' : '♪'; },
    toast(msg, kind = 'bump') {
      const t = $('toast'); t.textContent = msg; t.className = `et-toast show ${kind}`;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1300);
    },
    dispose() { clearTimeout(toastTimer); root.remove(); style.remove(); },
  };
}
