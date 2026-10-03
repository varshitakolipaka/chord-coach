// Kalighat cat, in oils.
// A practice desk seen from above, as the keyboard is: warm honey planks under a lamp, a cup of chai, a pencil,
// the lead sheet, a few marigold petals, and the red Casio. On it, a long squishy tabby after the Calcutta bazaar
// paintings (big turmeric eyes, sweeping stripes, long whiskers). Everything is drawn plainly first and then
// repainted stroke by stroke (painter.js); only the whiskers and the type stay crisp.
(function () {
  const INK = '#1d140e', CREAM = '#f3e9d4', VERM = '#cf3a22', VERM_DK = '#7c1b0d', TURMERIC = '#e8ad2e', PINK = '#e3907a',
        ULTRA = '#2d3f8f', ULTRA_LT = '#9fb0d6', WOOD = '#a77749';
  const KB = {x0: 112, x1: 888, top: 432, bottom: 668, blackBottom: 574, restY: 408, gap: 3};
  const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const rad = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };

  function paint(c, P, K){
    const {rnd, pick, curve, ell, fill, shade, inkline, calli, streaks, clipTo, pathOf} = P;
    // --- the desk: honey planks under a lamp, darker toward the corners; a ragged painted edge ---
    const edge = [], E = 16, J = () => rnd(-7, 7);
    for (let x = E; x <= 1000 - E; x += 18) edge.push([x, E + J()]);
    for (let y = E; y <= 700 - E; y += 18) edge.push([1000 - E + J(), y]);
    for (let x = 1000 - E; x >= E; x -= 18) edge.push([x, 700 - E + J()]);
    for (let y = 700 - E; y >= E; y -= 18) edge.push([E + J(), y]);
    fill(c, edge, WOOD);
    clipTo(c, edge, false, () => {
      for (let i = 0; i < 170; i++) {           // grain
        const y0 = rnd(-10, 710), amp = rnd(1, 4), f = rnd(0.004, 0.012), ph = rnd(0, 6);
        c.strokeStyle = pick(['#8a5d34', '#c1915c', '#6f4a29', '#d3a56d', '#9b6a3d']); c.globalAlpha = rnd(0.12, 0.32); c.lineWidth = rnd(1.5, 6);
        c.beginPath(); for (let x = -10; x <= 1010; x += 20) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1) * amp * 0.3; x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
      }
      c.globalAlpha = 1;
      [150, 312, 474, 636].forEach(y => { c.fillStyle = 'rgba(52,30,14,0.55)'; c.fillRect(0, y, 1000, 3); c.fillStyle = 'rgba(230,190,140,0.35)'; c.fillRect(0, y + 3, 1000, 2); });
      [[300, 90, 26, 9], [700, 520, 20, 7], [130, 400, 16, 6]].forEach(([x, y, rx, ry]) => { for (let r = 0; r < 4; r++) { c.strokeStyle = 'rgba(80,46,20,0.35)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, rx + r * 9, ry + r * 4, 0, 0, 7); c.stroke(); } });
      c.fillStyle = rad(c, 360, 220, 0, 680, [[0, 'rgba(255,228,172,0.42)'], [0.55, 'rgba(255,228,172,0.08)'], [1, 'rgba(255,228,172,0)']]); c.fillRect(0, 0, 1000, 700);
      c.fillStyle = rad(c, 470, 330, 280, 780, [[0, 'rgba(38,20,8,0)'], [1, 'rgba(38,20,8,0.62)']]); c.fillRect(0, 0, 1000, 700);
    });

    // --- props: light from the top left, shadows fall down and right ---
    const drop = (pts, dx, dy, a, smooth) => { fill(c, pts.map(([x, y]) => [x + dx, y + dy]), '#2a1608', smooth, a); fill(c, pts.map(([x, y]) => [x + dx * 1.7, y + dy * 1.7]), '#2a1608', smooth, a * 0.4); };
    // a cup of chai on a blue-rimmed saucer
    const sau = ell(102, 112, 74, 74, 48); drop(sau, 12, 14, 0.32);
    fill(c, sau, '#efe6d6'); c.fillStyle = rad(c, 80, 90, 10, 80, [[0, 'rgba(255,255,255,0.5)'], [1, 'rgba(160,140,120,0.35)']]); pathOf(c, sau); c.fill();
    c.strokeStyle = '#2f5f9e'; c.lineWidth = 4; c.beginPath(); c.arc(102, 112, 66, 0, 7); c.stroke();
    fill(c, [[146, 100], [184, 96], [190, 112], [184, 128], [146, 124]], '#f7f1e6', true); inkline(c, [[146, 100], [184, 96], [190, 112], [184, 128], [146, 124]], 1.2, 3, '#6b5a48');
    const cup = ell(102, 112, 50, 50, 44); drop(cup, 6, 8, 0.25);
    fill(c, cup, '#f7f1e6'); inkline(c, cup, 1.2, 3.5, '#6b5a48');
    const tea = ell(102, 112, 40, 40, 40); fill(c, tea, '#9a5a2a'); c.fillStyle = rad(c, 96, 104, 2, 40, [[0, '#d8a26a'], [0.6, '#b0703a'], [1, '#7a4219']]); pathOf(c, tea); c.fill();
    c.strokeStyle = 'rgba(255,245,225,0.75)'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(102, 112, 30, 3.6, 4.6); c.stroke();
    // a yellow pencil
    const pen = [[232, 50], [404, 26], [407, 42], [235, 66]]; drop(pen, 8, 10, 0.3);
    fill(c, pen, '#e9b52c'); fill(c, [[233, 58], [405, 34], [406, 40], [234, 64]], '#c48d17', false, 0.8);
    fill(c, [[404, 26], [436, 30], [407, 42]], '#e2c08d'); fill(c, [[426, 29], [436, 30], [428, 35]], '#3a332c');
    fill(c, [[214, 52], [232, 50], [235, 66], [217, 68]], '#b9b4a8'); fill(c, [[198, 54], [214, 52], [217, 68], [201, 70]], '#e88d8d');
    inkline(c, [[198, 54], [404, 26], [436, 30], [407, 42], [201, 70]], 1, 2.6, '#5a4630');
    // the lead sheet, tucked under the Casio's corner
    const sheet = [[-150, -112], [150, -112], [150, 112], [-150, 112]].map(([x, y]) => { const a = 0.11; return [840 + x * Math.cos(a) - y * Math.sin(a), 150 + x * Math.sin(a) + y * Math.cos(a)]; });
    drop(sheet, 10, 12, 0.3); fill(c, sheet, '#f3ebd8'); c.fillStyle = rad(c, 760, 80, 10, 300, [[0, 'rgba(255,255,255,0.45)'], [1, 'rgba(150,120,80,0.25)']]); pathOf(c, sheet); c.fill();
    c.save(); c.translate(840, 150); c.rotate(0.11);
    c.strokeStyle = 'rgba(60,50,40,0.6)'; c.lineWidth = 1.1;
    [-38, 18, 74].forEach(y0 => { for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(-132, y0 + l * 7); c.lineTo(132, y0 + l * 7); c.stroke(); }
      for (let n = 0; n < 9; n++) { c.fillStyle = '#2c241c'; c.beginPath(); c.ellipse(-110 + n * 27, y0 + ((n * 5) % 8) * 3.5, 4.2, 3, -0.4, 0, 7); c.fill(); c.fillRect(-106 + n * 27, y0 - 18 + ((n * 5) % 8) * 3.5, 1.4, 18); } });
    c.restore();
    // marigold petals
    [[42, 646, 1], [78, 610, 0.8], [962, 636, 1], [930, 676, 0.7], [986, 560, 0.8], [180, 30, 0.7]].forEach(([x, y, s]) => {
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + rnd(-0.3, 0.3), r = rnd(5, 11) * s;
        fill(c, ell(x + Math.cos(a) * r, y + Math.sin(a) * r, 7 * s, 4 * s, 12, a), pick(['#f08a1c', '#f7b733', '#e5761a']), false, 0.95); }
      fill(c, ell(x, y, 4 * s, 4 * s, 10), '#9a4a0e'); });

    // --- the Casio and its shadow on the desk ---
    const cas = curve([[84, 340], [300, 337], [500, 336], [700, 337], [916, 340], [934, 356], [938, 520], [934, 676], [916, 690], [700, 692], [500, 693], [300, 692], [84, 690], [66, 676], [62, 520], [66, 356]], true, 8);
    drop(cas, 14, 16, 0.42, false);
    fill(c, cas, VERM);
    streaks(c, cas, false, ['#e4553a', '#b52c17', '#d84a2c'], 220, [40, 160], [6, 18], 0.02, [0.06, 0.2]);
    clipTo(c, cas, false, () => {
      c.fillStyle = lin(c, 0, 336, 0, 700, [[0, 'rgba(255,190,150,0.45)'], [0.12, 'rgba(255,170,130,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(60,8,2,0.35)']]); c.fillRect(0, 300, 1000, 420);
      c.fillStyle = rad(c, 280, 360, 10, 520, [[0, 'rgba(255,215,170,0.28)'], [1, 'rgba(255,215,170,0)']]); c.fillRect(0, 300, 1000, 420);
    });
    fill(c, [[86, 418], [914, 418], [914, 430], [86, 430]], VERM_DK, false, 0.4);
    shade(c, cas, VERM_DK, 28, 0.75);
    // speaker grilles: rows of dots, the way pat painters dot a sari border
    const dots = (x0, x1) => { for (let r = 0; r < 4; r++) for (let x = x0 + (r % 2) * 7; x < x1; x += 14) { const y = 356 + r * 13;
      c.fillStyle = VERM_DK; c.beginPath(); c.arc(x + rnd(-0.6, 0.6), y + rnd(-0.5, 0.5), 3.4, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,190,160,0.5)'; c.beginPath(); c.arc(x + 1.2, y + 1.6, 1.4, 0, 7); c.fill(); } };
    dots(110, 330); dots(670, 890);
    // knob and tone buttons, each with a glint
    const knob = ell(392, 382, 19, 19, 30); fill(c, ell(396, 386, 19, 19, 30), VERM_DK, false, 0.6); fill(c, knob, INK);
    c.fillStyle = rad(c, 386, 375, 1, 18, [[0, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]); pathOf(c, knob); c.fill(); calli(c, [[392, 367], [392, 377]], 4, TURMERIC);
    [450, 486, 522, 558, 594].forEach((x, i) => { const b = ell(x, 384, 11, 8, 22); fill(c, ell(x + 2, 387, 11, 8, 22), VERM_DK, false, 0.5); fill(c, b, i === 2 ? CREAM : INK); inkline(c, b, 1.4, 3, INK);
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(x - 4, 381, 3.5, 2, -0.3, 0, 7); c.fill(); });
    // --- the key bed and the keys: ivory, lit from the left, black keys casting short shadows ---
    fill(c, [[KB.x0 - 8, KB.top - 8], [KB.x1 + 8, KB.top - 8], [KB.x1 + 8, KB.bottom + 9], [KB.x0 - 8, KB.bottom + 9]], INK);
    K.whites.forEach(k => {
      const q = k.poly; fill(c, q, '#efe5cd');
      clipTo(c, q, false, () => {
        c.fillStyle = lin(c, k.x0, 0, k.x1, 0, [[0, 'rgba(255,252,240,0.6)'], [0.5, 'rgba(255,252,240,0)'], [1, 'rgba(120,100,70,0.25)']]); c.fillRect(k.x0, k.y0, k.x1 - k.x0, k.y1 - k.y0);
        c.fillStyle = lin(c, 0, k.y0, 0, k.y0 + 30, [[0, 'rgba(50,30,15,0.45)'], [1, 'rgba(50,30,15,0)']]); c.fillRect(k.x0, k.y0, k.x1 - k.x0, 30);
        K.blacks.forEach(b => { if (b.x1 < k.x0 - 10 || b.x0 > k.x1 + 10) return;
          c.fillStyle = 'rgba(40,24,12,0.32)'; c.fillRect(b.x1, b.y0, 9, b.y1 - b.y0 + 9); c.fillRect(b.x0 + 6, b.y1, b.x1 - b.x0 + 3, 10); });
      });
      streaks(c, q, false, ['#fffaee', '#d8cbb0'], 12, [30, 100], [3, 8], Math.PI / 2, [0.08, 0.22]);
    });
    K.blacks.forEach(k => {
      const q = [[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]]; fill(c, q, '#1c1512');
      calli(c, [[k.x0 + 9, k.y0 + 14], [k.x0 + 9, k.y1 - 18]], 6, '#6a6470', 0.55);
      fill(c, [[k.x0 + 3, k.y1 - 12], [k.x1 - 3, k.y1 - 12], [k.x1 - 3, k.y1 - 3], [k.x0 + 3, k.y1 - 3]], '#4a4148', false, 0.7);
    });
    K.whites.forEach(k => calli(c, [[k.x1 + 3, KB.top], [k.x1 + 3, KB.bottom]], 3.2, INK, 0.9, 0.2));
    inkline(c, cas, 4, 10, INK);
  }

  // marks laid on the keys while notes sound
  function markKeys(c, kind, keys, P){
    const {fill, shade, calli, streaks, clipTo} = P;
    const col = {you: [ULTRA, '#141d4a', '#5368b8'], got: ['#3f8f4e', '#1d4a26', '#6cbf7a'], target: [TURMERIC, '#a8730f', '#f6cd6a'], mel: ['#d6336c', '#7a1236', '#ef6c98'], mc: ['#e9a3bf', '#b05c7e', '#f6c9da']}[kind];
    keys.forEach(k => {
      const q = k.black ? [[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]] : k.poly;
      if (col) {
        fill(c, q, k.black && kind === 'mel' ? '#4a5fb0' : col[0], false, 0.97);
        clipTo(c, q, false, () => { c.fillStyle = lin(c, k.x0, 0, k.x1, 0, [[0, 'rgba(255,240,220,0.35)'], [0.5, 'rgba(255,240,220,0)'], [1, 'rgba(0,0,0,0.2)']]); c.fillRect(k.x0, k.y0 - 4, k.x1 - k.x0, k.y1 - k.y0 + 4); });
        streaks(c, q, false, [col[2]], 10, [30, 90], [4, 9], Math.PI / 2, [0.12, 0.32]);
        shade(c, q, col[1], k.black ? 8 : 14, 0.7);
        if (!k.black) calli(c, [[k.x1 + 3, k.y0], [k.x1 + 3, k.y1]], 3.2, INK, 0.9, 0.2);
      } else {
        // the chord's notes: three turmeric dots, a pat painter's textile pattern
        const [x, y] = k.black ? [k.cx, k.y0 + 30] : [k.cx, KB.blackBottom - 40];
        [[0, -9], [-9, 7], [9, 7]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx, y + dy, k.black ? 5.5 : 7, 0, 7); c.fillStyle = TURMERIC; c.fill(); c.strokeStyle = k.black ? '#f4cf72' : '#6b4a12'; c.lineWidth = 1.8; c.stroke(); });
      }
    });
  }

  function label(k, kind){
    const lit = kind === 'you' || kind === 'mel' || kind === 'got';
    return k.black
      ? {font: `700 17px Fraunces, Georgia, serif`, size: 17, y: k.y1 - 16, color: lit ? '#fff6e6' : '#d9ccb0', mark: 2}
      : {font: `800 23px Fraunces, Georgia, serif`, size: 23, y: k.y1 - 12, color: lit ? '#fff6e6' : INK, mark: 2.6};
  }

  // ---------- the cat, in pieces: each painted once, then stretched and moved live ----------
  const FUR_HI = '#f6ead2', FUR = '#d9c9ad', FUR_MID = '#ab9a83', FUR_LO = '#6b5d53';
  // a tabby stripe: a brush loaded at the start, running out as it sweeps on
  function stripe(c, P, pts, w){ const {pathOf, ribbon, curve} = P; const line = pts.length > 2 ? curve(pts, false, 6) : pts;
    pathOf(c, ribbon(line, t => w * Math.min(1, 0.35 + t * 5) * (1 - 0.88 * t) + 0.4)); c.fillStyle = INK; c.fill(); }
  const pieces = {
    body: {box: {x: -26, y: -32, w: 612, h: 184}, inner: {x0: 0, y0: 0, x1: 560, y1: 120},
      draw(c, P){
        const {pathOf, inkline, clipTo, ell, fill} = P, pts = [];
        for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([52 + 456 * u, 6 - Math.sin(Math.PI * u) * 9]); }
        for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 10; pts.push([506 + Math.cos(a) * 54, 60 + Math.sin(a) * 56]); }
        for (let i = 16; i >= 0; i--) { const u = i / 16; pts.push([52 + 456 * u, 118 - Math.sin(Math.PI * u) * 6]); }
        for (let i = 1; i < 10; i++) { const a = Math.PI / 2 + Math.PI * i / 10; pts.push([54 + Math.cos(a) * 56, 60 + Math.sin(a) * 56]); }
        fill(c, pts, FUR);
        clipTo(c, pts, false, () => {
          c.fillStyle = lin(c, 0, -4, 0, 122, [[0, FUR_HI], [0.35, FUR], [0.7, FUR_MID], [1, FUR_LO]]); c.fillRect(-30, -30, 620, 190);
          c.fillStyle = 'rgba(255,252,240,0.55)'; c.fillRect(60, 6, 420, 12);
          const LEN = [0.7, 0.55, 0.82, 0.62, 0.88, 0.56, 0.8, 0.66, 0.74, 0.6, 0.84], LEAN = [-4, 3, -6, 2, -3, 5, -5, 1, -2, 4, -3];
          for (let i = 0; i < 11; i++) { const x = 70 + i * 40, y1 = 120 * LEN[i];
            stripe(c, P, [[x + 10, -12], [x + 4 + LEAN[i], y1 * 0.4], [x - 2 + LEAN[i] * 1.4, y1 * 0.75], [x - 10 + LEAN[i] * 1.8, y1]], i % 3 === 1 ? 15 : 20);
            if (i % 3 === 2) stripe(c, P, [[x + 26, -12], [x + 23, 16], [x + 18, 40]], 11); }
          fill(c, ell(478, 92, 52, 24, 30), '#f8f1e2', false, 0.75);
          c.strokeStyle = 'rgba(205,80,45,0.35)'; c.lineWidth = 14; c.beginPath(); c.moveTo(40, 124); c.lineTo(520, 124); c.stroke();   // red light bounced off the Casio
        });
        inkline(c, pts, 2.5, 9, INK);
      }},
    leg: {box: {x: -10, y: -6, w: 56, h: 316}, inner: {x0: 0, y0: 0, x1: 36, y1: 300}, draw: legDraw(0)},
    legHind: {box: {x: -10, y: -6, w: 56, h: 316}, inner: {x0: 0, y0: 0, x1: 36, y1: 300}, draw: legDraw(0.14)},
    paw: {box: {x: -36, y: -26, w: 72, h: 50}, draw: pawDraw(false)},
    pawExtra: {box: {x: -36, y: -40, w: 72, h: 64}, draw: pawDraw(true)},
    tailUp: {box: {x: -160, y: -224, w: 200, h: 260},
      draw(c, P){
        const line = P.bez([0, 0], [-74, -6], [-114, -120], [-58, -178], 26);
        tailDraw(c, P, line, t => 30 - 15 * t);
      }},
    tailDown: {box: {x: -8, y: -6, w: 44, h: 316}, inner: {x0: 0, y0: 0, x1: 28, y1: 300},
      draw(c, P){
        const {fill, clipTo, pathOf} = P, q = [[0, 0], [28, 0], [28, 300], [0, 300]];
        fill(c, q, FUR);
        clipTo(c, q, false, () => { c.fillStyle = lin(c, 0, 0, 28, 0, [[0, FUR_HI], [0.5, FUR], [1, FUR_LO]]); c.fillRect(0, 0, 28, 300);
          for (let y = 30; y < 300; y += 36) stripe(c, P, [[-4, y], [14, y + 4], [32, y]], 10); });
        c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 300); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(28, 0); c.lineTo(28, 300); c.stroke();
      }},
    tailTip: {box: {x: -22, y: -22, w: 44, h: 44},
      draw(c, P){ P.fill(c, P.ell(0, 0, 15, 13, 24), INK); c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-5, -5, 5, 3, -0.5, 0, 7); c.fill(); }},
    head: {box: {x: -160, y: -175, w: 320, h: 260},
      painter: {radii: [5, 2.5, 1.3], threshold: 12},
      draw(c, P){
        const {curve, fill, shade, inkline, calli, clipTo, ell, pathOf} = P;
        const head = curve([[-64, 2], [-58, -40], [-30, -60], [30, -60], [58, -40], [66, 4], [48, 44], [0, 58], [-48, 42]], true, 10);
        const earL = [[-56, -34], [-48, -106], [-8, -58]], earR = [[14, -60], [58, -104], [62, -26]];
        [earL, earR].forEach(e => { fill(c, e, FUR); shade(c, e, FUR_LO, 10, 0.6); inkline(c, e, 2.5, 7, INK); });
        fill(c, [[-46, -40], [-44, -86], [-18, -56]], PINK, false, 0.9); fill(c, [[22, -56], [50, -86], [52, -34]], PINK, false, 0.9);
        fill(c, head, FUR);
        clipTo(c, head, false, () => {
          c.fillStyle = rad(c, -24, -30, 6, 110, [[0, FUR_HI], [0.5, FUR], [1, FUR_LO]]); c.fillRect(-80, -80, 160, 160);
          [-18, 0, 18].forEach(dx => calli(c, [[dx, -64], [dx * 1.15, -44], [dx * 0.9, -26]], 10, INK, 0.95, 0.3));
          [[-1, -6], [-1, 12], [1, -6], [1, 12]].forEach(([s, dy]) => calli(c, [[s * 72, dy - 4], [s * 56, dy + 2], [s * 42, dy]], 8, INK, 0.92, 0.3));
          fill(c, ell(0, 30, 34, 22, 24), '#fbf4e4', false, 0.8);
        });
        inkline(c, head, 2.5, 9.5, INK);
        pieces.head.eyes.forEach(([x, y]) => { const e = curve([[x - 20, y + 3], [x - 4, y - 14], [x + 14, y - 10], [x + 20, y + 1], [x + 4, y + 13], [x - 12, y + 10]], true, 8);
          fill(c, e, TURMERIC); c.fillStyle = rad(c, x - 4, y - 4, 1, 20, [[0, '#f7d27a'], [1, '#b47b12']]); pathOf(c, e); c.fill(); inkline(c, e, 2, 4.5, INK); });
        const nose = [[-10, 14], [10, 14], [0, 26]];
        fill(c, nose, VERM); inkline(c, nose, 1.4, 3, INK);
        calli(c, [[0, 26], [0, 34], [-10, 40], [-19, 36]], 3.6, INK); calli(c, [[0, 34], [10, 40], [19, 36]], 3.6, INK);
      },
      eyes: [[-23, -18, 12], [23, -18, 12]],
      // long ink whiskers stay crisp, laid over the painted head
      after(c, P){
        const w = t => 3 * (1 - t) + 0.5;
        [[-1, 22, -0.14], [-1, 30, 0.02], [-1, 38, 0.17], [1, 22, -0.14], [1, 30, 0.02], [1, 38, 0.17]].forEach(([s, dy, a]) => {
          const x0 = s * 30; P.calli(c, [[x0, dy], [x0 + s * 56, dy + a * 46 - 5], [x0 + s * 120, dy + a * 100 - 9]], w, INK, 0.92, 0); });
      }},
  };
  function legDraw(dark){
    return (c, P) => {
      const {fill, clipTo} = P, q = [[0, 0], [36, 0], [36, 300], [0, 300]];
      fill(c, q, FUR);
      clipTo(c, q, false, () => {
        c.fillStyle = lin(c, 0, 0, 36, 0, [[0, FUR_HI], [0.4, FUR], [0.85, FUR_MID], [1, FUR_LO]]); c.fillRect(0, 0, 36, 300);
        if (dark) { c.fillStyle = `rgba(40,30,25,${dark})`; c.fillRect(0, 0, 36, 300); }
        c.globalAlpha = 0.75; [70, 128].forEach((y, i) => stripe(c, P, [[38, y - 6], [24, y + 2], [10, y + 4], [2, y + 1]], i ? 8 : 11)); c.globalAlpha = 1;
        c.strokeStyle = 'rgba(255,250,235,0.35)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { const x = 4 + i * 2.6; c.beginPath(); c.moveTo(x, 10 + i * 13); c.lineTo(x + 1, 300); c.stroke(); }
        c.fillStyle = 'rgba(205,80,45,0.2)'; c.fillRect(28, 0, 8, 300);
      });
      // edges: darker and heavier on the shadow side, slightly wavering
      c.strokeStyle = INK; c.lineCap = 'round';
      [[0, 2.6, 0.75], [36, 5, 0.9]].forEach(([x, w, a]) => { c.globalAlpha = a; c.lineWidth = w; c.beginPath(); for (let y = -4; y <= 304; y += 12) { const xx = x + Math.sin(y * 0.09 + x) * 0.9; y < 0 ? c.moveTo(xx, y) : c.lineTo(xx, y); } c.stroke(); });
      c.globalAlpha = 1;
    };
  }
  function pawDraw(extra){
    return (c, P) => {
      const {fill, ell, inkline, pathOf} = P, p = ell(0, 0, 24, 15, 30);
      if (extra) {   // the extra leg wears a vermilion anklet, a payal with little bells
        fill(c, [[-19, -30], [19, -30], [19, -18], [-19, -18]], VERM);
        [-12, -4, 4, 12].forEach(x => { fill(c, ell(x, -16, 3.4, 3.4, 10), TURMERIC); });
        inkline(c, [[-19, -30], [19, -30], [19, -18], [-19, -18]], 1.2, 2.6, INK);
      }
      fill(c, p, FUR); c.fillStyle = rad(c, -8, -6, 2, 26, [[0, FUR_HI], [1, FUR_MID]]); pathOf(c, p); c.fill();
      inkline(c, p, 2.2, 5, INK);
      c.strokeStyle = INK; c.lineWidth = 2.6; c.lineCap = 'round'; [-8, 0, 8].forEach(dx => { c.beginPath(); c.moveTo(dx, 14); c.lineTo(dx * 1.1, 6); c.stroke(); });
    };
  }
  function tailDraw(c, P, line, wFn){
    const {ribbon, pathOf, clipTo, inkline} = P, n = line.length, shape = ribbon(line, wFn);
    pathOf(c, shape); c.fillStyle = FUR; c.fill();
    clipTo(c, shape, false, () => {
      c.fillStyle = lin(c, -130, 0, 20, 0, [[0, FUR_HI], [1, FUR_MID]]); c.fillRect(-170, -230, 220, 270);
      [0.2, 0.34, 0.48, 0.62, 0.76].forEach(t => { const i = Math.round(t * (n - 1)), [x, y] = line[i], [px, py] = line[i - 1], [nx, ny] = line[i + 1];
        const dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, w = wFn(t) / 2 + 3;
        stripe(c, P, [[x - dy / l * w, y + dx / l * w], [x + dx / l * 3, y + dy / l * 3], [x + dy / l * w, y - dx / l * w]], 9); });
    });
    inkline(c, shape, 2.5, 6, INK);
    const [px, py] = line[n - 1]; P.fill(c, P.ell(px, py, 13, 11, 20), INK);
  }

  // words on the lead sheet, set after the paint so they stay legible
  function after(c){
    c.save(); c.translate(840, 150); c.rotate(0.11); c.textAlign = 'left';
    c.fillStyle = '#2c241c'; c.font = '800 18px Fraunces, Georgia, serif'; c.fillText('I Fall in Love Too Easily', -132, -76);
    c.font = '800 13px Fraunces, Georgia, serif'; c.fillStyle = '#8a2c14'; c.fillText('Fm7', -128, -50); c.fillText('B♭7', -48, -50); c.fillText('E♭maj7', 32, -50);
    c.restore();
  }
  const cat = {floor: 336, thick: 112, restLen: 300, pad: 46, minLen: 250, headIn: 34, headDrop: 26, legW: 36, tailW: 28,
    eyes: pieces.head.eyes, pupil: '#140c06', pieces};

  Duo.register({id: 'kalighat', name: 'Kalighat, in oils', seed: 11, KB, paint, after, markKeys, label, cat, display: {x: 708, y: 60, w: 256, h: 128, panel: 'engine'},
    painter: {radii: [16, 8, 4, 2.6], threshold: 18},
    alt: 'An oil painting of a practice desk seen from above: a red Casio keyboard, chai, a pencil and a lead sheet, with a long squishy tabby cat on the keyboard pressing keys with legs that drop straight down'});
})();
