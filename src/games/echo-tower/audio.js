// Tiny WebAudio synth: no files, no network. Created lazily on first key press (autoplay rules).
export function createAudio() {
  let ctx = null; let muted = false; let master = null;
  const ensure = () => {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination);
    } catch { ctx = null; }
    return ctx;
  };
  function tone(freq, dur = 0.12, { type = 'sine', slideTo, delay = 0, vol = 1 } = {}) {
    if (muted || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume?.();
    const t0 = ctx.currentTime + delay; const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  return {
    unlock: ensure,
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    move() { tone(520, 0.09, { type: 'triangle', slideTo: 700 }); },
    echo(ghostMoved) { if (ghostMoved) tone(330, 0.14, { type: 'sine', slideTo: 260, delay: 0.08, vol: 0.8 }); },
    wait() { tone(240, 0.08, { type: 'sine', vol: 0.6 }); },
    bump() { tone(130, 0.16, { type: 'square', slideTo: 70, vol: 0.7 }); },
    arm() { tone(300, 0.25, { type: 'sawtooth', slideTo: 900, vol: 0.5 }); },
    disarm() { tone(700, 0.18, { type: 'sawtooth', slideTo: 250, vol: 0.4 }); },
    zap() { tone(900, 0.2, { type: 'square', slideTo: 120, vol: 0.6 }); tone(1300, 0.1, { type: 'sine', delay: 0.05, vol: 0.5 }); },
    deny() { tone(160, 0.12, { type: 'square', vol: 0.4 }); },
    goal() { tone(880, 0.12, { type: 'sine', vol: 0.6 }); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', delay: i * 0.11 })); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', delay: i * 0.14, vol: 0.5 })); },
  };
}
