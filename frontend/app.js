import { renderDiagram, describeFingering } from './fingering.js';
import { renderScore, renderNoteRow } from './score.js';
import { SaxSynth } from './audio.js';

const $ = (id) => document.getElementById(id);

const synth = new SaxSynth();

const state = {
  diagram: null,
  instruments: {},
  range: { lowest: 58, highest: 90 },
  fingerings: new Map(),
  instrument: 'alto',
  showLabels: false,

  score: null,
  originalMidi: new Map(),
  positions: [],
  measureByIndex: new Map(),
  playable: [],
  index: 0,
  tempo: 90,
  playing: false,
  view: 'song',

  chart: [],
  chartIndex: 0,
  chartPositions: [],
};

const playback = { t0: 0, spq: 0.5, pointer: 0, clickQuarter: 0, raf: 0 };

/* ─────────────────────────── fingering lookup ─────────────────────────── */

function fingeringFor(midi) {
  const direct = state.fingerings.get(midi);
  if (direct) return direct;

  let shifted = midi;
  let octaves = 0;
  while (shifted > state.range.highest) { shifted -= 12; octaves += 1; }
  while (shifted < state.range.lowest) { shifted += 12; octaves -= 1; }
  const fallback = state.fingerings.get(shifted);
  if (!fallback) return { inRange: false, options: [], note: 'No fingering available.' };

  return {
    inRange: false,
    options: fallback.options.slice(0, 1),
    note: octaves > 0
      ? `Altissimo — above written F♯6 there is no standard fingering; it varies by player and horn. `
        + `Showing ${noteLabel(shifted)}, ${octaves} octave${octaves > 1 ? 's' : ''} lower.`
      : `Below the saxophone's written range (low B♭3). Showing ${noteLabel(shifted)}, `
        + `${-octaves} octave${octaves < -1 ? 's' : ''} up.`,
  };
}

const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const DURATION_NAMES = {
  w: 'whole', h: 'half', q: 'quarter', 8: 'eighth', 16: 'sixteenth', 32: '32nd', 64: '64th',
};

function noteLabel(midi, flats = false) {
  return `${(flats ? FLATS : SHARPS)[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

function hasEnharmonic(midi) {
  return SHARPS[((midi % 12) + 12) % 12].length > 1;
}

function concertMidi(midi) {
  return midi + (state.instruments[state.instrument]?.transpose ?? 0);
}

/* ─────────────────────────── diagram rendering ────────────────────────── */

function paintDiagrams(container, midi) {
  container.innerHTML = '';
  const fingering = fingeringFor(midi);

  if (!fingering.options.length) {
    container.append(Object.assign(document.createElement('p'),
      { className: 'fingering-desc', textContent: 'No fingering for this note.' }));
    return fingering;
  }

  // Key names are only legible at full panel width, so that mode shows just the
  // main fingering. Otherwise every diagram in the row is drawn the same size.
  const hidden = state.showLabels ? fingering.options.length - 1 : 0;
  const options = state.showLabels ? fingering.options.slice(0, 1) : fingering.options;

  options.forEach((option, i) => {
    const card = document.createElement('figure');
    card.className = `diagram-card ${i === 0 ? 'is-primary' : ''}`;
    card.appendChild(renderDiagram(state.diagram, option.keys, {
      showLabels: state.showLabels,
    }));

    const caption = document.createElement('figcaption');
    if (i === 0 && hidden) {
      caption.textContent = `${option.name} (${hidden} alternate hidden)`;
    } else if (i === 0 && fingering.options.length > 1) {
      caption.textContent = `${option.name} (use this)`;
    } else {
      caption.textContent = option.name;
    }
    card.appendChild(caption);
    container.appendChild(card);
  });

  return fingering;
}

/* ────────────────────────────── song view ─────────────────────────────── */

function currentNote() {
  return state.score?.notes[state.index] ?? null;
}

function updateReadout() {
  const note = currentNote();
  if (!note) return;

  const measure = state.measureByIndex.get(note.measureIndex);
  const beat = measure ? (note.start - measure.start) + 1 : null;
  const where = measure
    ? `bar ${measure.number}${beat ? `, beat ${(Math.round(beat * 100) / 100)}` : ''}`
    : '';

  if (note.rest) {
    $('noteName').textContent = 'rest';
    $('noteEnh').textContent = '';
    $('noteConcert').textContent = `${DURATION_NAMES[note.duration] || note.duration} rest`;
    $('noteWhere').textContent = where;
    $('diagramRow').innerHTML = '';
    const card = document.createElement('figure');
    card.className = 'diagram-card';
    card.appendChild(renderDiagram(state.diagram, [], { showLabels: state.showLabels }));
    $('diagramRow').appendChild(card);
    $('fingeringDesc').textContent = 'Rest — lift your fingers and breathe.';
    $('fingeringWarning').hidden = true;
  } else {
    const { midi } = note;
    $('noteName').textContent = noteLabel(midi);
    $('noteEnh').textContent = hasEnharmonic(midi) ? `(${noteLabel(midi, true)})` : '';
    $('noteConcert').textContent = `sounds ${noteLabel(concertMidi(midi))} concert`;
    $('noteWhere').textContent = where;

    const fingering = paintDiagrams($('diagramRow'), midi);
    $('fingeringDesc').textContent = fingering.options.length
      ? describeFingering(state.diagram, fingering.options[0].keys) : '';
    $('fingeringWarning').hidden = !fingering.note;
    $('fingeringWarning').textContent = fingering.note || '';
  }

  const position = state.playable.indexOf(note.index);
  $('noteCounter').textContent = `${position >= 0 ? position + 1 : '–'} / ${state.playable.length}`;
  if (position >= 0) $('seek').value = String(position);
  moveHighlight();
}

function moveHighlight() {
  const box = state.positions[state.index];
  const highlight = $('highlight');
  if (!box) { highlight.hidden = true; return; }
  highlight.hidden = false;
  highlight.style.transform = `translate(${box.left}px, ${box.top}px)`;
  highlight.style.width = `${box.width}px`;
  highlight.style.height = `${box.height}px`;
}

function scrollCurrentIntoView(smooth = true) {
  const box = state.positions[state.index];
  const scroller = $('scoreScroll');
  if (!box || !scroller) return;

  // Only move the score when the note has actually left the comfortable band,
  // otherwise playback would scroll on every single note.
  const margin = 24;
  const visibleTop = scroller.scrollTop + margin;
  const visibleBottom = scroller.scrollTop + scroller.clientHeight - margin;
  if (box.top >= visibleTop && box.top + box.height <= visibleBottom) return;

  const target = box.top - scroller.clientHeight / 2 + box.height / 2;
  const max = scroller.scrollHeight - scroller.clientHeight;
  scroller.scrollTo({
    top: Math.max(0, Math.min(target, max)),
    behavior: smooth ? 'smooth' : 'auto',
  });
}

function setIndex(index, { scroll = true, hear = false } = {}) {
  if (!state.score) return;
  state.index = Math.max(0, Math.min(index, state.score.notes.length - 1));
  updateReadout();
  if (scroll) scrollCurrentIntoView(!state.playing);
  const note = currentNote();
  if (hear && note && !note.rest) {
    synth.note(concertMidi(note.midi), synth.now + 0.01, 0.6);
  }
}

function step(delta, hear = true) {
  if (!state.score) return;
  const notes = state.score.notes;
  let i = state.index + delta;
  while (i >= 0 && i < notes.length && notes[i].rest) i += delta;
  if (i < 0 || i >= notes.length) return;
  stopPlayback();
  setIndex(i, { hear });
}

function drawScore() {
  if (!state.score) return;
  state.positions = renderScore($('score'), state.score, {
    onSelectNote: (index) => { stopPlayback(); setIndex(index, { scroll: false, hear: true }); },
  });
  moveHighlight();
}

/* ──────────────────────────── playback engine ─────────────────────────── */

function endQuarter() {
  const notes = state.score.notes;
  const last = notes[notes.length - 1];
  return last.start + Math.max(last.quarters, 0.25);
}

function startPlayback() {
  if (!state.score) return;
  synth.resume();
  // Pressing play at the end starts over rather than doing nothing.
  if (state.index >= state.score.notes.length - 1) {
    setIndex(state.playable[0] ?? 0, { scroll: true });
  }
  const note = currentNote();
  playback.spq = 60 / state.tempo;
  playback.t0 = synth.now + 0.14 - (note?.start ?? 0) * playback.spq;
  playback.pointer = state.index;
  playback.clickQuarter = Math.ceil((note?.start ?? 0) - 1e-6);
  state.playing = true;
  $('playBtn').textContent = '❚❚';
  $('playBtn').classList.add('is-playing');
  tick();
}

function stopPlayback() {
  if (!state.playing) return;
  state.playing = false;
  cancelAnimationFrame(playback.raf);
  synth.stopAll();
  $('playBtn').textContent = '▶';
  $('playBtn').classList.remove('is-playing');
}

function tick() {
  if (!state.playing) return;
  const notes = state.score.notes;
  const { spq, t0 } = playback;
  const now = synth.now;
  const horizon = now + 1.2;

  while (playback.pointer < notes.length
         && t0 + notes[playback.pointer].start * spq < horizon) {
    const note = notes[playback.pointer];
    if (!note.rest) {
      const at = Math.max(now + 0.005, t0 + note.start * spq);
      synth.note(concertMidi(note.midi), at,
        Math.max(0.1, (note.soundingQuarters || note.quarters) * spq * 0.94));
    }
    playback.pointer += 1;
  }

  if ($('metronomeToggle').checked) {
    while (t0 + playback.clickQuarter * spq < horizon) {
      const at = t0 + playback.clickQuarter * spq;
      if (at > now) {
        const beatsPerBar = parseInt((state.score.timeSignature || '4/4').split('/')[0], 10) || 4;
        synth.click(at, playback.clickQuarter % beatsPerBar === 0);
      }
      playback.clickQuarter += 1;
    }
  }

  const quarters = (now - t0) / spq;
  let i = state.index;
  while (i + 1 < notes.length && notes[i + 1].start <= quarters + 1e-6) i += 1;
  if (i !== state.index) setIndex(i, { scroll: true });

  if (quarters >= endQuarter()) {
    stopPlayback();
    if ($('loopToggle').checked) {
      setIndex(0, { scroll: true });
      startPlayback();
    }
    return;
  }
  playback.raf = requestAnimationFrame(tick);
}

/* ───────────────────────────── note editing ──────────────────────────── */

function editCurrent(delta) {
  const note = currentNote();
  if (!note || note.rest) return;
  note.midi = Math.max(21, Math.min(108, note.midi + delta));
  note.name = noteLabel(note.midi);
  drawScore();
  updateReadout();
  synth.note(concertMidi(note.midi), synth.now + 0.01, 0.5);
  markEdited();
}

function markEdited() {
  const changed = state.score.notes.filter(
    (n) => !n.rest && state.originalMidi.get(n.index) !== n.midi).length;
  $('resetEdits').classList.toggle('is-active', changed > 0);
  $('resetEdits').textContent = changed ? `reset (${changed})` : 'reset';
}

function resetEdits() {
  for (const note of state.score.notes) {
    if (state.originalMidi.has(note.index)) {
      note.midi = state.originalMidi.get(note.index);
      note.name = noteLabel(note.midi);
    }
  }
  drawScore();
  updateReadout();
  markEdited();
}

/* ──────────────────────────── loading a score ─────────────────────────── */

function showPanel(name) {
  $('uploadWrap').hidden = name !== 'upload';
  $('progressCard').hidden = name !== 'progress';
  $('errorCard').hidden = name !== 'error';
  $('player').hidden = name !== 'player';
  $('newFileBtn').hidden = name !== 'player';
  if (name !== 'player') $('originalModal').hidden = true;
}

function toggleModal(open) {
  $('originalModal').hidden = !open;
}

function loadScore(score) {
  stopPlayback();
  state.score = score;
  state.index = 0;
  state.originalMidi = new Map(score.notes.filter((n) => !n.rest).map((n) => [n.index, n.midi]));
  state.measureByIndex = new Map(score.measures.map((m) => [m.index, m]));
  state.playable = score.notes.filter((n) => !n.rest).map((n) => n.index);
  state.tempo = Math.round(score.tempo || 90);

  $('tempo').value = String(state.tempo);
  $('tempoValue').textContent = String(state.tempo);
  $('seek').max = String(Math.max(0, state.playable.length - 1));
  $('seek').value = '0';

  const stats = score.stats || {};
  const range = stats.lowest != null
    ? `${noteLabel(stats.lowest)}–${noteLabel(stats.highest)}` : '—';
  $('scoreMeta').innerHTML = [
    score.source?.filename ? `<strong>${escapeHtml(score.source.filename)}</strong>` : '',
    `${stats.noteCount ?? 0} notes`,
    `${stats.measureCount ?? 0} bars`,
    `range ${range}`,
    `${score.timeSignature || '4/4'}`,
  ].filter(Boolean).join('<span class="dot-sep">•</span>');

  const pageUrls = score.source?.pageUrls || [];
  $('originalBtn').hidden = !pageUrls.length;
  $('originalPages').innerHTML = pageUrls.map(
    (url) => `<img src="${escapeHtml(url)}" alt="original page" loading="lazy" />`).join('');

  showPanel('player');
  drawScore();
  const first = state.playable.length ? state.playable[0] : 0;
  setIndex(first, { scroll: false });
  markEdited();
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function pollJob(jobId) {
  for (;;) {
    const response = await fetch(`/api/jobs/${jobId}`);
    if (!response.ok) throw new Error('Lost track of that job. Try again.');
    const job = await response.json();

    $('progressMessage').textContent = job.message || '…';
    $('progressBar').style.width = `${Math.round((job.progress || 0) * 100)}%`;

    if (job.status === 'done') return job;
    if (job.status === 'error') throw new Error(job.message || 'Recognition failed.');
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
}

async function runJob(startRequest, title) {
  showPanel('progress');
  $('progressTitle').textContent = title;
  $('progressMessage').textContent = 'Starting the recogniser';
  $('progressBar').style.width = '4%';
  try {
    const response = await startRequest();
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail || `Upload failed (${response.status}).`);
    }
    const { jobId } = await response.json();
    const job = await pollJob(jobId);
    loadScore(job.result);
  } catch (error) {
    $('errorMessage').textContent = error.message;
    showPanel('error');
  }
}

function uploadFile(file) {
  const body = new FormData();
  body.append('file', file);
  runJob(() => fetch('/api/transcribe', { method: 'POST', body }),
    `Reading ${file.name}…`);
}

/* ───────────────────────────── chart view ────────────────────────────── */

function drawChart() {
  const rows = $('chartRows');
  rows.innerHTML = '';
  const midis = state.chart.map((entry) => entry.midi);
  const split = midis.findIndex((m) => m >= 74);
  const groups = [midis.slice(0, split), midis.slice(split)];

  state.chartPositions = [];
  let offset = 0;
  for (const group of groups) {
    const positions = renderNoteRow(rows, group, {
      fifths: 0,
      indexOffset: offset,
      onSelectNote: (index) => setChartIndex(index, true),
    });
    state.chartPositions.push(...positions);
    offset += group.length;
  }
  setChartIndex(state.chartIndex, false);
}

function setChartIndex(index, hear) {
  state.chartIndex = Math.max(0, Math.min(index, state.chart.length - 1));
  const midi = state.chart[state.chartIndex].midi;

  $('chartNoteName').textContent = hasEnharmonic(midi)
    ? `${noteLabel(midi)} / ${noteLabel(midi, true)}` : noteLabel(midi);
  $('chartNoteConcert').textContent = `written pitch • sounds ${noteLabel(concertMidi(midi))} concert on ${state.instruments[state.instrument].label}`;

  const fingering = paintDiagrams($('chartDiagramRow'), midi);
  $('chartDesc').textContent = fingering.options.length
    ? describeFingering(state.diagram, fingering.options[0].keys) : '';

  const box = state.chartPositions[state.chartIndex];
  const highlight = $('chartHighlight');
  if (box) {
    highlight.hidden = false;
    highlight.style.transform = `translate(${box.left}px, ${box.top}px)`;
    highlight.style.width = `${box.width}px`;
    highlight.style.height = `${box.height}px`;
  } else {
    highlight.hidden = true;
  }

  if (hear) synth.note(concertMidi(midi), synth.now + 0.01, 0.7);
}

/* ──────────────────────────────── wiring ─────────────────────────────── */

function setView(view) {
  state.view = view;
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.view === view);
  }
  $('view-song').classList.toggle('is-active', view === 'song');
  $('view-chart').classList.toggle('is-active', view === 'chart');

  // A hidden view has no width, so anything laid out while it was hidden has to
  // be measured again once it is on screen.
  if (view === 'chart') {
    stopPlayback();
    drawChart();
  } else if (state.score && !$('player').hidden) {
    drawScore();
    setIndex(state.index, { scroll: false });
  }
}

function buildInstrumentToggle() {
  const container = $('instrumentToggle');
  container.innerHTML = '';
  for (const [id, info] of Object.entries(state.instruments)) {
    const button = document.createElement('button');
    button.className = `pill ${id === state.instrument ? 'is-active' : ''}`;
    button.textContent = info.label.split(' ')[0];
    button.title = info.label;
    button.addEventListener('click', () => {
      state.instrument = id;
      buildInstrumentToggle();
      if (state.score) updateReadout();
      if (state.chartPositions.length) setChartIndex(state.chartIndex, false);
    });
    container.appendChild(button);
  }
}

function wireEvents() {
  $('tabs').addEventListener('click', (event) => {
    if (event.target.dataset.view) setView(event.target.dataset.view);
  });

  $('chooseBtn').addEventListener('click', () => $('fileInput').click());
  $('dropzone').addEventListener('click', (event) => {
    if (event.target === $('dropzone') || event.target.tagName === 'H1') $('fileInput').click();
  });
  $('fileInput').addEventListener('change', (event) => {
    if (event.target.files[0]) uploadFile(event.target.files[0]);
    event.target.value = '';
  });
  $('sampleBtn').addEventListener('click', () => {
    runJob(() => fetch('/api/sample', { method: 'POST' }), 'Reading the sample…');
  });
  $('errorBackBtn').addEventListener('click', () => showPanel('upload'));
  $('newFileBtn').addEventListener('click', () => { stopPlayback(); showPanel('upload'); });

  for (const type of ['dragenter', 'dragover']) {
    document.addEventListener(type, (event) => {
      event.preventDefault();
      $('dropzone').classList.add('is-hover');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    document.addEventListener(type, () => $('dropzone').classList.remove('is-hover'));
  }
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  });

  $('playBtn').addEventListener('click', () => (state.playing ? stopPlayback() : startPlayback()));
  $('prevBtn').addEventListener('click', () => step(-1));
  $('nextBtn').addEventListener('click', () => step(1));
  $('hearBtn').addEventListener('click', () => setIndex(state.index, { scroll: false, hear: true }));

  $('seek').addEventListener('input', (event) => {
    stopPlayback();
    const target = state.playable[Number(event.target.value)];
    if (target != null) setIndex(target, { scroll: true });
  });

  $('tempo').addEventListener('input', (event) => {
    state.tempo = Number(event.target.value);
    $('tempoValue').textContent = String(state.tempo);
    if (state.playing) { stopPlayback(); startPlayback(); }
  });

  $('labelsToggle').addEventListener('change', (event) => {
    state.showLabels = event.target.checked;
    if (state.score) updateReadout();
    if (state.chartPositions.length) setChartIndex(state.chartIndex, false);
  });

  $('originalBtn').addEventListener('click', () => toggleModal(true));
  for (const node of document.querySelectorAll('[data-close-modal]')) {
    node.addEventListener('click', () => toggleModal(false));
  }

  $('semitoneUp').addEventListener('click', () => editCurrent(1));
  $('semitoneDown').addEventListener('click', () => editCurrent(-1));
  $('octaveUp').addEventListener('click', () => editCurrent(12));
  $('octaveDown').addEventListener('click', () => editCurrent(-12));
  $('resetEdits').addEventListener('click', resetEdits);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('originalModal').hidden) {
      toggleModal(false);
      return;
    }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;

    if (state.view === 'chart') {
      if (event.key === 'ArrowRight') { setChartIndex(state.chartIndex + 1, true); event.preventDefault(); }
      if (event.key === 'ArrowLeft') { setChartIndex(state.chartIndex - 1, true); event.preventDefault(); }
      return;
    }
    if (!state.score || $('player').hidden) return;

    switch (event.key) {
      case ' ':
        event.preventDefault();
        state.playing ? stopPlayback() : startPlayback();
        break;
      case 'ArrowRight': event.preventDefault(); step(1); break;
      case 'ArrowLeft': event.preventDefault(); step(-1); break;
      case 'Enter': event.preventDefault(); setIndex(state.index, { scroll: false, hear: true }); break;
      case 'ArrowUp':
        event.preventDefault();
        editCurrent(event.altKey ? 12 : event.shiftKey ? 1 : 0);
        break;
      case 'ArrowDown':
        event.preventDefault();
        editCurrent(event.altKey ? -12 : event.shiftKey ? -1 : 0);
        break;
      default: break;
    }
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.view === 'song' && state.score && !$('player').hidden) {
        drawScore();
        moveHighlight();
      } else if (state.view === 'chart') {
        drawChart();
      }
    }, 180);
  });
}

async function main() {
  const response = await fetch('/api/fingerings');
  const data = await response.json();
  state.diagram = data.diagram;
  state.instruments = data.instruments;
  state.range = data.range;
  state.chart = data.chart;
  state.fingerings = new Map(data.chart.map((entry) => [entry.midi, entry]));

  buildInstrumentToggle();
  wireEvents();
  showPanel('upload');
}

main();
