// A stroke painter. Give it a picture (any canvas) and it repaints it with brushstrokes, broad ones first and
// then finer ones only where detail is still missing, after Aaron Hertzmann's "Painterly Rendering with Curved
// Brush Strokes of Multiple Sizes" (SIGGRAPH 1998). Each stroke starts where the painting is most wrong, follows
// the form (along edges, across gradients), takes the colour under it with a little warm/cool drift, and drags a
// few bristle streaks. Flat areas get strokes laid along a gentle flow so the ground is never dead.
window.Painter = (function () {
  // deterministic randomness so a picture always paints the same way
  let seed = 1;
  const rand = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // a blurred copy of the source at a coarser grid, sampled bilinearly
  function reference(src, f){
    const rw = Math.max(2, Math.ceil(src.width / f)), rh = Math.max(2, Math.ceil(src.height / f));
    const c = document.createElement('canvas'); c.width = rw; c.height = rh; const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, rw, rh);
    const d = x.getImageData(0, 0, rw, rh).data;
    const at = (px, py, out) => {
      const gx = Math.max(0, Math.min(rw - 1.001, px / f - 0.5)), gy = Math.max(0, Math.min(rh - 1.001, py / f - 0.5));
      const x0 = gx | 0, y0 = gy | 0, tx = gx - x0, ty = gy - y0, i00 = (y0 * rw + x0) * 4, i10 = i00 + 4, i01 = i00 + rw * 4, i11 = i01 + 4;
      for (let k = 0; k < 4; k++) out[k] = (d[i00 + k] * (1 - tx) + d[i10 + k] * tx) * (1 - ty) + (d[i01 + k] * (1 - tx) + d[i11 + k] * tx) * ty;
      return out;
    };
    const lum = (px, py) => { const i = ((Math.max(0, Math.min(rh - 1, py / f | 0))) * rw + Math.max(0, Math.min(rw - 1, px / f | 0))) * 4; return (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * d[i + 3] / 255 + (255 - d[i + 3]) * 0.6; };
    return {at, lum};
  }
  const diff = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3 * Math.min(a[3], b[3]) / 255 + Math.abs(a[3] - b[3]) * 0.7;

  function* painting(src, o = {}, out){
    seed = o.seed || 1;
    const w = src.width, h = src.height, k = o.scale || 1;
    const radii = (o.radii || [14, 7, 3.5, 1.8]).map(r => Math.max(o.minR ?? 3, r * k)).filter((r, i, a) => i === 0 || r < a[i - 1] - 0.01);
    const T = o.threshold ?? 18, maxLen = o.maxLen ?? 14, minLen = o.minLen ?? 3, fc = o.curve ?? 0.55;
    const jit = o.jitter ?? 7, warm = o.warm ?? 6, bristles = o.bristles ?? 3, alpha = o.alpha ?? 0.94;
    const flow = o.flow || ((x, y) => 0.5 * Math.sin(x * 0.0035 / k + y * 0.002 / k) + 0.35 * Math.cos(y * 0.006 / k) - 0.25);
    const srcData = src.getContext('2d').getImageData(0, 0, w, h).data;
    const c = out.getContext('2d');
    c.lineCap = 'round'; c.lineJoin = 'round';
    const minR = o.minR ?? 3;
    const A = [0, 0, 0, 0], B = [0, 0, 0, 0], Cc = [0, 0, 0, 0];
    let count = 0;
    for (let li = 0; li < radii.length; li++) {
      const R = radii[li];
      yield 0;
      const ref = reference(src, Math.max(1, R * 0.7));
      const cur = c.getImageData(0, 0, w, h).data;
      const curAt = (x, y, o4) => { const i = ((Math.min(h - 1, Math.max(0, y | 0))) * w + Math.min(w - 1, Math.max(0, x | 0))) * 4; o4[0] = cur[i]; o4[1] = cur[i + 1]; o4[2] = cur[i + 2]; o4[3] = cur[i + 3]; return o4; };
      const strokes = [], step = Math.max(1, R * 0.9);
      for (let gy = 0; gy < h; gy += step) for (let gx = 0; gx < w; gx += step) {
        // where in this cell is the painting most wrong?
        let best = -1, bx = 0, by = 0, sum = 0;
        for (let s = 0; s < 4; s++) {
          const x = gx + rand() * step, y = gy + rand() * step;
          ref.at(x, y, A); curAt(x, y, B);
          if (A[3] < 10 && B[3] < 10) continue;
          const e = diff(A, B); sum += e; if (e > best) { best = e; bx = x; by = y; }
        }
        if (best < 0) continue;
        if (li > 0 && sum / 4 < T) continue;
        ref.at(bx, by, A); if (A[3] < 24) continue;
        const col = A.slice();
        // grow the stroke along the form
        const pts = [[bx, by]]; let x = bx, y = by, dx = 0, dy = 0;
        for (let i = 1; i < maxLen; i++) {
          const g = 1.5 * Math.max(1, R * 0.5);
          const gxv = ref.lum(x + g, y) - ref.lum(x - g, y), gyv = ref.lum(x, y + g) - ref.lum(x, y - g), m = Math.hypot(gxv, gyv);
          let nx, ny;
          if (m < 3) { if (i > minLen && li > 1) break; const a = flow(x, y) + (rand() - 0.5) * 0.3; nx = Math.cos(a); ny = Math.sin(a); }
          else { nx = -gyv / m; ny = gxv / m; }
          if (i > 1 && nx * dx + ny * dy < 0) { nx = -nx; ny = -ny; }
          if (i > 1) { nx = fc * nx + (1 - fc) * dx; ny = fc * ny + (1 - fc) * dy; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; }
          x += nx * R; y += ny * R; dx = nx; dy = ny;
          if (x < 0 || y < 0 || x >= w || y >= h) break;
          ref.at(x, y, Cc);
          if (i >= minLen && diff(Cc, col) > diff(curAt(x, y, B), col)) break;
          if (Cc[3] < 20 && i >= 1) break;
          pts.push([x, y]);
        }
        strokes.push({pts, col, R});
      }
      // lay them down in shuffled order so no direction of the grid shows
      for (let i = strokes.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [strokes[i], strokes[j]] = [strokes[j], strokes[i]]; }
      for (let i = 0; i < strokes.length; i++) { drawStroke(c, strokes[i], li); count++; if ((i & 255) === 255) yield 1; }
    }
    out.strokes = count;

    function drawStroke(c, s, li){
      const {pts, col, R} = s;
      const wv = (rand() - 0.5) * 2 * warm, j = () => (rand() - 0.5) * 2 * jit;
      const r = col[0] + wv + j(), g = col[1] + j() * 0.6, b = col[2] - wv + j();
      const a = Math.min(1, col[3] / 255) * alpha * (li === 0 ? 0.9 : 1);
      const path = () => {
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        if (pts.length === 1) c.lineTo(pts[0][0] + 0.1, pts[0][1] + 0.1);
        for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
        if (pts.length > 1) c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      };
      c.globalAlpha = a; c.strokeStyle = `rgb(${r | 0},${g | 0},${b | 0})`; c.lineWidth = R * (0.95 + rand() * 0.3);
      path(); c.stroke();
      // bristle streaks dragged through the stroke
      if (bristles && R > 2.5 * k) {
        const ex = pts[pts.length - 1][0] - pts[0][0], ey = pts[pts.length - 1][1] - pts[0][1], el = Math.hypot(ex, ey) || 1, nx = -ey / el, ny = ex / el;
        for (let q = 0; q < bristles; q++) {
          const off = (rand() - 0.5) * R * 0.8, shade = (rand() < 0.5 ? -1 : 1) * (14 + rand() * 16);
          c.save(); c.translate(nx * off, ny * off);
          c.globalAlpha = a * (0.18 + rand() * 0.2); c.lineWidth = Math.max(0.6, R * (0.08 + rand() * 0.12));
          c.strokeStyle = `rgb(${(r + shade) | 0},${(g + shade) | 0},${(b + shade) | 0})`;
          path(); c.stroke(); c.restore();
        }
      }
      c.globalAlpha = 1;
    }
  }
  const blank = src => { const out = document.createElement('canvas'); out.width = src.width; out.height = src.height; return out; };
  // all at once
  function paint(src, o = {}){ const out = blank(src); const g = painting(src, o, out); while (!g.next().done); return out; }
  // a little at a time, so the page (and the music) never stalls; onBatch lets the caller show the painting as it grows
  function paintAsync(src, o = {}, onBatch, isCancelled){
    const out = blank(src), g = painting(src, o, out), budget = o.budget ?? 9;
    return new Promise(resolve => {
      const tick = () => {
        if (isCancelled && isCancelled()) return resolve(null);
        const t0 = performance.now(); let r;
        do { r = g.next(); } while (!r.done && performance.now() - t0 < budget);
        if (onBatch) onBatch(out);
        if (r.done) resolve(out); else setTimeout(tick, 0);
      };
      setTimeout(tick, 0);
    });
  }
  return {paint, paintAsync};
})();
