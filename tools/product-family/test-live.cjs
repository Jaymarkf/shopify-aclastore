const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const directory = path.resolve('product-import/product-family');
const requireTools = createRequire(path.join(process.env.TEMP, 'acla-product-tools/package.json'));
const { chromium } = requireTools('playwright');
const state = JSON.parse(fs.readFileSync(path.join(directory, 'admin-setup-result.json')));
const results = [];
const check = (name, result = true) => { assert.ok(result, name); results.push(name); console.log('PASS: ' + name); };
let browser;
let page;
let ownsCart = false;
let testLines = [];
const base = process.argv[2] || 'http://127.0.0.1:9494';
const ajax = (url, body) => page.evaluate(async ({ url, body }) => {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}, { url, body });
(async () => {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/products/' + state.parentHandle, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('acla-product-family')?.controller);
  check('Shopify renders all 40 assigned individual products', await page.locator('[data-family-item]').count() === 40);
  check('Zero is available in the real group', await page.locator('[data-family-item][data-name="Zero"]').count() === 1);
  const initial = await ajax('/cart.js');
  check('Test browser has its own initially empty cart', initial.status === 200 && initial.data.item_count === 0);
  ownsCart = true;
  const choices = await page.locator('[data-family-item][data-available="true"]').evaluateAll(nodes => nodes.filter(node => !node.hasAttribute('data-stock') || Number(node.dataset.stock) >= 2).slice(0, 2).map(node => ({ id: node.dataset.variantId, name: node.dataset.name, productId: node.dataset.productId })));
  check('Two independently stocked colors can be purchased', choices.length === 2 && choices[0].id !== choices[1].id);
  await page.screenshot({ path: path.join(directory, 'live-desktop-top.png') });
  await page.locator('.acla-family__shop').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 150));
  await page.screenshot({ path: path.join(directory, 'live-desktop-colors.png') });
  await page.locator('[data-family-search]').fill('Zero');
  check('Search works with the real Shopify product data', await page.locator('[data-family-item]:visible').count() === 1);
  await page.locator('[data-family-search]').fill('');
  await page.locator('[data-family-view="list"]').click();
  check('Real list view shows SKU information', await page.locator('.acla-family__item-sku').first().isVisible());
  await page.locator('[data-family-view="grid"]').click();
  for (const choice of choices) await page.locator('[data-family-item][data-variant-id="' + choice.id + '"] [data-quantity-step="1"]').click();
  const added = page.waitForResponse(response => response.url().includes('/cart/add.js') && response.request().method() === 'POST');
  await page.locator('[data-add-selected]').click();
  const response = await added;
  check('Shopify accepts the mixed-product cart request', response.ok());
  await page.waitForFunction(() => !document.querySelector('acla-product-family').pending);
  const cart = (await ajax('/cart.js')).data;
  testLines = cart.items;
  check('The real cart contains two separate products', cart.item_count === 2 && cart.items.length === 2 && choices.every(choice => cart.items.some(item => String(item.variant_id) === choice.id && String(item.product_id) === choice.productId && item.quantity === 1)));
  check('The parent display product is not in the cart', cart.items.every(item => String(item.variant_id) !== state.parentVariantId.split('/').pop()));
  await page.waitForFunction(() => [...document.querySelectorAll('.cart-bubble__text-count')].some(node => node.textContent.trim() === '2'));
  check('Horizon cart badge updates through the native cart event');
  const drawer = page.locator('cart-drawer-component');
  if (await drawer.count()) {
    check('Native cart drawer receives both product rows', await drawer.locator('[data-key]').count() >= 2);
    await page.screenshot({ path: path.join(directory, 'live-cart-drawer.png') });
    await page.evaluate(() => document.querySelector('cart-drawer-component')?.closest('theme-drawer')?.close());
  }
  const parentRejected = await ajax('/cart/add.js', { items: [{ id: Number(state.parentVariantId.split('/').pop()), quantity: 1 }] });
  check('Shopify prevents purchasing the display-only parent', parentRejected.status === 422);
  const after = (await ajax('/cart.js')).data;
  check('Rejected parent does not alter the child-product cart', after.item_count === 2 && after.items.length === 2);
  await page.locator('[data-family-item][data-variant-id="' + choices[0].id + '"] [data-select-color]').click();
  check('Color preview opens on the real page', (await page.locator('[data-selected-name]').innerText()) === choices[0].name);
  await page.screenshot({ path: path.join(directory, 'live-color-preview.png') });
  await page.locator('[data-close-selection]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  check('Real page has no horizontal overflow on mobile', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(directory, 'live-mobile-top.png') });
  await page.locator('.acla-family__shop').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 150));
  await page.screenshot({ path: path.join(directory, 'live-mobile-colors.png') });
  await page.locator('[data-family-view="list"]').click();
  check('Real mobile list view fits the viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('No JavaScript runtime errors on the real page', errors.length === 0);
  fs.writeFileSync(path.join(directory, 'live-browser-tests.json'), JSON.stringify({ status: 'passed', url: state.productUrl, checks: results, errors, cartTest: 'Two separate individual products were added in an isolated test browser; no orders were placed.' }, null, 2));
})().catch(error => { console.error(error); fs.writeFileSync(path.join(directory, 'live-browser-tests.json'), JSON.stringify({ status: 'failed', checks: results, error: error.message }, null, 2)); process.exitCode = 1; }).finally(async () => {
  if (page && ownsCart) {
    try {
      for (const line of testLines) await ajax('/cart/change.js', { id: line.key, quantity: 0 });
      const cleared = await ajax('/cart.js');
      assert.equal(cleared.data.item_count, 0);
      console.log('Isolated test cart emptied and verified.');
      const reportPath = path.join(directory, 'live-browser-tests.json');
      const report = JSON.parse(fs.readFileSync(reportPath));
      report.testCartEmptied = true;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }
    catch (error) { console.error('Test cart cleanup: ' + error.message); }
  }
  if (browser) await browser.close();
});
