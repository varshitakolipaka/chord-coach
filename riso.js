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

  // ---- the press on the GPU: the same rules as the JS press below, as one fragment shader (fast) ----
  let gl = null, glCv = null, prog = null, glFailed = false;
  const FS = `#version 300 es
  precision highp float;
  uniform sampler2D ink[5]; uniform sampler2D paperTex;
  uniform vec3 col[5]; uniform float ang[5]; uniform vec2 mis[5]; uniform int nInk; uniform int hasPaper;
  uniform vec2 size; uniform float cell; uniform float solid; uniform vec3 paperCol; uniform float seed;
  out vec4 outC;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21) + seed); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float dens(int i, vec2 uv){ if (i == 0) return texture(ink[0], uv).a; if (i == 1) return texture(ink[1], uv).a; if (i == 2) return texture(ink[2], uv).a; if (i == 3) return texture(ink[3], uv).a; return texture(ink[4], uv).a; }
  void main(){
    vec2 px = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
    vec3 c = vec3(1.0); float A = 0.0;
    for (int i = 0; i < 5; i++) {
      if (i >= nInk) break;
      vec2 q = px - mis[i];
      if (q.x < 0.0 || q.y < 0.0 || q.x >= size.x || q.y >= size.y) continue;
      float d = dens(i, q / size); if (d < 0.02) continue;
      float nz = 0.6 * vnoise(px / 16.0 + float(i) * 7.3) + 0.4 * hash(px + float(i) * 3.1);
      float cov;
      if (d >= solid) cov = 0.8 + 0.2 * min(1.0, nz * 1.6);
      else { float a = ang[i]; vec2 r = vec2(px.x * cos(a) + px.y * sin(a), -px.x * sin(a) + px.y * cos(a)) / cell;
        float t = 0.5 - (cos(6.2831853 * r.x) + cos(6.2831853 * r.y)) * 0.25;
        cov = clamp((d * 1.04 - t) / 0.09 + 0.5, 0.0, 1.0) * (0.86 + 0.14 * nz); }
      if (nz > 0.93) cov *= 0.3;
      c *= 1.0 - cov * (1.0 - col[i]); A = 1.0 - (1.0 - A) * (1.0 - cov);
    }
    float p = hasPaper == 1 ? texture(paperTex, px / size).a : 0.0;
    if (p > 0.0) { float tooth = 0.965 + 0.035 * vnoise(px / 3.0); vec3 o = paperCol * c * tooth; float a = max(p, A); outC = vec4(o * a, a); }
    else if (A > 0.0) { vec3 o = max(vec3(0.0), (c - (1.0 - A)) / A); outC = vec4(o * A, A); }
    else outC = vec4(0.0);
  }`;
  const VS = `#version 300 es
  in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  function glInit(){
    if (gl || glFailed) return !!gl;
    try {
      glCv = document.createElement('canvas'); gl = glCv.getContext('webgl2', {premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false});
      if (!gl) throw new Error('no webgl2');
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      return true;
    } catch (e) { console.warn('riso press falls back to JS:', e.message); gl = null; glFailed = true; return false; }
  }
  function glPrint(layers, w, h, S, o){
    if (!glInit()) return null;
    glCv.width = w; glCv.height = h; gl.viewport(0, 0, w, h);
    const names = Object.keys(layers).filter(n => n !== 'paper').slice(0, 5), U = n => gl.getUniformLocation(prog, n);
    const tex = (unit, canvas) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    const made = [];
    names.forEach((n, i) => { made.push(tex(i, layers[n].c)); gl.uniform1i(U(`ink[${i}]`), i); gl.uniform3fv(U(`col[${i}]`), rgb(INKS[n])); gl.uniform1f(U(`ang[${i}]`), (ANG[n] || 0) * Math.PI / 180);
      const m = (o.misreg || {})[n] || [0, 0]; gl.uniform2f(U(`mis[${i}]`), Math.round(m[0] * S / 2), Math.round(m[1] * S / 2)); });
    for (let i = names.length; i < 5; i++) gl.uniform1i(U(`ink[${i}]`), 0);
    if (layers.paper) { made.push(tex(5, layers.paper.c)); gl.uniform1i(U('paperTex'), 5); gl.uniform1i(U('hasPaper'), 1); } else { gl.uniform1i(U('paperTex'), 0); gl.uniform1i(U('hasPaper'), 0); }
    gl.uniform1i(U('nInk'), names.length); gl.uniform2f(U('size'), w, h); gl.uniform1f(U('cell'), (o.cell ?? 5.2) * S / 2); gl.uniform1f(U('solid'), o.solid ?? 0.9);
    gl.uniform3fv(U('paperCol'), rgb(o.paper || '#f3ead7')); gl.uniform1f(U('seed'), ((o.seed || 0) * 0.137) % 1);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const out = document.createElement('canvas'); out.width = w; out.height = h; out.getContext('2d').drawImage(glCv, 0, 0);
    made.forEach(t => gl.deleteTexture(t));
    return out;
  }

  // a set of ink layers covering a logical box, at scale S
  function sheet(box, S, inks){
    const w = Math.ceil(box.w * S), h = Math.ceil(box.h * S), layers = {};
    (inks || Object.keys(INKS)).forEach(name => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      x.setTransform(S, 0, 0, S, -box.x * S, -box.y * S); x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineCap = 'round'; x.lineJoin = 'round';
      layers[name] = {c, x};
    });
    return {w, h, S, box, ink: name => layers[name].x, layers,
      // lay the inks down; paper (a colour) fills where the 'paper' layer is drawn; otherwise the print is transparent
      print(o = {}){
        if (!o.cpu) { const g = glPrint(layers, w, h, S, o); if (g) return g; }
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
