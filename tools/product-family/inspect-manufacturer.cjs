const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const output = path.resolve('product-import/product-family');
  const response = await fetch('https://olomarker.com/collections/olo-brush-colors/products.json?limit=250');
  if (!response.ok) throw new Error('Manufacturer catalog HTTP ' + response.status);
  const catalog = await response.json();
  fs.writeFileSync(path.join(output, 'manufacturer-products.json'), JSON.stringify(catalog));
  console.log('Manufacturer brush products: ' + catalog.products.length);
  console.log(JSON.stringify(catalog.products.slice(0, 2).map(product => ({ title: product.title, handle: product.handle, images: product.images.map(image => ({ src: image.src, width: image.width, height: image.height })) }))));
  const html = await (await fetch('https://olomarker.com/products/brush-b0-2-forget-me-not')).text();
  fs.writeFileSync(path.join(output, 'manufacturer-product.html'), html);
  console.log((html.match(/.{0,70}(?:#[a-fA-F0-9]{6}|rgb\(|color-swatch|swatch-color).{0,100}/g) || []).slice(0, 12).join('\n'));
  const resources = await (await fetch('https://olomarker.com/pages/resources')).text();
  const chartPosition = resources.toLowerCase().indexOf('128 color swatch chart, real');
  console.log(resources.slice(chartPosition - 1500, chartPosition + 500));
})().catch(error => { console.error(error); process.exitCode = 1; });
