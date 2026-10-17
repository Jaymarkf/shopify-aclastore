const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'product-import/product-family/promotion');
const family = JSON.parse(fs.readFileSync(path.join(root, 'product-import/product-family/admin-setup-result.json')));
const cliRoot = path.join(process.env.TEMP, 'acla-product-tools/node_modules/@shopify/cli');
const cliPackage = JSON.parse(fs.readFileSync(path.join(cliRoot, 'package.json')));
const cli = path.join(cliRoot, typeof cliPackage.bin === 'string' ? cliPackage.bin : cliPackage.bin.shopify);
fs.mkdirSync(directory, { recursive: true });
function execute(name, query, variables, mutation = false) {
  const variableFile = path.join(directory, name + '-variables.json');
  const resultFile = path.join(directory, name + '-result.json');
  fs.writeFileSync(variableFile, JSON.stringify(variables, null, 2));
  const args = [cli, 'store', 'execute', '--store', family.store, '--query-file', query, '--variable-file', variableFile, '--json', '--no-input', '--output-file', resultFile];
  if (mutation) args.push('--allow-mutations');
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, OPT_OUT_INSTRUMENTATION: 'true', SHOPIFY_CLI_NO_ANALYTICS: '1' }, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || result.error?.message);
  const response = JSON.parse(fs.readFileSync(resultFile));
  if (response.errors?.length) throw new Error(JSON.stringify(response.errors));
  const data = response.data || response;
  for (const value of Object.values(data)) if (value?.userErrors?.length) throw new Error(JSON.stringify(value.userErrors));
  return data;
}
const familyTools = path.join(root, 'tools/product-family');
const read = () => execute('read-promotion', path.join(__dirname, 'read-promotion.graphql'), { parentId: family.parentId });
try {
  if (!process.argv.includes('--prepare-disabled') && !process.argv.includes('--enable')) throw new Error('Choose --prepare-disabled or --enable explicitly.');
  let live = read();
  const definitions = [
    { name: 'Promotion badge text', namespace: 'custom', key: 'promotion_badge', type: 'single_line_text_field', ownerType: 'COLLECTION', pin: true,
      description: 'Message displayed beside prices for products in this collection. For example: Save 20%. This is a display label and does not change prices.',
      access: { storefront: 'PUBLIC_READ' }, validations: [{ name: 'max', value: '100' }] },
    { name: 'Show promotion badge', namespace: 'custom', key: 'promotion_enabled', type: 'boolean', ownerType: 'COLLECTION', pin: true,
      description: 'Enable after confirming the badge text and product prices. Disable to hide this promotion on all assigned products.', access: { storefront: 'PUBLIC_READ' } }
  ];
  for (const definition of definitions) {
    const existing = live.metafieldDefinitions.nodes.find(value => value.key === definition.key);
    if (existing && existing.type.name !== definition.type) throw new Error('Incompatible definition: ' + definition.key);
    if (!existing) execute('create-' + definition.key, path.join(familyTools, 'create-definition.graphql'), { definition }, true);
  }
  let promotion = live.collections.nodes.find(collection => collection.handle === 'olo-brush-promotion');
  if (!promotion) promotion = execute('create-promotion', path.join(__dirname, 'create-promotion.graphql'), { input: {
    title: 'OLO Brush promotion', handle: 'olo-brush-promotion', sortOrder: 'MANUAL', products: [family.parentId],
    metafields: [
      { namespace: 'custom', key: 'promotion_badge', type: 'single_line_text_field', value: 'Save 50%' },
      { namespace: 'custom', key: 'promotion_enabled', type: 'boolean', value: 'false' }
    ]
  } }, true).collectionCreate.collection;
  if (!promotion.id) throw new Error('Promotion collection was not created.');
  if (process.argv.includes('--enable')) execute('enable-promotion', path.join(familyTools, 'set-metafields.graphql'), {
    metafields: [{ ownerId: promotion.id, namespace: 'custom', key: 'promotion_enabled', type: 'boolean', value: 'true' }]
  }, true);
  execute('publish-promotion', path.join(familyTools, 'publish-parent.graphql'), { id: promotion.id, input: [{ publicationId: family.publicationId }] }, true);
  live = read();
  promotion = live.collections.nodes.find(collection => collection.id === promotion.id);
  if (!promotion || promotion.badge?.value !== 'Save 50%' || !promotion.products.nodes.some(product => product.id === family.parentId)) throw new Error('Promotion did not round-trip correctly.');
  const state = { collectionId: promotion.id, parentId: family.parentId, badgeText: promotion.badge.value, enabled: promotion.enabled?.value === 'true',
    adminUrl: 'https://admin.shopify.com/store/' + family.store.split('.')[0] + '/collections/' + promotion.id.split('/').pop(),
    assignedProducts: promotion.products.nodes, priceUnchanged: true };
  fs.writeFileSync(path.join(directory, 'setup-result.json'), JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
