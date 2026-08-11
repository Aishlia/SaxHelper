/* Dev helper: high-DPI crops of the fingering diagram and the first staff. */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tools/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 980 },
  deviceScaleFactor: 2,
});
await page.goto(process.env.BASE || 'http://127.0.0.1:8765', { waitUntil: 'networkidle' });
await page.click('#sampleBtn');
await page.waitForSelector('#player:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(600);

const target = process.env.NOTE ? Number(process.env.NOTE) : 3;
for (let i = 3; i < target; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);

await page.locator('.fingering-panel').screenshot({ path: `${OUT}/z-diagram.png` });
await page.locator('#score .score-line').first().screenshot({ path: `${OUT}/z-staff.png` });

if (process.env.LABELS) {
  await page.click('#labelsToggle');
  await page.waitForTimeout(300);
  await page.locator('.fingering-panel').screenshot({ path: `${OUT}/z-diagram-labels.png` });
}

await browser.close();
console.log('ok');
