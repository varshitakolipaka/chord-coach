# Magenta's Stanford brain

This little server runs Stanford's **Anticipatory Music Transformer** (Thickstun, Hall, Donahue, Liang; Apache 2.0) on your Mac, so that Magenta the cat can answer you with it instead of its built-in brain.

It writes one bar at a time. The app sends what you just played plus the chord of the bar. The chord goes in as an *anticipated control*, the model's special trick: it knows what's coming, so its melody fits the harmony. If the server is slow or switched off, the built-in Magenta brain answers instead, so the music never stops.

## Set up (once)

You need an Apple Silicon Mac (M1 or newer) and Python 3.10+.

Open Terminal and run:

```
python3 -m venv ~/stanford-brain
source ~/stanford-brain/bin/activate
pip install torch transformers git+https://github.com/jthickstun/anticipation
curl -O https://raw.githubusercontent.com/varshitakolipaka/chord-coach/main/stanford/server.py
```

## Play

```
source ~/stanford-brain/bin/activate
python3 server.py
```

The first run downloads the model, which is about 500 MB for the small one. Wait until it says **"Stanford brain ready"**.

Then, on the same Mac:

1. Open the app in **Chrome**, not Safari. Safari has no MIDI.
2. Go to **Settings → Magenta → Brain → Stanford (on my Mac)**. It should say "Connected". If Chrome asks whether the page may talk to devices on your local network, allow it.
3. Play as usual. Magenta composes from beat 2½ of your bar and comes in on the downbeat.

### Bigger brain

`python3 server.py --model medium` uses the 360M model. It's richer, but slower. If its answers start arriving late, so that only the end of the bar plays, go back to `small`.

### From the iPad or iPhone

The iPad can't reach your Mac over plain `http`, so give the server a temporary secure address:

```
brew install cloudflared
cloudflared tunnel --url http://localhost:8721
```

It prints an address like `https://something.trycloudflare.com`. Paste that into **Settings → Magenta → Brain** on the iPad. Keep both Terminal windows open while you play.

## What it does, exactly

- `GET /health` returns which model it's running and on what (`mps` = the Mac's GPU).
- `POST /bar` takes `{history: [{p, t, d}], chord: [pitches], length, budget_ms, temperature}`. Times are in seconds relative to the start of Magenta's bar, so your notes have negative times. It returns `{notes: [{p, t, d}]}`.
- It only writes piano notes between middle C and D6, and it stops at the end of the bar or when the time budget runs out, whichever comes first.
- `python3 server.py --random` runs untrained weights, which is only useful for testing that everything is wired up.
