const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const requireTools = createRequire(path.join(process.env.TEMP, 'acla-product-tools/package.json'));
const { chromium } = requireTools('playwright');
const directory = path.resolve('product-import/product-family');
const checks = [];
const check = (name, passed) => { assert.ok(passed, name); checks.push(name); console.log('PASS: ' + name); };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.argv[2] || 'http://127.0.0.1:9292') + '/products/olo-premium-markers-brush', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-description-wrap]')?.dataset.collapsible === 'true');
    check('Shopify preview renders all 40 individual products', await page.locator('[data-family-item]').count() === 40);
    check('Admin description retains its five opening bullets under the price', await page.locator('.acla-family__intro [data-description-content] ul:first-child li').count() === 5 || await page.locator('.acla-family__intro [data-description-content] li').count() === 5);
    check('Product details tab is absent', await page.locator('.acla-family__tabs a[href*="FamilyDetails"],.acla-family__details').count() === 0);
    await page.screenshot({ path: path.join(directory, 'local-description-collapsed.png') });
    await page.locator('[data-description-toggle]').click();
    await page.waitForFunction(() => {
      const window = document.querySelector('[data-description-window]');
      return window.getBoundingClientRect().height > 190 && Math.abs(window.getBoundingClientRect().height - window.scrollHeight) < 2;
    });
    check('Read more exposes the full Shopify description', await page.locator('[data-description-toggle]').getAttribute('aria-expanded') === 'true');
    await page.screenshot({ path: path.join(directory, 'local-description-expanded.png'), fullPage: true });
    await page.locator('[data-description-toggle]').click();
    await page.waitForFunction(() => document.querySelector('[data-description-window]').getBoundingClientRect().height <= 191);
    check('Show less restores the compact description', await page.locator('[data-description-toggle]').getAttribute('aria-expanded') === 'false');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    check('Collapsed mobile page fits the viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('[data-description-toggle]').click();
    await page.waitForFunction(() => {
      const window = document.querySelector('[data-description-window]');
      return Math.abs(window.getBoundingClientRect().height - window.scrollHeight) < 2;
    });
    check('Expanded mobile description fits the viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('[data-description-toggle]').click();
    await page.waitForFunction(() => document.querySelector('[data-description-window]').getBoundingClientRect().height <= 191);
    await page.locator('[data-family-search]').fill('Zero');
    check('Color search still filters to Zero', await page.locator('[data-family-item]:visible').count() === 1);
    await page.screenshot({ path: path.join(directory, 'local-mobile-description.png'), fullPage: true });
    check('No browser runtime errors', errors.length === 0);
    fs.writeFileSync(path.join(directory, 'local-description-checks.json'), JSON.stringify({ status: 'passed', checks, errors, note: 'Real local Shopify preview. No cart or admin mutations.' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
