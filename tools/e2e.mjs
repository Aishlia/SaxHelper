/* End-to-end check: upload a PDF through the UI, step notes, edit a note,
   play a bar, and visit the chart. Fails on any console error. */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tools/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(process.env.BASE || 'http://127.0.0.1:8765', { waitUntil: 'networkidle' });

const file = process.env.PDF || '/tmp/test_two_page.pdf';
await page.setInputFiles('#fileInput', file);
await page.waitForSelector('#progressCard:not([hidden])');
const firstMessage = await page.textContent('#progressMessage');
await page.waitForSelector('#player:not([hidden])', { timeout: 300000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/e1-pdf-loaded.png` });

const initial = await page.textContent('#noteName');
await page.click('#nextBtn');
await page.click('#nextBtn');
const stepped = await page.textContent('#noteName');

await page.click('#octaveDown');
const afterEdit = await page.textContent('#noteName');
const resetLabel = await page.textContent('#resetEdits');
await page.click('#resetEdits');
const afterReset = await page.textContent('#noteName');

await page.click('#metronomeToggle');
await page.click('#playBtn');
await page.waitForTimeout(2600);
const whilePlaying = await page.textContent('#noteCounter');
await page.screenshot({ path: `${OUT}/e2-playing.png` });
await page.click('#playBtn');

await page.click('#originalBtn');
await page.waitForTimeout(900);
const pageImages = await page.evaluate(() => [...document.querySelectorAll('#originalPages img')]
  .map((img) => ({ src: img.getAttribute('src'), loaded: img.naturalWidth > 0 })));
await page.screenshot({ path: `${OUT}/e4-original-modal.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const modalClosed = await page.locator('#originalModal').isHidden();

await page.click('.tab[data-view="chart"]');
await page.waitForTimeout(600);
for (let i = 0; i < 32; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
const topNote = await page.textContent('#chartNoteName');
const topDesc = await page.textContent('#chartDesc');
await page.screenshot({ path: `${OUT}/e3-chart-top.png`, fullPage: true });

await browser.close();

console.log(JSON.stringify({
  firstMessage, initial, stepped, afterEdit, resetLabel, afterReset,
  whilePlaying, pageImages, modalClosed, topNote, topDesc,
}, null, 2));
if (errors.length) { console.log('\nERRORS\n' + errors.join('\n')); process.exitCode = 1; }
