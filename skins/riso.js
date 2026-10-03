// Riso: the cat, pulled as a risograph print, with every form painted by brush.
// Each ink separation is painted with a bristle brush (bristle.js), the way printmakers paint their own separations:
// forms are built from strokes laid along them, edges are wherever the strokes happened to stop, outlines are a few
// overlapping strokes that swell and lift, and nothing is a perfect shape. Then the press (riso.js) does its part:
// tints become halftone dots, solids lie down unevenly, the drums are a hair out of register, and inks overprint
// (the ginger cat is yellow under red, the hills blue over yellow).
// Five inks on cream stock: black, the Casio's red, sunflower yellow, riso blue, fluorescent pink.
// Your notes print in fluorescent pink, Magenta's in blue, the chord's notes as yellow dabs.
(function () {
  const PAPER = '#f4ecd8';
  const KB = {x0: 112, x1: 888, top: 432, bottom: 668, blackBottom: 574, restY: 408, gap: 3, jitter: 1.6, markPad: 7};
  const MIS = {black: [0, 0], red: [1.6, -1], yellow: [-1.4, 1.2], blue: [2, 1.4], pink: [-1.8, -1.2]};
  const B = window.Bristle;
  const DISPLAY = {x: 250, y: 30, w: 500, h: 106};
  let P;   // the engine's toolkit, set on first use

  const fill = (x, poly, o) => B.fill(x, poly, o);
  const stroke = (x, pts, o) => B.stroke(x, pts, o);
  const contour = (x, poly, o) => B.contour(x, poly, o);
  const wob = (pts, amp, f) => B.wobble(pts, amp, f);
  const knock = (x, fn) => { x.save(); x.globalCompositeOperation = 'destination-out'; fn(); x.restore(); };
  const solid = (x, pts) => { x.fillStyle = '#000'; x.globalAlpha = 1; P.pathOf(x, pts); x.fill(); };
  const circle = (cx, cy, rx, ry, n = 30, amp = 0) => wob(P.ell(cx, cy, rx, ry, n), amp);
  const print = (sh, o) => sh.print(Object.assign({paper: PAPER, misreg: MIS, cell: 5.4}, o || {}));
  const stampTo = (c, out, box) => c.drawImage(out, box.x, box.y, box.w, box.h);
  // a flick: a short loaded stroke that runs out
  const flick = (x, x0, y0, x1, y1, w, a = 1, bend = 0) => stroke(x, [[x0, y0], [(x0 + x1) / 2 + bend, (y0 + y1) / 2], [x1, y1]], {w, a, press: 'flick'});
  const dab = (x, cx, cy, r, a = 1, ang = 0.3) => stroke(x, [[cx - Math.cos(ang) * r * 0.5, cy - Math.sin(ang) * r * 0.5], [cx + Math.cos(ang) * r * 0.5, cy + Math.sin(ang) * r * 0.5]], {w: r * 1.6, a, press: 'dab', load: 2});

  // ---------- the print ----------
  function paint(c, PP, K){
    P = PP; const {rnd} = P; B.seed(31); const D = DISPLAY;
    const box = {x: 0, y: 0, w: 1000, h: 700};
    const sh = Riso.sheet(box, P.S, ['paper', 'blue', 'yellow', 'pink', 'red', 'black']);
    const [paper, blue, yellow, pink, red, black] = ['paper', 'blue', 'yellow', 'pink', 'red', 'black'].map(sh.ink);
    // the sheet, with a deckled edge (the stock itself is the only thing not painted)
    const edge = [], E = 16, J = () => rnd(-3, 3);
    for (let x = E; x <= 1000 - E; x += 14) edge.push([x, E + J()]);
    for (let y = E; y <= 700 - E; y += 14) edge.push([1000 - E + J(), y]);
    for (let x = 1000 - E; x >= E; x -= 14) edge.push([x, 700 - E + J()]);
    for (let y = 700 - E; y >= E; y -= 14) edge.push([E + J(), y]);
    solid(paper, edge);
    const inSheet = (x, fn) => { x.save(); P.pathOf(x, edge); x.clip(); fn(); x.restore(); };
    const horizon = xx => 304 + Math.sin(xx * 0.012) * 16 + Math.sin(xx * 0.031) * 7;

    // sky: broad blue strokes, laid twice so the tint gathers unevenly, darker up top
    const sky = [[10, 10], [990, 10], ...Array.from({length: 51}, (_, i) => [990 - i * 19.6, horizon(990 - i * 19.6) + 4])];
    inSheet(blue, () => { fill(blue, sky, {w: 46, ang: 0.02, a: 0.32, bend: 0.03, over: 0.6, reach: 360});
      fill(blue, [[10, 10], [990, 10], [990, 150], [10, 190]], {w: 40, ang: -0.03, a: 0.28, over: 0.8, reach: 300}); });
    // the sun, top right: yellow worked round and round, flicked rays
    const SX = 850, SY = 128, sunR = 74, sun = circle(SX, SY, sunR, sunR, 36, 3);
    knock(blue, () => { P.pathOf(blue, circle(SX, SY, sunR + 10, sunR + 10, 36, 3)); blue.fill(); });
    fill(yellow, sun, {w: 22, ang: 0.5, a: 1, over: 0.15, bend: 0.12});
    fill(yellow, circle(SX, SY, sunR * 0.8, sunR * 0.8, 30, 3), {w: 18, ang: -0.6, a: 1, over: 0.1, bend: 0.1});
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2 + rnd(-0.05, 0.05), r0 = 94 + (i % 2) * 6 + rnd(-3, 3), len = 18 + (i % 2) * 10 + rnd(-3, 5);
      inSheet(black, () => flick(black, SX + Math.cos(a) * r0, SY + Math.sin(a) * r0, SX + Math.cos(a) * (r0 + len), SY + Math.sin(a) * (r0 + len), 4.4)); }
    // the 8-bit display Magenta watches, hanging on two strings: a red bezel round a black screen (the engine lights its LEDs)
    const bezel = wob(P.curve([[248, 18], [500, 16], [752, 18], [764, 28], [764, 140], [752, 150], [500, 151], [248, 150], [236, 140], [236, 28]], true, 6), 1.2);
    [blue, yellow, pink].forEach(x => knock(x, () => { P.pathOf(x, bezel); x.fill(); }));
    fill(black, bezel.map(([x, y]) => [x + 9, y + 10]), {w: 22, ang: 0, a: 0.28, over: 0.2});
    knock(black, () => { P.pathOf(black, bezel); black.fill(); });
    fill(red, bezel, {w: 16, ang: 0.02, a: 1, over: 0.08});
    const screen = wob([[D.x - 4, D.y - 4], [D.x + D.w + 4, D.y - 4], [D.x + D.w + 4, D.y + D.h + 4], [D.x - 4, D.y + D.h + 4]], 0.6);
    knock(red, () => { P.pathOf(red, screen); red.fill(); });
    fill(black, screen, {w: 16, ang: 0, a: 1, over: 0.04, gap: 0.3}); solid(black, [[D.x, D.y], [D.x + D.w, D.y], [D.x + D.w, D.y + D.h], [D.x, D.y + D.h]]);
    contour(black, bezel, {w: 4, pieces: 4});
    [[243, 24], [757, 24], [243, 144], [757, 144]].forEach(([x, y]) => dab(black, x, y, 4));
    // the hills: yellow and blue strokes along the slope (green where they overlap), black furrows flicked in
    const land = [...Array.from({length: 51}, (_, i) => [10 + i * 19.6, horizon(10 + i * 19.6)]), [990, 690], [10, 690]];
    inSheet(yellow, () => fill(yellow, land, {w: 30, ang: 0.04, a: 0.95, over: 0.4, reach: 300}));
    inSheet(blue, () => fill(blue, land, {w: 30, ang: -0.05, a: 0.55, over: 0.4, reach: 300}));
    inSheet(black, () => { for (let r = 0; r < 24; r++) { const y0 = 324 + r * 16; for (let xx = 24 + (r % 2) * 20 + rnd(-6, 6); xx < 986; xx += 40 + rnd(-8, 8)) { const yy = y0 + Math.sin(xx * 0.012) * 10; flick(black, xx - 9, yy + rnd(-1, 1), xx + 9, yy + rnd(-2, 2), 3.4, 0.9, rnd(-2, 2)); } } });

    // ---- the Casio, painted in long red strokes ----
    const cas = wob(P.curve([[84, 342], [300, 338], [500, 336], [700, 338], [916, 341], [934, 358], [938, 520], [934, 674], [916, 689], [700, 692], [500, 693], [300, 692], [84, 690], [66, 676], [62, 520], [66, 358]], true, 6), 2.2, 0.03);
    [blue, yellow, black, pink].forEach(x => knock(x, () => { P.pathOf(x, cas); x.fill(); }));
    fill(black, cas.map(([x, y]) => [x + 13, y + 13]), {w: 30, ang: 0, a: 0.3, over: 0.2});     // its shadow, a black tint
    knock(black, () => { P.pathOf(black, cas); black.fill(); });
    fill(red, cas, {w: 28, ang: 0.01, a: 1, over: 0.12, reach: 420, bend: 0.01});
    fill(black, wob([[70, 600], [930, 600], [934, 686], [66, 686]], 3), {w: 22, ang: 0, a: 0.16, over: 0.2});   // shade along the bottom
    knock(red, () => { stroke(red, [[100, 348], [500, 346], [880, 350]], {w: 4, press: 'swell'}); stroke(red, [[130, 357], [620, 356]], {w: 2.4, press: 'flick'}); });
    // grilles as dabs, knob and buttons as worked blobs
    const grille = (x0, x1) => { for (let r = 0; r < 4; r++) for (let x = x0 + (r % 2) * 7; x < x1; x += 14) dab(black, x + rnd(-0.6, 0.6), 358 + r * 13 + rnd(-0.6, 0.6), 4.4, 1, rnd(0, 3)); };
    grille(110, 330); grille(670, 890);
    fill(black, circle(392, 382, 19, 19, 24, 1.2), {w: 9, ang: 0.7, a: 1, over: 0.1}); contour(black, circle(392, 382, 19, 19, 24, 1), {w: 3});
    knock(black, () => stroke(black, [[392, 366], [392, 379]], {w: 4, press: 'flick'}));
    [450, 486, 522, 558, 594].forEach((x, i) => { if (i === 2) dab(yellow, x, 384, 12, 1, 0); else dab(black, x, 384, 11, 1, 0.1); });
    contour(black, cas, {w: 6.5, pieces: 7});
    // ---- the keys ----
    const bed = wob([[KB.x0 - 9, KB.top - 9], [KB.x1 + 9, KB.top - 9], [KB.x1 + 9, KB.bottom + 10], [KB.x0 - 9, KB.bottom + 10]], 1.5);
    knock(red, () => { P.pathOf(red, bed); red.fill(); });
    fill(black, bed, {w: 18, ang: Math.PI / 2, a: 1, over: 0.15, gap: 0.3});
    K.whites.forEach(k => {
      knock(black, () => { P.pathOf(black, k.poly); black.fill(); });
      black.save(); P.pathOf(black, k.poly); black.clip();
      stroke(black, [[k.x0, k.y0 + 6], [k.x1, k.y0 + 7]], {w: 12, a: 0.22, press: 'flat'});                  // under the panel lip
      K.blacks.forEach(b => { if (b.x1 < k.x0 - 10 || b.x0 > k.x1 + 10) return;
        stroke(black, [[b.x1 + 4, b.y0], [b.x1 + 4, b.y1 + 6]], {w: 9, a: 0.24, press: 'flat'}); stroke(black, [[b.x0 + 4, b.y1 + 5], [b.x1 + 6, b.y1 + 5]], {w: 9, a: 0.22, press: 'flat'}); });
      black.restore();
      stroke(black, [[k.x1 + 3, k.y0 - 2], [k.x1 + 3.5, (k.y0 + k.y1) / 2], [k.x1 + 3, k.y1 + 2]], {w: 3.4, press: 'flat'});
    });
    K.blacks.forEach(k => {
      fill(black, wob([[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]], 0.8), {w: 10, ang: Math.PI / 2, a: 1, over: 0.06, gap: 0.3});
      knock(black, () => { stroke(black, [[k.x0 + 9, k.y0 + 16], [k.x0 + 8.5, k.y1 - 24]], {w: 3, press: 'swell'}); stroke(black, [[k.x0 + 6, k.y1 - 10], [k.x1 - 6, k.y1 - 11]], {w: 2, press: 'flick'}); });
    });
    stampTo(c, print(sh, {seed: 1}), box);
  }

  // ---------- marks laid on the keys: brushed in, a little over the edges ----------
  // target (a chord note still to play) = solid yellow; got = yellow and blue overprinted, which prints green;
  // you (a note outside the chord) = blue; Magenta's note = pink; Magenta's chord = a pink tint
  const MARK_INKS = {target: ['yellow'], got: ['yellow', 'blue'], you: ['blue'], mel: ['pink'], mc: ['pink']};
  function markKeys(c, kind, keys, PP, box){
    P = PP; B.seed(kind.length * 7 + 3);
    const inks = ['paper', 'black', ...MARK_INKS[kind]];
    const sh = Riso.sheet(box, P.S, inks);
    const dummy = document.createElement('canvas').getContext('2d');
    const [paper, yellow, pink, blue, black] = ['paper', 'yellow', 'pink', 'blue', 'black'].map(n => inks.includes(n) ? sh.ink(n) : dummy);
    keys.forEach(k => {
      const q = k.black ? [[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]] : k.poly;
      solid(paper, q.map(([x, y], i) => [x + (i === 0 || i === 3 ? -2 : 2), y]));
      const brush = (ink, a) => fill(ink, wob(q, 1), {w: k.black ? 11 : 15, ang: Math.PI / 2 + 0.03, a, over: 0.1, gap: 0.36});
      MARK_INKS[kind].forEach(ink => brush({yellow, pink, blue}[ink], kind === 'mc' ? (k.black ? 0.75 : 0.45) : 1));
      if (k.black && kind === 'mc') brush(black, 0.35);
      if (!k.black) stroke(black, [[k.x1 + 3, k.y0 - 2], [k.x1 + 3.5, (k.y0 + k.y1) / 2], [k.x1 + 3, k.y1 + 2]], {w: 3.4, press: 'flat'});
    });
    stampTo(c, print(sh, {seed: 2}), box);
  }

  // the print's border, brushed in the colour of whoever is playing
  function border(c, PP, turn){
    P = PP; B.seed(turn === 'you' ? 41 : 43);
    const box = {x: 0, y: 0, w: 1000, h: 700}, ink = turn === 'you' ? 'blue' : 'pink';
    const sh = Riso.sheet(box, P.S, [ink]), x = sh.ink(ink);
    const E = 16, w = 26;
    [[[E, E], [1000 - E, E]], [[1000 - E, E], [1000 - E, 700 - E]], [[1000 - E, 700 - E], [E, 700 - E]], [[E, 700 - E], [E, E]]].forEach(([a, b2]) => {
      for (let pass = 0; pass < 2; pass++) { const n = 3; for (let i = 0; i < n; i++) {
        const t0 = i / n - 0.04, t1 = (i + 1) / n + 0.04, p0 = [a[0] + (b2[0] - a[0]) * t0, a[1] + (b2[1] - a[1]) * t0], p1 = [a[0] + (b2[0] - a[0]) * t1, a[1] + (b2[1] - a[1]) * t1];
        stroke(x, [p0, [(p0[0] + p1[0]) / 2 + P.rnd(-2, 2), (p0[1] + p1[1]) / 2 + P.rnd(-2, 2)], p1], {w: w * P.rnd(0.85, 1.1), press: 'flat', load: 1.6}); } }
    });
    stampTo(c, print(sh, {seed: turn === 'you' ? 5 : 6}), box);
  }

  function label(k, kind){
    const lit = kind === 'you' || kind === 'mel' || kind === 'got';
    return k.black
      ? {font: `700 17px Fraunces, Georgia, serif`, size: 17, y: k.y1 - 16, color: lit ? '#fff7ee' : kind === 'target' ? '#1e1b1d' : '#efe5cf', mark: 2}
      : {font: `800 23px Fraunces, Georgia, serif`, size: 23, y: k.y1 - 12, color: lit ? '#fff7ee' : '#1e1b1d', mark: 2.6};
  }

  // ---------- the cat, a ginger brush-painted print, in pieces ----------
  function piece(c, PP, box, inks, fn, seed){
    P = PP; B.seed(seed * 101);
    const sh = Riso.sheet(box, P.S, ['paper', ...inks]); const L = {}; ['paper', ...inks].forEach(n => L[n] = sh.ink(n));
    fn(L); stampTo(c, print(sh, {seed}), box);
  }
  // the long body: a soft loaf, a little lumpy
  const BODY = (() => { const pts = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([52 + 456 * u, 6 - Math.sin(Math.PI * u) * 9 + Math.sin(u * 17) * 1.5]); }
    for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 10; pts.push([506 + Math.cos(a) * 54, 60 + Math.sin(a) * 56]); }
    for (let i = 16; i >= 0; i--) { const u = i / 16; pts.push([52 + 456 * u, 118 - Math.sin(Math.PI * u) * 6 + Math.sin(u * 13) * 1.5]); }
    for (let i = 1; i < 10; i++) { const a = Math.PI / 2 + Math.PI * i / 10; pts.push([54 + Math.cos(a) * 56, 60 + Math.sin(a) * 56]); }
    return pts; })();
  const pieces = {
    body: {box: {x: -26, y: -32, w: 612, h: 184}, inner: {x0: 0, y0: 0, x1: 560, y1: 120},
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'red', 'black'], ({paper, yellow, red, black}) => {
        const body = wob(BODY, 1.6, 0.04);
        fill(paper, body, {w: 20, ang: 0, a: 1, over: 0.05, gap: 0.4});
        fill(yellow, body, {w: 18, ang: 0.01, a: 1, over: 0.08, reach: 260, bend: 0.02});
        // ginger: a red tint brushed along, heavier down the back and under the belly
        fill(red, body, {w: 16, ang: -0.01, a: 0.42, over: 0, reach: 220});
        stroke(red, [[60, 14], [300, 4], [500, 14]], {w: 22, a: 0.35, press: 'flat'});
        // tabby stripes: loaded strokes pulled down from the spine, running out
        const LEN = [0.62, 0.48, 0.78, 0.55, 0.82, 0.5, 0.74, 0.6, 0.68, 0.54, 0.78];
        red.save(); P.pathOf(red, body); red.clip();
        LEN.forEach((f, i) => { const xx = 74 + i * 40 + P.rnd(-4, 4), y1 = 120 * f; stroke(red, [[xx + 10, -4], [xx + 3, y1 * 0.45], [xx - 9, y1]], {w: i % 3 === 1 ? 15 : 20, press: 'flick', load: 1.3}); });
        red.restore();
        // a pale belly: the ink lifted off with a brush
        [yellow, red].forEach(x => knock(x, () => { stroke(x, [[300, 112], [420, 102], [520, 86]], {w: 22, press: 'swell'}); stroke(x, [[340, 118], [500, 104]], {w: 14, press: 'flick'}); }));
        // a few fur flicks along the shadowed side
        for (let i = 0; i < 26; i++) { const xx = 50 + (i * 97) % 450, yy = 76 + (i * 31) % 32; flick(black, xx, yy, xx + 7, yy + 8, 2.4, 0.9); }
        // the outline: a few strokes, heavier underneath
        contour(black, body, {w: 4.4, pieces: 6});
        stroke(black, body.slice(27, 42), {w: 6.5, press: 'swell'});
      }, 3); }},
    leg: {box: {x: -10, y: -6, w: 56, h: 316}, inner: {x0: 0, y0: 0, x1: 36, y1: 300}, draw: legDraw(0)},
    legHind: {box: {x: -10, y: -6, w: 56, h: 316}, inner: {x0: 0, y0: 0, x1: 36, y1: 300}, draw: legDraw(0.18)},
    paw: {box: {x: -36, y: -26, w: 72, h: 50}, draw: pawDraw(false)},
    pawExtra: {box: {x: -36, y: -42, w: 72, h: 66}, draw: pawDraw(true)},
    tailUp: {box: {x: -160, y: -224, w: 200, h: 260},
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'red', 'black'], L => tailDraw(L, [[0, 0], [-62, -8], [-100, -48], [-98, -104], [-66, -128]]), 5); }},
    tailDown: {box: {x: -8, y: -6, w: 44, h: 316}, inner: {x0: 0, y0: 0, x1: 28, y1: 300},
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'red', 'black'], ({paper, yellow, red, black}) => {
        const q = [[0, -4], [28, -4], [28, 304], [0, 304]];
        fill(paper, q, {w: 12, ang: Math.PI / 2, a: 1, over: 0.02}); fill(yellow, q, {w: 12, ang: Math.PI / 2, a: 1, over: 0.04}); fill(red, q, {w: 10, ang: Math.PI / 2, a: 0.48, over: 0});
        for (let y = 26; y < 300; y += 34) flick(red, -2, y, 30, y + 5, 11, 1, 3);
        stroke(black, [[0, -4], [-0.5, 150], [0, 304]], {w: 3.4, press: 'flat'}); stroke(black, [[28, -4], [28.5, 150], [28, 304]], {w: 5, press: 'flat'});
      }, 6); }},
    tailTip: {box: {x: -22, y: -22, w: 44, h: 44},
      draw(c, PP, box){ piece(c, PP, box, ['red', 'black'], ({paper, red, black}) => { const e = circle(0, 0, 14, 12, 20, 0.8); fill(paper, e, {w: 8, a: 1}); fill(red, e, {w: 8, ang: 0.4, a: 1}); contour(black, e, {w: 3.4, pieces: 3}); }, 7); }},
    head: {box: {x: -160, y: -175, w: 320, h: 260},
      eyes: [[-27, -16, 15], [27, -16, 15]],
      draw(c, PP, box){ piece(c, PP, box, ['yellow', 'pink', 'red', 'black'], ({paper, yellow, pink, red, black}) => {
        const head = wob(P.curve([[-70, 4], [-63, -40], [-32, -62], [28, -63], [62, -40], [71, 6], [52, 46], [2, 61], [-52, 45]], true, 8), 1.4);
        const earL = wob([[-60, -32], [-56, -76], [-50, -112], [-30, -84], [-10, -60]], 1.5), earR = wob([[10, -60], [30, -86], [53, -114], [58, -74], [62, -32]], 1.5);
        // ears: ginger, pink inside
        [earL, earR].forEach(e => { fill(paper, e, {w: 10, ang: 1.2, a: 1, over: 0.05}); fill(yellow, e, {w: 10, ang: 1.2, a: 1, over: 0.05}); fill(red, e, {w: 9, ang: 1.0, a: 0.5}); });
        stroke(pink, [[-44, -50], [-45, -74], [-42, -94]], {w: 12, press: 'flick'}); stroke(pink, [[44, -50], [46, -74], [44, -94]], {w: 12, press: 'flick'});
        [earL, earR].forEach(e => contour(black, e, {w: 3.6, pieces: 2}));
        // the head, worked round
        fill(paper, head, {w: 14, ang: 0.2, a: 1, over: 0.04});
        fill(yellow, head, {w: 13, ang: 0.25, a: 1, over: 0.06});
        fill(red, head, {w: 12, ang: -0.3, a: 0.45, over: 0});
        red.save(); P.pathOf(red, head); red.clip();
        [-20, 0, 20].forEach(dx => stroke(red, [[dx, -68], [dx * 1.1, -50], [dx * 0.85, -32]], {w: 11, press: 'flick'}));
        [-1, 1].forEach(s => { flick(red, s * 76, -4, s * 46, 2, 10, 1, 2); flick(red, s * 76, 14, s * 50, 20, 8, 1, 2); });
        red.restore();
        // a bare muzzle: lifted with the brush
        [yellow, red].forEach(x => knock(x, () => { fill(x, circle(0, 30, 34, 22, 24, 1.5), {w: 10, ang: 0.1, a: 1, over: 0.05}); }));
        // owl eyes: yellow worked round, then a heavy ring
        cat.eyes.forEach(([x, y, r]) => {
          knock(red, () => { P.pathOf(red, circle(x, y, r + 7, r + 7, 24)); red.fill(); });
          fill(yellow, circle(x, y, r + 5, r + 5, 24, 0.6), {w: 8, ang: 0.8, a: 1, over: 0.05});
          dab(pink, x - 2, y + 4, r, 0.28);
          contour(black, circle(x, y, r + 6, r + 6, 30, 0.8), {w: 5, pieces: 3});
        });
        flick(black, -44, -50, -18, -44, 3.4, 1, -2); flick(black, 44, -50, 18, -44, 3.4, 1, -2);    // curious brows
        // nose, mouth, whiskers
        dab(pink, 0, 22, 9, 1, 0); contour(black, [[-9, 18], [9, 18], [0, 28]], {w: 2.2, pieces: 1});
        stroke(black, [[0, 28], [0, 35], [-9, 41], [-17, 37]], {w: 3.2, press: 'swell'}); stroke(black, [[0, 35], [9, 41], [17, 37]], {w: 3.2, press: 'swell'});
        contour(black, head, {w: 4.6, pieces: 5});
        // Magenta's collar: a band of magenta pink, and a little yellow name tag
        stroke(paper, [[-44, 52], [0, 62], [44, 52]], {w: 13, press: 'flat', load: 2}); stroke(pink, [[-46, 51], [0, 61], [46, 51]], {w: 12, press: 'flat', load: 2});
        dab(paper, 6, 72, 9); dab(yellow, 6, 72, 9, 1); contour(black, circle(6, 72, 8, 8, 16, 0.4), {w: 2, pieces: 2});
        [[-1, 26, -0.12], [-1, 33, 0.03], [-1, 40, 0.16], [1, 26, -0.12], [1, 33, 0.03], [1, 40, 0.16]].forEach(([s, dy, a]) => stroke(black, [[s * 34, dy], [s * 80, dy + a * 50 - 4], [s * 128, dy + a * 104 - 8]], {w: 2.2, press: 'flick', hairs: 5}));
      }, 8); }},
  };
  function legDraw(dark){
    return (c, PP, box) => piece(c, PP, box, ['yellow', 'red', 'black'], ({paper, yellow, red, black}) => {
      const q = [[0, -4], [36, -4], [36, 304], [0, 304]];
      fill(paper, q, {w: 14, ang: Math.PI / 2, a: 1, over: 0.02});
      fill(yellow, q, {w: 14, ang: Math.PI / 2, a: 1, over: 0.04});
      fill(red, q, {w: 12, ang: Math.PI / 2, a: 0.4 + dark, over: 0});
      stroke(red, [[30, -4], [30, 304]], {w: 10, a: 0.45, press: 'flat'});
      [70, 132].forEach((y, i) => flick(red, 40, y - 6, 2, y + 4, i ? 9 : 12, 1, 3));
      // white socks: the ink lifted off the bottom of the leg
      [yellow, red].forEach(x => knock(x, () => fill(x, [[-4, 240], [40, 236], [40, 310], [-4, 310]], {w: 14, ang: 0.05, a: 1, over: 0.3})));
      flick(black, 26, 34, 20, 48, 2.4); flick(black, 22, 190, 16, 204, 2.2);
      if (dark) fill(red, [[0, -4], [36, -4], [36, 236], [0, 236]], {w: 12, ang: Math.PI / 2, a: dark * 2, over: 0});
      stroke(black, [[0, -4], [-0.6, 150], [0, 304]], {w: 3.4, press: 'flat'}); stroke(black, [[36, -4], [36.6, 150], [36, 304]], {w: 5.4, press: 'flat'});
    }, dark ? 10 : 9);
  }
  function pawDraw(extra){
    return (c, PP, box) => piece(c, PP, box, ['yellow', 'pink', 'black'], ({paper, yellow, pink, black}) => {
      const p = circle(0, 0, 24, 15, 24, 0.8);
      if (extra) {   // the extra leg wears a fluorescent payal with little yellow bells
        stroke(paper, [[-20, -26], [20, -26]], {w: 13, press: 'flat'}); stroke(pink, [[-20, -26], [20, -26]], {w: 12, press: 'flat'});
        [-12, -4, 4, 12].forEach(x => { dab(paper, x, -17, 4); dab(yellow, x, -17, 4); });
      }
      fill(paper, p, {w: 9, ang: 0.1, a: 1, over: 0.02}); stroke(black, [[-20, 8], [0, 13], [20, 8]], {w: 7, a: 0.18, press: 'swell'});
      contour(black, p, {w: 4, pieces: 3});
      [-8, 0, 8].forEach(dx => flick(black, dx, 14, dx * 1.1, 6, 2.8));
    }, extra ? 12 : 11);
  }
  // the tail is one long loaded stroke, ginger over paper, with rings flicked across
  function tailDraw({paper, yellow, red, black}, ctrl){
    const taper = t => (1 - 0.5 * t) * Math.min(1, t * 12 + 0.3);
    stroke(paper, ctrl, {w: 30, press: taper, load: 3, wobble: 0.01});
    stroke(yellow, ctrl, {w: 29, press: taper, load: 3, wobble: 0.01});
    stroke(red, ctrl, {w: 26, a: 0.45, press: taper, load: 3});
    const pts = B.path(ctrl, 4), n = pts.length;
    [0.24, 0.38, 0.52, 0.66, 0.8, 0.92].forEach(t => { const i = Math.min(n - 2, Math.round(t * (n - 1))), [x, y] = pts[i], [nx, ny] = pts[i + 1], dx = nx - x, dy = ny - y, l = Math.hypot(dx, dy) || 1, w = 15 * taper(t) + 2;
      flick(red, x - dy / l * w, y + dx / l * w, x + dy / l * w, y - dx / l * w, 10, 1, 2); });
    // its edges: two strokes, not one closed line
    const side = s => pts.map(([x, y], i) => { const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(n - 1, i + 1)], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, w = 15 * taper(i / (n - 1)); return [x - dy / l * w * s, y + dx / l * w * s]; });
    stroke(black, side(1).filter((_, i) => i % 3 === 0), {w: 4.2, press: 'swell'}); stroke(black, side(-1).filter((_, i) => i % 3 === 0), {w: 3.4, press: 'swell'});
    dab(black, ...pts[n - 1], 9, 1, 1);
  }

  const cat = {floor: 336, thick: 104, restLen: 300, pad: 46, minLen: 250, headIn: 30, headDrop: 30, headScale: 0.84, legW: 36, tailW: 28,
    eyes: pieces.head.eyes, pupil: '#1e1b1d', pieces};

  Duo.register({id: 'riso', name: 'Riso print', seed: 21, KB, paint, markKeys, border, display: DISPLAY, needsFonts: false, label, cat, painterly: false,
    alt: 'A brush-painted risograph print in red, yellow, blue, black and fluorescent pink: a red Casio keyboard under a hanging 8-bit display, and Magenta, a long ginger cat with owl eyes and a magenta collar, standing on it and playing its notes'});
})();
