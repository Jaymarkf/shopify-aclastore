const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const output = path.resolve('product-import/product-family');
const requireTools = createRequire(path.join(process.env.TEMP, 'acla-product-tools/package.json'));
const { chromium } = requireTools('playwright');
const fixture = JSON.parse(fs.readFileSync(path.join(output, 'fixture-products.json')));
const server = http.createServer((request, response) => {
  if (request.url === '/assets/acla-cart-status.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    return response.end(fs.readFileSync(path.resolve('assets/acla-cart-status.js')));
  }
  if (request.url === '/fixture-component.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    return response.end('export class Component extends HTMLElement { connectedCallback() {} disconnectedCallback() {} updatedCallback() {} }');
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(fs.readFileSync(path.join(output, 'preview.html')));
});
const results = [];
const check = (name, passed = true) => { assert.ok(passed, name); results.push(name); console.log('PASS: ' + name); };
let browser;
(async () => {
  await new Promise(resolve => server.listen(8991, '127.0.0.1', resolve));
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  let state = { quantities: {}, posts: [], mode: 'success', getCalls: 0 };
  const cart = () => {
    const items = Object.entries(state.quantities).filter(([, quantity]) => quantity > 0).map(([variantId, quantity]) => {
      const product = fixture.find(product => String(product.selected_or_first_available_variant.id) === variantId);
      return { id: Number(variantId), product_id: product.id, variant_id: Number(variantId), key: variantId + ':test', quantity,
        price: product.price, final_price: product.price, final_line_price: product.price * quantity, line_price: product.price * quantity,
        title: product.title, product_title: product.title, url: product.url, discounts: [], line_level_discount_allocations: [], properties: {}, requires_shipping: true };
    });
    return { token: 'test-cart', item_count: items.reduce((sum, item) => sum + item.quantity, 0), items,
      total_price: items.reduce((sum, item) => sum + item.line_price, 0), currency: 'USD', items_subtotal_price: items.reduce((sum, item) => sum + item.line_price, 0), cart_level_discount_applications: [], discount_codes: [], attributes: {} };
  };
  await context.route('**/cart.js', route => {
    state.getCalls++;
    if (state.mode === 'unknown' && state.posts.length) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(cart()) });
  });
  await context.route('**/cart/add.js', async route => {
    const payload = route.request().postDataJSON();
    state.posts.push(payload);
    if (state.mode === 'reject') return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ status: 422, description: 'The requested quantity is unavailable.' }) });
    const selected = state.mode === 'partial' ? payload.items.slice(0, 1) : payload.items;
    for (const item of selected) state.quantities[item.id] = (state.quantities[item.id] || 0) + (state.mode === 'partial' ? 1 : item.quantity);
    if (state.mode === 'unknown') return route.abort('failed');
    if (state.mode === 'partial') return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ status: 422, description: 'Stock changed.' }) });
    await new Promise(resolve => setTimeout(resolve, 100));
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: cart().items, sections: {} }) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const load = async () => {
    await page.goto('http://127.0.0.1:8991/products/olo-premium-markers-brush');
    await page.waitForFunction(() => customElements.get('acla-product-family'));
    await page.waitForFunction(() => customElements.get('acla-cart-status'));
  };
  await load();
  check('40 separate product cards render', await page.locator('[data-family-item]').count() === 40);
  check('Zero is included', await page.locator('[data-family-item][data-name="Zero"]').count() === 1);
  check('No horizontal overflow at desktop size', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('All image URLs resolve', await page.locator('[data-main-image]').evaluate(image => image.complete && image.naturalWidth > 0));
  check('Description is below the price and retains bullet formatting', await page.evaluate(() => {
    const price = document.querySelector('.acla-family__hero-price');
    const description = document.querySelector('[data-description-content]');
    return Boolean(price.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING) && description.querySelectorAll('li').length === 4 && price.parentElement.contains(description);
  }));
  check('Product details tab and duplicate description are removed', await page.locator('.acla-family__tabs a[href*="FamilyDetails"],.acla-family__details').count() === 0 && await page.locator('[data-description-content]').count() === 1);
  const descriptionButton = page.locator('[data-description-toggle]');
  const previewHeight = await page.locator('[data-description-window]').evaluate(element => element.getBoundingClientRect().height);
  check('Long description initially displays a compact formatted preview', await descriptionButton.isVisible() && (await descriptionButton.getAttribute('aria-expanded')) === 'false' && previewHeight <= 191);
  check('Clipped description links cannot receive keyboard focus', await page.locator('[data-description-content] a').evaluate(element => element.inert));
  await descriptionButton.click();
  check('Read more expands the full description in place', (await descriptionButton.getAttribute('aria-expanded')) === 'true' && (await descriptionButton.innerText()).includes('Show less') && await page.locator('[data-description-window]').evaluate(element => element.getBoundingClientRect().height > 190));
  check('Expanded description links are interactive', !(await page.locator('[data-description-content] a').evaluate(element => element.inert)));
  await descriptionButton.click();
  check('Show less collapses the description again', (await descriptionButton.getAttribute('aria-expanded')) === 'false' && await page.locator('[data-description-window]').evaluate(element => element.getBoundingClientRect().height <= 191));
  await page.screenshot({ path: path.join(output, 'preview-desktop-top.png') });
  await page.locator('.acla-family__shop').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'preview-desktop-colors.png') });
  await page.locator('[data-family-search]').fill('Zero');
  check('Color search filters to Zero', await page.locator('[data-family-item]:visible').count() === 1);
  await page.locator('[data-family-search]').fill('not-a-color');
  check('Empty search provides a reset', await page.locator('[data-empty-results]').isVisible());
  await page.locator('[data-clear-filters]').click();
  check('Clearing search restores all 40 products', await page.locator('[data-family-item]:visible').count() === 40);
  await page.locator('[data-family-view="list"]').click();
  check('List view shows SKU column', await page.locator('.acla-family__item-sku').first().isVisible());
  await page.locator('[data-family-sort]').selectOption('name');
  const names = await page.locator('[data-family-item]').evaluateAll(items => items.map(item => item.dataset.name));
  check('Alphabetical sorting works', JSON.stringify(names) === JSON.stringify([...names].sort((a, b) => a.localeCompare(b, 'en-US'))));
  await page.locator('[data-family-view="grid"]').click();
  const targets = await page.locator('[data-family-item][data-available="true"]').evaluateAll(items => items.filter(item => Number(item.dataset.stock) >= 3).slice(0, 2).map(item => ({ id: item.dataset.variantId, name: item.dataset.name, price: Number(item.dataset.price) })));
  check('At least two sample colors have available stock', targets.length === 2);
  const row = id => page.locator('[data-family-item][data-variant-id="' + id + '"]');
  await row(targets[0].id).locator('[data-quantity-step="1"]').click();
  await row(targets[0].id).locator('[data-quantity-step="1"]').click();
  await row(targets[1].id).locator('[data-quantity-step="1"]').click();
  check('Subtotal sums quantities across independent products', (await page.locator('[data-selected-total]').innerText()) === '$' + ((targets[0].price * 2 + targets[1].price) / 100).toFixed(2));
  await page.locator('[data-family-search]').fill(targets[0].name);
  check('Filtering retains the hidden color selection', (await page.locator('[data-selected-count]').innerText()).includes('3'));
  await page.locator('[data-add-selected]').click();
  await page.waitForFunction(() => !document.querySelector('acla-product-family').pending);
  check('Mixed cart request uses the two real item IDs', state.posts.length === 1 && state.posts[0].items.length === 2 && state.posts[0].items.some(item => String(item.id) === targets[0].id && item.quantity === 2) && state.posts[0].items.some(item => String(item.id) === targets[1].id && item.quantity === 1));
  check('The parent product is never added to the cart', state.posts.every(post => post.items.every(item => item.id !== 999999)));
  check('Successful additions clear the selected quantities', (await page.locator('[data-selected-count]').innerText()).endsWith('0'));
  check('Success feedback includes a cart link', await page.locator('[data-family-feedback] a[href="/cart"]').isVisible());
  await page.waitForFunction(id => document.querySelector('[data-family-item][data-variant-id="' + id + '"] acla-cart-status')?.dataset.cartQuantity === '2', targets[0].id);
  check('Added product keeps its check mark after the quantity selector resets', await row(targets[0].id).locator('.acla-family__selected-mark').isVisible() && await row(targets[0].id).locator('[data-family-quantity]').inputValue() === '0');
  check('In-cart badge shows the actual quantity', (await row(targets[0].id).locator('acla-cart-status').innerText()).includes('2'));
  check('Group header sums cart quantities across its individual products', (await page.locator('.acla-family__hero-price acla-cart-status').innerText()).includes('3'));
  check('Reduced motion skips flying cart animations', await page.locator('.acla-family__cart-flight').count() === 0);
  await page.locator('[data-family-search]').fill('');
  await row(targets[0].id).locator('[data-select-color]').click();
  check('Color preview opens with the matching label and SKU', (await page.locator('[data-selected-name]').innerText()) === targets[0].name && (await page.locator('[data-selected-sku]').innerText()).startsWith('OMB-'));
  await page.locator('[data-add-single]').click();
  await page.waitForFunction(() => !document.querySelector('acla-product-family').pending);
  check('Individual add targets only the selected color', state.posts.length === 2 && state.posts[1].items.length === 1 && String(state.posts[1].items[0].id) === targets[0].id);
  await load();
  await page.waitForFunction(id => document.querySelector('[data-family-item][data-variant-id="' + id + '"] acla-cart-status')?.dataset.cartQuantity === '3', targets[0].id);
  check('Cart indicators persist after a page reload', await row(targets[0].id).locator('.acla-family__selected-mark').isVisible());
  state.quantities[targets[0].id] = 1;
  await page.evaluate(() => dispatchEvent(new Event('focus')));
  await page.waitForFunction(id => document.querySelector('[data-family-item][data-variant-id="' + id + '"] acla-cart-status')?.dataset.cartQuantity === '1', targets[0].id);
  check('Cart quantity changes elsewhere reconcile on return to the page', (await row(targets[0].id).locator('acla-cart-status').innerText()).includes('1'));
  delete state.quantities[targets[0].id];
  await page.evaluate(() => dispatchEvent(new Event('focus')));
  await page.waitForFunction(id => document.querySelector('[data-family-item][data-variant-id="' + id + '"] acla-cart-status')?.hidden, targets[0].id);
  check('Removing the last cart quantity clears the badge and check mark', !(await row(targets[0].id).locator('.acla-family__selected-mark').isVisible()));
  await row(targets[0].id).locator('[data-select-color]').click();
  await page.locator('[data-close-selection]').click();
  await page.locator('[data-gallery-image]').nth(1).click();
  check('Gallery thumbnails switch the main image', (await page.locator('[data-gallery-image]').nth(1).getAttribute('aria-pressed')) === 'true');
  await page.locator('[data-open-image]').click();
  check('Image enlargement opens an accessible dialog', await page.locator('[data-image-dialog]').evaluate(dialog => dialog.open));
  await page.keyboard.press('Escape');
  check('Escape closes the image dialog', !(await page.locator('[data-image-dialog]').evaluate(dialog => dialog.open)));
  await page.locator('.acla-family__questions summary').click();
  check('Question accordion opens', await page.locator('.acla-family__questions details').evaluate(details => details.open));
  for (const mode of ['reject', 'partial', 'unknown']) {
    state = { quantities: {}, posts: [], mode, getCalls: 0 };
    await load();
    await row(targets[0].id).locator('[data-quantity-step="1"]').click();
    if (mode === 'partial') await row(targets[1].id).locator('[data-quantity-step="1"]').click();
    await page.locator('[data-add-selected]').click();
    await page.waitForFunction(() => !document.querySelector('acla-product-family').pending);
    check(mode + ': error is visible and announced', await page.locator('[data-family-feedback][role="alert"]').isVisible());
    if (mode === 'reject') check('Rejected cart preserves quantities for correction', (await row(targets[0].id).locator('[data-family-quantity]').inputValue()) === '1');
    if (mode === 'partial') {
      const addedId = String(state.posts[0].items[0].id);
      const remainingId = targets.find(target => target.id !== addedId).id;
      check('Partial cart addition keeps only the unadded selection', (await row(addedId).locator('[data-family-quantity]').inputValue()) === '0' && (await row(remainingId).locator('[data-family-quantity]').inputValue()) === '1');
    }
    if (mode === 'unknown') check('Unknown cart result blocks accidental duplicate submission', await page.locator('[data-add-selected]').isDisabled());
  }
  state = { quantities: {}, posts: [], mode: 'success', getCalls: 0 };
  await load();
  const limited = row(targets[0].id);
  const maximum = Number(await limited.getAttribute('data-stock'));
  await limited.locator('[data-family-quantity]').fill(String(maximum));
  await limited.locator('[data-family-quantity]').press('Tab');
  check('Stock limit disables increasing past inventory', await limited.locator('[data-quantity-step="1"]').isDisabled());
  await page.locator('[data-clear-selection]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  check('No horizontal overflow at 390px mobile size', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, 'preview-mobile-top.png'), fullPage: true });
  await page.locator('.acla-family__shop').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'preview-mobile-colors.png') });
  await page.locator('[data-family-view="list"]').click();
  check('Mobile list view stays inside the viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, 'preview-mobile-list.png') });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  state = { quantities: {}, posts: [], mode: 'success', getCalls: 0 };
  await load();
  await descriptionButton.click();
  await page.waitForFunction(() => {
    const window = document.querySelector('[data-description-window]');
    return Math.abs(window.getBoundingClientRect().height - window.scrollHeight) < 2;
  });
  check('Animated description finishes fully expanded on mobile', (await descriptionButton.getAttribute('aria-expanded')) === 'true');
  await descriptionButton.click();
  await page.waitForFunction(() => document.querySelector('[data-description-window]').getBoundingClientRect().height <= 191);
  check('Animated description finishes collapsed on mobile', (await descriptionButton.getAttribute('aria-expanded')) === 'false');
  await row(targets[0].id).locator('[data-quantity-step="1"]').click();
  await page.locator('[data-add-selected]').click();
  await page.waitForSelector('.acla-family__cart-flight');
  check('Successful cart addition creates a flying product preview', await page.locator('.acla-family__cart-flight img').count() === 1);
  await page.screenshot({ path: path.join(output, 'preview-cart-flight.png') });
  await page.waitForSelector('.acla-family__cart-flight', { state: 'detached' });
  check('Cart animation cleans up without blocking the page', await page.locator('[data-family-search]').isEnabled());
  state = { quantities: {}, posts: [], mode: 'reject', getCalls: 0 };
  await load();
  await page.evaluate(() => {
    window.testCartFlights = 0;
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1 && node.matches('.acla-family__cart-flight')) window.testCartFlights++;
    }))).observe(document.body, { childList: true });
  });
  await row(targets[0].id).locator('[data-quantity-step="1"]').click();
  await page.locator('[data-add-selected]').click();
  await page.waitForFunction(() => !document.querySelector('acla-product-family').pending);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  check('Rejected cart addition does not show a success flight', await page.evaluate(() => window.testCartFlights === 0));
  await page.evaluate(() => document.querySelector('[data-description-content]').innerHTML = '<p>A short description.</p>');
  await page.waitForSelector('[data-description-toggle]', { state: 'hidden' });
  check('Short descriptions display fully without an unnecessary toggle', (await page.locator('[data-description-content]').innerText()) === 'A short description.');
  check('No JavaScript runtime errors', errors.length === 0);
  fs.writeFileSync(path.join(output, 'browser-tests.json'), JSON.stringify({ status: 'passed', checks: results, errors, note: 'Exact Liquid section rendered with catalog fixtures; cart requests simulated without modifying a real customer cart.' }, null, 2));
})().catch(error => { console.error(error); fs.writeFileSync(path.join(output, 'browser-tests.json'), JSON.stringify({ status: 'failed', checks: results, error: error.message }, null, 2)); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
