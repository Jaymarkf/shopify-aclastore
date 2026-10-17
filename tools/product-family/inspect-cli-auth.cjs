const fs = require('node:fs');
const path = require('node:path');
const file = path.join(process.env.TEMP, 'acla-product-tools/node_modules/@shopify/cli/dist/index.js');
const source = fs.readFileSync(file, 'utf8');
const position = source.indexOf('Shopify CLI will open the app authorization page');
console.log(source.slice(position - 5500, position + 3000));
