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

// The practice page is taller than the player, so it gets a window that fits
// the whole drill.
await page.click('.tab[data-view="practice"]');
await page.click('.drill-item[data-drill="major-g"]');
await page.setViewportSize({ width: 1360, height: 1080 });
await page.mouse.move(1340, 12);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/practice.png` });

// The chart in its default mode: one note, big, against the chromatic staves.
await page.click('.tab[data-view="chart"]');
for (let i = 0; i < 9; i += 1) await page.keyboard.press('ArrowRight');
await page.setViewportSize({ width: 1360, height: 1180 });
await page.mouse.move(1340, 12);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/chart.png` });

// And the wall: wide enough that the whole range lands in three rows.
await page.click('#chartMode .pill[data-mode="all"]');
await page.setViewportSize({ width: 1440, height: 940 });
await page.mouse.move(1420, 12);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/chart-all.png` });

await browser.close();
console.log('wrote docs/player.png, docs/key-names.png, docs/practice.png, '
  + 'docs/chart.png, docs/chart-all.png');
