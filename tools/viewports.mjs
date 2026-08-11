/* Dev helper: check the fixed layout survives small and short windows. */

import { chromium } from 'playwright';

const sizes = [
  { name: 'short', width: 1280, height: 620 },
  { name: 'laptop', width: 1440, height: 900 },
  { name: 'narrow', width: 900, height: 820 },
];

const browser = await chromium.launch();
const results = [];

for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.BASE || 'http://127.0.0.1:8765', { waitUntil: 'networkidle' });
  await page.click('#sampleBtn');
  await page.waitForSelector('#player:not([hidden])', { timeout: 120000 });
  await page.waitForTimeout(600);

  const transport = await page.locator('.transport').boundingBox();
  results.push({
    ...size,
    transportBottom: Math.round(transport.y + transport.height),
    transportVisibleInWindow: transport.y + transport.height <= size.height + 1,
    diagramHeight: Math.round((await page.locator('.diagram-card .sax-diagram').first().boundingBox()).height),
    errors,
  });
  await page.screenshot({ path: `tools/shots/v-${size.name}.png` });

  await page.click('.tab[data-view="chart"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tools/shots/v-${size.name}-chart.png` });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
