/* Saxophone fingering diagram: draws the key layout as SVG and fills in
   whichever keys are pressed, in the style of a printed fingering chart.
   Geometry comes from the backend so the fingering table and the drawing can
   never drift apart. */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function keyShape(key) {
  switch (key.shape) {
    case 'circle':
      return el('circle', { cx: key.cx, cy: key.cy, r: key.r });
    case 'ellipse': {
      const node = el('ellipse', { cx: key.cx, cy: key.cy, rx: key.rx, ry: key.ry });
      if (key.rotate) node.setAttribute('transform', `rotate(${key.rotate} ${key.cx} ${key.cy})`);
      return node;
    }
    case 'rect': {
      const node = el('rect', {
        x: key.x, y: key.y, width: key.w, height: key.h, rx: key.rx ?? 3,
      });
      if (key.rotate) {
        node.setAttribute('transform',
          `rotate(${key.rotate} ${key.x + key.w / 2} ${key.y + key.h / 2})`);
      }
      return node;
    }
    default: {
      const node = el('path', { d: key.d });
      if (key.transform) node.setAttribute('transform', key.transform);
      return node;
    }
  }
}

export function renderDiagram(diagram, pressedKeys, options = {}) {
  const { showLabels = false } = options;
  const pressed = new Set(pressedKeys || []);

  // Key names hang off both sides, so widen the canvas when they are shown.
  // The drawing scales to whatever box CSS gives it, keeping its aspect ratio.
  const padX = showLabels ? 46 : 6;
  const padY = 10;
  const svg = el('svg', {
    class: 'sax-diagram',
    viewBox: `${-padX} ${-padY} ${diagram.width + padX * 2} ${diagram.height + padY * 2}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
  });

  for (const key of diagram.keys) {
    const isPressed = pressed.has(key.id);
    const group = el('g', {
      class: `sax-key ${isPressed ? 'is-pressed' : ''}`,
      'data-key': key.id,
    });

    const shape = keyShape(key);
    shape.setAttribute('class', 'sax-key-shape');
    group.appendChild(shape);

    const title = el('title');
    title.textContent = `${key.label} — ${key.hand === 'L' ? 'left' : 'right'} hand, ${key.finger}`;
    group.appendChild(title);

    if (showLabels && key.anchor) {
      const [x, y] = key.anchor;
      const inside = key.side === 'in';
      const label = el('text', {
        x,
        y: inside ? y + 5 : y,
        class: `sax-key-label is-${key.side}`,
      });
      label.textContent = key.label;
      group.appendChild(label);
    }

    svg.appendChild(group);
  }

  if (showLabels) {
    for (const [text, y] of [['LEFT HAND', 8], ['RIGHT HAND', 214]]) {
      const label = el('text', {
        x: diagram.width + padX - 4, y, class: 'sax-hand-label',
      });
      label.textContent = text;
      svg.appendChild(label);
    }
  }

  return svg;
}

const FINGER_ORDER = ['thumb', '1st (index)', '1st (index, side)', '2nd (middle)',
  '3rd (ring)', '3rd (ring, side)', '4th (pinky)', 'palm', 'index (roll up)'];

export function describeFingering(diagram, pressedKeys) {
  const pressed = new Set(pressedKeys || []);
  if (pressed.size === 0) return 'All keys open';

  const byHand = { L: [], R: [] };
  for (const key of diagram.keys) {
    if (pressed.has(key.id)) byHand[key.hand].push(key);
  }
  const parts = [];
  for (const [hand, name] of [['L', 'Left'], ['R', 'Right']]) {
    const keys = byHand[hand];
    if (!keys.length) continue;
    keys.sort((a, b) => FINGER_ORDER.indexOf(a.finger) - FINGER_ORDER.indexOf(b.finger));
    parts.push(`${name}: ${keys.map((k) => k.label).join(', ')}`);
  }
  return parts.join('  •  ');
}
