/* Dev helper: check the fingering chart draws the whole written range as one
   wall of diagrams, with alternates side by side. */

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
  const grid = document.getElementById('chartGrid');
  const panel = document.querySelector('.chart-panel');
  return {
    cards: cards.length,
    withAlternates: cards.filter((card) => card.classList.contains('is-wide')).length,
    diagrams: document.querySelectorAll('#chartGrid .sax-diagram').length,
    // Diagrams in a row have to line up, whether or not the note has a
    // second name or a caption under it.
    diagramTops: [...new Set([...document.querySelectorAll('#chartGrid .sax-diagram')]
      .map((svg) => Math.round(svg.getBoundingClientRect().top)))].length,
    note: document.getElementById('chartNoteName').textContent,
    concert: document.getElementById('chartNoteConcert').textContent,
    desc: document.getElementById('chartDesc').textContent,
    current: cards.findIndex((card) => card.classList.contains('is-current')),
    fitsWindow: panel.getBoundingClientRect().bottom <= window.innerHeight,
    gridHeight: Math.round(grid.getBoundingClientRect().height),
  };
});

const report = { initial: await snapshot() };
await page.screenshot({ path: `${OUT}/c1-chart.png`, fullPage: true });

for (let i = 0; i < 32; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
report.topOfRange = await snapshot();

await page.click('#chartGrid .note-card:nth-child(5)');
await page.waitForTimeout(200);
report.clicked = await snapshot();

await browser.close();
console.log(JSON.stringify(report, null, 1));
if (errors.length) {
  console.log('\nERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
