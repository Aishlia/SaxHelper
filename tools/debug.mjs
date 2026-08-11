import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
await page.goto(process.env.BASE || 'http://127.0.0.1:8765', { waitUntil: 'networkidle' });
await page.click('#sampleBtn');
await page.waitForSelector('#player:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(600);

console.log(await page.evaluate(() => {
  const hit = document.querySelector('#score .score-hit');
  const style = getComputedStyle(hit);
  const stave = document.querySelector('#score svg');
  return {
    hitClass: hit.getAttribute('class'),
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    svgAttrs: [...stave.attributes].map((a) => `${a.name}=${a.value}`),
    parentOfHit: hit.parentElement.getAttribute('class'),
    sheetRules: [...document.styleSheets].map((s) => {
      try { return [...s.cssRules].filter((r) => r.selectorText?.includes('score-hit')).map((r) => r.cssText); } catch { return ['blocked']; }
    }).flat(),
  };
}));

await browser.close();
