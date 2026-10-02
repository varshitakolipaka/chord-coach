// Sequence builder shared by the chord coach and the improviser.
// Pick "Whole tune" or build "My sequence" from chord chips, in any order.
(function () {
  const css = `.seq-sub{font-size:13px;color:var(--char,#4a4741);margin:14px 0 7px}
  .seq-mode{margin-bottom:4px} .seq-item{display:flex;align-items:center;gap:6px}
  .seq-n{font-size:11px;color:var(--dim);font-weight:400} .seq-empty{color:var(--dim);font-size:14px}
  .seq-tools{margin:8px 0 0} .seq-tools button{padding:6px 10px;font-size:14px}
  .seq-list .chip.on{outline:2px solid var(--you,#d8417f);outline-offset:1px}`;
  const tag = document.createElement('style'); tag.textContent = css; document.head.appendChild(tag);
  const PRESETS = [
    ['ii–V–I in E♭ (bars 1–2)', ['Fm7', 'B♭7', 'E♭maj7']],
    ['Bars 1–2', ['Fm7', 'B♭7', 'E♭maj7', 'A♭maj7']],
    ['ii–V–i in C minor', ['Dø', 'G7', 'Cm7']],
    ['ii–V in G', ['Aø', 'D7']],
    ['ii–V in F minor', ['Gø', 'C7', 'Fm7']],
    ['Ending', ['Fm7', 'B♭7', 'E♭6']],
  ];
  const LENGTHS = [[2, '2 beats each'], [4, '1 bar each'], [8, '2 bars each']];

  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  window.Sequencer = function ({ el, names, onChange, storageKey, showLength }) {
    const st = Object.assign({ mode: 'tune', seq: ['Fm7', 'B♭7', 'E♭maj7'], sel: -1, len: 4 }, load(storageKey) || {});
    st.seq = st.seq.filter(n => names.includes(n));
    const esc = s => s.replace(/"/g, '&quot;');

    function render() {
      const on = (c) => c ? ' on' : '';
      let h = `<div class="chips seq-mode">
          <div class="chip${on(st.mode === 'tune')}" data-act="mode" data-v="tune">Whole tune</div>
          <div class="chip${on(st.mode === 'seq')}" data-act="mode" data-v="seq">My sequence${st.seq.length ? ' (' + st.seq.length + ')' : ''}</div>
        </div>`;
      if (st.mode === 'seq') {
        h += `<div class="seq-sub">Quick picks</div><div class="chips">` +
          PRESETS.map(([l, s], i) => `<div class="chip" data-act="preset" data-v="${i}">${l}</div>`).join('') + `</div>`;
        h += `<div class="seq-sub">Your sequence: tap one to move or remove it</div><div class="chips seq-list">` +
          (st.seq.length ? st.seq.map((n, i) => `<div class="chip seq-item${on(i === st.sel)}" data-act="sel" data-v="${i}"><span class="seq-n">${i + 1}</span>${n}</div>`).join('')
                         : `<span class="seq-empty">Empty. Add chords below.</span>`) + `</div>`;
        if (st.sel >= 0 && st.sel < st.seq.length) {
          h += `<div class="row seq-tools">
              <button data-act="left">◀ Earlier</button><button data-act="right">Later ▶</button>
              <button data-act="del">✕ Remove</button></div>`;
        }
        h += `<div class="seq-sub">Add a chord</div><div class="chips">` +
          names.map(n => `<div class="chip" data-act="add" data-v="${esc(n)}">+ ${n}</div>`).join('') + `</div>`;
        h += `<div class="row seq-tools"><button data-act="clear">Clear</button></div>`;
        if (showLength) h += `<div class="seq-sub">How long on each chord</div><div class="chips">` +
          LENGTHS.map(([b, l]) => `<div class="chip${on(st.len === b)}" data-act="len" data-v="${b}">${l}</div>`).join('') + `</div>`;
      }
      el.innerHTML = h;
      el.querySelectorAll('[data-act]').forEach(x => x.onclick = () => act(x.dataset.act, x.dataset.v));
    }

    function act(a, v) {
      if (a === 'mode') st.mode = v;
      if (a === 'preset') { st.seq = PRESETS[+v][1].filter(n => names.includes(n)); st.sel = -1; }
      if (a === 'add') { st.seq.push(v); st.sel = -1; }
      if (a === 'sel') st.sel = st.sel === +v ? -1 : +v;
      if (a === 'del') { st.seq.splice(st.sel, 1); st.sel = -1; }
      if (a === 'left' && st.sel > 0) { [st.seq[st.sel - 1], st.seq[st.sel]] = [st.seq[st.sel], st.seq[st.sel - 1]]; st.sel--; }
      if (a === 'right' && st.sel < st.seq.length - 1) { [st.seq[st.sel + 1], st.seq[st.sel]] = [st.seq[st.sel], st.seq[st.sel + 1]]; st.sel++; }
      if (a === 'clear') { st.seq = []; st.sel = -1; }
      if (a === 'len') st.len = +v;
      save(storageKey, { mode: st.mode, seq: st.seq, len: st.len });
      render();
      // selecting/moving doesn't change what plays unless the order changed
      if (a !== 'sel') onChange(api.get());
    }

    const api = {
      // what to practise: null = whole tune, otherwise {names:[...], beats}
      get: () => (st.mode === 'seq' && st.seq.length) ? { names: st.seq.slice(), beats: st.len } : null,
    };
    render();
    return api;
  };
})();
