/* A wall of fingering diagrams, one card per note. The practice page uses it for
   a drill and the reference chart for the whole written range. */

import { renderDiagram } from './fingering.js';

/**
 * `items` are { label, sublabel, options } in reading order. Cards that show
 * more than one fingering take two columns, so every diagram on the page ends
 * up the same size. Returns the cards, for marking which note is current.
 */
export function renderNoteCards(container, items, config = {}) {
  const { diagram, onSelect, showAlternates = false } = config;
  container.innerHTML = '';

  return items.map((item, index) => {
    const card = document.createElement('button');
    card.className = 'note-card';
    card.type = 'button';

    const name = document.createElement('span');
    name.className = 'note-card-name';
    name.textContent = item.label;
    card.appendChild(name);

    // Always present, even when empty, so diagrams line up across a row
    // whether or not the note has a second name.
    const sub = document.createElement('span');
    sub.className = 'note-card-sub';
    sub.textContent = item.sublabel || '';
    card.appendChild(sub);

    const options = showAlternates ? item.options : item.options.slice(0, 1);
    const shown = options.length ? options : [{ name: '', keys: [] }];
    if (shown.length > 1) card.classList.add('is-wide');

    const row = document.createElement('div');
    row.className = 'note-card-row';
    for (const option of shown) {
      const figure = document.createElement('figure');
      figure.appendChild(renderDiagram(diagram, option.keys));
      const caption = document.createElement('figcaption');
      // Naming one fingering only helps when there is another to tell it from.
      caption.textContent = shown.length > 1 ? option.name : '';
      figure.appendChild(caption);
      row.appendChild(figure);
    }
    card.appendChild(row);

    if (onSelect) card.addEventListener('click', () => onSelect(index));
    container.appendChild(card);
    return card;
  });
}
