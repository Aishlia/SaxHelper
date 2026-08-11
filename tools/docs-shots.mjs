/* Dev helper: capture the screenshots used in the README. */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const OUT = 'docs';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1360, height: 880 },
  deviceScaleFactor: 2,
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('#sampleBtn');
await page.waitForSelector('#player:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(900);

// Step onto a note with a full fingering, so the diagram has something to show.
for (let i = 0; i < 7; i += 1) await page.keyboard.press('ArrowRight');
// Park the pointer clear of the staff, otherwise a note keeps its hover tint.
await page.mouse.move(1340, 12);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/player.png` });

await page.click('#labelsToggle');
await page.waitForTimeout(300);
await page.screenshot({
  path: `${OUT}/key-names.png`,
  clip: { x: 16, y: 82, width: 380, height: 618 },
});
await page.click('#labelsToggle');

await page.click('.tab[data-view="chart"]');
for (let i = 0; i < 9; i += 1) await page.keyboard.press('ArrowRight');
// The chart is taller than the player, so give it a window that fits both staves.
await page.setViewportSize({ width: 1360, height: 1150 });
await page.mouse.move(1340, 12);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/chart.png` });

await browser.close();
console.log('wrote docs/player.png, docs/key-names.png, docs/chart.png');
