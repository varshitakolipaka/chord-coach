// The painted stage: a pianist behind a one-octave keyboard, painted with p5.brush
// (charcoal outlines, watercolour washes, hatching). Every painted piece is painted once
// on a single hidden WebGL canvas and copied into ordinary 2D canvases; during play we only
// move and stack those copies, so painting never delays the music.
//
// p5.brush by Alejandro Campos (MIT): https://github.com/acamposuribe/p5.brush
(function () {
  const W = 900, H = 640;                   // logical stage size; the keyboard lives in the bottom half
  const Y0 = 300;                           // the old drawing's y = 0 sits 300px down
  const INK = '#17161a', PAPER = '#f7f0e0', RUST = '#a4502b', RUST_DK = '#6e2f17',
        SKIN = '#8a5a3e', SKIN_DK = '#5e3a26', OCHRE = '#d99a2b', SUN = '#e9b44a';
  const KB = {far: 22 + Y0, near: 318 + Y0, wFar: 0.66, blackLen: 0.58};
  const BLACK = new Set([1, 3, 6, 8, 10]);

  const kbPoint = (u, v) => {
    const w = W * (KB.wFar + (1 - KB.wFar) * v) * 0.97;
    return [W / 2 + (u - 0.5) * w, KB.far + (KB.near - KB.far) * Math.pow(v, 0.92)];
  };
  const quad = (u0, u1, v0, v1) => [kbPoint(u0, v0), kbPoint(u1, v0), kbPoint(u1, v1), kbPoint(u0, v1)];
  const KEYS = (() => {                     // E♭4..E♭5: 7 whites with half a black key off each end
    const whites = [], blacks = [], unit = 1 / 7.6, off = 0.3 * unit; let wi = 0;
    for (let n = 63; n <= 75; n++) {
      const pc = n % 12;
      if (BLACK.has(pc)) blacks.push({n, pc, u: off + wi * unit});
      else { whites.push({n, pc, u0: off + wi * unit, u1: off + (wi + 1) * unit}); wi++; }
    }
    const bw = unit * 0.56;
    blacks.forEach(k => { k.u0 = Math.max(0, k.u - bw / 2); k.u1 = Math.min(1, k.u + bw / 2); });
    return {whites, blacks, unit};
  })();
  const keyPoly = k => BLACK.has(k.pc) ? quad(k.u0, k.u1, 0, KB.blackLen) : quad(k.u0 + 0.004, k.u1 - 0.004, 0, 1);
  const keyU = pc => {
    const w = KEYS.whites.find(k => k.pc === pc); if (w) return (w.u0 + w.u1) / 2;
    const b = KEYS.blacks.find(k => k.pc === pc); return b ? b.u : 0.5;
  };

  // ---------- painting on one hidden WebGL canvas ----------
  let work = null, density = 1;
  function startPaint(seed){ brush.load(work); brush.clear(); brush.push(); brush.translate(-W / 2, -H / 2); brush.seed(seed); }
  function endPaint(){ brush.pop(); brush.render(); }
  // copy a logical rectangle of the work canvas into a new 2D canvas
  function grab(x, y, w, h){
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * density); c.height = Math.ceil(h * density);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    c.getContext('2d').drawImage(work, x * density, y * density, w * density, h * density, 0, 0, w * density, h * density);
    return c;
  }
  // a solid wash, then textured watercolour on top, then a charcoal outline
  function paintShape(poly, base, tint, opts = {}){
    brush.noStroke(); brush.noHatch();
    brush.wash(base, opts.washA ?? 235); brush.polygon(poly); brush.noWash();
    if (tint) { brush.fill(tint, opts.tintA ?? 110); brush.fillBleed(opts.bleed ?? 0.12); brush.fillTexture(opts.tex ?? 0.45, opts.border ?? 0.4, false); brush.polygon(poly); brush.noFill(); }
    if (opts.outline !== false) { brush.set(opts.pen || 'charcoal', INK, opts.penW ?? 1.25); brush.polygon(poly); }
  }
  const ellipsePoly = (cx, cy, rx, ry, n = 28) => Array.from({length: n}, (_, i) => [cx + rx * Math.cos(i / n * Math.PI * 2), cy + ry * Math.sin(i / n * Math.PI * 2)]);
  const bez = (p0, p1, p2, p3, n = 12) => Array.from({length: n + 1}, (_, i) => {
    const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  });

  // ---------- the scene ----------
  const cx = W / 2;
  const layers = {};
  function paintLight(){
    startPaint(3);
    brush.noStroke();
    brush.fill(SUN, 150); brush.fillBleed(0.35, 'out'); brush.fillTexture(0.6, 0.5, false); brush.circle(cx, 170, 200);
    brush.fill('#f2c862', 120); brush.fillBleed(0.2); brush.circle(cx, 165, 150); brush.noFill();
    brush.set('spray', OCHRE, 1.2);
    for (let i = 0; i < 16; i++) { const a = Math.PI * (1.05 + i / 16 * 0.9); brush.line(cx + Math.cos(a) * 160, 170 + Math.sin(a) * 160, cx + Math.cos(a) * 225, 170 + Math.sin(a) * 225); }
    endPaint(); return grab(0, 0, W, H);
  }
  function paintBody(){
    startPaint(5);
    const coat = [...bez([cx - 210, 340], [cx - 222, 260], [cx - 190, 180], [cx - 120, 160]), ...bez([cx + 120, 160], [cx + 190, 180], [cx + 222, 260], [cx + 210, 340])];
    paintShape(coat, RUST, RUST_DK, {tintA: 120, tex: 0.55});
    brush.set('2B', RUST_DK, 0.6); brush.hatch(10, 70); brush.noFill();
    brush.polygon(coat.map(([x, y]) => [cx + (x - cx) * 0.94, 160 + (y - 160) * 0.96])); brush.noHatch();
    paintShape([[cx - 46, 160], [cx + 46, 160], [cx + 18, 340], [cx - 18, 340]], PAPER, '#e8dcc2', {penW: 1});
    paintShape([...bez([cx - 12, 164], [cx + 30, 220], [cx - 26, 270], [cx + 14, 330], 10), ...bez([cx + 28, 330], [cx - 12, 270], [cx + 44, 220], [cx + 2, 164], 10)],
      '#d8417f', '#b02a62', {penW: 0.8, tex: 0.5});
    endPaint(); return grab(0, 0, W, H);
  }
  function paintHead(){
    startPaint(9);
    paintShape([[cx - 20, 128], [cx + 20, 128], [cx + 20, 168], [cx - 20, 168]], '#7a5038', SKIN_DK, {penW: 1});
    paintShape(ellipsePoly(cx, 85, 52, 60), SKIN, SKIN_DK, {tintA: 90, tex: 0.5});
    paintShape([...bez([cx - 56, 70], [cx - 60, 0], [cx + 62, -6], [cx + 56, 64]), ...bez([cx + 56, 64], [cx + 40, 38], [cx - 30, 30], [cx - 56, 70])], INK, '#2a2830', {penW: 1});
    brush.set('2B', INK, 1.6); brush.noFill();
    [[cx - 20, 88], [cx + 20, 88]].forEach(([x, y]) => brush.spline([[x - 13, y - 2], [x, y + 6], [x + 13, y - 2]], 0.6));
    brush.spline([[cx - 16, 114], [cx, 122], [cx + 16, 114]], 0.6);
    endPaint(); return grab(0, 0, W, H);
  }
  function paintKeys(){
    startPaint(21);
    paintShape([kbPoint(-0.02, -0.06), kbPoint(1.02, -0.06), kbPoint(1.02, 0), kbPoint(-0.02, 0)], INK, null, {penW: 1});
    KEYS.whites.forEach(k => paintShape(keyPoly(k), PAPER, '#eadfc8', {tintA: 60, tex: 0.3, penW: 1.3}));
    KEYS.blacks.forEach(k => paintShape(keyPoly(k), INK, '#2b2a33', {tintA: 120, tex: 0.6, penW: 1.2}));
    endPaint(); return grab(0, 0, W, H);
  }
  // a key washed in a colour (cached per key and colour)
  const washCache = new Map();
  function keyWash(k, color, kind){
    const id = k.n + kind + color; if (washCache.has(id)) return washCache.get(id);
    startPaint(100 + k.n);
    const poly = keyPoly(k);
    if (kind === 'lit') paintShape(poly, color, color, {washA: 215, tintA: 150, bleed: 0.2, tex: 0.6, border: 0.6, penW: 1.3});
    else {                                     // the chord's notes: an ochre marker stroke near the front of the key
      const v = BLACK.has(k.pc) ? KB.blackLen - 0.1 : 0.95;
      brush.set('marker', OCHRE, 2.2); brush.line(...kbPoint(k.u0 + 0.02, v), ...kbPoint(k.u1 - 0.02, v));
    }
    endPaint();
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const box = [Math.floor(Math.min(...xs)) - 14, Math.floor(Math.min(...ys)) - 14, Math.ceil(Math.max(...xs) - Math.min(...xs)) + 28, Math.ceil(Math.max(...ys) - Math.min(...ys)) + 28];
    const out = {c: grab(...box), x: box[0], y: box[1]};
    washCache.set(id, out); return out;
  }
  function paintHand(){
    startPaint(77);
    const ox = 80, oy = 70;                  // painted around (80, 70) in a 160 x 140 box
    paintShape([[ox - 26, oy - 52], [ox + 26, oy - 52], [ox + 22, oy - 26], [ox - 22, oy - 26]], PAPER, '#e8dcc2', {penW: 1});   // cuff
    paintShape(ellipsePoly(ox, oy - 8, 36, 24), SKIN, SKIN_DK, {tintA: 90, penW: 1.2});
    for (let f = 0; f < 4; f++) {
      const fx = ox - 27 + f * 18, len = 34 + (f === 1 || f === 2 ? 8 : 0);
      paintShape([[fx - 7, oy - 6], [fx + 7, oy - 6], [fx + 6, oy + len], [fx - 6, oy + len]], SKIN, SKIN_DK, {tintA: 80, penW: 1});
    }
    paintShape([[ox - 40, oy - 16], [ox - 30, oy - 20], [ox - 40, oy + 22], [ox - 50, oy + 18]], SKIN, SKIN_DK, {tintA: 80, penW: 1});
    endPaint(); return grab(0, 0, 160, 140);
  }
  function paintSleeve(){
    startPaint(71);
    const poly = [[10, 0], [70, 0], [62, 300], [18, 300]];
    paintShape(poly, RUST, RUST_DK, {tintA: 120, tex: 0.55, penW: 1.3});
    endPaint(); return grab(0, 0, 80, 300);
  }
  function paintBlot(color, seed){
    startPaint(seed);
    brush.noStroke(); brush.wash(color, 150); brush.polygon(ellipsePoly(60, 45, 40, 30, 22)); brush.noWash();
    brush.fill(color, 160); brush.fillBleed(0.3, 'out'); brush.fillTexture(0.7, 0.6, false); brush.polygon(ellipsePoly(60, 45, 40, 30, 22)); brush.noFill();
    endPaint(); return grab(0, 0, 120, 90);
  }

  // ---------- DOM ----------
  const Stage = {ok: false, keyU, KEYS, W, H};
  let root, world, cLight, cBody, cHead, cKeys, cWash, svgLabels, notesLayer, glowL, glowR, armL, armR, handL, handR, handImg, sleeveImg;
  const blots = {you: [], mag: []};
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const abs = (e, x, y) => { e.style.position = 'absolute'; e.style.left = x + 'px'; e.style.top = y + 'px'; return e; };

  Stage.init = function (host, opts){
    try {
      if (!window.brush) return false;
      const probe = document.createElement('canvas');
      if (!probe.getContext('webgl2')) return false;
      density = Math.min(2, window.devicePixelRatio || 1);
      work = brush.createCanvas(W, H, {pixelDensity: density, parent: null});
      brush.scaleBrushes(1.6);
      Stage.opts = opts;
      root = el('div', 'stagebox'); world = el('div', 'world'); root.appendChild(world);
      world.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`;
      const full = c => { c.style.position = 'absolute'; c.style.left = '0'; c.style.top = '0'; return c; };
      cLight = full(paintLight()); cBody = full(paintBody()); cHead = full(paintHead()); cKeys = full(paintKeys());
      cBody.style.transformOrigin = `${cx}px 340px`; cHead.style.transformOrigin = `${cx}px 140px`;
      cWash = full(el('canvas')); cWash.width = W * density; cWash.height = H * density; cWash.style.width = W + 'px'; cWash.style.height = H + 'px';
      svgLabels = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgLabels.setAttribute('viewBox', `0 0 ${W} ${H}`); svgLabels.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible`;
      notesLayer = el('div'); notesLayer.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
      handImg = paintHand(); sleeveImg = paintSleeve();
      const mk = (src) => { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.width = src.style.width; c.style.height = src.style.height; c.getContext('2d').drawImage(src, 0, 0); c.style.position = 'absolute'; return c; };
      armL = mk(sleeveImg); armR = mk(sleeveImg); handL = mk(handImg); handR = mk(handImg);
      [armL, armR].forEach(a => { a.style.left = '0'; a.style.top = '0'; a.style.transformOrigin = '40px 0'; });
      [handL, handR].forEach(h => { h.style.left = '0'; h.style.top = '0'; h.style.transformOrigin = '80px 70px'; });
      handR.style.transform = 'scaleX(-1)';
      glowL = el('div', 'glow'); glowR = el('div', 'glow');
      [glowL, glowR].forEach(g => g.style.cssText = 'position:absolute;left:0;top:0;width:180px;height:120px;border-radius:50%;filter:blur(18px);opacity:0;transition:opacity .2s');
      for (let i = 0; i < 3; i++) { blots.you.push(paintBlot(opts.colors.you, 300 + i)); blots.mag.push(paintBlot(opts.colors.mel, 400 + i)); }
      world.append(cLight, cBody, cHead, cKeys, cWash, svgLabels, glowL, glowR, armL, armR, handL, handR, notesLayer);
      host.innerHTML = ''; host.appendChild(root);
      const fit = () => { const k = root.clientWidth / W; world.style.transform = `scale(${k})`; root.style.height = H * k + 'px'; };
      new ResizeObserver(fit).observe(root); fit();
      Stage.ok = true;
      requestAnimationFrame(loop);
      // paint the washes for every key in the background, so the first press is instant too
      const queue = [];
      [...KEYS.whites, ...KEYS.blacks].forEach(k => { queue.push([k, opts.colors.you, 'lit'], [k, opts.colors.mel, 'lit'], [k, opts.colors.magchord, 'lit'], [k, OCHRE, 'tone']); });
      const idle = window.requestIdleCallback || (f => setTimeout(f, 60));
      const step = () => { if (!queue.length) return; keyWash(...queue.shift()); idle(step); };
      idle(step);
      return true;
    } catch (e) { console.error('painted stage unavailable', e); Stage.ok = false; return false; }
  };

  // ---------- state: which keys glow ----------
  let lastSig = '';
  Stage.update = function (s){
    if (!Stage.ok) return;
    const sig = JSON.stringify(s);
    if (sig === lastSig) return; lastSig = sig;
    const ctx = cWash.getContext('2d'); ctx.clearRect(0, 0, cWash.width, cWash.height);
    const draw = w => ctx.drawImage(w.c, w.x * density, w.y * density);
    const all = [...KEYS.whites, ...KEYS.blacks];
    const colorOf = pc => s.you.includes(pc) ? Stage.opts.colors.you : s.mel === pc ? Stage.opts.colors.mel : s.magchord.includes(pc) ? Stage.opts.colors.magchord : null;
    // whites first, then black keys (which sit on top)
    [KEYS.whites, KEYS.blacks].forEach(group => group.forEach(k => {
      const c = colorOf(k.pc);
      if (c) draw(keyWash(k, c, 'lit'));
      else if (s.tones.includes(k.pc)) draw(keyWash(k, OCHRE, 'tone'));
    }));
    if (s.drawBlacksOver) {}
    // labels in Instrument Serif italic
    let h = '';
    all.forEach(k => {
      const black = BLACK.has(k.pc), [x, y] = kbPoint(black ? k.u : (k.u0 + k.u1) / 2, black ? KB.blackLen - 0.2 : 0.86);
      const lit = colorOf(k.pc), tone = s.tones.includes(k.pc);
      const fill = lit ? '#fff' : black ? (tone ? '#f0c065' : '#cfc8b8') : (tone ? '#7a4f08' : '#4a4741');
      h += `<text x="${x}" y="${y}" text-anchor="middle" font-family="'Instrument Serif', Georgia, serif" font-style="italic" font-size="${black ? 20 : 27}" fill="${fill}">${Stage.opts.label(k.pc, black)}</text>`;
    });
    svgLabels.innerHTML = h;
  };

  // ---------- hands, groove and rising notes ----------
  const hand = {L: {u: 0.28, t: 0.28, down: 0, press: false}, R: {u: 0.72, t: 0.72, down: 0, press: false}};
  let handColor = '';
  function placeArm(arm, h, sx, sy, kx, ky){
    const ex = kx, ey = ky - 50;                          // wrist
    const dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI - 90;
    arm.style.transform = `translate(${sx - 40}px, ${sy}px) rotate(${ang}deg) scaleY(${len / 300})`;
  }
  function loop(now){
    const src = Stage.opts.source();
    hand.L.t = src.leftU; hand.R.t = src.rightU; hand.L.press = src.pressL; hand.R.press = src.pressR;
    for (const side of ['L', 'R']) {
      const h = hand[side];
      h.u += (h.t - h.u) * 0.22; h.down += ((h.press ? 1 : 0) - h.down) * 0.4;
    }
    const sy = 175 + (src.sway || 0) * 0;                   // shoulders
    [['L', armL, handL, glowL, -1], ['R', armR, handR, glowR, 1]].forEach(([side, arm, hd, glow, dir]) => {
      const h = hand[side], [kx, ky] = kbPoint(h.u, 0.13 + 0.05 * h.down);
      placeArm(arm, h, cx + dir * 160, sy, kx, ky);
      hd.style.transform = `translate(${kx - 80}px, ${ky - 64}px)${dir > 0 ? ' scaleX(-1)' : ''}`;
      glow.style.transform = `translate(${kx - 90}px, ${ky - 46}px)`;
      glow.style.background = src.color; glow.style.opacity = 0.35 + 0.35 * h.down;
    });
    // the pianist nods on the beat and sways across the bar
    if (src.playing && !src.still) {
      const nod = Math.pow(Math.max(0, Math.cos(src.beat * Math.PI)), 3) * 7;
      cBody.style.transform = `rotate(${Math.sin(src.bar * Math.PI * 2) * 1.6}deg)`;
      cHead.style.transform = `translateY(${nod}px) rotate(${Math.sin(src.bar * Math.PI * 2) * 3}deg)`;
      const pulse = 1 + 0.025 * Math.pow(Math.max(0, Math.cos(src.beat * Math.PI)), 6);
      cLight.style.transformOrigin = `${cx}px 170px`; cLight.style.transform = `scale(${pulse})`;
    } else { cBody.style.transform = cHead.style.transform = cLight.style.transform = ''; }
    // rising notes
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i], age = (now - f.born) / 2600;
      if (age >= 1) { f.e.remove(); floaters.splice(i, 1); continue; }
      const ease = 1 - Math.pow(1 - age, 2);
      f.e.style.transform = `translate(${f.x + f.drift * ease - 60}px, ${f.y - 430 * ease - 45}px) rotate(${f.spin * ease}deg) scale(${1.15 - 0.4 * age})`;
      f.e.style.opacity = (1 - age) * (age < 0.08 ? age / 0.08 : 1);
    }
    requestAnimationFrame(loop);
  }
  const floaters = [];
  Stage.spawn = function (pc, who){
    if (!Stage.ok) return;
    const set = blots[who === 'you' ? 'you' : 'mag'], b = set[Math.floor(Math.random() * set.length)];
    const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:0;top:0;width:120px;height:90px;will-change:transform,opacity';
    const c = document.createElement('canvas'); c.width = b.width; c.height = b.height; c.style.width = '120px'; c.style.height = '90px'; c.getContext('2d').drawImage(b, 0, 0);
    const t = document.createElement('div'); t.textContent = Stage.opts.label(pc, false);
    t.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;font:italic 30px 'Instrument Serif',Georgia,serif;color:#17161a";
    e.append(c, t); notesLayer.appendChild(e);
    const [x, y] = kbPoint(keyU(pc), 0);
    floaters.push({e, x, y: y - 10, born: performance.now(), drift: (Math.random() - 0.5) * 140, spin: (Math.random() - 0.5) * 20});
    while (floaters.length > 24) floaters.shift().e.remove();
  };
  Stage.ring = function (){};
  window.Stage = Stage;
})();
