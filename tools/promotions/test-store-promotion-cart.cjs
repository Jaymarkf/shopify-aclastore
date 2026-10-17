const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const requireTools = createRequire(path.join(process.env.TEMP, 'acla-product-tools/package.json'));
const { chromium } = requireTools('playwright');
const directory = path.resolve('product-import/product-family/promotion');
const family = JSON.parse(fs.readFileSync(path.resolve('product-import/product-family/admin-setup-result.json')));
const choices = [family.products[0], family.products.find(product => product.sku === 'OMB-ZERO')];
const numericId = value => value.split('/').pop();
const checks = [];
let ownsCart = false;
let page;
const ajax = (url, body) => page.evaluate(async ({ url, body }) => {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}, { url, body });
const check = (name, passed) => { assert.ok(passed, name); checks.push(name); console.log('PASS: ' + name); };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const base = process.argv[2] || 'http://127.0.0.1:9292';
  const row = product => page.locator('[data-family-item][data-product-id="' + numericId(product.id) + '"]');
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/products/' + family.parentHandle, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('acla-product-family')?.controller && customElements.get('acla-cart-status'));
    const title = await page.locator('acla-product-family h1').evaluate(element => ({ size: parseFloat(getComputedStyle(element).fontSize), weight: getComputedStyle(element).fontWeight }));
    check('Product title is smaller and bold', title.size <= 29 && title.weight === '700');
    check('Admin-managed Save 50% badge appears after the parent price', (await page.locator('.acla-family__hero-price .acla-promotion-badge').innerText()) === 'Save 50%');
    const initial = await ajax('/cart.js');
    check('Isolated browser starts with an empty cart', initial.data?.item_count === 0);
    ownsCart = true;
    for (const product of choices) await row(product).locator('[data-quantity-step="1"]').click();
    await page.locator('[data-add-selected]').click();
    await page.waitForFunction(() => !document.querySelector('acla-product-family').pending);
    await page.keyboard.press('Escape');
    const cart = (await ajax('/cart.js')).data;
    check('Two colors are added as separate cart items', cart.items.length === 2 && choices.every(product => cart.items.some(line => String(line.product_id) === numericId(product.id))));
    check('Shopify automatically discounts both $4.10 colors to $2.05', cart.items.every(line => line.original_price === 410 && line.final_price === 205));
    check('Discounted total is $4.10 for two colors', cart.total_price === 410);
    check('Real cart allocations name the OLO automatic discount', cart.items.every(line => line.line_level_discount_allocations.some(allocation => allocation.discount_application.title === 'OLO Brush Save 50%')));
    for (const product of choices) {
      await row(product).locator('acla-cart-status').waitFor({ state: 'visible' });
      check(product.sku + ': in-cart quantity and check mark persist after adding', (await row(product).locator('acla-cart-status').innerText()).includes('1') && await row(product).locator('.acla-family__selected-mark').isVisible() && await row(product).locator('[data-family-quantity]').inputValue() === '0');
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(directory, 'store-promo-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    check('Title and promo fit mobile width', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('[data-family-search]').fill('Zero');
    await page.locator('[data-family-view="list"]').click();
    check('Mobile list fits with the persistent cart badge', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(directory, 'store-cart-status-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.goto(base + '/products/' + choices[0].handle, { waitUntil: 'domcontentloaded' });
    const productBadge = page.locator('product-price[data-product-id="' + numericId(choices[0].id) + '"] acla-cart-status').first();
    await productBadge.waitFor({ state: 'visible' });
    check('Normal product page shows its existing cart quantity', (await productBadge.innerText()).includes('1'));
    await page.goto(base + '/collections/olo-brush-promotion', { waitUntil: 'domcontentloaded' });
    const parentCard = page.locator('product-card[data-product-id="' + numericId(family.parentId) + '"]').first();
    await parentCard.locator('.acla-card-cart-status acla-cart-status').waitFor({ state: 'visible' });
    check('Category product card totals the two linked cart colors', (await parentCard.locator('.acla-card-cart-status').innerText()).includes('2'));
    check('Category card shows one visible in-cart indicator', await parentCard.locator('acla-cart-status:visible').count() === 1);
    await page.screenshot({ path: path.join(directory, 'store-category-cart-status.png') });
    await page.goto(base + '/search?q=' + encodeURIComponent(choices[0].sku) + '&type=product', { waitUntil: 'domcontentloaded' });
    const searchCard = page.locator('product-card[data-product-id="' + numericId(choices[0].id) + '"]').first();
    await searchCard.locator('.acla-card-cart-status acla-cart-status').waitFor({ state: 'visible' });
    check('Search product card shows existing cart quantity', (await searchCard.locator('.acla-card-cart-status').innerText()).includes('1'));
    await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' });
    const quantity = page.locator('main cart-quantity-selector-component[data-variant-id="' + numericId(choices[0].variantId) + '"]');
    const changed = page.waitForResponse(response => response.request().method() === 'POST' && response.url().includes('/cart/change'));
    await quantity.locator('button[name="plus"]').click();
    await changed;
    await page.waitForFunction(id => document.querySelector('main cart-quantity-selector-component[data-variant-id="' + id + '"] input')?.value === '2', numericId(choices[0].variantId));
    await page.goto(base + '/products/' + family.parentHandle, { waitUntil: 'domcontentloaded' });
    await row(choices[0]).locator('acla-cart-status').waitFor({ state: 'visible' });
    check('Changing quantity in the normal cart persists on the family page', (await row(choices[0]).locator('acla-cart-status').innerText()).includes('2'));
    check('No storefront JavaScript runtime errors', errors.length === 0);
    const updates = Object.fromEntries(choices.map(product => [numericId(product.variantId), 0]));
    await ajax('/cart/update.js', { updates });
    const emptied = await ajax('/cart.js');
    const cleanupVerified = emptied.data?.item_count === 0;
    if (!cleanupVerified) console.log('NOTE: Development proxy did not confirm an empty cart after the isolated cleanup request.');
    ownsCart = false;
    fs.writeFileSync(path.join(directory, 'store-checks.json'), JSON.stringify({ status: 'passed', checks, errors, cleanupVerified, note: 'Fresh isolated cart; no orders placed. Shopify automatic-discount calculations verified. Cleanup verification is reported separately.' }, null, 2));
  } catch (error) {
    fs.writeFileSync(path.join(directory, 'store-checks.json'), JSON.stringify({ status: 'failed', checks, errors, error: error.message }, null, 2));
    throw error;
  } finally {
    if (ownsCart && page) {
      try { await ajax('/cart/update.js', { updates: Object.fromEntries(choices.map(product => [numericId(product.variantId), 0])) }); } catch {}
    }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
