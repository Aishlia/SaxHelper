# SaxHelper

Drop in a PDF, photo or scan of sheet music and get the alto sax fingering for
every note, in order. Runs entirely on your own machine.

![The song view: fingering on the left, the recognised score on the right](docs/player.png)

## What it does

- **Reads the page.** Optical music recognition turns a PDF or image into notes;
  multi-page PDFs are stitched into one piece.
- **Shows the fingering** in the printed-chart style — filled keys are the ones
  you press — plus alternates where they exist (bis Bb, side keys, alt F#).
- **Walks the piece** note by note, or plays it back with a synth tone, a
  tempo slider, a metronome click and looping.
- **Transposes** for soprano, alto, tenor and baritone, and tells you the
  concert pitch each written note sounds.
- **Lets you fix mistakes.** Recognition is never perfect, so click any note and
  nudge it by a semitone or an octave, or open the original page side by side.
- **Chromatic chart tab** for looking up a single note, no file needed.

## Run it

```bash
git clone git@github.com:Aishlia/SaxHelper.git
cd SaxHelper
./run.sh
```

Needs Python 3.11 or newer. The first run creates `.venv` and installs the
requirements (using [uv](https://github.com/astral-sh/uv) if you have it), then
opens <http://localhost:8765>. The recognition models download once, about
200 MB, and are cached afterwards.

No file to hand? Hit **Try the sample**.

## Keyboard

| Key | Action |
| --- | --- |
| `space` | play / pause |
| `←` `→` | step a note |
| `enter` | hear the current note |
| `shift` + `↑` `↓` | nudge the note a semitone |
| `alt` + `↑` `↓` | nudge the note an octave |

## Reading a diagram

Every key sits roughly where it does on the horn, so you can read the diagram
straight onto the instrument. Tick **Show key names** if you are still learning
which key is which.

![The diagram with every key named](docs/key-names.png)

The **Fingering chart** tab walks the chromatic scale from low Bb to altissimo
F#, with the same diagram for each note.

![The chromatic fingering chart](docs/chart.png)

## How it works

```
PDF / image ──► page images ──► recogniser ──► MusicXML ──► note list ──► fingerings
   PyMuPDF                        homr                      score.py     fingerings.py
```

The backend is FastAPI. Uploads become background jobs so the page can report
progress while a scan is being read; MusicXML files skip recognition entirely.
The fingering table and the diagram geometry live together in one module, so
the picture and the keys it names can never drift apart.

| Path | What's in it |
| --- | --- |
| `backend/app.py` | HTTP API, upload handling, job queue |
| `backend/omr.py` | page rasterising and the recogniser |
| `backend/score.py` | MusicXML → flat note list, multi-page merge |
| `backend/fingerings.py` | key layout and the chromatic fingering table |
| `frontend/` | the app: score rendering, diagrams, playback |
| `tools/` | headless-browser scripts for screenshots and checks |

## Worth knowing

- Recognition quality follows scan quality. Flat, straight, well-lit pages with
  clean staff lines work best; handwriting and heavy chord symbols confuse it.
- Fingerings are written pitch, so they are identical on every saxophone. The
  transposing toggle only changes the concert pitch that is reported.
- Above written F#6 the app falls back to the nearest note an octave down and
  says so: altissimo has no standard fingering, it varies by player and horn.
