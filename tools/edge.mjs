/* Dev helper: push a note out of the saxophone's range and confirm the warning. */

import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(process.env.BASE || 'http://127.0.0.1:8765', { waitUntil: 'networkidle' });
await page.click('#sampleBtn');
await page.waitForSelector('#player:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(500);

const shots = {};
await page.click('#octaveUp');
await page.click('#octaveUp');
await page.click('#octaveUp');
await page.waitForTimeout(200);
shots.high = {
  note: await page.textContent('#noteName'),
  warning: await page.textContent('#fingeringWarning'),
  visible: await page.isVisible('#fingeringWarning'),
};
await page.locator('.fingering-panel').screenshot({ path: 'tools/shots/x-altissimo.png' });

await page.click('#octaveDown');
await page.click('#octaveDown');
await page.click('#octaveDown');
await page.waitForTimeout(200);
shots.low = {
  note: await page.textContent('#noteName'),
  warning: await page.textContent('#fingeringWarning'),
  visible: await page.isVisible('#fingeringWarning'),
};

await page.click('#resetEdits');
await page.waitForTimeout(200);
shots.afterReset = {
  note: await page.textContent('#noteName'),
  warningVisible: await page.isVisible('#fingeringWarning'),
};

await browser.close();
console.log(JSON.stringify(shots, null, 2));
if (errors.length) { console.log('ERRORS\n' + errors.join('\n')); process.exitCode = 1; }
