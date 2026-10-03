// A bristle brush, for drawing forms out of strokes rather than filling perfect shapes.
// A stroke is a loaded brush dragged along a wobbling path: a solid core where the brush is full, a dozen bristles
// that streak, wander and run dry toward the end, pressure that swells and lifts. Regions are built by laying many
// such strokes side by side along a direction, starting and stopping a little short of or past the edge, so the
// edges come out ragged and alive. Everything is drawn in one colour with alpha = how much ink, which suits the
// riso layers (and works on any canvas).
window.Bristle = (function () {
  let seed = 1;
  const rand = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rnd = (a, b) => a + rand() * (b - a);
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const PRESS = {
    swell: t => sstep(0, 0.1, t) * (1 - 0.75 * sstep(0.62, 1, t)) * (0.92 + 0.08 * Math.sin(t * 9)),
    flat: t => sstep(0, 0.04, t) * (1 - 0.35 * sstep(0.85, 1, t)),
    flick: t => sstep(0, 0.05, t) * Math.pow(1 - t, 0.9),
    dab: t => Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.6,
  };
  // smooth a few control points into a dense path (Catmull-Rom), then resample evenly
  function path(ctrl, step = 2.5){
    if (ctrl.length < 2) return ctrl.slice();
    const dense = [], n = ctrl.length, Pt = i => ctrl[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < 10; j++) {
      const t = j / 10, p0 = Pt(i - 1), p1 = Pt(i), p2 = Pt(i + 1), p3 = Pt(i + 2), t2 = t * t, t3 = t2 * t;
      dense.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
    dense.push(ctrl[n - 1]);
    const out = [dense[0]]; let acc = 0;
    for (let i = 1; i < dense.length; i++) {
      const [ax, ay] = dense[i - 1], [bx, by] = dense[i], d = Math.hypot(bx - ax, by - ay); acc += d;
      if (acc >= step) { out.push([bx, by]); acc = 0; }
    }
    if (out.length < 2) out.push(dense[dense.length - 1]);
    return out;
  }
  // one brush stroke along control points: a "hairy brush". Dozens of hairs, evenly spread across the brush,
  // each laying its own thin line. Edge hairs touch down later and lift sooner, every hair carries its own ink
  // and runs dry at its own point, so a stroke is solid where it was loaded and streaky where it ran out.
  function stroke(c, ctrl, o = {}){
    const w = o.w ?? 10, a = o.a ?? 1, press = typeof o.press === 'function' ? o.press : PRESS[o.press || 'swell'];
    let approx = 0; for (let i = 1; i < ctrl.length; i++) approx += Math.hypot(ctrl[i][0] - ctrl[i - 1][0], ctrl[i][1] - ctrl[i - 1][1]);
    const pts = path(ctrl, Math.max(0.3, Math.min(4, w * 0.15, approx / 14))), m = pts.length; if (m < 2) return;
    const nrm = [], cum = [0];
    for (let i = 0; i < m; i++) { const [px, py] = pts[Math.max(0, i - 1)], [nx, ny] = pts[Math.min(m - 1, i + 1)], dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1; nrm.push([-dy / l, dx / l]); if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    const L = cum[m - 1] || 1, load = o.load ?? 1.1, wob = o.wobble ?? 0.05;
    const nh = o.hairs ?? Math.round(Math.max(8, Math.min(44, w * 1.5)));
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = o.color || '#000';
    for (let h = 0; h < nh; h++) {
      const off = (h + 0.5) / nh - 0.5 + rnd(-0.4, 0.4) / nh, edge = Math.abs(off) * 2;
      const hw = Math.max(0.6, w / nh * rnd(2.6, 4.2)), ha = a * (rand() < 0.12 ? rnd(0.25, 0.5) : rnd(0.75, 1));
      const t0 = rnd(0, 0.035) + edge * edge * rnd(0, 0.1), t1 = 1 - edge * edge * edge * rnd(0, 0.2);
      const cap = L * load * rnd(0.6, 1.35) * (1 - 0.3 * edge), ph = rnd(0, 6), fq = rnd(0.02, 0.07);
      c.globalAlpha = ha; c.lineWidth = hw; c.beginPath();
      let pen = false, run = 0, inked = true;
      for (let i = 0; i < m; i++) {
        const d = cum[i], t = d / L, ww = w * press(t);
        if (run <= 0) { run = Math.min(rnd(3, 10), L * 0.2 + 0.5); inked = (d < cap || rand() < Math.exp(-(d - cap) / (L * 0.1 + 3))) && rand() > 0.01 + 0.04 * edge; }
        if (i) run -= cum[i] - cum[i - 1];
        const on = inked && t >= t0 && t <= t1 && ww > 0.4;
        const lat = off * ww + Math.sin(d * fq + ph) * wob * w;
        const px = pts[i][0] + nrm[i][0] * lat, py = pts[i][1] + nrm[i][1] * lat;
        if (on) { if (!pen) { c.moveTo(px, py); pen = true; } else c.lineTo(px, py); } else pen = false;
      }
      c.stroke();
    }
    c.restore();
  }
  // point-in-polygon and edge crossings along a line, for region fills
  function crossings(poly, ox, oy, dx, dy){
    const hits = [];
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length], ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((ax - ox) * ey - (ay - oy) * ex) / den, u = ((ax - ox) * dy - (ay - oy) * dx) / den;
      if (u >= 0 && u < 1) hits.push(t);
    }
    return hits.sort((p, q) => p - q);
  }
  // fill a region with strokes laid side by side along angle ang (radians); bend curves them a little
  function fill(c, poly, o = {}){
    const w = o.w ?? 14, ang = o.ang ?? 0, gap = o.gap ?? 0.48, bend = o.bend ?? 0.06, over = o.over ?? 0.25;
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    let lo = Infinity, hi = -Infinity; poly.forEach(([x, y]) => { const s = (x - cx) * nx + (y - cy) * ny; lo = Math.min(lo, s); hi = Math.max(hi, s); });
    const rows = [];
    for (let s = lo + w * 0.3; s <= hi - w * 0.2 + 0.01; s += w * gap) rows.push(s + rnd(-0.12, 0.12) * w);
    if (o.shuffle !== false) rows.sort(() => rand() - 0.5);
    rows.forEach(s => {
      const ox = cx + nx * s, oy = cy + ny * s, h = crossings(poly, ox, oy, dx, dy);
      for (let i = 0; i + 1 < h.length; i += 2) {
        let t0 = h[i], t1 = h[i + 1]; if (t1 - t0 < w * 0.3) continue;
        // start and stop a little short of, or past, the edge: ragged on purpose
        t0 += rnd(-over, over * 1.2) * w; t1 += rnd(-over * 1.2, over) * w;
        // long runs are painted as a few overlapping strokes
        const len = t1 - t0, segs = Math.max(1, Math.round(len / (o.reach ?? 220)));
        for (let k = 0; k < segs; k++) {
          const a0 = t0 + len * k / segs - (k ? rnd(4, 14) : 0), a1 = t0 + len * (k + 1) / segs + (k < segs - 1 ? rnd(4, 14) : 0), mid = (a0 + a1) / 2, b = rnd(-bend, bend) * (a1 - a0);
          const dir = rand() < (o.flip ?? 0.5) ? 1 : -1;
          const p = [[ox + dx * a0, oy + dy * a0], [ox + dx * mid + nx * b, oy + dy * mid + ny * b], [ox + dx * a1, oy + dy * a1]];
          stroke(c, dir > 0 ? p : p.reverse(), Object.assign({}, o, {w: w * rnd(0.85, 1.15), press: o.press || 'flat'}));
        }
      }
    });
  }
  // an outline drawn as a few overlapping strokes with lifts, never one perfect closed line
  function contour(c, poly, o = {}){
    const n = poly.length, pieces = o.pieces ?? Math.max(3, Math.round(n / 14));
    for (let k = 0; k < pieces; k++) {
      const s = Math.floor(k * n / pieces), e = Math.floor((k + 1) * n / pieces) + Math.round(rnd(1, 3));
      const seg = []; for (let i = s - Math.round(rnd(0, 2)); i <= e; i++) seg.push(poly[((i % n) + n) % n]);
      stroke(c, seg, Object.assign({press: 'swell', load: 1.4, wobble: 0.08}, o, {w: (o.w ?? 5) * rnd(0.8, 1.2)}));
    }
  }
  // make a shape imperfect: low-frequency wobble on its points
  function wobble(pts, amp, f = 0.05){
    const p1 = rnd(0, 6), p2 = rnd(0, 6);
    return pts.map(([x, y], i) => [x + amp * Math.sin(i * f * 6.28 + p1) + rnd(-amp, amp) * 0.25, y + amp * Math.cos(i * f * 5.1 + p2) + rnd(-amp, amp) * 0.25]);
  }
  return {stroke, fill, contour, wobble, path, PRESS, seed: s => { seed = s; }, rnd: (a, b) => rnd(a, b)};
})();
