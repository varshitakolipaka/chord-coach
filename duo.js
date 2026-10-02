// A still painting: a red Casio CT-S1 lying straight across the page, and a long black-and-white cat
// wrapped around it, curiously poking one of its buttons. Painted once (gouache: flat shapes, dry-brush
// streaks, grain, dark outlines). Only the keys change: your notes take a red wash, Magenta's go inky
// black, and the chord's notes get pencil hatching.
(function () {
  const W = 1000, H = 660;
  const C = {paper: '#efe9de', ink: '#121212', char: '#2b2b2b', grey: '#6d6d6d', pale: '#c9c4ba', white: '#f7f4ee',
             red: '#c8302b', redDk: '#8b1d1b', redLt: '#e2574d', key: '#f4f0e7', keyDk: '#d6cfc1'};
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const Duo = {ok: false};
  let host, cv, ctx, dpr = 1, base = null, grain = null, opts, state = {you: [], mel: -1, magchord: [], tones: []};

  // keyboard geometry (logical units)
  const KB = {x0: 112, x1: 888, top: 372, bottom: 560, blackBottom: 486};
  const KEYS = (() => {
    const whites = [], blacks = [], ww = (KB.x1 - KB.x0) / 7.6, off = 0.3 * ww; let wi = 0;
    for (let n = 63; n <= 75; n++) {
      const pc = n % 12;
      if (BLACK.has(pc)) { const cx = KB.x0 + off + wi * ww, bw = ww * 0.58; blacks.push({pc, x0: Math.max(KB.x0, cx - bw / 2), x1: Math.min(KB.x1, cx + bw / 2)}); }
      else { whites.push({pc, x0: KB.x0 + off + wi * ww, x1: KB.x0 + off + (wi + 1) * ww}); wi++; }
    }
    return {whites, blacks};
  })();

  // ---------- gouache helpers ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  function makeGrain(){
    const g = document.createElement('canvas'); g.width = g.height = 200; const x = g.getContext('2d'), img = x.createImageData(200, 200);
    for (let i = 0; i < img.data.length; i += 4) { const v = 110 + Math.random() * 145; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); return g;
  }
  function pathOf(c, pts, smooth){
    c.beginPath();
    if (!smooth) { pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); return; }
    const n = pts.length, mid = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    c.moveTo(...mid(0)); for (let i = 1; i <= n; i++) c.quadraticCurveTo(pts[i % n][0], pts[i % n][1], ...mid(i)); c.closePath();
  }
  function paint(c, pts, base, light, dark, o = {}){
    c.save(); pathOf(c, pts, o.smooth); c.fillStyle = base; c.fill(); c.clip();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const n = Math.min(500, Math.ceil((x1 - x0) * (y1 - y0) / 500 * (o.density ?? 1)) + 12);
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd(x0, x1), y = rnd(y0, y1), a = (o.angle ?? 0) + rnd(-0.3, 0.3), len = rnd(14, 60);
      c.strokeStyle = Math.random() < (o.lightShare ?? 0.5) ? light : dark; c.globalAlpha = rnd(0.07, 0.24); c.lineWidth = rnd(3, 11);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
    }
    c.globalAlpha = o.grain ?? 0.28; c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.restore();
    if (o.outline !== false) ink(c, pts, o.lw ?? 3.2, o.smooth);
  }
  function ink(c, pts, w = 3, smooth = false, color = C.ink){
    c.save(); c.strokeStyle = color; c.lineJoin = 'round'; c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.globalAlpha = pass ? 0.45 : 0.92; c.lineWidth = w + pass * 1.6;
      const j = pts.map(([x, y]) => [x + rnd(-0.9, 0.9) * pass, y + rnd(-0.9, 0.9) * pass]);
      pathOf(c, j, smooth); c.stroke();
    }
    c.restore();
  }
  function stroke(c, pts, w, color, alpha = 1){            // an open brush stroke along points
    c.save(); c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = alpha; c.lineWidth = w;
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.restore();
  }
  const ell = (x, y, rx, ry, n = 32, rot = 0) => Array.from({length: n}, (_, i) => { const t = i / n * Math.PI * 2;
    return [x + rx * Math.cos(t) * Math.cos(rot) - ry * Math.sin(t) * Math.sin(rot), y + rx * Math.cos(t) * Math.sin(rot) + ry * Math.sin(t) * Math.cos(rot)]; });
  const bez = (p0, p1, p2, p3, n = 16) => Array.from({length: n + 1}, (_, i) => { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, cc = 3 * (1 - t) * t * t, d = t ** 3;
    return [a * p0[0] + b * p1[0] + cc * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + cc * p2[1] + d * p3[1]]; });
  // a thick shape along a curve (for the tail and legs)
  function tube(line, w0, w1){
    const L = [], R = [];
    line.forEach(([x, y], i) => { const [px, py] = line[Math.max(0, i - 1)], [nx, ny] = line[Math.min(line.length - 1, i + 1)];
      const dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (line.length - 1)) / 2;
      L.push([x - dy / l * w, y + dx / l * w]); R.push([x + dy / l * w, y - dx / l * w]); });
    return [...L, ...R.reverse()];
  }

  // ---------- the painting ----------
  function paintBase(){
    const s = document.createElement('canvas'); s.width = W * dpr; s.height = H * dpr; const c = s.getContext('2d'); c.scale(dpr, dpr);
    // paper
    // no background: the painting sits straight on the page's paper
    // a soft charcoal shadow under the keyboard
    c.save(); c.globalAlpha = 0.18; c.fillStyle = C.ink; pathOf(c, ell(W / 2, 600, 470, 34), true); c.fill(); c.restore();

    // --- the cat's body lies along the back of the keyboard (painted first, behind the Casio) ---
    const body = [...bez([150, 300], [170, 150], [520, 120], [760, 175], 22), ...bez([760, 175], [830, 190], [860, 260], [820, 300], 10)];
    paint(c, [...body, [700, 300], [400, 300]], C.ink, C.grey, '#000', {angle: -0.15, density: 2.2, lightShare: 0.35, smooth: true, lw: 3.4});
    // fur: a few pale dry-brush streaks along the back
    for (let i = 0; i < 26; i++) { const x = rnd(220, 740), y = rnd(175, 230); stroke(c, [[x, y], [x + rnd(18, 40), y + rnd(-4, 4)]], rnd(1.5, 3), C.pale, rnd(0.25, 0.5)); }

    // --- the red Casio CT-S1 ---
    const caseOuter = [[70, 300], [930, 300], [946, 318], [946, 572], [930, 590], [70, 590], [54, 572], [54, 318]];
    paint(c, caseOuter, C.red, C.redLt, C.redDk, {angle: 0.05, density: 1.4, lw: 3.6});
    // top panel: speaker grilles left and right, a few round buttons in the middle
    const grille = (x0, x1) => { for (let r = 0; r < 4; r++) for (let x = x0; x < x1; x += 13) {
      c.save(); c.fillStyle = C.redDk; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(x + rnd(-0.6, 0.6), 322 + r * 11, 3.4, 2.4, 0, 0, 7); c.fill(); c.restore(); } };
    grille(96, 330); grille(670, 906);
    const buttons = [[400, 340], [440, 340], [480, 340], [560, 340], [600, 340]];
    buttons.forEach(([x, y], i) => paint(c, ell(x, y, 11, 9, 20), i === 3 ? C.white : C.char, '#888', '#000', {density: 1, lw: 2.2, smooth: true}));
    paint(c, [[515, 330], [535, 330], [535, 350], [515, 350]], C.char, '#777', '#000', {lw: 2}); // a little screen-ish slider
    // key bed
    paint(c, [[KB.x0 - 8, KB.top - 6], [KB.x1 + 8, KB.top - 6], [KB.x1 + 8, KB.bottom + 8], [KB.x0 - 8, KB.bottom + 8]], C.ink, '#333', '#000', {outline: false, density: 0.6});
    // white keys
    KEYS.whites.forEach(k => paint(c, [[k.x0 + 2, KB.top], [k.x1 - 2, KB.top], [k.x1 - 2, KB.bottom], [k.x0 + 2, KB.bottom]], C.key, '#fffdf6', C.keyDk, {angle: 1.57, density: 1.1, lightShare: 0.6, lw: 2.2}));
    // black keys
    KEYS.blacks.forEach(k => paint(c, [[k.x0, KB.top], [k.x1, KB.top], [k.x1, KB.blackBottom], [k.x0, KB.blackBottom]], C.ink, '#444', '#000', {angle: 1.57, density: 1.2, lightShare: 0.35, lw: 2.2}));

    // --- the tail curls down the left end of the Casio and round its front corner ---
    const tail = bez([158, 292], [40, 300], [10, 470], [70, 560], 24).concat(bez([70, 560], [110, 620], [200, 630], [230, 600], 14).slice(1));
    paint(c, tube(tail, 44, 18), C.ink, C.grey, '#000', {angle: 1.2, density: 2, lightShare: 0.3, lw: 3});
    stroke(c, bez([226, 603], [240, 590], [236, 576], [222, 578], 8), 9, C.white, 0.9);       // white tail tip
    // --- the back paw draped over the left of the case ---
    paint(c, ell(118, 312, 30, 18, 24, -0.2), C.ink, C.grey, '#000', {density: 1.5, lightShare: 0.3, smooth: true, lw: 2.6});
    [[100, 318], [116, 323], [132, 321]].forEach(([x, y]) => stroke(c, [[x, y], [x + 2, y + 6]], 2, C.pale, 0.8));

    // --- the head peeks over the right end, eyes wide, looking at its paw ---
    const head = ell(818, 205, 74, 62, 36);
    paint(c, head, C.ink, C.grey, '#000', {angle: 0.4, density: 2.2, lightShare: 0.3, smooth: true, lw: 3.4});
    paint(c, [[760, 168], [768, 98], [800, 150]], C.ink, C.grey, '#000', {lw: 3});            // ears
    paint(c, [[846, 150], [880, 96], [884, 168]], C.ink, C.grey, '#000', {lw: 3});
    paint(c, [[772, 158], [775, 120], [792, 152]], '#8a8a8a', '#bbb', '#555', {lw: 1.4, outline: false});
    paint(c, [[856, 152], [876, 118], [876, 160]], '#8a8a8a', '#bbb', '#555', {lw: 1.4, outline: false});
    // a white muzzle and chest
    paint(c, ell(812, 238, 40, 26, 26), C.white, '#fff', C.pale, {density: 1.4, lightShare: 0.6, smooth: true, lw: 2.4});
    // big curious eyes, pupils turned down-left toward the poking paw
    [[788, 196], [842, 194]].forEach(([x, y]) => {
      paint(c, ell(x, y, 19, 21, 26), C.white, '#fff', C.pale, {density: 1, lightShare: 0.7, smooth: true, lw: 2.6});
      paint(c, ell(x - 6, y + 6, 9, 12, 20), C.ink, '#333', '#000', {density: 1, smooth: true, lw: 1.6});
      c.save(); c.fillStyle = C.white; c.beginPath(); c.arc(x - 9, y + 1, 3.2, 0, 7); c.fill(); c.restore();
    });
    // nose, mouth and whiskers
    paint(c, [[804, 226], [820, 226], [812, 236]], C.char, '#555', '#000', {lw: 1.6});
    stroke(c, [[812, 236], [812, 244], [802, 250]], 2.4, C.ink); stroke(c, [[812, 244], [822, 250]], 2.4, C.ink);
    [[-1, 236], [-1, 246], [1, 236], [1, 246]].forEach(([s, y]) => stroke(c, [[812 + s * 30, y], [812 + s * 96, y + s * 0 + (y - 241) * 1.6 - 8]], 1.6, C.white, 0.85));

    // --- the front leg reaches down from the chest and pokes one button ---
    const leg = bez([770, 262], [700, 268], [640, 300], [566, 330], 18);
    paint(c, tube(leg, 40, 26), C.ink, C.grey, '#000', {angle: 2.8, density: 2, lightShare: 0.3, lw: 3});
    paint(c, ell(560, 334, 20, 15, 24, 0.3), C.white, '#fff', C.pale, {density: 1.2, lightShare: 0.6, smooth: true, lw: 2.6});   // white paw on the button
    [[548, 338], [558, 344], [569, 343]].forEach(([x, y]) => stroke(c, [[x, y], [x + 1, y + 5]], 1.8, C.grey, 0.9));
    // three little curiosity marks above the button
    [[536, 300, 548, 314], [560, 292, 562, 310], [586, 298, 576, 313]].forEach(([a, b, d, e]) => stroke(c, [[a, b], [d, e]], 2.4, C.ink, 0.8));

    // paper grain over everything
    c.save(); c.globalAlpha = 0.12; c.globalCompositeOperation = 'source-atop'; c.fillStyle = c.createPattern(grain, 'repeat'); c.globalCompositeOperation = 'multiply';
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.08; c.fillStyle = '#000'; c.restore();
    return s;
  }

  // ---------- the live layer: keys change colour, nothing else moves ----------
  function render(){
    if (!Duo.ok) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0); ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    const you = new Set(state.you), tone = new Set(state.tones), mc = new Set(state.magchord);
    const wash = (pts, color, alpha) => { ctx.save(); pathOf(ctx, pts); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill();
      ctx.globalAlpha = 0.3; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fill(); ctx.restore(); };
    const hatch = (x0, x1, y0, y1, color) => { ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.55;
      for (let x = x0 - 80; x < x1; x += 9) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + 70, y0); ctx.stroke(); } ctx.restore(); };
    const sets = [[KEYS.whites, KB.bottom, false], [KEYS.blacks, KB.blackBottom, true]];
    sets.forEach(([keys, bottom, black]) => keys.forEach(k => {
      const pts = black ? [[k.x0, KB.top], [k.x1, KB.top], [k.x1, bottom], [k.x0, bottom]] : [[k.x0 + 2, KB.top], [k.x1 - 2, KB.top], [k.x1 - 2, bottom], [k.x0 + 2, bottom]];
      if (you.has(k.pc)) wash(pts, C.red, black ? 0.9 : 0.78);
      else if (state.mel === k.pc) wash(pts, black ? '#555' : C.ink, black ? 0.95 : 0.82);
      else if (mc.has(k.pc)) wash(pts, black ? '#666' : '#9a958b', 0.7);
      else if (tone.has(k.pc)) hatch(k.x0 + 4, k.x1 - 4, black ? KB.top + 4 : KB.top + 90, bottom - 4, black ? '#cfc8b8' : C.char);
      if (black) { if (you.has(k.pc) || state.mel === k.pc) ink(ctx, pts, 2.2); }
      else if (you.has(k.pc) || state.mel === k.pc || mc.has(k.pc)) ink(ctx, pts, 2.2);
    }));
    // black keys sit on top of any white-key wash
    KEYS.blacks.forEach(k => { const lit = you.has(k.pc) || state.mel === k.pc || mc.has(k.pc) || tone.has(k.pc); if (lit) return;
      const touched = KEYS.whites.some(w => (you.has(w.pc) || state.mel === w.pc || mc.has(w.pc)) && w.x1 > k.x0 && w.x0 < k.x1);
      if (touched) { ctx.save(); ctx.fillStyle = C.ink; ctx.fillRect(k.x0, KB.top, k.x1 - k.x0, KB.blackBottom - KB.top); ctx.restore(); ink(ctx, [[k.x0, KB.top], [k.x1, KB.top], [k.x1, KB.blackBottom], [k.x0, KB.blackBottom]], 2.2); } });
    // sargam names
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    KEYS.whites.forEach(k => { const lit = you.has(k.pc) || state.mel === k.pc;
      ctx.font = `italic 30px 'Instrument Serif', Georgia, serif`; ctx.fillStyle = lit ? C.white : tone.has(k.pc) ? C.ink : '#6a645a';
      ctx.fillText(opts.label(k.pc, false), (k.x0 + k.x1) / 2, KB.bottom - 26); });
    KEYS.blacks.forEach(k => { const lit = you.has(k.pc) || state.mel === k.pc;
      ctx.font = `italic 21px 'Instrument Serif', Georgia, serif`; ctx.fillStyle = lit ? C.white : tone.has(k.pc) ? C.white : '#9b968c';
      ctx.fillText(opts.label(k.pc, true), (k.x0 + k.x1) / 2, KB.blackBottom - 18); });
    ctx.restore();
  }
  let k = 1;
  function resize(){
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, host.clientWidth); k = w / W;
    cv.style.width = w + 'px'; cv.style.height = H * k + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(H * k * dpr);
    const s = paintBase(); base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
    base.getContext('2d').drawImage(s, 0, 0, cv.width, cv.height);
    render();
  }
  let lastSig = '';
  Duo.update = s => { const sig = JSON.stringify(s); if (sig === lastSig) return; lastSig = sig; state = s; render(); };
  Duo.init = function (h, o){
    try {
      host = h; opts = o; grain = makeGrain();
      cv = document.createElement('canvas'); ctx = cv.getContext('2d'); cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', 'A long black-and-white cat wrapped around a red Casio keyboard, poking one of its buttons');
      host.innerHTML = ''; host.appendChild(cv);
      Duo.ok = true; resize();
      let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(resize, 150); }).observe(host);
      if (document.fonts) document.fonts.ready.then(render);
      return true;
    } catch (e) { console.error('painting unavailable', e); Duo.ok = false; return false; }
  };
  window.Duo = Duo;
})();
