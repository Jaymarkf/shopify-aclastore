const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const output = path.resolve('product-import/product-family');
  const catalog = JSON.parse(fs.readFileSync(path.join(output, 'manufacturer-products.json'))).products;
  for (const code of ['B0.2', 'R0.3', 'ZERO']) {
    const product = catalog.find(product => product.title.startsWith('Brush - ' + code + ' '));
    if (!product) continue;
    const url = product.images[0]?.src;
    console.log(JSON.stringify({ code, title: product.title, url }));
    if (url) fs.writeFileSync(path.join(output, 'manufacturer-' + code.replace('.', '-') + '.png'), Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  const source = JSON.parse(fs.readFileSync(path.join(output, 'source-products.json'), 'utf8').replace(/^\uFEFF/, ''));
  fs.writeFileSync(path.join(output, 'source-product.jpg'), Buffer.from(await (await fetch(source[0]['Product image URL'])).arrayBuffer()));
})().catch(error => { console.error(error); process.exitCode = 1; });
