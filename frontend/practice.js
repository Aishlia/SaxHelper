/* The practice page: a library of warm-ups, scales, arpeggios and patterns.
   Each drill is laid out as one fingering diagram per note, all on screen at
   once, so a whole scale can be read the way a printed chart reads. */

import { renderNoteRow } from './score.js';
import { renderNoteCards } from './notegrid.js';

const MAX_PER_STAFF = 16;

export function renderDrillList(container, groups, selectedId, onSelect) {
  container.innerHTML = '';
  for (const group of groups) {
    const heading = document.createElement('h3');
    heading.className = 'drill-group';
    heading.textContent = group.name;
    container.appendChild(heading);

    for (const drill of group.drills) {
      const button = document.createElement('button');
      button.className = `drill-item ${drill.id === selectedId ? 'is-active' : ''}`;
      button.textContent = drill.name;
      button.dataset.drill = drill.id;
      button.addEventListener('click', () => onSelect(drill.id));
      container.appendChild(button);
    }
  }
}

/** Split a drill across staves of roughly equal length rather than leaving a
    stray note on a line of its own. */
function staffChunks(notes) {
  const rows = Math.ceil(notes.length / MAX_PER_STAFF);
  const size = Math.ceil(notes.length / rows);
  const chunks = [];
  for (let i = 0; i < notes.length; i += size) chunks.push(notes.slice(i, i + size));
  return chunks;
}

export function renderDrillStaff(container, drill) {
  container.innerHTML = '';
  for (const chunk of staffChunks(drill.notes)) {
    // Tighter than the reference chart's rows: a drill can need three of them
    // and the diagrams below are the part worth the space. VexFlow already
    // reserves room above the staff, so the row starts near the top.
    renderNoteRow(container, chunk, { fifths: drill.fifths, height: 134, staveY: 4 });
  }
}

/** Draw the diagram for every note in the drill. Returns the card elements so
    the caller can mark which one is sounding. */
/** Draw the diagram for every note in the drill. */
export function renderDrillNotes(container, drill, deps) {
  const { fingeringFor, noteLabel } = deps;
  const flats = drill.fifths < 0;
  return renderNoteCards(container, drill.notes.map((midi) => ({
    label: noteLabel(midi, flats),
    options: fingeringFor(midi).options,
  })), { diagram: deps.diagram, onSelect: deps.onSelect });
}
