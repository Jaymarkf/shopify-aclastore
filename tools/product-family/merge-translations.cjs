const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const requireTools = createRequire(path.join(process.env.TEMP, 'acla-product-tools/package.json'));
const { parse, modify, applyEdits } = requireTools('jsonc-parser');
const translations = require('./translations.json');
for (const [file, key] of [['en.default.json', 'storefront'], ['en.default.schema.json', 'schema']]) {
  const backup = path.join(process.env.TEMP, 'acla-family-theme-backup/locales', file);
  const target = path.join(root, 'locales', file);
  const original = fs.readFileSync(fs.existsSync(backup) ? backup : target, 'utf8');
  const before = parse(original);
  const result = applyEdits(original, modify(original, ['acla_family'], translations[key], { formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' } }));
  const after = parse(result);
  for (const name of Object.keys(before).filter(name => name !== 'acla_family')) {
    if (JSON.stringify(before[name]) !== JSON.stringify(after[name])) throw new Error('Existing translations changed: ' + name);
  }
  fs.writeFileSync(target, result);
  console.log(file + ': merged acla_family; existing translations preserved');
}
