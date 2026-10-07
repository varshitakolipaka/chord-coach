// Score: one line of real notation (VexFlow, in Steinberg's hand-drawn Petaluma font) for the sheet-music game.
// It draws the bars around the note you're on, colours each note by how it went, puts sargam under the notes
// if you want it, and shows a ghost of a wrong note where it actually sits on the staff.
const Score = (() => {
  const LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'], NATURAL = [0, 2, 4, 5, 7, 9, 11], MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const FLATS = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
  const INK = '#1e1b1d', COL = {ok: '#178a4a', slip: '#c98a00', miss: '#d8412f', you: '#0f6fbf', mag: '#e2338f'};
  let fontReady = null;
  const ready = () => fontReady || (fontReady = (document.fonts ? document.fonts.load('40px Petaluma') : Promise.resolve()).then(() => {
    VexFlow.setFonts('Petaluma'); return true; }).catch(() => true));

  // spell a pitch: in a key, by its scale letter; otherwise with flats (this app's keys are all flat keys)
  function spell(midi, key){
    const pc = ((midi % 12) + 12) % 12;
    if (key) {
      const deg = key.pcs.indexOf(pc);
      if (deg >= 0) { const L = key.letters[deg], acc = ((pc - NATURAL[L] + 18) % 12) - 6; return mk(midi, L, acc); }
    }
    const nm = FLATS[pc]; return mk(midi, LETTERS.indexOf(nm[0]), nm.length > 1 ? -1 : 0);
  }
  function mk(midi, L, acc){
    const oct = Math.floor((midi - acc) / 12) - 1;
    return {midi, pc: ((midi % 12) + 12) % 12, key: LETTERS[L] + (acc < 0 ? 'b'.repeat(-acc) : '#'.repeat(acc)) + '/' + oct,
            acc: acc < 0 ? 'b'.repeat(-acc) : acc > 0 ? '#'.repeat(acc) : '', step: oct * 7 + L};
  }
  function makeKey(tonicName){        // 'Bb' -> its major scale, spelled
    const L = LETTERS.indexOf(tonicName[0].toLowerCase()), acc = tonicName.length > 1 ? (tonicName[1] === 'b' ? -1 : 1) : 0;
    const tonic = (NATURAL[L] + acc + 12) % 12;
    return {name: tonicName, tonic, pcs: MAJOR.map(i => (tonic + i) % 12), letters: MAJOR.map((_, d) => (L + d) % 7)};
  }

  // "the perfect jazz exercise": the scale in stacked 4ths, a triplet per step
  function fourths(tonicName, which){
    const key = makeKey(tonicName);
    const groups = which === 'video' ? [3, 4, 5, 6].map(d => [d, d + 3, d + 6])
      : [...[0, 1, 2, 3, 4, 5, 6, 7].map(d => [d, d + 3, d + 6]), ...[7, 6, 5, 4, 3, 2, 1, 0].map(d => [d + 6, d + 3, d])];
    const at = (s, O) => 12 * (O + 1) + key.tonic + 12 * Math.floor(s / 7) + MAJOR[s % 7];
    const mean = O => groups.flat().reduce((a, s) => a + at(s, O), 0) / (groups.length * 3);
    const O = Math.abs(mean(3) - 71) <= Math.abs(mean(4) - 71) ? 3 : 4;      // sit the line on the staff
    const notes = groups.flat().map((s, i) => ({...spell(at(s, O), key), beat: i / 3, dur: 1 / 3, group: Math.floor(i / 3)}));
    return {key, notes, beats: notes.length / 3, perBar: 12, title: which === 'video' ? '4ths in ' + tonicName : '4ths up & down · ' + tonicName};
  }

  const bottomOf = svg => { try { const b = svg.getBBox(); return b.y + b.height; } catch (e) { return 0; } };
  // draw the line holding note `view.cur`
  function render(el, piece, view){
    const VF = VexFlow, W = el.clientWidth || 600;
    const s = W >= 700 ? 1.45 : W >= 480 ? 1.25 : 1.05;             // staff size
    const perLine = view.perLine || piece.perBar;
    const line = Math.floor(Math.max(0, Math.min(piece.notes.length - 1, view.cur)) / perLine);
    const from = line * perLine, to = Math.min(piece.notes.length, from + perLine), bars = Math.ceil((to - from) / piece.perBar);
    const w = W / s, top = 30, H = 132;
    el.innerHTML = '';
    const r = new VF.Renderer(el, VF.Renderer.Backends.SVG); r.resize(W, H * s);
    const ctx = r.getContext(); ctx.scale(s, s);
    const svg = el.querySelector('svg');
    const xs = [], staves = [];
    let x = 6;
    for (let b = 0; b < bars; b++) {
      const first = b === 0, bw = (w - 12) / bars;
      const st = new VF.Stave(x, top, bw); if (first) st.addClef('treble');
      st.setStyle({strokeStyle: INK, fillStyle: INK}); st.setContext(ctx).draw(); staves.push(st); x += bw;
      const lo = from + b * piece.perBar, hi = Math.min(to, lo + piece.perBar);
      const notes = piece.notes.slice(lo, hi).map((n, k) => {
        const i = lo + k, sn = new VF.StaveNote({keys: [n.key], duration: '8', autoStem: true});
        if (n.acc) sn.addModifier(new VF.Accidental(n.acc), 0);
        const st8 = view.status[i], col = i === view.cur && view.who ? COL[view.who] : st8 ? COL[st8] : INK;
        sn.setStyle({fillStyle: col, strokeStyle: col}); return sn;
      });
      const tuplets = [], beams = [];
      for (let g = 0; g < notes.length; g += 3) {
        const grp = notes.slice(g, g + 3);
        if (grp.length === 3) tuplets.push(new VF.Tuplet(grp, {numNotes: 3, notesOccupied: 2, bracketed: false, ratioed: false}));
        const bm = new VF.Beam(grp, true); beams.push(bm);
        const cols = grp.map(n => n.getStyle && n.getStyle() && n.getStyle().fillStyle), same = cols.every(c => c === cols[0]);
        bm.setStyle({fillStyle: same ? cols[0] : INK, strokeStyle: same ? cols[0] : INK});
      }
      const voice = new VF.Voice({numBeats: 4, beatValue: 4}).setMode(VF.Voice.Mode.SOFT).addTickables(notes);
      new VF.Formatter().joinVoices([voice]).format([voice], st.getNoteEndX() - st.getNoteStartX() - 14);
      voice.draw(ctx, st); beams.forEach(bm => bm.setContext(ctx).draw()); tuplets.forEach(t => t.setContext(ctx).draw());
      notes.forEach((sn, k) => xs[lo + k - from] = {x: sn.getAbsoluteX(), w: sn.getGlyphWidth ? sn.getGlyphWidth() : 10, st});
    }
    const NS = 'http://www.w3.org/2000/svg';
    const add = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; svg.appendChild(e); return e; };
    // sargam under every note: komal underlined, tivra with a tick, the Bhatkhande way
    if (view.sargam) {
      const y = Math.max(staves[0].getYForLine(4) + 50, bottomOf(svg) + 14);
      piece.notes.slice(from, to).forEach((n, k) => {
        const nm = view.sargam(n.pc), komal = nm.startsWith('komal '), tivra = nm.startsWith('tivra '), t = nm.replace(/^(komal|tivra) /, '');
        const i = from + k, st8 = view.status[i], col = i === view.cur && view.who ? COL[view.who] : st8 ? COL[st8] : '#6d6456';
        const cx = xs[k].x + xs[k].w / 2;
        const tx = add('text', {x: cx, y, stroke: 'none', 'text-anchor': 'middle', 'font-family': 'Figtree, system-ui, sans-serif', 'font-weight': 800, 'font-size': 10.5, fill: col}, t);
        if (komal) add('line', {x1: cx - 7, x2: cx + 7, y1: y + 3, y2: y + 3, stroke: col, 'stroke-width': 1.4});
        if (tivra) add('line', {x1: cx, x2: cx, y1: y - 13, y2: y - 9, stroke: col, 'stroke-width': 1.4});
        void tx;
      });
    }
    // the note you actually played, where it sits on the staff
    if (view.ghost && view.ghost.i >= from && view.ghost.i < to) {
      const g = spell(view.ghost.midi, piece.key), k = view.ghost.i - from, st = xs[k].st;
      const kd = piece.key.letters.indexOf(LETTERS.indexOf(g.key[0])), keyAcc = kd >= 0 && piece.key.pcs[kd] !== NATURAL[piece.key.letters[kd]];
      const sign = g.acc === 'b' ? '♭' : g.acc === '#' ? '♯' : keyAcc ? '♮' : '';   // a natural where the key would flatten it
      const line = (g.step - 30) / 2 + 1, y = st.getYForNote(line), cx = xs[k].x + xs[k].w / 2 + 14;
      const ledger = l => add('line', {x1: cx - 9, x2: cx + 9, y1: st.getYForNote(l), y2: st.getYForNote(l), stroke: COL.miss, 'stroke-width': 1.3, opacity: 0.8});
      for (let l = 0; l >= line; l--) ledger(l);
      for (let l = 6; l <= line; l++) ledger(l);
      add('ellipse', {cx, cy: y, rx: 6.2, ry: 4.4, transform: `rotate(-22 ${cx} ${y})`, fill: COL.miss, opacity: 0.75});
      if (sign) add('text', {x: cx - 15, y: y + 4, stroke: 'none', 'font-family': 'Figtree, system-ui, sans-serif', 'font-size': 12, 'font-weight': 800, fill: COL.miss, 'text-anchor': 'middle'}, sign);
    }
    // fit the picture to what was drawn (beams and ledger lines can hang well off the staff)
    const bb = svg.getBBox(), y0 = Math.min(0, bb.y - 6), y1 = Math.max(H, bb.y + bb.height + 6);
    svg.setAttribute('viewBox', `0 ${y0} ${w} ${y1 - y0}`); svg.setAttribute('height', (y1 - y0) * s); svg.style.height = (y1 - y0) * s + 'px';
    const yOff = -y0 * s;
    return {xs: xs.map(o => ({x: (o.x + o.w / 2) * s, w: o.w * s})), from, to, line, lines: Math.ceil(piece.notes.length / perLine),
            top: yOff + staves[0].getYForLine(0) * s - 16 * s, bottom: yOff + staves[0].getYForLine(4) * s + 16 * s, scale: s};
  }
  return {ready, fourths, render, spell, makeKey};
})();
