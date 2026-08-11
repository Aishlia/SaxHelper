/* Staff rendering with VexFlow: lays the transcription out system by system and
   reports where every notehead landed so the player can box the current note. */

const VF = () => window.Vex.Flow;

const SHARP_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const FLAT_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
const SHARP_SPELLING = [['C', ''], ['C', '#'], ['D', ''], ['D', '#'], ['E', ''],
  ['F', ''], ['F', '#'], ['G', ''], ['G', '#'], ['A', ''], ['A', '#'], ['B', '']];
const FLAT_SPELLING = [['C', ''], ['D', 'b'], ['D', ''], ['E', 'b'], ['E', ''],
  ['F', ''], ['G', 'b'], ['G', ''], ['A', 'b'], ['A', ''], ['B', 'b'], ['B', '']];

export function keyName(fifths) {
  return fifths >= 0 ? SHARP_KEYS[Math.min(fifths, 7)] : FLAT_KEYS[Math.min(-fifths, 7)];
}

export function vexKey(midi, fifths = 0) {
  const table = fifths < 0 ? FLAT_SPELLING : SHARP_SPELLING;
  const [letter, accidental] = table[((midi % 12) + 12) % 12];
  return `${letter.toLowerCase()}${accidental}/${Math.floor(midi / 12) - 1}`;
}

function makeNote(note, fifths) {
  const { StaveNote, Dot } = VF();
  const staveNote = note.rest
    ? new StaveNote({ keys: ['b/4'], duration: `${note.duration}r`, clef: 'treble' })
    : new StaveNote({ keys: [vexKey(note.midi, fifths)], duration: note.duration, clef: 'treble' });
  for (let i = 0; i < (note.dots || 0); i += 1) {
    Dot.buildAndAttach([staveNote], { all: true });
  }
  return staveNote;
}

function estimateWidth(measure) {
  return Math.max(120, 34 + 30 * Math.max(measure.notes.length, 1));
}

function packLines(measures, available, firstExtra) {
  const lines = [];
  let current = [];
  let width = firstExtra;
  for (const measure of measures) {
    const w = estimateWidth(measure);
    if (current.length && width + w > available) {
      lines.push(current);
      current = [];
      width = firstExtra;
    }
    current.push(measure);
    width += w;
  }
  if (current.length) lines.push(current);
  return lines;
}

/**
 * Draw the whole score. Returns an array of note positions, indexed the same as
 * score.notes, each { left, top, width, height } relative to `container`.
 */
export function renderScore(container, score, options = {}) {
  const { onSelectNote } = options;
  const { Renderer, Stave, Voice, Formatter, Beam, Accidental, StaveTie } = VF();

  container.innerHTML = '';
  const positions = new Array(score.notes.length).fill(null);
  if (!score.notes.length) return positions;

  const measures = score.measures.map((measure) => ({
    ...measure,
    notes: score.notes.slice(measure.firstNote, measure.firstNote + measure.noteCount),
  })).filter((measure) => measure.notes.length);

  const available = Math.max(560, container.clientWidth - 24);
  const key = keyName(score.keyFifths || 0);
  const firstExtra = 96;
  const lines = packLines(measures, available, firstExtra);

  lines.forEach((lineMeasures, lineIndex) => {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'score-line';
    container.appendChild(lineDiv);

    const height = 132;
    const renderer = new Renderer(lineDiv, Renderer.Backends.SVG);
    renderer.resize(available + 16, height);
    const context = renderer.getContext();
    context.setFont('Arial', 10);

    const estimates = lineMeasures.map(estimateWidth);
    const total = estimates.reduce((a, b) => a + b, 0);
    const extra = lineIndex === 0 ? firstExtra : 74;
    const usable = available - extra - 12;
    const scale = usable / total;

    let x = 8;
    const staves = [];
    const beams = [];
    const ties = [];

    lineMeasures.forEach((measure, measureIndex) => {
      let width = Math.max(90, estimates[measureIndex] * scale);
      if (measureIndex === 0) width += extra;
      const stave = new Stave(x, 24, width);
      if (measureIndex === 0) {
        stave.addClef('treble').addKeySignature(key);
        if (lineIndex === 0) stave.addTimeSignature(score.timeSignature || '4/4');
      }
      if (measureIndex === lineMeasures.length - 1) {
        stave.setEndBarType(lineIndex === lines.length - 1 ? VF().Barline.type.END
          : VF().Barline.type.SINGLE);
      }
      stave.setContext(context).draw();
      x += width;

      const staveNotes = measure.notes.map((note) => makeNote(note, score.keyFifths || 0));
      const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      voice.addTickables(staveNotes);
      Accidental.applyAccidentals([voice], key);
      new Formatter().joinVoices([voice]).formatToStave([voice], stave);
      voice.draw(context, stave);

      beams.push(...Beam.generateBeams(staveNotes));

      measure.notes.forEach((note, i) => {
        if (note.tieStart && measure.notes[i + 1] && measure.notes[i + 1].tieStop) {
          ties.push(new StaveTie({
            first_note: staveNotes[i], last_note: staveNotes[i + 1],
            first_indices: [0], last_indices: [0],
          }));
        }
      });

      staves.push({ stave, staveNotes, measure });
    });

    beams.forEach((beam) => beam.setContext(context).draw());
    ties.forEach((tie) => tie.setContext(context).draw());

    const svg = lineDiv.querySelector('svg');
    const hits = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    hits.setAttribute('class', 'score-hits');
    svg.appendChild(hits);

    staves.forEach(({ stave, staveNotes, measure }) => {
      staveNotes.forEach((staveNote, i) => {
        const note = measure.notes[i];
        // The box wraps the staff plus whatever the note pokes out by, so a
        // high ledger-line note is still fully enclosed.
        const box = staveNote.getBoundingBox();
        const left = Math.round(staveNote.getAbsoluteX() - 11);
        const top = Math.min(stave.getYForLine(0) - 13, box ? box.getY() - 5 : Infinity);
        const bottom = Math.max(stave.getYForLine(4) + 13,
          box ? box.getY() + box.getH() + 5 : -Infinity);
        positions[note.index] = {
          left: lineDiv.offsetLeft + left,
          top: lineDiv.offsetTop + top,
          width: 24,
          height: bottom - top,
          line: lineIndex,
        };

        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        hit.setAttribute('x', left);
        hit.setAttribute('y', stave.getYForLine(0) - 40);
        hit.setAttribute('width', 24);
        hit.setAttribute('height', stave.getYForLine(4) - stave.getYForLine(0) + 80);
        hit.setAttribute('class', 'score-hit');
        hit.dataset.index = note.index;
        if (onSelectNote) {
          hit.addEventListener('click', () => onSelectNote(note.index));
        }
        hits.appendChild(hit);
      });
    });
  });

  return positions;
}

/**
 * A single row of whole notes with no barlines, for the chromatic reference
 * chart. Returns positions keyed by array index.
 */
export function renderNoteRow(container, midiList, options = {}) {
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF();
  const {
    fifths = 0, onSelectNote, indexOffset = 0, height = 168, staveY = 40,
  } = options;

  const width = Math.max(520, container.clientWidth - 16);
  const lineDiv = document.createElement('div');
  lineDiv.className = 'score-line';
  container.appendChild(lineDiv);

  const renderer = new Renderer(lineDiv, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();

  const stave = new Stave(8, staveY, width - 20);
  stave.addClef('treble');
  stave.setContext(context).draw();

  const staveNotes = midiList.map((midi) => new StaveNote({
    keys: [vexKey(midi, fifths)], duration: 'w', clef: 'treble',
  }));
  staveNotes.forEach((note, i) => {
    const [, accidental] = (fifths < 0 ? FLAT_SPELLING : SHARP_SPELLING)[
      ((midiList[i] % 12) + 12) % 12];
    if (accidental) note.addModifier(new Accidental(accidental), 0);
  });

  const voice = new Voice({ num_beats: midiList.length * 4, beat_value: 4 }).setStrict(false);
  voice.addTickables(staveNotes);
  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(context, stave);

  const svg = lineDiv.querySelector('svg');
  const hits = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(hits);

  return staveNotes.map((staveNote, i) => {
    const box = staveNote.getBoundingBox();
    const left = Math.round(staveNote.getAbsoluteX() - 13);
    const top = Math.min(stave.getYForLine(0) - 14, box ? box.getY() - 6 : Infinity);
    const height = Math.max(stave.getYForLine(4) + 14,
      box ? box.getY() + box.getH() + 6 : -Infinity) - top;

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hit.setAttribute('x', left);
    hit.setAttribute('y', stave.getYForLine(0) - 34);
    hit.setAttribute('width', 28);
    hit.setAttribute('height', stave.getYForLine(4) - stave.getYForLine(0) + 68);
    hit.setAttribute('class', 'score-hit');
    if (onSelectNote) hit.addEventListener('click', () => onSelectNote(indexOffset + i));
    hits.appendChild(hit);

    return {
      left: lineDiv.offsetLeft + left,
      top: lineDiv.offsetTop + top,
      width: 28,
      height,
    };
  });
}
