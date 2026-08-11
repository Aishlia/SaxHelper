/* Dev helper: check both fingering chart modes — one note at a time against the
   chromatic staves, and the whole written range as a wall of diagrams. */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const OUT = 'tools/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });

const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('.tab[data-view="chart"]');
await page.waitForTimeout(700);
await page.mouse.move(1420, 12);

const snapshot = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('#chartGrid .note-card')];
  const panel = document.getElementById('chartPanel');
  const highlight = document.getElementById('chartHighlight');
  return {
    mode: document.querySelector('#chartMode .pill.is-active').dataset.mode,
    note: document.getElementById('chartNoteName').textContent,
    concert: document.getElementById('chartNoteConcert').textContent,
    desc: document.getElementById('chartDesc').textContent,
    // The single-note view: one big diagram plus the two chromatic staves.
    bigDiagrams: document.querySelectorAll('#chartDiagramRow .sax-diagram').length,
    staves: document.querySelectorAll('#chartRows .score-line').length,
    highlighted: !highlight.hidden,
    // The wall: one card per note, alternates side by side, rows lined up.
    cards: cards.length,
    withAlternates: cards.filter((card) => card.classList.contains('is-wide')).length,
    gridDiagrams: document.querySelectorAll('#chartGrid .sax-diagram').length,
    diagramRows: [...new Set([...document.querySelectorAll('#chartGrid .sax-diagram')]
      .map((svg) => Math.round(svg.getBoundingClientRect().top)))].length,
    current: cards.findIndex((card) => card.classList.contains('is-current')),
    fitsWindow: panel.getBoundingClientRect().bottom <= window.innerHeight,
    panelHeight: Math.round(panel.getBoundingClientRect().height),
  };
});

const report = { default: await snapshot() };
await page.screenshot({ path: `${OUT}/c1-chart-one.png`, fullPage: true });

for (let i = 0; i < 32; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
report.oneTopOfRange = await snapshot();
await page.screenshot({ path: `${OUT}/c2-chart-one-top.png`, fullPage: true });

await page.click('#chartMode .pill[data-mode="all"]');
await page.waitForTimeout(600);
await page.mouse.move(1420, 12);
report.allNotes = await snapshot();
await page.screenshot({ path: `${OUT}/c3-chart-all.png`, fullPage: true });

await page.click('#chartGrid .note-card:nth-child(5)');
await page.waitForTimeout(200);
report.allClicked = await snapshot();

// Back to the default, and the staves have to be measured for their real width.
await page.click('#chartMode .pill[data-mode="one"]');
await page.waitForTimeout(500);
report.backToOne = await snapshot();

await browser.close();
console.log(JSON.stringify(report, null, 1));
if (errors.length) {
  console.log('\nERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
