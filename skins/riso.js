// Riso: the cat, pulled as a risograph print.
// Five spot inks on cream stock: black, the Casio's red, sunflower yellow, riso blue and fluorescent pink.
// Tints are halftone dots, solids lie down a little unevenly, every drum is a hair out of register, and inks overprint:
// the ginger cat is yellow under a red tint, the green hills are blue over yellow. Fur and feathers-of-fur are carved
// linocut marks. Your notes print in fluorescent pink, Magenta's in blue, the chord's notes as yellow dots.
(function () {
  const PAPER = '#f4ecd8';
  const KB = {x0: 112, x1: 888, top: 432, bottom: 668, blackBottom: 574, restY: 408, gap: 3};
  const MIS = {black: [0, 0], red: [1.6, -1], yellow: [-1.4, 1.2], blue: [2, 1.4], pink: [-1.8, -1.2]};
  const D = a => `rgba(0,0,0,${a})`;
  let P;   // the engine's toolkit, set on first use

  // ---- small drawing helpers on an ink layer ----
  function shape(x, pts, a = 1, smooth = false){ x.fillStyle = D(a); P.pathOf(x, pts, smooth); x.fill(); }
  function line(x, pts, w, a = 1){ x.strokeStyle = D(a); x.lineWidth = w; x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke(); }
  function knock(x, fn){ x.save(); x.globalCompositeOperation = 'destination-out'; fn(); x.restore(); }
  function grad(x, x0, y0, x1, y1, stops){ const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, a]) => g.addColorStop(o, D(a))); return g; }
  // a carved linocut mark: a short tapered curve
  function carve(x, cx, cy, len, ang, w, a = 1){
    const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2, nx = -dy * 0.25, ny = dx * 0.25;
    const pts = P.ribbon(P.quad([cx - dx, cy - dy], [cx + nx, cy + ny], [cx + dx, cy + dy], 6), t => w * Math.sin(Math.PI * t) + 0.3);
    shape(x, pts, a);
  }
  // a wedge stripe from the spine, loaded at the start and running out
  function stripe(x, pts, w, a = 1){ const ln = pts.length > 2 ? P.curve(pts, false, 6) : pts; shape(x, P.ribbon(ln, t => w * Math.min(1, 0.4 + t * 5) * (1 - 0.88 * t) + 0.4), a); }
  const print = (sh, o) => sh.print(Object.assign({paper: PAPER, misreg: MIS, cell: 5.4}, o || {}));
  const stampTo = (c, out, box) => c.drawImage(out, box.x, box.y, box.w, box.h);

  // ---------- the print ----------
  function paint(c, PP, K){
    P = PP; const {rnd, ell, curve} = P;
    const box = {x: 0, y: 0, w: 1000, h: 700};
    const sh = Riso.sheet(box, P.S, ['paper', 'blue', 'yellow', 'pink', 'red', 'black']);
    const [paper, blue, yellow, pink, red, black] = ['paper', 'blue', 'yellow', 'pink', 'red', 'black'].map(sh.ink);
    // the sheet, with a deckled edge
    const edge = [], E = 16, J = () => rnd(-3, 3);
    for (let x = E; x <= 1000 - E; x += 14) edge.push([x, E + J()]);
    for (let y = E; y <= 700 - E; y += 14) edge.push([1000 - E + J(), y]);
    for (let x = 1000 - E; x >= E; x -= 14) edge.push([x, 700 - E + J()]);
    for (let y = 700 - E; y >= E; y -= 14) edge.push([E + J(), y]);
    shape(paper, edge, 1);
    const clipE = (x, fn) => { x.save(); P.pathOf(x, edge); x.clip(); fn(); x.restore(); };

    // sky: a blue tint deepening toward the top, ending in a carved wavy horizon
    const hills = [[0, 300]]; for (let xx = 0; xx <= 1000; xx += 20) hills.push([xx, 300 + Math.sin(xx * 0.012) * 16 + Math.sin(xx * 0.031) * 7]); hills.push([1000, 0], [0, 0]);
    clipE(blue, () => { blue.fillStyle = grad(blue, 0, 0, 0, 320, [[0, 0.62], [1, 0.22]]); P.pathOf(blue, hills); blue.fill(); });
    // a big sun: solid yellow, a pink tint at its heart, carved rays around it
    const sun = ell(232, 168, 104, 104, 60);
    shape(yellow, sun, 1);
    pink.fillStyle = (() => { const g = pink.createRadialGradient(232, 168, 4, 232, 168, 104); g.addColorStop(0, D(0.55)); g.addColorStop(1, D(0)); return g; })(); P.pathOf(pink, sun); pink.fill();
    knock(blue, () => { P.pathOf(blue, ell(232, 168, 112, 112, 60)); blue.fill(); });
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r0 = 122 + (i % 2) * 8; carve(black, 232 + Math.cos(a) * (r0 + 12), 168 + Math.sin(a) * (r0 + 12), 22 + (i % 2) * 10, a, 3.2, 1); }
    // a field of pink dots in the top right, with a wobbling edge
    const field = [[640, 16], [1000, 16], [1000, 290], [700, 290]]; const fe = [];
    for (let y = 16; y <= 290; y += 12) fe.push([640 + Math.sin(y * 0.05) * 18 + y * 0.18, y]);
    clipE(pink, () => { shape(pink, [...fe, [1000, 290], [1000, 16]], 0.32); });
    // the hills: blue over yellow prints green; carved furrows
    const land = [[0, 300]]; for (let xx = 0; xx <= 1000; xx += 20) land.push([xx, 300 + Math.sin(xx * 0.012) * 16 + Math.sin(xx * 0.031) * 7]); land.push([1000, 700], [0, 700]);
    clipE(yellow, () => shape(yellow, land, 0.9));
    clipE(blue, () => shape(blue, land, 0.55));
    clipE(black, () => { for (let r = 0; r < 26; r++) { const y0 = 318 + r * 15; for (let xx = 20 + (r % 2) * 18; xx < 990; xx += 36) carve(black, xx, y0 + Math.sin(xx * 0.012) * 10, 16, 0.08 * Math.sin(xx * 0.02), 2.6, 0.85); } });

    // ---- the Casio ----
    const cas = curve([[84, 340], [300, 337], [500, 336], [700, 337], [916, 340], [934, 356], [938, 520], [934, 676], [916, 690], [700, 692], [500, 693], [300, 692], [84, 690], [66, 676], [62, 520], [66, 356]], true, 8);
    // knock the landscape out under it, so the red prints clean on paper
    [blue, yellow, black, pink].forEach(x => knock(x, () => { P.pathOf(x, cas); x.fill(); }));
    shape(black, cas.map(([x, y]) => [x + 12, y + 12]), 0.35);          // its shadow, as a black tint
    knock(black, () => { P.pathOf(black, cas); black.fill(); });
    shape(red, cas, 1);
    // red-on-red shading: a black tint toward the bottom and right
    black.save(); P.pathOf(black, cas); black.clip(); black.fillStyle = grad(black, 0, 340, 0, 700, [[0, 0], [0.6, 0.05], [1, 0.3]]); black.fillRect(0, 300, 1000, 420); black.restore();
    // carved highlights along the top edge
    knock(red, () => { for (let i = 0; i < 3; i++) line(red, [[110 + i * 6, 348 + i * 5], [880 - i * 30, 348 + i * 5]], 2.2 - i * 0.5); });
    // grilles, knob, buttons
    const grille = (x0, x1) => { for (let r = 0; r < 4; r++) for (let x = x0 + (r % 2) * 7; x < x1; x += 14) shape(black, ell(x, 358 + r * 13, 3.2, 3.2, 10), 1); };
    grille(110, 330); grille(670, 890);
    shape(black, ell(392, 382, 19, 19, 30), 1); knock(black, () => line(black, [[392, 368], [392, 378]], 3.5)); shape(yellow, ell(392, 373, 2.5, 6, 10), 1);
    [450, 486, 522, 558, 594].forEach((x, i) => { shape(i === 2 ? yellow : black, ell(x, 384, 11, 8, 22), 1); if (i === 2) shape(black, ell(x, 384, 11, 8, 22).map(([a, b]) => [a, b]), 0); });
    line(black, cas.concat([cas[0]]), 5.5);
    // ---- keys ----
    const bed = [[KB.x0 - 8, KB.top - 8], [KB.x1 + 8, KB.top - 8], [KB.x1 + 8, KB.bottom + 9], [KB.x0 - 8, KB.bottom + 9]];
    knock(red, () => { P.pathOf(red, bed); red.fill(); });
    shape(black, bed, 1);
    K.whites.forEach(k => {
      knock(black, () => { P.pathOf(black, k.poly); black.fill(); });
      // a soft black tint: shade on the right, and the shadows of the black keys
      black.save(); P.pathOf(black, k.poly); black.clip();
      black.fillStyle = grad(black, k.x0, 0, k.x1, 0, [[0, 0], [0.6, 0.02], [1, 0.16]]); black.fillRect(k.x0, k.y0, k.x1 - k.x0, k.y1 - k.y0);
      black.fillStyle = grad(black, 0, k.y0, 0, k.y0 + 26, [[0, 0.3], [1, 0]]); black.fillRect(k.x0, k.y0, k.x1 - k.x0, 26);
      K.blacks.forEach(b => { if (b.x1 < k.x0 - 10 || b.x0 > k.x1 + 10) return; black.fillStyle = D(0.24); black.fillRect(b.x1, b.y0, 8, b.y1 - b.y0 + 8); black.fillRect(b.x0 + 6, b.y1, b.x1 - b.x0 + 2, 9); });
      black.restore();
    });
    K.blacks.forEach(k => {
      const q = [[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]]; shape(black, q, 1);
      knock(black, () => { line(black, [[k.x0 + 9, k.y0 + 16], [k.x0 + 9, k.y1 - 22]], 2.6); line(black, [[k.x0 + 5, k.y1 - 10], [k.x1 - 5, k.y1 - 10]], 1.6); });
    });
    // the title, printed in black like everything else
    black.save(); black.textAlign = 'left'; black.fillStyle = D(1); black.font = '900 24px Fraunces, Georgia, serif'; black.fillText('I Fall in Love Too Easily', 690, 66);
    black.font = '700 14px Fraunces, Georgia, serif'; black.fillText('a riso print for two players', 692, 88); black.restore();
    stampTo(c, print(sh, {seed: 1}), box);
  }

  // ---------- marks laid on the keys while notes sound ----------
  function markKeys(c, kind, keys, PP, box){
    P = PP;
    const sh = Riso.sheet(box, P.S, ['paper', 'yellow', 'pink', 'blue', 'black']);
    const [paper, yellow, pink, blue, black] = ['paper', 'yellow', 'pink', 'blue', 'black'].map(sh.ink);
    keys.forEach(k => {
      const q = k.black ? [[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]] : k.poly;
      shape(paper, q, 1);
      if (k.black) shape(black, q, 1);
      else { black.save(); P.pathOf(black, q); black.clip(); black.fillStyle = grad(black, k.x0, 0, k.x1, 0, [[0, 0], [1, 0.14]]); black.fillRect(k.x0, k.y0, k.x1 - k.x0, k.y1 - k.y0); black.restore(); }
      if (kind === 'you') { if (k.black) knock(black, () => { P.pathOf(black, q); black.fill(); }); shape(pink, q, 1); knock(pink, () => { for (let y = k.y0 + 14; y < k.y1 - 40; y += 22) line(pink, [[k.x0 + 8, y], [k.x0 + 14, y + 4]], 2); }); }
      if (kind === 'mel') { if (k.black) knock(black, () => { P.pathOf(black, q); black.fill(); }); shape(blue, q, 1); knock(blue, () => { for (let y = k.y0 + 14; y < k.y1 - 40; y += 22) line(blue, [[k.x0 + 8, y], [k.x0 + 14, y + 4]], 2); }); }
      if (kind === 'mc') { if (k.black) knock(black, () => { P.pathOf(black, q); black.fill(); }); shape(blue, q, 0.4); }
      if (kind === 'tone') {
        const [x, y] = k.black ? [k.cx, k.y0 + 34] : [k.cx, KB.blackBottom - 42];
        if (k.black) knock(black, () => { P.pathOf(black, P.ell(x, y, 13, 13, 20)); black.fill(); });
        shape(yellow, P.ell(x, y, k.black ? 12 : 15, k.black ? 12 : 15, 24), 1);
        shape(black, P.ell(x, y, 3.5, 3.5, 10), 1);
        if (!k.black) { yellow.save(); P.pathOf(yellow, q); yellow.clip(); yellow.fillStyle = D(0.35); yellow.fillRect(k.x0, KB.blackBottom - 10, k.x1 - k.x0, k.y1 - KB.blackBottom + 10); yellow.restore(); }
      }
      if (!k.black) line(black, [[k.x1 + 3, k.y0], [k.x1 + 3, k.y1]], 3.2);
    });
    stampTo(c, print(sh, {seed: 2}), box);
  }

  function label(k, kind){
    const lit = kind === 'you' || kind === 'mel';
    return k.black
      ? {font: `700 17px Fraunces, Georgia, serif`, size: 17, y: k.y1 - 16, color: lit ? '#fff7ee' : '#efe5cf', mark: 2}
      : {font: `800 23px Fraunces, Georgia, serif`, size: 23, y: k.y1 - 12, color: lit ? '#fff7ee' : '#1e1b1d', mark: 2.6};
  }

  // ---------- the cat, a ginger print, in pieces ----------
  // ginger = solid yellow under a red tint; stripes = more red; outline and carved fur = black; socks, chest and muzzle = bare paper
  function piece(c, PP, box, inks, fn, seed){
    P = PP; const sh = Riso.sheet(box, P.S, ['paper', ...inks]); const L = {}; ['paper', ...inks].forEach(n => L[n] = sh.ink(n));
    fn(L); stampTo(c, print(sh, {seed}), box);
  }
  function furRows(x, pts, rows, step, len, w, a, lean = 0.5){
    x.save(); P.pathOf(x, pts); x.clip();
    rows.forEach(([y, x0, x1], r) => { for (let xx = x0 + (r % 2) * step / 2; xx < x1; xx += step) carve(x, xx, y, len, lean, w, a); });
    x.restore();
  }
  const pieces = {
    body: {box: {x: -26, y: -32, w: 612, h: 184}, inner: {x0: 0, y0: 0, x1: 560, y1: 120},
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'red', 'black'], ({paper, yellow, red, black}) => {
        const pts = [];
        for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([52 + 456 * u, 6 - Math.sin(Math.PI * u) * 9]); }
        for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 10; pts.push([506 + Math.cos(a) * 54, 60 + Math.sin(a) * 56]); }
        for (let i = 16; i >= 0; i--) { const u = i / 16; pts.push([52 + 456 * u, 118 - Math.sin(Math.PI * u) * 6]); }
        for (let i = 1; i < 10; i++) { const a = Math.PI / 2 + Math.PI * i / 10; pts.push([54 + Math.cos(a) * 56, 60 + Math.sin(a) * 56]); }
        shape(paper, pts, 1); shape(yellow, pts, 1);
        red.save(); P.pathOf(red, pts); red.clip();
        red.fillStyle = grad(red, 0, 0, 0, 120, [[0, 0.62], [0.55, 0.42], [1, 0.62]]); red.fillRect(-30, -30, 620, 190);
        const LEN = [0.66, 0.5, 0.8, 0.58, 0.84, 0.52, 0.76, 0.62, 0.7, 0.56, 0.8];
        for (let i = 0; i < 11; i++) { const xx = 72 + i * 40, y1 = 120 * LEN[i]; stripe(red, [[xx + 10, -12], [xx + 4, y1 * 0.4], [xx - 3, y1 * 0.75], [xx - 10, y1]], i % 3 === 1 ? 15 : 20, 1); }
        red.restore();
        // a pale chest and belly: bare paper
        const belly = P.curve([[300, 104], [420, 92], [500, 76], [540, 96], [500, 124], [300, 124]], true, 6);
        [yellow, red].forEach(x => knock(x, () => { P.pathOf(x, belly); x.fill(); }));
        // carved fur: rows of little marks, thicker toward the shadowed belly
        black.save(); P.pathOf(black, pts); black.clip();
        for (let i = 0; i < 46; i++) { const xx = 40 + ((i * 97) % 460), yy = 64 + ((i * 53) % 46); carve(black, xx, yy, 8, 0.9, 1.4, 0.9); carve(black, xx + 5, yy, 8, -0.9 + Math.PI, 1.4, 0.9); }
        black.restore();
        // the outline, heavy underneath
        line(black, pts.concat([pts[0]]), 4.2);
        line(black, pts.slice(17 + 9, 17 + 9 + 17), 7);
      }, 3); }},
    leg: {box: {x: -10, y: -6, w: 56, h: 316}, inner: {x0: 0, y0: 0, x1: 36, y1: 300}, draw: legDraw(0)},
    legHind: {box: {x: -10, y: -6, w: 56, h: 316}, inner: {x0: 0, y0: 0, x1: 36, y1: 300}, draw: legDraw(0.18)},
    paw: {box: {x: -36, y: -26, w: 72, h: 50}, draw: pawDraw(false)},
    pawExtra: {box: {x: -36, y: -42, w: 72, h: 66}, draw: pawDraw(true)},
    tailUp: {box: {x: -160, y: -224, w: 200, h: 260},
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'red', 'black'], L => tailDraw(L, PP.bez([0, 0], [-74, -6], [-114, -120], [-58, -178], 26), t => 30 - 15 * t), 5); }},
    tailDown: {box: {x: -8, y: -6, w: 44, h: 316}, inner: {x0: 0, y0: 0, x1: 28, y1: 300},
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'red', 'black'], ({paper, yellow, red, black}) => {
        const q = [[0, 0], [28, 0], [28, 300], [0, 300]];
        shape(paper, q); shape(yellow, q); shape(red, q, 0.5);
        for (let y = 26; y < 300; y += 34) stripe(red, [[-2, y], [14, y + 4], [30, y]], 11, 1);
        line(black, [[0, 0], [0, 300]], 3); line(black, [[28, 0], [28, 300]], 5);
      }, 6); }},
    tailTip: {box: {x: -22, y: -22, w: 44, h: 44},
      draw(c, PP, box){ piece(c, PP, box, ['red', 'black'], ({paper, red, black}) => { const e = PP.ell(0, 0, 15, 13, 24); shape(paper, e); shape(red, e, 1); line(black, e.concat([e[0]]), 3.5); }, 7); }},
    head: {box: {x: -160, y: -175, w: 320, h: 260},
      eyes: [[-27, -16, 15], [27, -16, 15]],
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'pink', 'red', 'black'], ({paper, yellow, pink, red, black}) => {
        const {curve, ell} = PP;
        const head = curve([[-70, 4], [-62, -42], [-30, -62], [30, -62], [62, -42], [70, 4], [52, 46], [0, 60], [-52, 46]], true, 10);
        const earL = [[-60, -34], [-52, -112], [-10, -60]], earR = [[10, -60], [52, -112], [60, -34]];
        // ears: ginger with fluorescent pink insides
        [earL, earR].forEach(e => { shape(paper, e); shape(yellow, e); shape(red, e, 0.55); });
        shape(pink, [[-48, -46], [-46, -92], [-20, -60]], 1); shape(pink, [[20, -60], [46, -92], [48, -46]], 1);
        [earL, earR].forEach(e => line(black, e.concat([e[0]]), 3.6));
        shape(paper, head); shape(yellow, head);
        red.save(); P.pathOf(red, head); red.clip(); red.fillStyle = D(0.5); red.fillRect(-80, -80, 160, 160);
        // forehead stripes and cheek flashes
        [-20, 0, 20].forEach(dx => stripe(red, [[dx, -66], [dx * 1.1, -48], [dx * 0.9, -32]], 11, 1));
        [[-1, -2], [1, -2]].forEach(([s, dy]) => { stripe(red, [[s * 74, dy], [s * 58, dy + 6], [s * 46, dy + 4]], 10, 1); stripe(red, [[s * 74, dy + 18], [s * 60, dy + 22], [s * 50, dy + 20]], 8, 1); });
        red.restore();
        // a bare-paper muzzle
        const muz = ell(0, 30, 36, 24, 26);
        [yellow, red].forEach(x => knock(x, () => { P.pathOf(x, muz); x.fill(); }));
        // owl eyes: big yellow discs in a heavy black ring
        cat.eyes.forEach(([x, y, r]) => {
          [red].forEach(L => knock(L, () => { P.pathOf(L, ell(x, y, r + 7, r + 7, 30)); L.fill(); }));
          shape(yellow, ell(x, y, r + 5, r + 5, 30), 1); shape(pink, ell(x - 2, y + 3, r + 5, r + 5, 30), 0.28);
          line(black, ell(x, y, r + 6, r + 6, 30).concat([ell(x, y, r + 6, r + 6, 30)[0]]), 4.5);
        });
        // carved brow marks: worried, curious
        carve(black, -30, -48, 16, -0.45, 2.6, 1); carve(black, 30, -48, 16, 0.45, 2.6, 1);
        // nose and mouth
        const nose = [[-9, 18], [9, 18], [0, 28]]; shape(pink, nose, 1); line(black, nose.concat([nose[0]]), 2.2);
        line(black, [[0, 28], [0, 35], [-9, 41], [-17, 37]], 3); line(black, [[0, 35], [9, 41], [17, 37]], 3);
        // the outline
        line(black, head.concat([head[0]]), 4.4);
        // whiskers
        [[-1, 26, -0.12], [-1, 33, 0.03], [-1, 40, 0.16], [1, 26, -0.12], [1, 33, 0.03], [1, 40, 0.16]].forEach(([s, dy, a]) => line(black, PP.quad([s * 34, dy], [s * 80, dy + a * 50 - 4], [s * 128, dy + a * 104 - 8], 10), 1.8));
      }, 8); }},
  };
  function legDraw(dark){
    return (c, PP, box) => piece(c, PP, box, ['yellow', 'red', 'black'], ({paper, yellow, red, black}) => {
      const q = [[0, 0], [36, 0], [36, 300], [0, 300]];
      shape(paper, q); shape(yellow, q);
      red.fillStyle = grad(red, 0, 0, 36, 0, [[0, 0.35 + dark], [1, 0.7 + dark]]); P.pathOf(red, q); red.fill();
      [70, 132].forEach((y, i) => stripe(red, [[38, y - 6], [24, y + 2], [10, y + 4], [2, y + 1]], i ? 9 : 12, 1));
      // white socks: the bottom of each leg is bare paper
      [yellow, red].forEach(x => knock(x, () => x.fillRect(-2, 236, 40, 70)));
      black.save(); P.pathOf(black, q); black.clip();
      carve(black, 26, 40, 12, 1.9, 1.6, 0.9); carve(black, 22, 196, 10, 1.9, 1.5, 0.8);
      if (dark) { black.fillStyle = D(dark); black.fillRect(0, 0, 36, 300); }
      black.restore();
      line(black, [[0, -4], [0, 304]], 3); line(black, [[36, -4], [36, 304]], 5);
    }, dark ? 10 : 9);
  }
  function pawDraw(extra){
    return (c, PP, box) => piece(c, PP, box, ['yellow', 'pink', 'black'], ({paper, yellow, pink, black}) => {
      const p = PP.ell(0, 0, 24, 15, 30);
      if (extra) {   // the extra leg wears a fluorescent payal with little yellow bells
        const band = [[-19, -32], [19, -32], [19, -20], [-19, -20]];
        shape(paper, band); shape(pink, band, 1); [-12, -4, 4, 12].forEach(x => { shape(paper, PP.ell(x, -17, 3.6, 3.6, 10)); shape(yellow, PP.ell(x, -17, 3.6, 3.6, 10), 1); });
        line(black, band.concat([band[0]]), 2);
      }
      shape(paper, p); black.fillStyle = grad(black, 0, -15, 0, 15, [[0, 0], [1, 0.18]]); P.pathOf(black, p); black.fill();
      line(black, p.concat([p[0]]), 4);
      [-8, 0, 8].forEach(dx => line(black, [[dx, 14], [dx * 1.1, 6]], 2.6));
    }, extra ? 12 : 11);
  }
  function tailDraw({paper, yellow, red, black}, ln, wFn){
    const n = ln.length, sh = P.ribbon(ln, wFn);
    shape(paper, sh); shape(yellow, sh); shape(red, sh, 0.5);
    red.save(); P.pathOf(red, sh); red.clip();
    [0.2, 0.34, 0.48, 0.62, 0.76, 0.9].forEach(t => { const i = Math.round(t * (n - 1)), [x, y] = ln[i], [px, py] = ln[i - 1], [nx, ny] = ln[Math.min(n - 1, i + 1)];
      const dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, w = wFn(t) / 2 + 3;
      stripe(red, [[x - dy / l * w, y + dx / l * w], [x + dx / l * 3, y + dy / l * 3], [x + dy / l * w, y - dx / l * w]], 10, 1); });
    red.restore();
    line(black, sh.concat([sh[0]]), 3.8);
  }

  const cat = {floor: 336, thick: 112, restLen: 300, pad: 46, minLen: 250, headIn: 34, headDrop: 26, legW: 36, tailW: 28,
    eyes: pieces.head.eyes, pupil: '#1e1b1d', pieces};

  Duo.register({id: 'riso', name: 'Riso print', seed: 21, KB, paint, markKeys, needsFonts: true, label, cat, painterly: false,
    alt: 'A risograph print in red, yellow, blue, black and fluorescent pink: a red Casio keyboard under a big sun, and a long ginger cat with owl eyes standing on it, its legs dropping straight down onto the keys'});
})();
