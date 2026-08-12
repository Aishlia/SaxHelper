/* Dev helper: exercise the practice page — drill switching, staff layout,
   diagram grids, playback and keyboard stepping. */

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
await page.click('.tab[data-view="practice"]');
await page.waitForTimeout(600);

const state = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('#drillGrid .note-card')];
  const btn = document.getElementById('drillPlay');
  return {
    name: document.getElementById('drillName').textContent,
    key: document.getElementById('drillKey').innerText,
    cards: cards.length,
    staves: document.querySelectorAll('#drillStaff .score-line').length,
    step: cards.findIndex((card) => card.classList.contains('is-current')),
    playing: btn.classList.contains('is-playing'),
    drills: document.querySelectorAll('.drill-item').length,
    groups: document.querySelectorAll('.drill-group').length,
  };
});

// A notehead outside its SVG means a low or high note is being clipped.
const clipped = () => page.evaluate(() => {
  const bad = [];
  for (const svg of document.querySelectorAll('#drillStaff svg')) {
    const box = svg.getBoundingClientRect();
    for (const shape of svg.querySelectorAll('path, rect')) {
      const r = shape.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) bad.push(shape.tagName);
    }
  }
  return bad;
});

const report = {};
for (const [drill, shot] of [
  ['long-tones', 'p1-long-tones'],
  ['major-bb', 'p2-bb-major'],
  ['chromatic-octave', 'p3-chromatic'],
  ['major-c-2oct', 'p4-two-octave'],
  // The highest drill on the page: its staff needs room for three ledger lines.
  ['two-five-one', 'p5-jazz-251'],
  ['bebop-dominant', 'p6-bebop'],
]) {
  await page.click(`.drill-item[data-drill="${drill}"]`);
  await page.waitForTimeout(450);
  await page.mouse.move(1420, 12);
  await page.screenshot({ path: `${OUT}/${shot}.png` });
  report[drill] = { ...(await state()), clipped: await clipped() };
}

// Playback should walk the highlight along and stop by itself at the end.
await page.click('.drill-item[data-drill="arp-c"]');
await page.waitForTimeout(300);
await page.click('#drillPlay');
await page.waitForTimeout(1400);
report.midPlay = await state();
await page.waitForTimeout(4400);
report.afterPlay = await state();

await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowLeft');
report.stepped = (await state()).step;

// Switching views and back has to leave the drill measured for its real width.
await page.click('.tab[data-view="song"]');
await page.click('.tab[data-view="practice"]');
await page.waitForTimeout(500);
report.roundTrip = await state();

await browser.close();
console.log(JSON.stringify(report, null, 1));
if (errors.length) {
  console.log('\nERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
