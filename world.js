// The world: your keyboard as the whole floor of the screen, stretching from under your fingers
// to a horizon where a small pianist (Magenta) sits at the far end of the same impossibly long red Casio.
// Your notes fly away up their lanes; Magenta's answers travel back down to you.
//
// Style: gouache. Flat painted shapes, grain, thick dark brush outlines, ochre and orange against slate blue.
// Everything textured is painted once into offscreen canvases; each frame only moves and stacks them,
// so it stays smooth on a phone.
(function () {
  const C = {
    sky: '#2c3a57', sky2: '#1c2740', dusk: '#425479', ink: '#141b2d', ochre: '#e3a83b', orange: '#e87a2c',
    sun: '#f1b544', red: '#c9302c', redDk: '#8e1f1f', redLt: '#e0544a', ivory: '#f2e8d3', ivoryDk: '#d9ccb0',
    ebony: '#171a26', skin: '#7d93bd', skinDk: '#56688f', jacket: '#d99a2b', scarf: '#c2357a',
  };
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const World = {ok: false};
  let cv, ctx, Wd = 0, Hd = 0, dpr = 1, opts;
  let staticLayer = null, grain = null, pianist = null, handSprite = null, blots = {you: [], mag: []};

  // ---------- geometry: depth d = 1 at your end, DMAX at the pianist ----------
  const DMAX = 7.5;
  let hy = 0, nearY = 0, nearW = 0, cx = 0;                // horizon y, near-edge y, near width, centre x
  function layout(){
    const portrait = Hd > Wd;
    hy = Hd * (portrait ? 0.4 : 0.36);
    nearY = Hd - Math.max(18, Hd * 0.035) * dpr / dpr;     // leave room for the key fronts
    nearW = Wd * (portrait ? 1.18 : 0.98);
    cx = Wd / 2;
  }
  const P = (u, d) => [cx + (u - 0.5) * nearW / d, hy + (nearY - hy) / d];     // project lane position u at depth d
  const KEYS = (() => {                                     // E♭..E♭: 7 whites with half a black key off each end
    const whites = [], blacks = [], unit = 1 / 7.6, off = 0.3 * unit; let wi = 0;
    for (let n = 63; n <= 75; n++) {
      const pc = n % 12;
      if (BLACK.has(pc)) blacks.push({n, pc, u: off + wi * unit}); else { whites.push({n, pc, u0: off + wi * unit, u1: off + (wi + 1) * unit}); wi++; }
    }
    const bw = unit * 0.56;
    blacks.forEach(k => { k.u0 = Math.max(0, k.u - bw / 2); k.u1 = Math.min(1, k.u + bw / 2); });
    return {whites, blacks, all: [...whites, ...blacks]};
  })();
  const keyU = pc => { const k = KEYS.all.find(k => k.pc === pc); return k ? (k.u0 + k.u1) / 2 : 0.5; };
  World.keyU = keyU;
  const lane = (k, d0, d1, inset = 0) => [P(k.u0 + inset, d0), P(k.u1 - inset, d0), P(k.u1 - inset, d1), P(k.u0 + inset, d1)];

  // ---------- gouache painting helpers ----------
  function makeGrain(){
    const g = document.createElement('canvas'); g.width = g.height = 220; const x = g.getContext('2d');
    const img = x.createImageData(220, 220);
    for (let i = 0; i < img.data.length; i += 4) { const v = 120 + Math.random() * 135; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); return g;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function pathOf(c, pts){ c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
  // a painted fill: base colour, then dry-brush streaks in lighter and darker tones, clipped to the shape
  function gouache(c, pts, base, light, dark, angle = 0, density = 1){
    c.save(); pathOf(c, pts); c.fillStyle = base; c.fill(); c.clip();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const n = Math.min(260, Math.ceil((x1 - x0) * (y1 - y0) / (900 * dpr * dpr) * density) + 10);
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd(x0, x1), y = rnd(y0, y1), len = rnd(20, 70) * dpr, a = angle + rnd(-0.25, 0.25);
      c.strokeStyle = Math.random() < 0.5 ? light : dark; c.globalAlpha = rnd(0.06, 0.2); c.lineWidth = rnd(4, 14) * dpr;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
    }
    c.globalAlpha = 0.22; c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.restore();
  }
  // a thick, slightly wobbly dark brush outline (a few passes, like a loaded brush)
  function inkLine(c, pts, w = 3, closed = true, color = C.ink){
    c.save(); c.strokeStyle = color; c.lineJoin = 'round'; c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.globalAlpha = pass ? 0.55 : 0.9; c.lineWidth = (w + (pass ? 1.5 : 0)) * dpr;
      c.beginPath();
      const seq = closed ? [...pts, pts[0]] : pts;
      seq.forEach(([x, y], i) => {
        const j = 0.8 * dpr * pass;
        if (!i) { c.moveTo(x + rnd(-j, j), y + rnd(-j, j)); return; }
        const [px, py] = seq[i - 1], mx = (px + x) / 2 + rnd(-1.2, 1.2) * dpr, my = (py + y) / 2 + rnd(-1.2, 1.2) * dpr;
        c.quadraticCurveTo(mx, my, x + rnd(-j, j), y + rnd(-j, j));
      });
      c.stroke();
    }
    c.restore();
  }
  const ell = (x, y, rx, ry, n = 30) => Array.from({length: n}, (_, i) => [x + rx * Math.cos(i / n * 2 * Math.PI), y + ry * Math.sin(i / n * 2 * Math.PI)]);

  // ---------- the painted scene (once per resize) ----------
  function paintStatic(){
    const s = document.createElement('canvas'); s.width = Wd; s.height = Hd; const c = s.getContext('2d');
    // sky: slate blue, painted in broad horizontal strokes, deepening upward
    const g = c.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, C.sky2); g.addColorStop(1, C.dusk);
    c.fillStyle = g; c.fillRect(0, 0, Wd, Hd);
    gouache(c, [[0, 0], [Wd, 0], [Wd, hy + 4], [0, hy + 4]], 'rgba(0,0,0,0)', '#5a6d96', '#151e33', 0, 0.6);
    // the sun behind the far end, with painted rays
    const sr = Math.min(Wd, Hd) * 0.2, sy = hy - sr * 0.15;
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = C.orange; c.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const a = Math.PI + i / 25 * Math.PI, r0 = sr * 1.08, r1 = sr * rnd(1.45, 1.9);
      c.lineWidth = rnd(5, 11) * dpr; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, sy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, sy + Math.sin(a) * r1); c.stroke(); }
    c.restore();
    gouache(c, ell(cx, sy, sr, sr), C.sun, '#ffd27a', C.orange, 0.3, 1.4);
    // dark ground on either side of the piano
    gouache(c, [[0, hy], [Wd, hy], [Wd, Hd], [0, Hd]], '#1d2539', '#33405f', '#0f1422', 0.1, 0.7);
    // the red Casio: its case walls run from your end to the horizon
    const wallL = [P(-0.1, 1), P(0, 1), P(0, DMAX), P(-0.1, DMAX)], wallR = [P(1, 1), P(1.1, 1), P(1.1, DMAX), P(1, DMAX)];
    gouache(c, wallL, C.red, C.redLt, C.redDk, -1.2, 1.2); inkLine(c, wallL, 2.6);
    gouache(c, wallR, C.red, C.redLt, C.redDk, -1.9, 1.2); inkLine(c, wallR, 2.6);
    // the key bed under the keys
    gouache(c, [P(0, 1), P(1, 1), P(1, DMAX), P(0, DMAX)], C.redDk, C.red, '#4d1010', -1.57, 0.8);
    // white keys as long lanes
    KEYS.whites.forEach(k => { const q = lane(k, 1, DMAX, 0.003); gouache(c, q, C.ivory, '#fffaf0', C.ivoryDk, -1.57, 1.1); inkLine(c, q, 1.6); });
    // black keys: raised, glossy, slightly narrower
    KEYS.blacks.forEach(k => { const q = lane(k, 1, DMAX); gouache(c, q, C.ebony, '#3a3f57', '#07080d', -1.57, 1); inkLine(c, q, 1.6);
      const hl = lane({u0: k.u0 + (k.u1 - k.u0) * 0.22, u1: k.u0 + (k.u1 - k.u0) * 0.38}, 1.02, DMAX);
      c.save(); c.globalAlpha = 0.18; pathOf(c, hl); c.fillStyle = '#c8d0ee'; c.fill(); c.restore(); });
    // key fronts at your end: the thickness of the keys, so it reads as a real keyboard
    const lip = Hd - nearY;
    KEYS.whites.forEach(k => { const [a] = [P(k.u0 + 0.003, 1)], [b] = [P(k.u1 - 0.003, 1)];
      const q = [a, b, [b[0], b[1] + lip], [a[0], a[1] + lip]]; gouache(c, q, C.ivoryDk, C.ivory, '#b9ab8c', 0, 0.6); inkLine(c, q, 1.4); });
    // the far end: the Casio's red back panel with a speaker grille
    const bl = P(-0.1, DMAX), br = P(1.1, DMAX), ph = (nearY - hy) / DMAX * 0.55;
    const back = [[bl[0], bl[1] - ph], [br[0], br[1] - ph], br, bl];
    gouache(c, back, C.red, C.redLt, C.redDk, 0, 1); inkLine(c, back, 2);
    c.save(); c.fillStyle = C.redDk; for (let i = 0; i < 28; i++) for (let j = 0; j < 2; j++) {
      const x = bl[0] + (br[0] - bl[0]) * (0.06 + i * 0.032), y = bl[1] - ph * (0.35 + j * 0.3);
      c.beginPath(); c.arc(x, y, 1.6 * dpr, 0, 7); c.fill(); } c.restore();
    // paper grain over everything
    c.save(); c.globalAlpha = 0.14; c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, Wd, Hd); c.restore();
    return s;
  }
  // the pianist, small, behind the far end: blue-grey skin, ochre jacket, magenta scarf, eyes closed
  function paintPianist(){
    const S = 220 * dpr, s = document.createElement('canvas'); s.width = S; s.height = S; const c = s.getContext('2d');
    const m = S / 220;
    const body = [[30 * m, 220 * m], [40 * m, 150 * m], [70 * m, 120 * m], [150 * m, 120 * m], [180 * m, 150 * m], [190 * m, 220 * m]];
    gouache(c, body, C.jacket, '#f3c160', '#a8701a', -1.2, 2); inkLine(c, body, 2.4);
    const shirt = [[95 * m, 122 * m], [125 * m, 122 * m], [116 * m, 220 * m], [104 * m, 220 * m]];
    gouache(c, shirt, C.ivory, '#fff', C.ivoryDk, -1.57, 1); inkLine(c, shirt, 1.6);
    const scarf = [[103 * m, 124 * m], [114 * m, 124 * m], [120 * m, 175 * m], [108 * m, 215 * m], [100 * m, 175 * m]];
    gouache(c, scarf, C.scarf, '#e46aa3', '#7d1d4d', -1.57, 1); inkLine(c, scarf, 1.4);
    const neck = [[100 * m, 100 * m], [120 * m, 100 * m], [120 * m, 124 * m], [100 * m, 124 * m]];
    gouache(c, neck, C.skinDk, C.skin, '#3f4d6c'); inkLine(c, neck, 1.4);
    const head = ell(110 * m, 74 * m, 30 * m, 34 * m);
    gouache(c, head, C.skin, '#a6b7d9', C.skinDk, 0.6, 2); inkLine(c, head, 2.2);
    // a round cap, tilted, in slate blue
    const cap = [[78 * m, 60 * m], [86 * m, 34 * m], [112 * m, 26 * m], [140 * m, 40 * m], [144 * m, 56 * m], [110 * m, 50 * m]];
    gouache(c, cap, '#33405f', '#4f5f86', '#1d2539', 0, 1.4); inkLine(c, cap, 2);
    c.save(); c.strokeStyle = C.ink; c.lineWidth = 2.2 * dpr; c.lineCap = 'round';
    [[98, 78], [122, 78]].forEach(([x, y]) => { c.beginPath(); c.arc(x * m, y * m - 3 * m, 7 * m, 0.2, Math.PI - 0.2); c.stroke(); });
    c.beginPath(); c.arc(110 * m, 92 * m, 9 * m, 0.3, Math.PI - 0.3); c.stroke(); c.restore();
    return s;
  }
  function paintHand(){
    const S = 90 * dpr, s = document.createElement('canvas'); s.width = S; s.height = S; const c = s.getContext('2d'), m = S / 90;
    const palm = ell(45 * m, 34 * m, 26 * m, 18 * m);
    gouache(c, palm, C.skin, '#a6b7d9', C.skinDk, 0.5, 2); inkLine(c, palm, 2);
    for (let f = 0; f < 4; f++) { const x = (24 + f * 14) * m, q = [[x - 5 * m, 36 * m], [x + 5 * m, 36 * m], [x + 4 * m, 70 * m], [x - 4 * m, 70 * m]];
      gouache(c, q, C.skin, '#a6b7d9', C.skinDk, 1.57, 1.5); inkLine(c, q, 1.6); }
    return s;
  }
  function paintBlot(color){
    const S = 120 * dpr, s = document.createElement('canvas'); s.width = S; s.height = S * 0.75; const c = s.getContext('2d'), m = S / 120;
    const pts = ell(60 * m, 45 * m, 44 * m, 30 * m, 22).map(([x, y]) => [x + rnd(-3, 3) * m, y + rnd(-3, 3) * m]);
    gouache(c, pts, color, 'rgba(255,255,255,.9)', 'rgba(0,0,0,.6)', 0.4, 3); inkLine(c, pts, 2.2);
    return s;
  }

  // ---------- live state ----------
  let state = {you: [], mel: -1, magchord: [], tones: []};
  const flying = [];
  World.update = s => { state = s; };
  World.spawn = (pc, who) => {
    if (!World.ok) return;
    const set = blots[who === 'you' ? 'you' : 'mag'];
    flying.push({pc, who, img: set[Math.floor(Math.random() * set.length)], born: performance.now()});
    if (flying.length > 30) flying.shift();
  };
  const hands = {L: 0.3, R: 0.7};

  function frame(now){
    if (!World.ok) return;
    const src = opts.source();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(staticLayer, 0, 0);
    // the chord's lanes glow ochre all the way to the horizon
    const tone = new Set(state.tones), you = new Set(state.you), mc = new Set(state.magchord);
    KEYS.all.forEach(k => {
      if (tone.has(k.pc)) { ctx.save(); ctx.globalAlpha = BLACK.has(k.pc) ? 0.5 : 0.35; ctx.fillStyle = C.ochre; pathOf(ctx, lane(k, 1, DMAX, (k.u1 - k.u0) * 0.3)); ctx.fill(); ctx.restore(); }
    });
    // what's sounding: your keys glow pink near you, Magenta's glow blue near the pianist
    KEYS.all.forEach(k => {
      if (you.has(k.pc)) { ctx.save(); const q = lane(k, 1, 2.2); const g = ctx.createLinearGradient(0, q[0][1], 0, q[2][1]);
        g.addColorStop(0, opts.colors.you); g.addColorStop(1, 'rgba(255,90,160,0)'); ctx.fillStyle = g; ctx.globalAlpha = 0.85; pathOf(ctx, q); ctx.fill(); ctx.restore(); }
      if (state.mel === k.pc || mc.has(k.pc)) { ctx.save(); const q = lane(k, DMAX * 0.55, DMAX); const g = ctx.createLinearGradient(0, q[0][1], 0, q[2][1]);
        g.addColorStop(0, 'rgba(90,170,255,0)'); g.addColorStop(1, state.mel === k.pc ? opts.colors.mel : opts.colors.magchord); ctx.fillStyle = g; ctx.globalAlpha = 0.9; pathOf(ctx, q); ctx.fill(); ctx.restore(); }
    });
    // sargam names at your end of each key
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    KEYS.all.forEach(k => {
      const black = BLACK.has(k.pc), [x, y] = P((k.u0 + k.u1) / 2, black ? 1.55 : 1.18), lit = you.has(k.pc);
      ctx.font = `italic ${(black ? 15 : 22) * dpr}px 'Instrument Serif', Georgia, serif`;
      ctx.fillStyle = lit ? '#fff' : black ? (tone.has(k.pc) ? '#f6c768' : '#c7c9d6') : (tone.has(k.pc) ? '#8a5a0a' : '#55503f');
      ctx.fillText(opts.label(k.pc, black), x, y);
    });
    ctx.restore();
    // notes in flight: yours fly away up the lane, Magenta's travel down toward you
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], t = (now - f.born) / (f.who === 'you' ? 1700 : 2100);
      if (t >= 1) { flying.splice(i, 1); continue; }
      const e = f.who === 'you' ? Math.pow(t, 1.6) : 1 - Math.pow(1 - t, 1.3);
      const d = f.who === 'you' ? 1.05 + (DMAX - 1.05) * e : DMAX - (DMAX - 1.1) * e;
      const [x, y] = P(keyU(f.pc), d), sc = 1.15 / Math.pow(d, 0.85);
      const w = f.img.width * sc * 0.6, h = f.img.height * sc * 0.6;
      ctx.save(); ctx.globalAlpha = f.who === 'you' ? Math.min(1, (1 - t) * 1.6) : Math.min(1, t * 4) * (t > 0.9 ? (1 - t) * 10 : 1);
      ctx.drawImage(f.img, x - w / 2, y - h / 2, w, h);
      ctx.font = `italic ${Math.max(9, 26 * sc) * dpr / dpr * dpr * 0.6}px 'Instrument Serif', Georgia, serif`; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.label(f.pc, false), x, y + 1);
      ctx.restore();
    }
    // the pianist at the far end, swaying with the groove
    const ps = (nearY - hy) / DMAX * 2.2, [pxc, pyb] = P(0.5, DMAX);
    const sway = src.playing && !src.still ? Math.sin(src.bar * Math.PI * 2) * 0.03 : 0;
    const nod = src.playing && !src.still ? Math.pow(Math.max(0, Math.cos(src.beat * Math.PI)), 3) * ps * 0.02 : 0;
    ctx.save(); ctx.translate(pxc, pyb - (nearY - hy) / DMAX * 0.5); ctx.rotate(sway);
    ctx.drawImage(pianist, -ps / 2, -ps + nod, ps, ps); ctx.restore();
    // their hands on the far end of the keys, glowing in whoever's colour is playing
    hands.L += (src.leftU - hands.L) * 0.2; hands.R += (src.rightU - hands.R) * 0.2;
    [['L', hands.L, src.pressL], ['R', hands.R, src.pressR]].forEach(([side, u, press]) => {
      const [x, y] = P(u, DMAX * 0.93), hs = ps * 0.34;
      if (press) { ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, hs * 1.3); g.addColorStop(0, src.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.75; ctx.fillStyle = g; ctx.fillRect(x - hs * 1.3, y - hs * 1.3, hs * 2.6, hs * 2.6); ctx.restore(); }
      ctx.save(); ctx.translate(x, y - hs * 0.5 + (press ? hs * 0.06 : 0)); if (side === 'R') ctx.scale(-1, 1);
      ctx.drawImage(handSprite, -hs / 2, -hs / 2, hs, hs); ctx.restore();
    });
    requestAnimationFrame(frame);
  }

  function resize(){
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    Wd = Math.max(1, Math.round(r.width * dpr)); Hd = Math.max(1, Math.round(r.height * dpr));
    cv.width = Wd; cv.height = Hd; layout();
    staticLayer = paintStatic(); pianist = paintPianist(); handSprite = paintHand();
    blots = {you: [0, 1, 2].map(() => paintBlot(opts.colors.you)), mag: [0, 1, 2].map(() => paintBlot(opts.colors.mel))};
  }
  World.init = function (canvas, o){
    try {
      cv = canvas; ctx = cv.getContext('2d'); opts = o; grain = makeGrain();
      resize();
      let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(resize, 120); }).observe(cv);
      World.ok = true; requestAnimationFrame(frame);
      return true;
    } catch (e) { console.error('world unavailable', e); World.ok = false; return false; }
  };
  window.World = World;
})();
