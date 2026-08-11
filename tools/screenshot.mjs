/* Dev helper: drive the app in a headless browser and take screenshots so the
   rendering can be checked without opening a window. */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const OUT = 'tools/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/1-upload.png` });

await page.click('#sampleBtn');
await page.waitForSelector('#player:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/2-player.png` });

for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/3-note7.png` });

await page.click('#labelsToggle');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/4-labels.png`, clip: { x: 22, y: 86, width: 340, height: 560 } });

await page.click('#labelsToggle');
const songSummary = await page.evaluate(() => ({
  note: document.getElementById('noteName').textContent,
  desc: document.getElementById('fingeringDesc').textContent,
  meta: document.getElementById('scoreMeta').innerText,
  lines: document.querySelectorAll('#score .score-line').length,
  hits: document.querySelectorAll('#score .score-hit').length,
}));

await page.click('.tab[data-view="chart"]');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/5-chart.png`, fullPage: true });

for (let i = 0; i < 13; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/6-chart-bb.png`, fullPage: true });

await page.click('.tab[data-view="song"]');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/7-back-to-song.png` });

const summary = {
  song: songSummary,
  chartNote: await page.textContent('#chartNoteName'),
  chartDesc: await page.textContent('#chartDesc'),
  linesAfterReturn: await page.locator('#score .score-line').count(),
};

await browser.close();
console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.log('\nERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
