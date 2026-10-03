// A risograph press in code. You draw each ink on its own layer, in plain black, where opacity means how much ink
// (1 = solid, 0.3 = a 30% tint). Printing turns tints into halftone dots (each ink screened at its own angle),
// gives solids a slightly uneven, grainy lay-down, nudges each drum a little out of register, and overprints the
// inks multiplicatively, so yellow over red makes orange, blue over yellow makes green, as on a real riso.
window.Riso = (function () {
  const INKS = {black: '#1e1b1d', red: '#e3342a', yellow: '#ffcd2e', blue: '#0f6fbf', pink: '#ff4fa8', teal: '#00838a', green: '#00a466'};
  const ANG = {black: 45, red: 15, yellow: 0, blue: 75, pink: 30, teal: 60, green: 52};
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  // cheap trig for the dot screen
  const COS = new Float32Array(4096); for (let i = 0; i < 4096; i++) COS[i] = Math.cos(i / 4096 * Math.PI * 2);
  const cos2pi = x => COS[((x - Math.floor(x)) * 4096) | 0];
  // a tiled noise texture: fine grain plus soft blotches, for uneven ink
  const N = 256, NOISE = new Float32Array(N * N);
  (function () {
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const g = 16, grid = Array.from({length: (N / g + 1) ** 2}, r), gw = N / g + 1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gx = x / g, gy = y / g, x0 = gx | 0, y0 = gy | 0, tx = gx - x0, ty = gy - y0, at = (i, j) => grid[((j % (gw - 1)) * gw + (i % (gw - 1)))];
      const v = (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
      NOISE[y * N + x] = 0.6 * v + 0.4 * r();
    }
  })();

  // a set of ink layers covering a logical box, at scale S
  function sheet(box, S, inks){
    const w = Math.ceil(box.w * S), h = Math.ceil(box.h * S), layers = {};
    (inks || Object.keys(INKS)).forEach(name => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', {willReadFrequently: true});
      x.setTransform(S, 0, 0, S, -box.x * S, -box.y * S); x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineCap = 'round'; x.lineJoin = 'round';
      layers[name] = {c, x};
    });
    return {w, h, S, box, ink: name => layers[name].x, layers,
      // lay the inks down; paper (a colour) fills where the 'paper' layer is drawn; otherwise the print is transparent
      print(o = {}){
        const out = document.createElement('canvas'); out.width = w; out.height = h; const ox = out.getContext('2d');
        const img = ox.createImageData(w, h), d = img.data, n = w * h;
        const R = new Float32Array(n).fill(1), G = new Float32Array(n).fill(1), B = new Float32Array(n).fill(1), A = new Float32Array(n);
        const cell = (o.cell ?? 5.2) * S / 2, mis = o.misreg || {}, seedOff = (o.seed || 0) * 37;
        for (const [name, L] of Object.entries(layers)) {
          if (name === 'paper') continue;
          const src = L.x.getImageData(0, 0, w, h).data, [cr, cg, cb] = rgb(INKS[name]);
          const a = (ANG[name] || 0) * Math.PI / 180, ca = Math.cos(a) / cell, sa = Math.sin(a) / cell;
          const [mx, my] = (mis[name] || [0, 0]).map(v => Math.round(v * S / 2));
          const solidAt = o.solid ?? 0.9;
          for (let y = 0; y < h; y++) {
            const sy = y - my; if (sy < 0 || sy >= h) continue;
            for (let x = 0; x < w; x++) {
              const sx = x - mx; if (sx < 0 || sx >= w) continue;
              const dens = src[(sy * w + sx) * 4 + 3] / 255; if (dens < 0.02) continue;
              const nz = NOISE[((y + seedOff) & 255) * N + ((x + seedOff * 3) & 255)];
              let cov;
              if (dens >= solidAt) cov = 0.8 + 0.2 * Math.min(1, nz * 1.6);          // solid ink, laid unevenly
              else {
                const u = x * ca + y * sa, v = -x * sa + y * ca;
                const t = 0.5 - (cos2pi(u) + cos2pi(v)) / 4;                          // dot screen threshold
                cov = Math.max(0, Math.min(1, (dens * 1.04 - t) / 0.09 + 0.5)) * (0.86 + 0.14 * nz);
              }
              if (nz > 0.93 && dens < 1.01) cov *= 0.3;                                // specks where the ink didn't take
              const i = y * w + x;
              R[i] *= 1 - cov * (1 - cr); G[i] *= 1 - cov * (1 - cg); B[i] *= 1 - cov * (1 - cb);
              A[i] = 1 - (1 - A[i]) * (1 - cov);
            }
          }
        }
        const pl = layers.paper ? layers.paper.x.getImageData(0, 0, w, h).data : null, pc = rgb(o.paper || '#f3ead7');
        for (let i = 0; i < n; i++) {
          const p = pl ? pl[i * 4 + 3] / 255 : 0, j = i * 4;
          if (p > 0) {   // printed on paper: multiply the inks into the paper colour, with a little paper tooth
            const tooth = 0.965 + 0.035 * NOISE[((i / w | 0) & 255) * N + ((i % w) & 255)];
            d[j] = pc[0] * R[i] * tooth * 255; d[j + 1] = pc[1] * G[i] * tooth * 255; d[j + 2] = pc[2] * B[i] * tooth * 255; d[j + 3] = Math.max(p, A[i]) * 255;
          } else if (A[i] > 0) {   // on its own (a cut-out piece): colour as if over white, un-premultiplied
            const Ai = A[i]; d[j] = Math.max(0, (R[i] - (1 - Ai)) / Ai) * 255; d[j + 1] = Math.max(0, (G[i] - (1 - Ai)) / Ai) * 255; d[j + 2] = Math.max(0, (B[i] - (1 - Ai)) / Ai) * 255; d[j + 3] = Ai * 255;
          }
        }
        ox.putImageData(img, 0, 0);
        return out;
      }};
  }
  return {INKS, sheet};
})();
