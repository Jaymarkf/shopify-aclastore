const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const directory = path.resolve('product-import/product-family');
const requireTools = createRequire(path.join(process.env.TEMP, 'acla-product-tools/package.json'));
const { chromium } = requireTools('playwright');
(async () => {
  const state = JSON.parse(fs.readFileSync(path.join(directory, 'admin-setup-result.json')));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.argv[2] || state.productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('acla-product-family').waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: path.join(directory, 'live-desktop-top.png') });
    const result = { url: page.url(), title: await page.title(), cards: await page.locator('[data-family-item]').count(),
      text: (await page.locator('body').innerText()).slice(0, 5000), errors,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
    fs.writeFileSync(path.join(directory, 'live-inspection.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
