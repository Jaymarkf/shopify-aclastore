const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const toolDirectory = path.join(process.env.TEMP, 'acla-product-tools');
const requireTools = createRequire(path.join(toolDirectory, 'package.json'));
const { chromium } = requireTools('playwright');

(async () => {
  const output = path.join(root, 'product-import/product-family');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://www.dickblick.com/products/olo-brush-tip-half-markers/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  const dismiss = page.getByRole('button', { name: /accept all|accept cookies|close/i });
  for (const button of await dismiss.all()) {
    if (await button.isVisible().catch(() => false)) await button.click({ timeout: 1200 }).catch(() => {});
  }
  await page.screenshot({ path: path.join(output, 'reference-top.png') });
  const shop = page.getByText('Shop Products', { exact: true });
  if (await shop.count()) await shop.first().click().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 850));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(output, 'reference-products.png') });
  fs.writeFileSync(path.join(output, 'reference.html'), await page.content());
  const inspect = async () => ({
    url: page.url(), title: await page.title(),
    text: (await page.locator('body').innerText()).slice(0, 25000),
    controls: await page.locator('button,select,input').evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, type: node.type, text: node.innerText?.trim().slice(0, 90), label: node.getAttribute('aria-label'), name: node.name })).filter(node => node.text || node.label || node.name).slice(0, 120)),
    errors,
  });
  const result = await inspect();
  fs.writeFileSync(path.join(output, 'reference-inspection.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result).slice(0, 19000));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
