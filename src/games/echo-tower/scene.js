// Echo Tower renderer. Draws a state; never mutates game logic.
import * as THREE from 'three';

export const PALETTE = {
  bg: 0x070b1d, explorer: 0x22e6ff, ghost: 0xb36bff, lowerExit: 0x19f0b0, upperExit: 0xffb347,
  inverted: 0xff5d8f, wallLow: 0x16305c, wallTop: 0x2a1a5c, bump: 0xff3b4d,
};
const CELL = 1.25;
const FLOOR_Y = { bottom: 0, top: 3.6 };
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const DIR_YAW = { UP: Math.PI, DOWN: 0, LEFT: Math.PI / 2, RIGHT: -Math.PI / 2 };

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(PALETTE.bg);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.bg, 0.028);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x120a2a, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(5, 12, 7); scene.add(key);
  const lowLight = new THREE.PointLight(PALETTE.lowerExit, 14, 12); lowLight.position.set(0, 1.4, 0); scene.add(lowLight);
  const topLight = new THREE.PointLight(PALETTE.ghost, 14, 12); topLight.position.set(0, FLOOR_Y.top + 1.4, 0); scene.add(topLight);

  addStars(scene);

  // --- camera orbit (yaw limited so grid directions stay readable) ---
  const cam = { yaw: 0.38, yawT: 0.38, pitch: 0.82, pitchT: 0.82, dist: 15.5, distT: 15.5, lift: 0, targetY: 1.9 };
  let dragging = null;
  const el = renderer.domElement;
  const onDown = (e) => { dragging = { x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    if (!dragging) return;
    cam.yawT = clamp(cam.yawT - (e.clientX - dragging.x) * 0.006, -0.95, 0.95);
    cam.pitchT = clamp(cam.pitchT + (e.clientY - dragging.y) * 0.004, 0.45, 1.2);
    dragging = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { dragging = null; };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);

  let world = null; // per-level group
  let size = 5;
  let level = null;
  const anims = []; // { t, dur, fn(k), done? }
  const particles = makeParticles(scene);
  let focus = 'both';
  let time = 0;
  let flash = 0;

  const toWorld = (x, z, floor, y = 0) =>
    new THREE.Vector3((x - (size - 1) / 2) * CELL, FLOOR_Y[floor] + y, (z - (size - 1) / 2) * CELL);

  // ---------- actors ----------
  function makeActor(color, ghostly) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: ghostly ? 0.7 : 0.55, roughness: 0.35, metalness: 0.2,
      transparent: ghostly, opacity: ghostly ? 0.62 : 1,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.62), mat); body.position.y = 0.38;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.46), mat); head.position.y = 0.78;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.05),
      new THREE.MeshBasicMaterial({ color: ghostly ? 0xffffff : 0x04121c })); visor.position.set(0, 0.8, 0.24);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22), mat); ant.position.y = 1.04;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); tip.position.y = 1.17;
    const inner = new THREE.Group(); inner.add(body, head, visor, ant, tip);
    if (ghostly) {
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),
        new THREE.LineBasicMaterial({ color: 0xe6d2ff })); wire.position.copy(body.position); inner.add(wire);
    }
    g.add(inner);
    g.userData = { inner, mat, base: new THREE.Vector3(), bump: 0 };
    return g;
  }
  const explorer = makeActor(PALETTE.explorer, false);
  const ghost = makeActor(PALETTE.ghost, true);
  scene.add(explorer, ghost);

  // ghost's queued-command arrow
  const arrow = new THREE.Group();
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 10), arrowMat); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.1;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 14), arrowMat); head.rotation.x = Math.PI / 2; head.position.z = 0.42;
  const pause = new THREE.Group();
  for (const sx of [-0.1, 0.1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), arrowMat); b.position.x = sx; pause.add(b); }
  const arrowCore = new THREE.Group(); arrowCore.add(shaft, head);
  arrow.add(arrowCore, pause);
  scene.add(arrow);

  // landing preview ring on the ghost's floor
  const preview = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  preview.rotation.x = -Math.PI / 2; scene.add(preview);

  // vertical "column links" that show which top cell sits above which bottom cell
  const colExplorer = makeBeam(PALETTE.explorer); const colGhost = makeBeam(PALETTE.ghost);
  scene.add(colExplorer, colGhost);

  // ---------- level build ----------
  function buildLevel(lvl) {
    if (world) { scene.remove(world); disposeTree(world); }
    level = lvl; size = lvl.size; world = new THREE.Group(); scene.add(world);
    world.userData.tiles = { bottom: [], top: [] };
    world.userData.groups = { bottom: new THREE.Group(), top: new THREE.Group() };
    world.add(world.userData.groups.bottom, world.userData.groups.top);

    for (const floor of ['bottom', 'top']) {
      const grp = world.userData.groups[floor];
      const def = lvl[floor];
      const lowFloor = floor === 'bottom';
      const slab = new THREE.Mesh(new THREE.BoxGeometry(size * CELL + 0.3, 0.14, size * CELL + 0.3),
        new THREE.MeshStandardMaterial({ color: lowFloor ? 0x0c1a38 : 0x180f38, roughness: 0.8, transparent: true, opacity: lowFloor ? 1 : 0.55 }));
      slab.position.set(0, FLOOR_Y[floor] - 0.12, 0); grp.add(slab);
      grp.userData.fadeMats = [slab.material];
      for (let x = 0; x < size; x++) for (let z = 0; z < size; z++) {
        const checker = (x + z) % 2;
        const mat = new THREE.MeshStandardMaterial({
          color: lowFloor ? (checker ? 0x1b3a75 : 0x214588) : (checker ? 0x3b2a7e : 0x46328f),
          emissive: 0x000000, roughness: 0.55, metalness: 0.15, transparent: true, opacity: lowFloor ? 1 : 0.62,
        });
        const tile = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.93, 0.1, CELL * 0.93), mat);
        tile.position.copy(toWorld(x, z, floor, 0)); tile.userData.cell = [x, z]; tile.userData.baseOpacity = mat.opacity;
        grp.add(tile); world.userData.tiles[floor].push(tile); grp.userData.fadeMats.push(mat);
      }
      for (const [wx, wz] of def.walls) {
        const mat = new THREE.MeshStandardMaterial({
          color: lowFloor ? PALETTE.wallLow : PALETTE.wallTop, roughness: 0.4, metalness: 0.3,
          emissive: lowFloor ? 0x0a2a66 : 0x3a1a88, emissiveIntensity: 0.6, transparent: true,
        });
        const wall = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.88, 0.95, CELL * 0.88), mat);
        wall.position.copy(toWorld(wx, wz, floor, 0.5));
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry),
          new THREE.LineBasicMaterial({ color: lowFloor ? 0x4aa8ff : 0xc79bff, transparent: true }));
        wall.add(edges); grp.add(wall); grp.userData.fadeMats.push(mat, edges.material);
      }
      // exit: pad + ring + beam
      const col = lowFloor ? PALETTE.lowerExit : PALETTE.upperExit;
      const [gx, gz] = def.goal;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 28),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }));
      pad.position.copy(toWorld(gx, gz, floor, 0.07));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      ring.rotation.x = Math.PI / 2; ring.position.copy(toWorld(gx, gz, floor, 0.2));
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.34, 2.4, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.copy(toWorld(gx, gz, floor, 1.3));
      grp.add(pad, ring, beam); grp.userData.exit = { pad, ring, beam, col };
      grp.userData.fadeMats.push(pad.material, ring.material, beam.material);
      // start marker
      const [sx, sz] = def.start;
      const mark = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 4), new THREE.MeshBasicMaterial({ color: 0x7fa0d8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      mark.rotation.x = -Math.PI / 2; mark.rotation.z = Math.PI / 4; mark.position.copy(toWorld(sx, sz, floor, 0.07)); grp.add(mark);
      grp.userData.fadeMats.push(mark.material);
    }
    // faint vertical guides at every cell + bright ones at exits
    const guideMat = new THREE.LineBasicMaterial({ color: 0x5a78c8, transparent: true, opacity: 0.16 });
    for (let x = 0; x < size; x++) for (let z = 0; z < size; z++) {
      const a = toWorld(x, z, 'bottom', 0.05), b = toWorld(x, z, 'top', 0.05);
      world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), guideMat));
    }
    for (const [floor, col] of [['bottom', PALETTE.lowerExit], ['top', PALETTE.upperExit]]) {
      const [gx, gz] = lvl[floor].goal;
      const a = toWorld(gx, gz, 'bottom', 0.05), b = toWorld(gx, gz, 'top', 0.05);
      const dashed = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]),
        new THREE.LineDashedMaterial({ color: col, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.8 }));
      dashed.computeLineDistances(); world.add(dashed);
    }
    topLight.position.y = FLOOR_Y.top + 1.4;
    setFocus(focus);
  }

  // ---------- actor placement / animation ----------
  function placeActors(state, animate, events = []) {
    const eT = toWorld(state.explorer.x, state.explorer.z, 'bottom', 0.07);
    const gT = toWorld(state.ghost.x, state.ghost.z, 'top', 0.07);
    for (const [actor, target, who] of [[explorer, eT, 'explorer'], [ghost, gT, 'ghost']]) {
      const from = actor.userData.base.clone();
      const ev = events.find((e) => e.type === who);
      if (!animate || !ev || from.lengthSq() === 0) { actor.userData.base.copy(target); actor.position.copy(target); continue; }
      actor.userData.base.copy(target);
      if (ev.moved) {
        const dir = target.clone().sub(from).setY(0).normalize();
        anims.push({ t: 0, dur: 0.22, fn: (k) => {
          const e = ease(k); actor.position.lerpVectors(from, target, e);
          actor.position.y += Math.sin(k * Math.PI) * 0.28;
          const s = Math.sin(k * Math.PI);
          actor.userData.inner.scale.set(1 - 0.18 * s, 1 + 0.28 * s, 1 - 0.18 * s);
          actor.userData.inner.rotation.y = Math.atan2(dir.x, dir.z);
          if (k > 0.12 && Math.random() < 0.7) particles.emit(actor.position.clone().setY(actor.position.y + 0.1), who === 'explorer' ? PALETTE.explorer : PALETTE.ghost, 1, 0.5);
        }, done: () => { actor.position.copy(target); actor.userData.inner.scale.set(1, 1, 1); } });
      } else if (ev.blocked) {
        const d = DIR_V[ev.command] ?? new THREE.Vector3();
        anims.push({ t: 0, dur: 0.24, fn: (k) => {
          const b = Math.sin(k * Math.PI) * 0.16 * (1 - k * 0.3);
          actor.position.copy(target).addScaledVector(d, b);
          actor.userData.inner.scale.set(1 + 0.12 * Math.sin(k * Math.PI), 1 - 0.14 * Math.sin(k * Math.PI), 1 + 0.12 * Math.sin(k * Math.PI));
        }, done: () => { actor.position.copy(target); actor.userData.inner.scale.set(1, 1, 1); } });
        flashTile(who === 'explorer' ? 'bottom' : 'top', ev.command, state, who);
        particles.emit(target.clone().addScaledVector(d, 0.45).setY(target.y + 0.4), PALETTE.bump, 14, 1.6);
      } else { // wait: gentle pulse
        anims.push({ t: 0, dur: 0.22, fn: (k) => { const s = 1 + 0.07 * Math.sin(k * Math.PI); actor.userData.inner.scale.set(s, 1 / s, s); },
          done: () => actor.userData.inner.scale.set(1, 1, 1) });
      }
    }
  }
  const DIR_V = { UP: new THREE.Vector3(0, 0, -1), DOWN: new THREE.Vector3(0, 0, 1), LEFT: new THREE.Vector3(-1, 0, 0), RIGHT: new THREE.Vector3(1, 0, 0) };

  function flashTile(floor, command, state, who) {
    const pos = who === 'explorer' ? state.explorer : state.ghost;
    const tile = world.userData.tiles[floor].find((t) => t.userData.cell[0] === pos.x && t.userData.cell[1] === pos.z);
    if (!tile) return;
    anims.push({ t: 0, dur: 0.5, fn: (k) => { tile.material.emissive.setHex(PALETTE.bump); tile.material.emissiveIntensity = (1 - k) * 1.3; },
      done: () => { tile.material.emissive.setHex(0); tile.material.emissiveIntensity = 1; } });
    // also flash the wall/edge we hit, by nudging scene shake
    flash = Math.max(flash, 0.2);
  }

  function updateIndicators(state) {
    // arrow above ghost
    const dirKey = state.pendingEcho;
    const base = toWorld(state.ghost.x, state.ghost.z, 'top', 1.55);
    arrow.position.copy(base); arrow.userData.base = base;
    const isWait = dirKey === 'WAIT';
    arrowCore.visible = !isWait; pause.visible = isWait;
    arrow.rotation.y = isWait ? 0 : DIR_YAW[dirKey];
    arrowMat.color.setHex(state.pendingInverted ? PALETTE.inverted : state.switchArmed ? 0xffffff : 0xe6d2ff);
    // landing preview
    const prev = { x: state.ghost.x, z: state.ghost.z };
    const d = DIR_V[dirKey];
    let blocked = false;
    if (d) {
      const nx = prev.x + d.x, nz = prev.z + d.z;
      blocked = nx < 0 || nz < 0 || nx >= size || nz >= size || level.top.walls.some(([wx, wz]) => wx === nx && wz === nz);
      if (!blocked) { prev.x = nx; prev.z = nz; }
    }
    preview.position.copy(toWorld(prev.x, prev.z, 'top', 0.1));
    preview.material.color.setHex(isWait ? 0x9aa6d0 : blocked ? PALETTE.bump : state.pendingInverted ? PALETTE.inverted : PALETTE.ghost);
    preview.userData.blocked = blocked;
    // column beams
    const e = toWorld(state.explorer.x, state.explorer.z, 'bottom', 0.1), g2 = toWorld(state.ghost.x, state.ghost.z, 'bottom', 0.1);
    setBeam(colExplorer, e, toWorld(state.explorer.x, state.explorer.z, 'top', 0.1));
    setBeam(colGhost, g2, toWorld(state.ghost.x, state.ghost.z, 'top', 0.1));
    // armed glow
    ghost.userData.mat.emissiveIntensity = state.switchArmed ? 1.4 : 0.7;
    ghost.userData.mat.color.setHex(state.switchArmed ? 0xffd0ff : PALETTE.ghost);
  }

  // ---------- public API ----------
  function setFocus(mode) {
    focus = mode;
    if (!world) return;
    const fade = { bottom: mode === 'top' ? 0.12 : 1, top: mode === 'bottom' ? 0.1 : 1 };
    for (const f of ['bottom', 'top']) {
      world.userData.groups[f].userData.targetFade = fade[f];
    }
    ghost.userData.mat.opacity = mode === 'bottom' ? 0.25 : 0.62;
    explorer.userData.mat.opacity = mode === 'top' ? 0.25 : 1; explorer.userData.mat.transparent = true;
  }

  function celebrate() {
    for (const [floor, col] of [['bottom', PALETTE.lowerExit], ['top', PALETTE.upperExit]]) {
      const [gx, gz] = level[floor].goal;
      for (let i = 0; i < 5; i++) particles.emit(toWorld(gx, gz, floor, 0.3 + i * 0.3), col, 40, 3.5);
    }
    cam.lift = 1; world.userData.win = true;
    anims.push({ t: 0, dur: 1.2, fn: (k) => { cam.distT = 15.5 + 4 * Math.sin(k * Math.PI); } , done: () => { cam.distT = 15.5; } });
  }
  function fail() { flash = 0.9; world.userData.lost = true; }

  function resize() {
    const w = container.clientWidth || 800, h = container.clientHeight || 600;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // narrow screens: pull back so both floors stay inside the view
    cam.distBase = 15.5 * Math.max(1, 1.25 / camera.aspect * 0.9);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  function frame(dt, state) {
    time += dt;
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); a.fn(k);
      if (k >= 1) { a.done?.(); anims.splice(i, 1); }
    }
    // camera
    const k = 1 - Math.pow(0.0015, dt);
    cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k; cam.dist += (cam.distT - cam.dist) * k;
    const d = cam.dist * (cam.distBase ? cam.distBase / 15.5 : 1);
    const shake = flash > 0 ? (Math.random() - 0.5) * flash * 0.25 : 0; flash = Math.max(0, flash - dt * 1.8);
    const ty = cam.targetY + (world?.userData.win ? Math.sin(time * 0.6) * 0.15 + 0.4 : 0);
    camera.position.set(Math.sin(cam.yaw) * Math.cos(cam.pitch) * d + shake, ty + Math.sin(cam.pitch) * d, Math.cos(cam.yaw) * Math.cos(cam.pitch) * d);
    camera.lookAt(0, ty, 0);
    // ambient animation
    if (world) {
      for (const f of ['bottom', 'top']) {
        const g = world.userData.groups[f];
        const target = g.userData.targetFade ?? 1; g.userData.fade = (g.userData.fade ?? 1) + (target - (g.userData.fade ?? 1)) * Math.min(1, dt * 8);
        g.userData.fadeMats.forEach((m) => { if (m.userData.base === undefined) m.userData.base = m.opacity; m.opacity = m.userData.base * g.userData.fade; });
        const ex = g.userData.exit; const w = world.userData.win;
        ex.ring.rotation.z = time * 1.2; ex.ring.scale.setScalar(1 + 0.06 * Math.sin(time * 3 + (f === 'top' ? 1 : 0)));
        ex.beam.material.opacity = (w ? 0.6 + 0.2 * Math.sin(time * 6) : 0.18 + 0.06 * Math.sin(time * 2.4)) * g.userData.fade;
      }
      const lost = world.userData.lost;
      lowLight.intensity = lost ? 3 : 14; topLight.intensity = lost ? 3 : 14;
      lowLight.color.setHex(lost ? PALETTE.bump : PALETTE.lowerExit);
    }
    if (state) {
      ghost.userData.inner.position.y = Math.sin(time * 2.2) * 0.05;
      arrow.position.y = (arrow.userData.base?.y ?? 0) + Math.sin(time * 3) * 0.06;
      const s = 1 + 0.08 * Math.sin(time * 4); preview.scale.set(s, s, s);
      if (state.switchArmed && Math.random() < 0.35) particles.emit(ghost.position.clone().setY(ghost.position.y + 0.8), PALETTE.inverted, 1, 0.8);
    }
    particles.update(dt);
    renderer.render(scene, camera);
  }

  function dispose() {
    ro.disconnect(); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp);
    disposeTree(scene); particles.dispose(); renderer.dispose(); el.remove();
  }
  function isBusy() { return anims.some((a) => a.dur >= 0.2 && a.dur <= 0.3); }
  function rotate(dir) { cam.yawT = clamp(cam.yawT + dir * 0.3, -0.95, 0.95); }
  function resetCamera() { cam.yawT = 0.38; cam.pitchT = 0.82; }
  function snap(state) { explorer.userData.base.set(0, 0, 0); ghost.userData.base.set(0, 0, 0); anims.length = 0; placeActors(state, false); updateIndicators(state); explorer.userData.inner.scale.set(1, 1, 1); ghost.userData.inner.scale.set(1, 1, 1); }
  function setState(state, events) { placeActors(state, true, events); updateIndicators(state); }
  return { buildLevel, snap, setState, frame, resize, dispose, celebrate, fail, setFocus, rotate, resetCamera, isBusy, particles, get focus() { return focus; }, ready: () => !!world };
}

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function makeBeam(color) {
  const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  return m;
}
function setBeam(line, a, b) {
  const pos = line.geometry.attributes.position; pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, b.x, b.y, b.z); pos.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}
function addStars(scene) {
  const n = 260, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const r = 30 + Math.random() * 25, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.2) * 30; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = y; p[i * 3 + 2] = Math.sin(a) * r; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb8ff, size: 0.18, transparent: true, opacity: 0.7, fog: false })));
}
function makeParticles(scene) {
  const MAX = 500, pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3);
  const vel = Array.from({ length: MAX }, () => new THREE.Vector3()); const life = new Float32Array(MAX); let head = 0;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts);
  const c = new THREE.Color();
  return {
    emit(at, color, n = 10, speed = 1) {
      c.setHex(color);
      for (let i = 0; i < n; i++) {
        const j = head++ % MAX; pos.set([at.x, at.y, at.z], j * 3); col.set([c.r, c.g, c.b], j * 3);
        vel[j].set((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed); life[j] = 0.6 + Math.random() * 0.5;
      }
    },
    update(dt) {
      for (let j = 0; j < MAX; j++) {
        if (life[j] <= 0) { pos[j * 3 + 1] = -999; continue; }
        life[j] -= dt; pos[j * 3] += vel[j].x * dt; pos[j * 3 + 1] += vel[j].y * dt; pos[j * 3 + 2] += vel[j].z * dt; vel[j].y -= dt * 0.8;
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    },
    dispose() { g.dispose(); pts.material.dispose(); },
  };
}
function disposeTree(o) {
  o.traverse?.((n) => { n.geometry?.dispose?.(); const m = n.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose?.()); });
}
