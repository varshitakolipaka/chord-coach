// Kalighat: the cat who stole the Casio.
// After the 19th-century Calcutta bazaar paintings (pats) of a smug tabby with a stolen prawn: one confident
// black line, heavy on the shadow side and thin where light falls; colour graded inward from the contour so
// forms swell; tabby stripes as sweeping bands; lamp black, indigo grey, turmeric and vermilion on buff paper.
(function () {
  const INK = '#15110e', CREAM = '#f3e7cc', CREAM_DK = '#ddd0b2', SHADE = '#5d5a62', INDIGO = '#34426b', INDIGO_LT = '#8e98bb',
        VERM = '#cf3a22', VERM_DK = '#821d0f', TURMERIC = '#e8ad2e', PINK = '#e7917c';
  const KB = {x0: 112, x1: 888, top: 432, bottom: 668, blackBottom: 574, restY: 408, gap: 3};

  function paint(c, P, K){
    const {rnd, curve, ell, fill, shade, inkline, calli, texture, streaks, brushLayer} = P;
    // --- the Casio: a vermilion slab, modelled darker toward its edges ---
    const cas = curve([[84, 340], [300, 337], [500, 336], [700, 337], [916, 340], [934, 356], [938, 520], [934, 676], [916, 690], [700, 692], [500, 693], [300, 692], [84, 690], [66, 676], [62, 520], [66, 356]], true, 8);
    c.save(); c.globalAlpha = 0.15; c.fillStyle = INK; c.beginPath(); c.ellipse(500, 698, 476, 12, 0, 0, 7); c.fill(); c.restore();
    fill(c, cas, VERM);
    streaks(c, cas, false, ['#e4553a', '#b52c17'], 160, [40, 140], [6, 16], 0.02, [0.06, 0.18]);
    fill(c, [[86, 418], [914, 418], [914, 430], [86, 430]], VERM_DK, false, 0.35);
    shade(c, cas, VERM_DK, 30, 0.8);
    texture(c, cas, false, 0.2);
    // speaker grilles: rows of dots, the way pat painters dot a sari border
    const dots = (x0, x1) => { c.fillStyle = VERM_DK; for (let r = 0; r < 4; r++) for (let x = x0 + (r % 2) * 7; x < x1; x += 14) { c.beginPath(); c.arc(x + rnd(-0.6, 0.6), 356 + r * 13 + rnd(-0.5, 0.5), 3.3, 0, 7); c.fill(); } };
    dots(110, 330); dots(670, 890);
    // a volume knob and a row of tone buttons
    const knob = ell(392, 382, 19, 19, 30); fill(c, knob, INK); calli(c, [[392, 367], [392, 377]], 4, TURMERIC);
    [450, 486, 522, 558, 594].forEach((x, i) => { const b = ell(x, 384, 11, 8, 22); fill(c, b, i === 2 ? CREAM : INK); inkline(c, b, 1.6, 3, INK); });
    // --- the key bed and the keys ---
    fill(c, [[KB.x0 - 8, KB.top - 8], [KB.x1 + 8, KB.top - 8], [KB.x1 + 8, KB.bottom + 9], [KB.x0 - 8, KB.bottom + 9]], INK);
    K.whites.forEach(k => {
      const q = k.poly; fill(c, q, CREAM);
      shade(c, q, '#9c9480', 12, 0.5);
      streaks(c, q, false, ['#fffaee', CREAM_DK], 10, [30, 90], [3, 7], Math.PI / 2, [0.08, 0.2]);
      texture(c, q, false, 0.12);
    });
    K.blacks.forEach(k => {
      const q = [[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]]; fill(c, q, INK);
      calli(c, [[k.x0 + 9, k.y0 + 14], [k.x0 + 9, k.y1 - 18]], 5, INDIGO_LT, 0.6);   // an indigo highlight down one side
    });
    K.whites.forEach(k => calli(c, [[k.x1 + 3, KB.top], [k.x1 + 3, KB.bottom]], 3.2, INK, 0.9, 0.2));
    inkline(c, cas, 4.5, 11, INK);
  }

  // marks laid on the keys while notes sound
  function markKeys(c, kind, keys, P){
    const {fill, shade, texture, calli, streaks} = P;
    const col = {you: [VERM, VERM_DK, '#e4553a'], mel: [INDIGO, '#18203d', '#4c5d97'], mc: [INDIGO_LT, INDIGO, '#a9b2d0'], tone: null}[kind];
    keys.forEach(k => {
      const q = k.black ? [[k.x0, k.y0 - 4], [k.x1, k.y0 - 4], [k.x1, k.y1], [k.x0, k.y1]] : k.poly;
      if (col) {
        fill(c, q, k.black && kind === 'mel' ? '#4f62a8' : col[0], false, 0.96);
        streaks(c, q, false, [col[2]], 8, [30, 80], [4, 8], Math.PI / 2, [0.12, 0.3]);
        shade(c, q, col[1], k.black ? 8 : 16, 0.75);
        texture(c, q, false, 0.2);
        if (!k.black) calli(c, [[k.x1 + 3, k.y0], [k.x1 + 3, k.y1]], 3.2, INK, 0.9, 0.2);
      } else {
        // the chord's notes: three turmeric dots, a pat painter's textile pattern
        const [x, y] = k.black ? [k.cx, k.y0 + 30] : [k.cx, KB.blackBottom - 40];
        [[0, -9], [-9, 7], [9, 7]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx, y + dy, k.black ? 5 : 6.5, 0, 7); c.fillStyle = TURMERIC; c.fill(); c.strokeStyle = k.black ? TURMERIC : INK; c.lineWidth = 1.8; c.stroke(); });
      }
    });
  }

  function label(k, kind){
    const lit = kind === 'you' || kind === 'mel';
    return k.black
      ? {font: `700 17px Fraunces, Georgia, serif`, size: 17, y: k.y1 - 14, color: lit ? '#fff6e6' : '#d9ccb0', mark: 2}
      : {font: `800 23px Fraunces, Georgia, serif`, size: 23, y: k.y1 - 12, color: lit ? '#fff6e6' : INK, mark: 2.6};
  }

  // ---------- the cat: long and squishy; its head is painted once, the rest is drawn live as it stretches ----------
  function bodyShape(g, P){
    const {R, F, T, top, bottom, mid} = g, r = T / 2, n = 14, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, x = R + r * 0.9 + (F - R - r * 1.6) * u; pts.push([x, top - Math.sin(Math.PI * u) * T * 0.07 + Math.sin(u * 9 + g.t * 0) * 1.2]); }
    for (let i = 1; i < 8; i++) { const a = -Math.PI / 2 + Math.PI * i / 8; pts.push([F - r * 0.7 + Math.cos(a) * r * 0.85, mid + Math.sin(a) * r]); }
    for (let i = n; i >= 0; i--) { const u = i / n, x = R + r * 0.9 + (F - R - r * 1.6) * u; pts.push([x, bottom - Math.sin(Math.PI * u) * T * 0.06]); }
    for (let i = 1; i < 8; i++) { const a = Math.PI / 2 + Math.PI * i / 8; pts.push([R + r * 0.9 + Math.cos(a) * r, mid + Math.sin(a) * r]); }
    return pts;
  }
  const taperW = t => 3.4 * (1 - t) + 0.6;
  const cat = {
    floor: 336, thick: 112, restLen: 300, pad: 46, minLen: 250, headIn: 34, headDrop: 26,
    eyes: [[-23, -18, 12], [23, -18, 12]], pupil: INK,
    paintHead(c, P){
      const {curve, fill, shade, inkline, calli, texture, clipTo, ell, brushLayer} = P;
      const head = curve([[-64, 2], [-58, -40], [-30, -60], [30, -60], [58, -40], [66, 4], [48, 44], [0, 58], [-48, 42]], true, 10);
      const earL = [[-56, -34], [-48, -106], [-8, -58]], earR = [[14, -60], [58, -104], [62, -26]];
      [earL, earR].forEach(e => { fill(c, e, CREAM); shade(c, e, SHADE, 10, 0.6); inkline(c, e, 2.5, 7, INK); });
      fill(c, [[-46, -40], [-44, -86], [-18, -56]], PINK, false, 0.9); fill(c, [[22, -56], [50, -86], [52, -34]], PINK, false, 0.9);
      fill(c, head, CREAM);
      clipTo(c, head, false, () => {
        [-18, 0, 18].forEach(dx => calli(c, [[dx, -64], [dx * 1.15, -44], [dx * 0.9, -26]], 10, INK, 0.95, 0.3));
        [[-1, -6], [-1, 12], [1, -6], [1, 12]].forEach(([s, dy]) => calli(c, [[s * 72, dy - 4], [s * 56, dy + 2], [s * 42, dy]], 8, INK, 0.92, 0.3));
      });
      fill(c, ell(0, 30, 34, 22, 24), '#fdf6e6', false, 0.75);
      shade(c, head, SHADE, 20, 0.75);
      texture(c, head, false, 0.14);
      inkline(c, head, 2.5, 9.5, INK);
      cat.eyes.forEach(([x, y]) => { const e = curve([[x - 20, y + 3], [x - 4, y - 14], [x + 14, y - 10], [x + 20, y + 1], [x + 4, y + 13], [x - 12, y + 10]], true, 8);
        fill(c, e, TURMERIC); shade(c, e, '#a8730f', 5, 0.7); inkline(c, e, 2, 4.5, INK); });
      const nose = [[-10, 14], [10, 14], [0, 26]];
      fill(c, nose, VERM); inkline(c, nose, 1.4, 3, INK);
      calli(c, [[0, 26], [0, 34], [-10, 40], [-19, 36]], 3.6, INK); calli(c, [[0, 34], [10, 40], [19, 36]], 3.6, INK);
      // long ink whiskers sweeping past the face, like the pat painters' cats
      [[-1, 22, -0.14], [-1, 30, 0.02], [-1, 38, 0.17], [1, 22, -0.14], [1, 30, 0.02], [1, 38, 0.17]].forEach(([s, dy, a]) => {
        const x0 = s * 30; calli(c, [[x0, dy], [x0 + s * 56, dy + a * 46 - 5], [x0 + s * 120, dy + a * 100 - 9]], taperW, INK, 0.95, 0); });
    },
    body(c, g, P){
      const {pathOf, inkline, ribbon, taper} = P;
      const pts = bodyShape(g, P);
      c.save(); pathOf(c, pts); c.fillStyle = CREAM; c.fill(); c.clip();
      // tabby bands: a fixed number, so they spread apart as it stretches
      const nB = 9, span = g.F - g.R - g.T * 0.9, wB = Math.max(7, Math.min(18, span / nB * 0.42));
      const LEN = [0.78, 0.6, 0.86, 0.66, 0.9, 0.58, 0.82, 0.7, 0.64], LEAN = [-4, 3, -6, 2, -3, 5, -5, 1, -2];
      for (let i = 0; i < nB; i++) {
        const x = g.R + g.T * 0.55 + span * (i + 0.5) / nB, y0 = g.top - 12, y1 = g.top + g.T * LEN[i];
        pathOf(c, ribbon([[x + 8, y0], [x + 2 + LEAN[i], y0 + (y1 - y0) * 0.45], [x - 6 + LEAN[i] * 1.6, y1]], taper(wB * (i % 3 === 1 ? 0.8 : 1.08), 0.4, 0.5))); c.fillStyle = INK; c.fill();
        if (i % 3 === 2) { pathOf(c, ribbon([[x + 8 + wB * 0.9, y0], [x + 6 + wB * 0.9, y0 + g.T * 0.22], [x + 2 + wB * 0.8, y0 + g.T * 0.36]], taper(wB * 0.55, 0.3, 0.5))); c.fill(); }
      }
      // the grey graded up from the belly and in from the rump
      c.strokeStyle = SHADE; c.lineJoin = 'round';
      for (let i = 0; i < 10; i++) { c.globalAlpha = 0.085; c.lineWidth = (g.T * 0.42) * (1 - i / 10) * 2 + 2; pathOf(c, pts); c.stroke(); }
      c.globalAlpha = 0.6; c.fillStyle = '#fdf6e6'; c.beginPath(); c.ellipse(g.F - g.T * 0.55, g.mid + g.T * 0.12, g.T * 0.32, g.T * 0.24, 0, 0, 7); c.fill();
      c.restore();
      inkline(c, pts, 2.5, 10, INK);
    },
    leg(c, o, P){
      const {pathOf} = P, w = 34, x = o.x, top = o.top, y = o.y;
      const sh = [[x - w / 2, top], [x + w / 2, top], [x + w / 2 - 1, y - 6], [x - w / 2 + 1, y - 6]];
      c.save(); pathOf(c, sh); c.fillStyle = o.hind ? CREAM_DK : CREAM; c.fill(); c.clip();
      c.fillStyle = SHADE; c.globalAlpha = 0.3; c.fillRect(x + w / 2 - 11, top, 11, y - top); c.globalAlpha = 0.18; c.fillRect(x + w / 2 - 18, top, 7, y - top);
      c.globalAlpha = 1; c.fillStyle = INK;
      [0.45, 0.68].forEach(t => { const yy = top + (y - top) * t; c.beginPath(); c.moveTo(x + w / 2 + 2, yy - 5); c.quadraticCurveTo(x, yy + 1, x - w / 2 + 6, yy + 5); c.quadraticCurveTo(x, yy - 3, x + w / 2 + 2, yy + 4); c.fill(); });
      c.restore();
      c.lineWidth = 4.2; c.strokeStyle = INK; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - w / 2, top); c.lineTo(x - w / 2 + 1, y - 6); c.moveTo(x + w / 2, top); c.lineTo(x + w / 2 - 1, y - 6); c.stroke();
      // the paw squashes when it lands
      const rx = 23 + 6 * o.squash, ry = 15 - 4 * o.squash;
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fillStyle = o.hind ? CREAM_DK : CREAM; c.fill(); c.lineWidth = 4; c.stroke();
      c.lineWidth = 3; [-8, 0, 8].forEach(dx => { c.beginPath(); c.moveTo(x + dx, y + ry - 1); c.lineTo(x + dx * 1.1, y + ry - 8); c.stroke(); });
      if (o.extra) { c.fillStyle = VERM; c.beginPath(); c.arc(x, y - 3, 4.5, 0, 7); c.fill(); }
    },
    tail(c, line, o, P){
      const {ribbon, pathOf} = P, n = line.length, wFn = t => 30 - 16 * t, shape = ribbon(line, wFn);
      c.save(); pathOf(c, shape); c.fillStyle = CREAM; c.fill(); c.clip(); c.fillStyle = INK;
      [0.24, 0.38, 0.52, 0.66, 0.8].forEach(t => { const i = Math.round(t * (n - 1)), [x, y] = line[i], [px, py] = line[i - 1], [nx, ny] = line[i + 1];
        const dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, w = wFn(t) / 2 + 3;
        pathOf(c, ribbon([[x - dy / l * w, y + dx / l * w], [x + dx / l * 3, y + dy / l * 3], [x + dy / l * w, y - dx / l * w]], P.taper(8, 1, 0.7))); c.fill(); });
      c.restore();
      pathOf(c, shape); c.strokeStyle = INK; c.lineWidth = 4.2; c.lineJoin = 'round'; c.stroke();
      const [px, py] = line[n - 1]; c.fillStyle = INK; c.beginPath(); c.ellipse(px, py, 12 + 4 * o.squash, 10 - 2 * o.squash, 0, 0, 7); c.fill();
    },
  };

  Duo.register({id: 'kalighat', name: 'Kalighat', seed: 11, KB, paint, markKeys, label, cat,
    alt: 'A Kalighat-style tabby cat with long whiskers walking over a red Casio keyboard, pressing keys with its paws and tail'});
})();
