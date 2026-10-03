// The painting engine: a one-octave red Casio, and a goofy cat walking over it.
// The cat's four paws and its tail (the thumb) press whatever is sounding. When a chord needs more than five
// notes it sprouts an extra leg, and now and then it grows one just because.
//
// Each personality (skins/*.js) paints the picture in its own style with 2D canvas and p5.brush. The still
// parts (the Casio, the background, the cat's body, the key marks) are painted once, when the personality is
// chosen. During play we only copy pieces of those paintings onto the keys and redraw the cat's legs and tail,
// and the cat layer only animates while it is moving, so painting never gets in the way of the music.
//
// p5.brush by Alejandro Campos (MIT): https://github.com/acamposuribe/p5.brush
(function () {
  const W = 1000, H = 700;
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const KINDS = ['you', 'got', 'target', 'mel', 'mc'];   // your stray note, a chord note you've got, one still to play, Magenta's note, Magenta's chord
  const Duo = {ok: false, skins: {}, order: [], W, H};
  window.Duo = Duo;
  let host, wrap, cv, ctx, catCv, cat, S = 2, work = null, base = null, sheets = null, skin = null, K = null, opts, dispK = 1, dpr = 1;
  let state = {you: [], mel: -1, magchord: [], tones: [], covered: [], turn: null, chord: null};

  // ---------- seeded randomness: a personality always paints the same picture ----------
  let seedN = 1;
  const rand = () => { seedN = seedN + 0x6D2B79F5 | 0; let t = Math.imul(seedN ^ seedN >>> 15, 1 | seedN); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rnd = (a, b) => a + rand() * (b - a);
  const pick = arr => arr[Math.floor(rand() * arr.length)];

  // ---------- geometry ----------
  function pathOf(c, pts, smooth){
    c.beginPath();
    if (!smooth) { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); return; }
    const n = pts.length, mid = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    c.moveTo(...mid(0)); for (let i = 1; i <= n; i++) c.quadraticCurveTo(pts[i % n][0], pts[i % n][1], ...mid(i)); c.closePath();
  }
  const ell = (x, y, rx, ry, n = 40, rot = 0) => Array.from({length: n}, (_, i) => { const t = i / n * Math.PI * 2;
    return [x + rx * Math.cos(t) * Math.cos(rot) - ry * Math.sin(t) * Math.sin(rot), y + rx * Math.cos(t) * Math.sin(rot) + ry * Math.sin(t) * Math.cos(rot)]; });
  const bez = (p0, p1, p2, p3, n = 20) => Array.from({length: n + 1}, (_, i) => { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, cc = 3 * (1 - t) * t * t, d = t ** 3;
    return [a * p0[0] + b * p1[0] + cc * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + cc * p2[1] + d * p3[1]]; });
  const quad = (p0, p1, p2, n = 16) => Array.from({length: n + 1}, (_, i) => { const t = i / n, a = (1 - t) ** 2, b = 2 * (1 - t) * t, d = t * t;
    return [a * p0[0] + b * p1[0] + d * p2[0], a * p0[1] + b * p1[1] + d * p2[1]]; });
  // a smooth curve through control points (Catmull-Rom), closed or open
  function curve(ctrl, closed = true, per = 8){
    const out = [], n = ctrl.length, Pt = i => closed ? ctrl[(i + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < (closed ? n : n - 1); i++) for (let j = 0; j < per; j++) {
      const t = j / per, p0 = Pt(i - 1), p1 = Pt(i), p2 = Pt(i + 1), p3 = Pt(i + 2), t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
    if (!closed) out.push(ctrl[n - 1]);
    return out;
  }
  // a shape of varying width along a line; w(t) is the full width at t in 0..1
  function ribbon(line, w){
    const L = [], R = [], n = line.length;
    line.forEach(([x, y], i) => { const [px, py] = line[Math.max(0, i - 1)], [nx, ny] = line[Math.min(n - 1, i + 1)];
      const dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, ww = (typeof w === 'function' ? w(i / (n - 1)) : w) / 2;
      L.push([x - dy / l * ww, y + dx / l * ww]); R.push([x + dy / l * ww, y - dx / l * ww]); });
    return [...L, ...R.reverse()];
  }
  const taper = (wMax, wMin = 0, bias = 0.6) => t => wMin + (wMax - wMin) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), bias);
  // a calligraphic stroke: a filled ribbon that swells and thins
  function calli(c, line, w, color, alpha = 1, rough = 0.5){
    const shape = ribbon(line, typeof w === 'number' ? taper(w, w * 0.2) : w);
    c.save(); c.globalAlpha = alpha; c.fillStyle = color; pathOf(c, rough ? shape.map(([x, y]) => [x + rnd(-rough, rough), y + rnd(-rough, rough)]) : shape); c.fill(); c.restore();
  }
  // trace a closed outline as several calligraphic strokes, each swelling in its middle
  function outline(c, pts, wMax, color = '#151210', pieces = 5, wMin = 0.8){
    const n = pts.length, per = Math.ceil(n / pieces);
    for (let s = 0; s < pieces; s++) {
      const seg = []; for (let i = s * per - 2; i <= (s + 1) * per + 2; i++) seg.push(pts[((i % n) + n) % n]);
      calli(c, seg, taper(wMax * rnd(0.8, 1.12), wMin, 0.45), color, 0.97, 0.35);
    }
  }
  // a closed ink line that is thin where the light falls and heavy on the shadow side (light from top-left)
  function inkline(c, pts, thin, thick, color = '#15110e', lx = -0.45, ly = -0.9){
    const n = pts.length, L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const [x, y] = pts[i % n], [px, py] = pts[(i - 1 + n) % n], [nx, ny] = pts[(i + 1) % n];
      const dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, ox = dy / l, oy = -dx / l;   // outward normal for clockwise points
      const lit = Math.max(0, ox * lx + oy * ly), w = (thick - (thick - thin) * lit) * (0.9 + 0.2 * Math.sin(i * 0.7 + x * 0.01)) / 2;
      L.push([x + ox * w * 0.6, y + oy * w * 0.6]); R.push([x - ox * w * 0.4, y - oy * w * 0.4]);
    }
    c.save(); c.fillStyle = color; pathOf(c, [...L, ...R.reverse()]); c.fill('evenodd'); c.restore();
  }
  // the folk painter's modelling: a darker tone graded inward from the contour
  function shade(c, pts, color, depth, alpha = 0.5, smooth = false){
    c.save(); pathOf(c, pts, smooth); c.clip(); c.strokeStyle = color; c.lineJoin = 'round';
    const steps = 16; for (let i = 0; i < steps; i++) { c.globalAlpha = alpha / steps * 1.7; c.lineWidth = depth * 2 * (1 - i / steps) + 1; pathOf(c, pts, smooth); c.stroke(); }
    c.restore();
  }
  function fill(c, pts, color, smooth = false, alpha = 1){ c.save(); c.globalAlpha = alpha; c.fillStyle = color; pathOf(c, pts, smooth); c.fill(); c.restore(); }
  function clipTo(c, pts, smooth, fn){ c.save(); pathOf(c, pts, smooth); c.clip(); fn(); c.restore(); }
  const jag = (pts, a) => pts.map(([x, y]) => [x + rnd(-a, a), y + rnd(-a, a)]);

  // paper / pigment grain
  let grainCv = null;
  function grain(){
    if (grainCv) return grainCv;
    const g = document.createElement('canvas'); g.width = g.height = 256; const x = g.getContext('2d'), img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = 120 + Math.random() * 135; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); return (grainCv = g);
  }
  function texture(c, pts, smooth, strength = 0.25){
    clipTo(c, pts, smooth, () => { c.globalCompositeOperation = 'multiply'; c.globalAlpha = strength; c.fillStyle = c.createPattern(grain(), 'repeat'); c.fillRect(-2000, -2000, 5000, 5000); });
  }
  // dry-brush streaks inside a shape
  function streaks(c, pts, smooth, colors, n, len, wid, angle, alpha = [0.06, 0.2]){
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    clipTo(c, pts, smooth, () => { c.lineCap = 'round';
      for (let i = 0; i < n; i++) { const x = rnd(x0, x1), y = rnd(y0, y1), a = angle + rnd(-0.25, 0.25), l = rnd(len[0], len[1]);
        c.strokeStyle = pick(colors); c.globalAlpha = rnd(alpha[0], alpha[1]); c.lineWidth = rnd(wid[0], wid[1]);
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l / 2 + rnd(-3, 3), y + Math.sin(a) * l / 2 + rnd(-3, 3), x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } });
  }
  // halftone dots (for the record-sleeve look): darkness(x, y) in 0..1
  function halftone(c, pts, smooth, darkness, color, cell = 7, angle = 0.26){
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs) - cell, x1 = Math.max(...xs) + cell, y0 = Math.min(...ys) - cell, y1 = Math.max(...ys) + cell;
    const ca = Math.cos(angle), sa = Math.sin(angle), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
    clipTo(c, pts, smooth, () => { c.fillStyle = color; c.beginPath();
      for (let u = -R; u < R; u += cell) for (let v = -R; v < R; v += cell) {
        const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca; if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        const d = Math.max(0, Math.min(1, darkness(x, y))); if (d < 0.03) continue;
        const r = cell * 0.62 * Math.sqrt(d); c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2);
      } c.fill(); });
  }

  // ---------- p5.brush on one hidden WebGL canvas, laid onto 2D layers ----------
  function brushReady(){
    if (work) return true;
    try {
      if (!window.brush) return false;
      const probe = document.createElement('canvas'); if (!probe.getContext('webgl2')) return false;
      work = brush.createCanvas(W, H, {pixelDensity: S, parent: null}); brush.scaleBrushes(1.4);
      return true;
    } catch (e) { console.warn('p5.brush unavailable', e); work = null; return false; }
  }
  // paint with p5.brush in logical coordinates, then lay it onto c (whose transform maps logical → pixels)
  function brushLayer(c, fn, ox = 0, oy = 0){
    if (!brushReady()) return false;
    try {
      brush.clear(); const gl = work.getContext('webgl2'); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      brush.push(); brush.translate(-W / 2 - ox, -H / 2 - oy); brush.seed(Math.floor(rand() * 1e6));
      fn(brush);
      brush.pop(); brush.render();
      c.drawImage(work, 0, 0, W * S, H * S, ox, oy, W, H);
      return true;
    } catch (e) { console.warn('brush layer failed', e); try { brush.pop(); } catch (_) {} return false; }
  }

  // ---------- keys ----------
  function keysFor(KB){
    const whites = [], blacks = [], ww = (KB.x1 - KB.x0) / 7.6, off = 0.3 * ww; let wi = 0;
    for (let n = 63; n <= 75; n++) {
      const pc = n % 12;
      if (BLACK.has(pc)) { const cx = KB.x0 + off + wi * ww, bw = ww * (KB.blackW || 0.58); blacks.push({pc, black: true, x0: cx - bw / 2, x1: cx + bw / 2, y0: KB.top, y1: KB.blackBottom}); }
      else { const g = KB.gap ?? 2; whites.push({pc, black: false, x0: KB.x0 + off + wi * ww + g, x1: KB.x0 + off + (wi + 1) * ww - g, y0: KB.top, y1: KB.bottom}); wi++; }
    }
    const all = [...whites, ...blacks];
    all.forEach(k => { k.x0 = Math.max(KB.x0, k.x0); k.x1 = Math.min(KB.x1, k.x1); k.cx = (k.x0 + k.x1) / 2;
      const j = KB.jitter || 0; k.poly = [[k.x0 + rnd(-j, j), k.y0 + rnd(-j, j)], [k.x1 + rnd(-j, j), k.y0 + rnd(-j, j)], [k.x1 + rnd(-j, j), k.y1 + rnd(-j, j)], [k.x0 + rnd(-j, j), k.y1 + rnd(-j, j)]];
      // where a paw lands: black keys in the middle, white keys below the black ones
      k.paw = [k.cx, KB.top - 2]; });   // a paw rests on the back edge of its key, so the whole key stays visible (and gets coloured)
    return {whites, blacks, all, KB};
  }
  const keyBox = KB => ({x: KB.x0 - 8, y: KB.top - 8, w: KB.x1 - KB.x0 + 16, h: KB.bottom - KB.top + 16});

  // the toolkit each personality paints with
  const P = {W, H, BLACK, rand, rnd, pick, pathOf, ell, bez, quad, curve, ribbon, taper, calli, outline, inkline, shade, fill, clipTo, jag, texture, streaks, halftone, grain, brushLayer,
             get brushOk(){ return brushReady(); }, get S(){ return S; }};
  Duo.P = P;
  Duo.register = s => { Duo.skins[s.id] = s; if (!Duo.order.includes(s.id)) Duo.order.push(s.id); };

  // ---------- painting a personality ----------
  // Everything is first drawn as a plain picture (instant, so the app works straight away), then repainted stroke by
  // stroke in the background (painter.js): first the scene, which you can watch being painted, then each piece of the
  // cat, then the key marks. The painted layer sits over the plain one, which fills any gaps between strokes.
  let pieces = {}, paintToken = 0, borders = {};
  const overlay = (flat, painted) => { const c2 = document.createElement('canvas'); c2.width = flat.width; c2.height = flat.height; const x = c2.getContext('2d'); x.drawImage(flat, 0, 0); x.drawImage(painted, 0, 0); return c2; };
  function paintSkin(){
    const t0 = performance.now(), token = ++paintToken;
    seedN = skin.seed || 7;
    K = keysFor(skin.KB);
    const b = document.createElement('canvas'); b.width = W * S; b.height = H * S; const c = b.getContext('2d'); c.scale(S, S);
    skin.paint(c, P, K);
    base = b; Duo.flat = b;
    const box = keyBox(skin.KB); sheets = {}; const flatSheets = {};
    for (const kind of KINDS) for (const black of [false, true]) {
      const sh = document.createElement('canvas'); sh.width = Math.ceil(box.w * S); sh.height = Math.ceil(box.h * S);
      const sc = sh.getContext('2d'); sc.setTransform(S, 0, 0, S, -box.x * S, -box.y * S);
      skin.markKeys(sc, kind, black ? K.blacks : K.whites, P, box);
      sheets[kind + (black ? 'B' : 'W')] = flatSheets[kind + (black ? 'B' : 'W')] = sh;
    }
    Duo.box = box;
    // the print's own border, in each player's colour
    borders = {};
    ['you', 'mag'].forEach(t => { const bc = document.createElement('canvas'); bc.width = W * S; bc.height = H * S; const bx = bc.getContext('2d'); bx.scale(S, S);
      if (skin.border) skin.border(bx, P, t); else plainBorder(bx, t); borders[t] = bc; });
    // the hanging 8-bit display: a dim grid of LEDs, lit live in render()
    if (skin.display) { const D = skin.display, bx = base.getContext('2d'); bx.save(); bx.setTransform(S, 0, 0, S, 0, 0);
      if (D.panel === 'engine') { bx.fillStyle = '#17141a'; bx.beginPath(); bx.roundRect(D.x - 10, D.y - 10, D.w + 20, D.h + 20, 10); bx.fill(); }
      bx.fillStyle = 'rgba(255,240,220,0.07)'; for (let y = D.y + 1; y < D.y + D.h - 1; y += LEDP) for (let x = D.x + 1; x < D.x + D.w - 1; x += LEDP) bx.fillRect(x, y, LEDP - 1.1, LEDP - 1.1);
      bx.restore(); }
    // the cat, piece by piece: plain now, painted shortly
    pieces = {}; const flatPieces = {};
    Object.entries(skin.cat.pieces).forEach(([name, pc]) => {
      const cv2 = document.createElement('canvas'); cv2.width = Math.ceil(pc.box.w * S); cv2.height = Math.ceil(pc.box.h * S);
      const pcx = cv2.getContext('2d'); pcx.setTransform(S, 0, 0, S, -pc.box.x * S, -pc.box.y * S);
      pc.draw(pcx, P, pc.box);
      flatPieces[name] = cv2;
      pieces[name] = {img: withAfter(cv2, pc), box: pc.box, inner: pc.inner};
    });
    headSprite = pieces.head.img;
    Duo.flatMs = performance.now() - t0;
    if (!window.Painter || skin.painterly === false) { if (skin.after) { const ac = base.getContext('2d'); ac.setTransform(S, 0, 0, S, 0, 0); skin.after(ac, P); } Duo.paintMs = performance.now() - t0; return; }
    // the painting, in the background
    const cancelled = () => token !== paintToken;
    const opt = o => Object.assign({scale: S, seed: 3}, skin.painter || {}, o || {});
    (async () => {
      let shown = 0;
      const painted = await Painter.paintAsync(b, opt(), out => {
        const now = performance.now(); if (now - shown < 120) return; shown = now;
        base = overlay(b, out); render();
      }, cancelled);
      if (!painted) return;
      base = overlay(b, painted); if (skin.after) { const ac = base.getContext('2d'); ac.setTransform(S, 0, 0, S, 0, 0); skin.after(ac, P); } render();
      for (const [name, pc] of Object.entries(skin.cat.pieces)) {
        const img = await Painter.paintAsync(flatPieces[name], opt(Object.assign({radii: [6, 3, 1.6], threshold: 14}, pc.painter || {})), null, cancelled);
        if (!img) return;
        pieces[name].img = withAfter(overlay(flatPieces[name], img), pc);
        if (name === 'head') headSprite = pieces[name].img;
        drawCat();
      }
      for (const key of Object.keys(flatSheets)) {
        const img = await Painter.paintAsync(flatSheets[key], opt({radii: [8, 4.5], threshold: 24, bristles: 2}), null, cancelled);
        if (!img) return;
        sheets[key] = overlay(flatSheets[key], img);
      }
      render();
      Duo.paintMs = performance.now() - t0;
    })();
  }
  // crisp details laid over a piece after painting (whiskers)
  function withAfter(img, pc){
    if (!pc.after) return img;
    const c2 = document.createElement('canvas'); c2.width = img.width; c2.height = img.height; const x = c2.getContext('2d');
    x.drawImage(img, 0, 0); x.setTransform(S, 0, 0, S, -pc.box.x * S, -pc.box.y * S); pc.after(x, P); return c2;
  }
  // draw a piece so that its inner rectangle lands on [x0,y0]-[x1,y1]
  function place(c, name, x0, y0, x1, y1){
    const pc = pieces[name]; if (!pc) return;
    const {box, inner} = pc, sx = (x1 - x0) / (inner.x1 - inner.x0), sy = (y1 - y0) / (inner.y1 - inner.y0);
    c.drawImage(pc.img, x0 - (inner.x0 - box.x) * sx, y0 - (inner.y0 - box.y) * sy, box.w * sx, box.h * sy);
  }
  // draw a piece with its own origin at (x, y), scaled and turned
  function stamp(c, name, x, y, sx = 1, sy = 1, rot = 0){
    const pc = pieces[name]; if (!pc) return;
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(sx, sy); c.drawImage(pc.img, pc.box.x, pc.box.y, pc.box.w, pc.box.h); c.restore();
  }

  // ---------- the still layer: picture + key marks + names ----------
  function render(){
    if (!Duo.ok || !base) return;
    const z = dpr * dispK;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(base, 0, 0, W * S, H * S, 0, 0, W * z, H * z);
    if (state.turn && borders[state.turn]) ctx.drawImage(borders[state.turn], 0, 0, W * S, H * S, 0, 0, W * z, H * z);
    const you = new Set(state.you), tone = new Set(state.tones), mc = new Set(state.magchord), got = new Set(state.covered || []);
    const kindOf = k => you.has(k.pc) ? (tone.has(k.pc) ? 'got' : 'you') : state.mel === k.pc ? 'mel' : mc.has(k.pc) ? 'mc' : got.has(k.pc) ? 'got' : tone.has(k.pc) ? 'target' : null;
    const box = Duo.box, pad = skin.KB.markPad ?? 5;
    const blit = (src, k) => {
      const x = k.x0 - pad, y = k.y0 - pad, w = k.x1 - k.x0 + pad * 2, h = k.y1 - k.y0 + pad * 2;
      if (!src) ctx.drawImage(base, x * S, y * S, w * S, h * S, x * z, y * z, w * z, h * z);
      else ctx.drawImage(src, (x - box.x) * S, (y - box.y) * S, w * S, h * S, x * z, y * z, w * z, h * z);
    };
    let touched = false;
    K.whites.forEach(k => { k.kind = kindOf(k); if (k.kind) { blit(sheets[k.kind + 'W'], k); touched = true; } });
    K.blacks.forEach(k => { k.kind = kindOf(k); if (k.kind) blit(sheets[k.kind + 'B'], k); else if (touched) blit(null, k); });
    // sargam names, Bhatkhande style: komal underlined, tivra with a tick above
    ctx.setTransform(z, 0, 0, z, 0, 0);
    K.all.forEach(k => {
      const raw = opts.label(k.pc), komal = raw.startsWith('komal '), tivra = raw.startsWith('tivra '), name = raw.replace(/^(komal|tivra) /, '');
      const st = skin.label(k, k.kind);
      ctx.font = st.font; ctx.fillStyle = st.color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const y = st.y, wd = ctx.measureText(name).width;
      ctx.fillText(name, k.cx, y);
      ctx.strokeStyle = st.color; ctx.lineCap = 'round'; ctx.lineWidth = st.mark || 2.6;
      if (komal) { ctx.beginPath(); ctx.moveTo(k.cx - wd / 2, y + st.size * 0.2); ctx.lineTo(k.cx + wd / 2, y + st.size * 0.2); ctx.stroke(); }
      if (tivra) { ctx.beginPath(); ctx.moveTo(k.cx, y - st.size * 0.92); ctx.lineTo(k.cx, y - st.size * 1.22); ctx.stroke(); }
    });
    if (skin.display) drawDisplay(ctx, skin.display);
  }

  // ---------- the 8-bit display ----------
  // Text is rasterised small, thresholded into pixels, and each pixel drawn as a lit LED square.
  const LEDP = 3.4, pixCache = new Map();
  const LED = {yellow: '#ffd84d', green: '#5ce07e', blue: '#5aaeff', pink: '#ff63b8', white: '#fff4e2'};
  function pix(text, px){
    const key = text + '|' + px; if (pixCache.has(key)) return pixCache.get(key);
    const c = document.createElement('canvas'), x = c.getContext('2d'), font = `800 ${px}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
    x.font = font; const w = Math.ceil(x.measureText(text).width) + 2, h = Math.ceil(px * 1.25);
    c.width = w; c.height = h; x.font = font; x.textBaseline = 'alphabetic'; x.fillStyle = '#000'; x.fillText(text, 1, Math.round(px * 0.98));
    const d = x.getImageData(0, 0, w, h).data, on = new Uint8Array(w * h);
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 120) { on[j * w + i] = 1; x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    const r = {w, h, on, x0: Math.max(0, x0), x1: Math.max(0, x1), base: Math.round(px * 0.98), top: y0};
    pixCache.set(key, r); return r;
  }
  // draw pixel text with its left edge at x and its baseline at y; returns its width
  function led(c, text, px, x, y, color, opts = {}){
    const r = pix(text, px), p = LEDP;
    c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 4;
    for (let j = 0; j < r.h; j++) for (let i = r.x0; i <= r.x1; i++) if (r.on[j * r.w + i]) c.fillRect(x + (i - r.x0) * p, y + (j - r.base) * p, p - 1.1, p - 1.1);
    const width = (r.x1 - r.x0 + 1) * p;
    if (opts.underline) for (let i = 0; i < r.x1 - r.x0 + 1; i++) c.fillRect(x + i * p, y + 2 * p, p - 1.1, p - 1.1);            // komal
    if (opts.tick) { const m = x + Math.floor((r.x1 - r.x0) / 2) * p; for (let j = 0; j < 2; j++) c.fillRect(m, y + (r.top - r.base - 2 - j) * p, p - 1.1, p - 1.1); }   // tivra
    c.shadowBlur = 0;
    return width;
  }
  const ledWidth = (text, px) => { const r = pix(text, px); return (r.x1 - r.x0 + 1) * LEDP; };
  function drawDisplay(c, D){
    c.save(); c.beginPath(); c.rect(D.x, D.y, D.w, D.h); c.clip();
    const s = state, mag = s.turn === 'mag', ch = s.chord, P = LEDP;
    // snap to the LED grid
    const gx = v => D.x + 1 + Math.round((v - D.x - 1) / P) * P, gy = v => D.y + 1 + Math.round((v - D.y - 1) / P) * P;
    if (!s.turn || !ch) {
      const a = 'MAGENTA', aw = ledWidth(a, 13); led(c, a, 13, gx(D.x + (D.w - aw) / 2), gy(D.y + 8 + 13 * P), LED.pink);
      const t = 'press play', w = ledWidth(t, 8); led(c, t, 8, gx(D.x + (D.w - w) / 2), gy(D.y + D.h - 4 * P), LED.yellow);
      c.restore(); return;
    }
    // the bar's four beats, top left: a little LED block per beat, lit as the bar goes by
    if (s.beat) { const col = s.beat.who === 'mag' ? LED.pink : s.beat.who === 'you' ? LED.blue : LED.white;
      for (let i = 0; i < 4; i++) { c.fillStyle = i <= s.beat.i ? col : 'rgba(255,240,220,0.16)'; c.shadowColor = col; c.shadowBlur = i <= s.beat.i ? 5 : 0;
        for (let a = 0; a < 4; a++) for (let b2 = 0; b2 < 4; b2++) c.fillRect(gx(D.x + 8) + (i * 5 + a) * P, gy(D.y + 8) + b2 * P, P - 1.1, P - 1.1); }
      c.shadowBlur = 0;
      if (s.count) { const t = 'ready', w = ledWidth(t, 7); led(c, t, 7, gx(D.x + 8), gy(D.y + 8 + 11 * P), LED.white); } }
    // the border says whose turn it is, so the screen only shows what to play: the chord, big, and its notes
    if (ch.step) { const w = ledWidth(ch.step, 9); led(c, ch.step, 9, gx(D.x + D.w - 8 - w), gy(D.y + 6 + 8 * P), ch.step === 'again' ? LED.pink : LED.white); }
    let px = 15; while (px > 8 && ledWidth(ch.name, px) > D.w - 90) px--;
    const cw = ledWidth(ch.name, px); led(c, ch.name, px, gx(D.x + (D.w - cw) / 2), gy(D.y + 4 + px * 0.98 * P), mag ? LED.pink : LED.yellow);
    // its notes in sargam: yellow still to play, green got
    const names = ch.notes.map(n => ({t: n.name.replace(/^(komal|tivra) /, ''), komal: n.name.startsWith('komal '), tivra: n.name.startsWith('tivra '), done: n.done}));
    const gap = 4 * P, total = names.reduce((a, n) => a + ledWidth(n.t, 9), 0) + gap * (names.length - 1);
    let x = gx(D.x + (D.w - total) / 2); const y = gy(D.y + D.h - 4 * P);
    names.forEach(n => { x += led(c, n.t, 9, x, y, mag ? LED.white : n.done ? LED.green : LED.yellow, {underline: n.komal, tick: n.tivra}) + gap; x = gx(x); });
    c.restore();
  }
  function plainBorder(c, t){
    const col = t === 'you' ? '#1f74c8' : '#e8489a';
    c.save(); c.strokeStyle = col; c.lineWidth = 14; c.lineJoin = 'round'; c.strokeRect(12, 12, W - 24, H - 24); c.restore();
  }

  // ---------- the cat: long, squishy, absurd ----------
  // Its legs hang in one straight row under its belly. Each leg drops straight down onto its note, and the body
  // stretches like dough to span whatever is sounding: a fat loaf for one note, a long thin noodle for a wide chord.
  // Left to right: the tail (the thumb), two hind legs, any extra legs it has grown, two front legs.
  const SLOTS = ['tail', 'h1', 'h2', 'x1', 'x2', 'x3', 'f1', 'f2'];
  const C = {limbs: {}, R: 380, F: 620, vR: 0, vF: 0, T: 110, t: 0, running: false, last: 0, lastSig: '', extraMood: false, looking: null, centre: 500};
  const FLOOR = () => skin.cat.floor ?? (skin.KB.top - 92);       // where the belly sits, just above the Casio
  const pawY = (k, hover) => k.paw[1] - (hover ? 34 : 0);
  function initCat(){
    SLOTS.forEach((id, i) => { C.limbs[id] = {id, x: 500, tx: 500, y: FLOOR() + 40, ty: FLOOR() + 40, vx: 0, vy: 0, key: null, hover: false, squash: 0, grow: id[0] === 'x' ? 0 : 1, wasLifted: false, used: false}; });
    C.centre = 500; C.R = 370; C.F = 630; C.lastSig = ''; layoutFree([]);
    Object.values(C.limbs).forEach(l => { l.x = l.tx; l.y = l.ty; });
  }
  // the legs without a note dangle as stubs, spaced along the belly between their neighbours
  function layoutFree(assigned){
    const legs = ['h1', 'h2', 'x1', 'x2', 'x3', 'f1', 'f2'].filter(id => id[0] !== 'x' || C.limbs[id].used);
    const fixed = legs.map(id => assigned.includes(id) ? C.limbs[id].tx : null);
    if (fixed.every(v => v == null)) { const n = legs.length, w = 54; legs.forEach((id, i) => C.limbs[id].tx = C.centre + (i - (n - 1) / 2) * w); }
    else legs.forEach((id, i) => {
      if (fixed[i] != null) return;
      let l = i - 1; while (l >= 0 && fixed[l] == null) l--;
      let r = i + 1; while (r < legs.length && fixed[r] == null) r++;
      const lx = l >= 0 ? fixed[l] : null, rx = r < legs.length ? fixed[r] : null;
      C.limbs[id].tx = lx != null && rx != null ? lx + (rx - lx) * (i - l) / (r - l) : lx != null ? lx + 44 * (i - l) : rx - 44 * (r - i);
    });
    legs.forEach(id => { const L = C.limbs[id]; if (!assigned.includes(id)) { L.key = null; L.ty = FLOOR() + 44; } });
    if (!assigned.includes('tail')) { C.limbs.tail.key = null; }
  }
  function targetsFrom(s){
    // Magenta plays through the cat; on your turn its paws hover over the chord's notes as a hint
    const keyOf = pc => K.all.find(k => k.pc === pc);
    // the cat is Magenta: it plays Magenta's melody and chords, and only those
    let pcs = [], hover = false;
    if (s.turn === 'mag' && (s.mel >= 0 || (s.magchord && s.magchord.length))) pcs = [...new Set([...(s.magchord || []), ...(s.mel >= 0 ? [s.mel] : [])])];
    return {keys: pcs.map(keyOf).filter(Boolean).sort((a, b) => a.cx - b.cx), hover, mel: s.mel};
  }
  function assign(){
    if (!skin || !K) return;
    const {keys, hover, mel} = targetsFrom(state);
    const sig = keys.map(k => k.pc).join() + (hover ? 'h' : 'p');
    if (sig === C.lastSig) return;
    const changed = C.lastSig.replace(/[hp]$/, '') !== keys.map(k => k.pc).join();
    C.lastSig = sig;
    // now and then, for no reason at all, it grows an extra leg
    if (changed) C.extraMood = keys.length >= 3 && rand() < 0.14;
    const n = keys.length;
    let use;
    if (n === 0) use = [];
    else if (n === 1) use = ['f2'];
    else if (n === 2) use = ['h1', 'f2'];
    else if (n === 3) use = C.extraMood ? ['h1', 'x1', 'f2'] : ['h1', 'f1', 'f2'];
    else if (n === 4) use = C.extraMood ? ['h1', 'h2', 'x1', 'f2'] : ['h1', 'h2', 'f1', 'f2'];
    else { const extra = Math.max(0, Math.min(3, n - 5)) + (C.extraMood && n < 8 ? 1 : 0); use = ['tail', 'h1', 'h2', ...['x1', 'x2', 'x3'].slice(0, Math.min(3, extra)), 'f1', 'f2']; }
    use = use.slice(0, n);
    // more notes than limbs: keep the outer notes and the melody
    let chosen = keys;
    if (n > use.length) { const m = keys.find(k => k.pc === mel); const inner = keys.slice(1, -1).filter(k => k !== m); chosen = [keys[0], ...(m && m !== keys[0] && m !== keys[n - 1] ? [m] : []), ...inner].slice(0, use.length - 1).concat([keys[n - 1]]).sort((a, b) => a.cx - b.cx); }
    ['x1', 'x2', 'x3'].forEach(id => C.limbs[id].used = use.includes(id));
    use.forEach((id, i) => { const L = C.limbs[id], k = chosen[i]; L.key = k; L.hover = hover; L.tx = k.cx; L.ty = pawY(k, hover); });
    if (n) C.centre = keys.reduce((a, k) => a + k.cx, 0) / n;
    layoutFree(use);
    C.looking = keys.find(k => k.pc === mel) || keys[keys.length - 1] || null;
    kick();
  }
  function spring(v, x, tx, k, d, dt){ return v + ((tx - x) * k - v * d) * dt; }
  function step(dt){
    C.t += dt;
    let busy = false;
    const lifted = FLOOR() + 50;
    SLOTS.forEach(id => {
      const L = C.limbs[id];
      L.grow += ((id[0] !== 'x' || L.used ? 1 : 0) - L.grow) * Math.min(1, dt * 9);
      // slide across lifted, then drop straight down onto the note
      const far = Math.abs(L.tx - L.x) > 10;
      const wantY = L.key && far ? Math.min(lifted, L.ty) : L.ty;
      L.vx = spring(L.vx, L.x, L.tx, 320, 26, dt); L.x += L.vx * dt;
      L.vy = spring(L.vy, L.y, wantY, 520, 30, dt); L.y += L.vy * dt;
      if (far && L.key) L.wasLifted = true;
      if (L.wasLifted && !far && Math.abs(L.y - L.ty) < 4) { L.wasLifted = false; if (!L.hover) L.squash = 1; }
      if (L.squash > 0) L.squash = Math.max(0, L.squash - dt * 4);
      if (Math.abs(L.tx - L.x) > 0.5 || Math.abs(L.vx) > 1 || Math.abs(wantY - L.y) > 0.5 || Math.abs(L.vy) > 1 || L.squash > 0 || Math.abs((id[0] !== 'x' || L.used ? 1 : 0) - L.grow) > 0.01) busy = true;
    });
    // the body stretches over the legs that are out, with a bit of give
    const out = SLOTS.filter(id => id !== 'tail' && C.limbs[id].grow > 0.5).map(id => C.limbs[id].x);
    const tailOn = !!C.limbs.tail.key;
    const lo = Math.min(...out, tailOn ? C.limbs.tail.x : Infinity), hi = Math.max(...out);
    const pad = skin.cat.pad ?? 44, minLen = skin.cat.minLen ?? 230;
    let tR = lo - (tailOn ? 6 : pad), tF = hi + pad;
    if (tF - tR < minLen) { const m = (tF + tR) / 2; tR = m - minLen / 2; tF = m + minLen / 2; }
    C.vR = spring(C.vR, C.R, tR, 160, 13, dt); C.R += C.vR * dt;
    C.vF = spring(C.vF, C.F, tF, 160, 13, dt); C.F += C.vF * dt;
    // squishy: the longer it gets, the thinner (it keeps its volume)
    const len = Math.max(80, C.F - C.R), T0 = skin.cat.thick ?? 112;
    C.T = Math.max(46, Math.min(T0 * 1.25, T0 * Math.sqrt((skin.cat.restLen ?? 280) / len)));
    if (!tailOn) { const L = C.limbs.tail; L.tx = C.R; L.x += (C.R - L.x) * Math.min(1, dt * 20); }
    if (Math.abs(C.vR) > 1 || Math.abs(C.vF) > 1 || Math.abs(tR - C.R) > 0.5 || Math.abs(tF - C.F) > 0.5) busy = true;
    if (!tailOn) busy = busy || !document.hidden && C.t < 1.2;
    return busy;
  }
  function geom(){ const fl = FLOOR(); return {R: C.R, F: C.F, T: C.T, bottom: fl, top: fl - C.T, mid: fl - C.T / 2, t: C.t}; }
  let headSprite = null; const HS = {x: -160, y: -175, w: 320, h: 260};
  function drawCat(){
    const z = dpr * dispK, c = cat;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, catCv.width, catCv.height);
    if (!headSprite) return;
    c.setTransform(z, 0, 0, z, 0, 0);
    const g = geom(), look = skin.cat, lw = look.legW ?? 36;
    // soft shadows: the body on the Casio, the paws on their keys
    const shadow = (x, y, rx, ry, a) => { const gr = c.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(25,14,6,${a})`); gr.addColorStop(1, 'rgba(25,14,6,0)');
      c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = gr; c.beginPath(); c.arc(x, y, rx, 0, 7); c.fill(); c.restore(); };
    shadow((g.R + g.F) / 2 + 18, g.bottom + 16, (g.F - g.R) * 0.58, 26, 0.32);
    SLOTS.forEach(id => { const L = C.limbs[id]; if (!L.key || L.grow < 0.5) return; shadow(L.x + 8, L.ty + (L.hover ? 34 : 0) + 10, 30, 10, L.hover ? 0.15 : 0.35); });
    // legs hang behind the belly, straight down
    SLOTS.forEach(id => { if (id === 'tail') return; const L = C.limbs[id]; if (L.grow < 0.02) return;
      const top = g.bottom - Math.min(34, g.T * 0.45), y = top + (L.y - top) * L.grow;
      c.globalAlpha = L.hover && L.key ? 0.6 : 1;      // on your turn the hint paws are ghostly
      if (y - 8 > top) place(c, id[0] === 'h' ? 'legHind' : 'leg', L.x - lw / 2, top, L.x + lw / 2, y - 8);
      stamp(c, id[0] === 'x' ? 'pawExtra' : 'paw', L.x, y, 1 + 0.22 * L.squash, 1 - 0.25 * L.squash);
      c.globalAlpha = 1; });
    // the tail: on a note it hangs straight down from the rump; otherwise it waves in the air
    const Lt = C.limbs.tail;
    if (Lt.key) { const tw = look.tailW ?? 28, top = g.mid - 10; if (Lt.y - 6 > top) place(c, 'tailDown', Lt.x - tw / 2, top, Lt.x + tw / 2, Lt.y - 6); stamp(c, 'tailTip', Lt.x, Lt.y, 1 + 0.2 * Lt.squash, 1 - 0.2 * Lt.squash); }
    else stamp(c, 'tailUp', g.R + 16, g.mid - 6, 1, 1, Math.sin(C.t * 2.4) * 0.09);
    // the body stretches between its ends
    place(c, 'body', g.R, g.top, g.F, g.bottom);
    // the head rides on the front end
    const hx = g.F - (look.headIn ?? 30), hy = g.top + (look.headDrop ?? 18);
    c.save(); c.translate(hx, hy); c.rotate(Math.max(-0.12, Math.min(0.12, C.vF / 2500)));
    const hs = look.headScale || 1; c.scale(hs, hs);
    stamp(c, 'head', 0, 0);
    if (look.eyes) {   // the eyes follow the note it's playing
      const D = skin.display, tgt = state.turn === 'mag' && C.looking ? C.looking.paw : D ? [D.x + D.w / 2, D.y + D.h / 2] : [hx + 200, 560];
      look.eyes.forEach(([ex, ey, r]) => {
        const a = Math.atan2(tgt[1] - (hy + ey), tgt[0] - (hx + ex));
        c.fillStyle = look.pupil || '#111'; c.beginPath(); c.ellipse(ex + Math.cos(a) * r * 0.42, ey + Math.sin(a) * r * 0.42, r * 0.4, r * 0.62, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,250,235,0.9)'; c.beginPath(); c.arc(ex + Math.cos(a) * r * 0.42 - r * 0.14, ey + Math.sin(a) * r * 0.42 - r * 0.26, r * 0.15, 0, 7); c.fill();
      });
    }
    c.restore();
  }
  function frame(now){
    const dt = Math.min(0.04, (now - (C.last || now)) / 1000); C.last = now;
    const busy = step(dt);
    drawCat();
    if (busy) requestAnimationFrame(frame); else { C.running = false; C.last = 0; }
  }
  function kick(){ if (!C.running && Duo.ok) { C.running = true; C.last = 0; C.t = C.t % 100; requestAnimationFrame(frame); } }

  function resize(){
    if (!cv) return;
    dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(200, host.clientWidth); dispK = w / W;
    [cv, catCv].forEach(x => { x.style.width = w + 'px'; x.style.height = H * dispK + 'px'; x.width = Math.round(w * dpr); x.height = Math.round(H * dispK * dpr); });
    wrap.style.height = H * dispK + 'px';
    render(); drawCat();
  }

  let lastSig = '';
  Duo.update = s => { const sig = JSON.stringify(s); if (sig === lastSig) return; lastSig = sig; state = s; render(); assign(); };
  Duo.setSkin = id => {
    const s = Duo.skins[id] || Duo.skins[Duo.order[0]]; if (!s) return false;
    skin = s; Duo.current = s.id;
    document.body.classList.remove(...Duo.order.map(i => 'skin-' + i)); document.body.classList.add('skin-' + s.id);
    if (cv) { cv.setAttribute('aria-label', s.alt || s.name); paintSkin(); initCat(); resize(); C.lastSig = '#'; assign(); kick(); }
    return true;
  };
  Duo.init = function (h, o){
    try {
      host = h; opts = o; S = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
      wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;width:100%';
      cv = document.createElement('canvas'); ctx = cv.getContext('2d'); cv.setAttribute('role', 'img'); cv.style.display = 'block';
      catCv = document.createElement('canvas'); cat = catCv.getContext('2d'); catCv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none';
      catCv.setAttribute('aria-hidden', 'true');
      host.innerHTML = ''; wrap.appendChild(cv); wrap.appendChild(catCv); host.appendChild(wrap);
      Duo.ok = true;
      const want = Duo.skins[o.skin] || Duo.skins[Duo.order[0]];
      // a skin that prints words into its picture waits (briefly) for the type to arrive
      if (want && want.needsFonts && document.fonts && document.fonts.status !== 'loaded') { skin = want; Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]).then(() => Duo.setSkin(want.id)); }
      else Duo.setSkin(o.skin);
      let raf = 0; const re = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(resize); };
      window.addEventListener('resize', re); if (window.ResizeObserver) new ResizeObserver(re).observe(host);
      if (document.fonts) document.fonts.ready.then(render);
      return true;
    } catch (e) { console.warn('painting failed', e); Duo.ok = false; return false; }
  };
  Duo._debug = () => ({C, K, base, headSprite, sheets});
})();
