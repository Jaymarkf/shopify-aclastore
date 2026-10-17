const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve('product-import/product-family');
const source = JSON.parse(fs.readFileSync(path.join(output, 'source-products.json'), 'utf8').replace(/^\uFEFF/, ''));
const catalog = JSON.parse(fs.readFileSync(path.join(output, 'manufacturer-products.json'), 'utf8')).products;
const normalize = value => value.replace(/[^a-z0-9]/gi, '').toUpperCase();
const regular = source.filter(product => product.SKU !== 'OMB-ZERO');
const selected = Array.from({ length: 39 }, (_, index) => regular[Math.round(index * (regular.length - 1) / 38)]);
selected.push(source.find(product => product.SKU === 'OMB-ZERO'));
if (new Set(selected.map(product => product['URL handle'])).size !== 40) throw new Error('Sample selection must contain 40 different products.');
fs.mkdirSync(path.join(output, 'swatch-sources'), { recursive: true });
(async () => {
  const missing = selected.some(product => !catalog.some(candidate => normalize(candidate.title.replace(/^Brush - /, '').split(' ')[0]) === normalize(product.SKU.replace(/^OMB-/, ''))));
  if (missing) {
    const nextPage = await (await fetch('https://olomarker.com/collections/olo-brush-colors/products.json?limit=250&page=2')).json();
    catalog.push(...nextPage.products);
    fs.writeFileSync(path.join(output, 'manufacturer-products.json'), JSON.stringify({ products: catalog }));
  }
  const rows = [];
  for (let start = 0; start < selected.length; start += 5) {
    const batch = selected.slice(start, start + 5);
    const resolved = await Promise.all(batch.map(async (product, offset) => {
      const code = product.SKU.replace(/^OMB-/, '');
      const match = catalog.find(candidate => normalize(candidate.title.replace(/^Brush - /, '').split(' ')[0]) === normalize(code));
      if (!match?.images?.length) throw new Error('Missing official swatch for ' + code);
      const imageResponse = await fetch(match.images[0].src);
      if (!imageResponse.ok) throw new Error('Cannot download manufacturer swatch for ' + code);
      const localFile = path.join(output, 'swatch-sources', String(start + offset + 1).padStart(2, '0') + '.png');
      fs.writeFileSync(localFile, Buffer.from(await imageResponse.arrayBuffer()));
      return {
        source: product,
        code,
        label: product.Title.split(' - Color: ').pop(),
        manufacturerTitle: match.title,
        swatchSource: match.images[0].src,
        swatchFile: localFile,
        colorImage: match.images.at(-1)?.src || product['Product image URL'],
      };
    }));
    rows.push(...resolved);
  }
  fs.writeFileSync(path.join(output, 'sample-products.json'), JSON.stringify(rows, null, 2));
  console.log('Prepared 40 individual products including Zero, with official OLO swatch sources and marker images.');
})().catch(error => { console.error(error); process.exitCode = 1; });
