/* Dev helper: confirm the fingering panel and transport bar never move as you
   step through notes with different numbers of fingerings. */

import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 945 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(process.env.BASE || 'http://127.0.0.1:8765', { waitUntil: 'networkidle' });
await page.click('#sampleBtn');
await page.waitForSelector('#player:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(600);

const boxOf = async (selector) => {
  const box = await page.locator(selector).boundingBox();
  return box && Object.fromEntries(
    Object.entries(box).map(([k, v]) => [k, Math.round(v)]));
};

const samples = [];
for (let i = 0; i < 26; i += 1) {
  samples.push({
    note: (await page.textContent('#noteName')).trim(),
    options: await page.locator('.diagram-card').count(),
    panel: await boxOf('.fingering-panel'),
    transport: await boxOf('.transport'),
  });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(60);
}

const unique = (key) => [...new Set(samples.map((s) => JSON.stringify(s[key])))];
const panels = unique('panel');
const transports = unique('transport');

await page.click('#labelsToggle');
await page.waitForTimeout(250);
const labelled = { panel: await boxOf('.fingering-panel'), transport: await boxOf('.transport') };
await page.locator('.fingering-panel').screenshot({ path: 'tools/shots/s-labels.png' });

await browser.close();
console.log(JSON.stringify({
  notesSeen: samples.map((s) => `${s.note}:${s.options}`).join(' '),
  panelVariants: panels,
  transportVariants: transports,
  stable: panels.length === 1 && transports.length === 1,
  withLabels: labelled,
}, null, 2));
if (errors.length) { console.log('ERRORS\n' + errors.join('\n')); process.exitCode = 1; }
