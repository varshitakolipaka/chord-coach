#!/usr/bin/env python3
"""
Magenta's Stanford brain: a tiny local server that runs the Anticipatory Music Transformer
(Thickstun, Hall, Donahue, Liang; Stanford CRFM, Apache 2.0) and answers one bar at a time.

The app sends what you just played and the chord of the next bar. The chord goes in as an
*anticipated control* (the model's trick: it can see what's coming), so the melody it writes
fits the harmony. Generation is limited to piano notes in the melody register and stops at the
end of the bar or at the time budget the app gives it, whichever comes first.

Run on an Apple Silicon Mac:
    python3 server.py                 # small model (fastest)
    python3 server.py --model medium  # 360M parameters, richer, slower

Then in the app: Settings -> Magenta -> Brain -> Stanford.
"""
import argparse, json, math, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import torch
import torch.nn.functional as F

from anticipation import ops
from anticipation.config import TIME_RESOLUTION, MAX_DUR, DELTA, MAX_PITCH
from anticipation.vocab import (TIME_OFFSET, DUR_OFFSET, NOTE_OFFSET, MAX_TIME, MAX_NOTE, REST,
                                CONTROL_OFFSET, ATIME_OFFSET, ADUR_OFFSET, ANOTE_OFFSET, SPECIAL_OFFSET,
                                ANTICIPATE, VOCAB_SIZE)

MODELS = {'small': 'stanford-crfm/music-small-800k',
          'medium': 'stanford-crfm/music-medium-800k',
          'large': 'stanford-crfm/music-large-800k'}
PIANO = 0                                   # General MIDI program 0: acoustic grand
DELTA_TICKS = DELTA * TIME_RESOLUTION       # how far ahead controls are revealed (5 s)

model, device, model_name, lock = None, 'cpu', '', threading.Lock()


def tick(seconds):
    return max(0, int(round(seconds * TIME_RESOLUTION)))


def note_token(pitch, instr=PIANO):
    return instr * MAX_PITCH + int(pitch)


def events_from(notes, shift):
    """[{p, t, d}] in seconds -> arrival-time event tokens, shifted so the earliest is >= 0."""
    ev = []
    for n in sorted(notes, key=lambda n: n['t']):
        t = tick(n['t'] + shift)
        d = min(MAX_DUR - 1, max(1, tick(n['d'])))
        ev += [TIME_OFFSET + t, DUR_OFFSET + d, NOTE_OFFSET + note_token(n['p'])]
    return ev


def controls_from(notes, shift):
    c = []
    for n in sorted(notes, key=lambda n: n['t']):
        t = tick(n['t'] + shift)
        d = min(MAX_DUR - 1, max(1, tick(n['d'])))
        c += [ATIME_OFFSET + t, ADUR_OFFSET + d, ANOTE_OFFSET + note_token(n['p'])]
    return c


class Sampler:
    """Token-by-token sampling with a KV cache (the stock sampler re-reads the whole history per token)."""

    def __init__(self, prefix):
        self.length = len(prefix)
        with torch.no_grad():
            out = model(torch.tensor([prefix], device=device), use_cache=True)
        self.past, self.logits = out.past_key_values, out.logits[0, -1].float()

    def feed(self, token):
        with torch.no_grad():
            out = model(torch.tensor([[token]], device=device), past_key_values=self.past, use_cache=True)
        self.past, self.logits = out.past_key_values, out.logits[0, -1].float()
        self.length += 1

    def sample(self, mask_fn, top_p, temperature):
        logits = self.logits.clone()
        logits[CONTROL_OFFSET:] = -math.inf                     # never generate controls or specials
        mask_fn(logits)
        logits = logits / max(1e-3, temperature)
        if top_p < 1.0:
            sl, si = torch.sort(logits, descending=True)
            cp = torch.cumsum(F.softmax(sl, dim=-1), dim=-1)
            drop = cp > top_p
            drop[1:] = drop[:-1].clone(); drop[0] = False
            logits[si[drop]] = -math.inf
        return int(torch.multinomial(F.softmax(logits, dim=-1), 1))


def answer(req):
    """Write one bar of melody. Times in the request are seconds relative to the start of the answer."""
    t_start = time.perf_counter()
    length = float(req.get('length', 2.0))
    budget = float(req.get('budget_ms', 900)) / 1000
    low, high = int(req.get('low', 60)), int(req.get('high', 86))
    top_p, temperature = float(req.get('top_p', 0.95)), float(req.get('temperature', 1.0))
    history = [n for n in req.get('history', []) if n['t'] > -8.0]
    chord = req.get('chord', [])

    # put the earliest history note at time 0; the answer starts at `start`
    shift = -min([n['t'] for n in history] + [0.0])
    start, end = tick(shift), tick(shift + length)
    prompt = ops.pad(events_from(history, shift), start)
    # the chord, held for the whole answer, as anticipated controls
    controls = controls_from([{'p': p, 't': 0.0, 'd': length} for p in chord], shift)
    tokens, pending = ops.anticipate(prompt, controls) if controls else (prompt, [])
    z = [ANTICIPATE]
    s = Sampler(z + tokens)

    current = ops.max_time(prompt, seconds=False) if prompt else 0
    notes = []
    note_lo, note_hi = NOTE_OFFSET + note_token(low), NOTE_OFFSET + note_token(high) + 1

    def time_mask(l):
        l[DUR_OFFSET:CONTROL_OFFSET] = -math.inf
        l[TIME_OFFSET:TIME_OFFSET + max(start, current)] = -math.inf      # nothing in the past
        l[TIME_OFFSET + end + 1:DUR_OFFSET] = -math.inf                    # end-of-bar is allowed, as a way to stop

    def dur_mask(l):
        l[:DUR_OFFSET] = -math.inf; l[NOTE_OFFSET:] = -math.inf
        l[DUR_OFFSET + 0] = -math.inf

    def note_mask(l):
        l[:NOTE_OFFSET] = -math.inf; l[NOTE_OFFSET + MAX_NOTE:] = -math.inf
        keep = l[note_lo:note_hi].clone(); l[NOTE_OFFSET:NOTE_OFFSET + MAX_NOTE] = -math.inf; l[note_lo:note_hi] = keep

    with lock:
        while time.perf_counter() - t_start < budget and len(notes) < 48:
            # reveal controls that fall inside the anticipation window
            while pending and current >= (pending[0] - ATIME_OFFSET) - DELTA_TICKS:
                for tok in pending[:3]: s.feed(tok)
                pending = pending[3:]
            tt = s.sample(time_mask, top_p, temperature); t = tt - TIME_OFFSET
            if t >= end: break
            s.feed(tt)
            dd = s.sample(dur_mask, top_p, temperature); s.feed(dd)
            nn = s.sample(note_mask, top_p, temperature); s.feed(nn)
            current = t
            pitch = (nn - NOTE_OFFSET) % MAX_PITCH
            notes.append({'p': pitch, 't': round((t - start) / TIME_RESOLUTION, 3),
                          'd': round(min(dd - DUR_OFFSET, end - t) / TIME_RESOLUTION, 3)})
    return {'notes': notes, 'ms': round((time.perf_counter() - t_start) * 1000), 'model': model_name}


class Handler(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')   # lets an https page reach this Mac

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.cors()
        self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()

    def do_GET(self):
        if self.path.startswith('/health'): self.reply(200, {'ok': True, 'model': model_name, 'device': device})
        else: self.reply(404, {'error': 'not found'})

    def do_POST(self):
        if not self.path.startswith('/bar'): return self.reply(404, {'error': 'not found'})
        try:
            req = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            self.reply(200, answer(req))
        except Exception as e:
            self.reply(500, {'error': str(e)})

    def log_message(self, fmt, *args):
        pass


def main():
    global model, device, model_name
    ap = argparse.ArgumentParser(description="Magenta's Stanford brain (Anticipatory Music Transformer)")
    ap.add_argument('--model', default='small', help='small | medium | large | a Hugging Face model id')
    ap.add_argument('--port', type=int, default=8721)
    ap.add_argument('--host', default='127.0.0.1', help='use 0.0.0.0 to let other devices on your network connect')
    ap.add_argument('--random', action='store_true', help='untrained weights, for testing the plumbing offline')
    a = ap.parse_args()
    device = 'mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
    model_name = MODELS.get(a.model, a.model)
    if a.random:
        from transformers import GPT2Config, GPT2LMHeadModel
        model = GPT2LMHeadModel(GPT2Config(vocab_size=VOCAB_SIZE, n_positions=1024, n_embd=768, n_layer=12, n_head=12))
        model_name = 'random-gpt2-small'
    else:
        from transformers import AutoModelForCausalLM
        print(f'Loading {model_name} (first run downloads it) ...')
        model = AutoModelForCausalLM.from_pretrained(model_name)
    model = model.to(device).eval()
    # warm up, so the first real answer isn't slow
    answer({'history': [{'p': 65, 't': -1.0, 'd': 0.4}], 'chord': [53, 56, 60, 63], 'length': 2.0, 'budget_ms': 3000})
    print(f'Stanford brain ready: {model_name} on {device}. Listening on http://{a.host}:{a.port}')
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
