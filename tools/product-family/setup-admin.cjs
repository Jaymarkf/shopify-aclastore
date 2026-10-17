const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'product-import/product-family');
const store = 'c5p0rn-q5.myshopify.com';
const cliRoot = path.join(process.env.TEMP, 'acla-product-tools/node_modules/@shopify/cli');
const cliPackage = JSON.parse(fs.readFileSync(path.join(cliRoot, 'package.json')));
const cli = path.join(cliRoot, typeof cliPackage.bin === 'string' ? cliPackage.bin : cliPackage.bin.shopify);
const sample = JSON.parse(fs.readFileSync(path.join(directory, 'sample-products.json'), 'utf8').replace(/^\uFEFF/, ''));
const statePath = path.join(directory, 'admin-setup-result.json');
const env = { ...process.env, OPT_OUT_INSTRUMENTATION: 'true', SHOPIFY_CLI_NO_ANALYTICS: '1' };

function execute(name, variables, mutation = false, suffix = '') {
  const variableFile = path.join(directory, name + suffix + '-variables.json');
  const resultFile = path.join(directory, name + suffix + '-result.json');
  fs.writeFileSync(variableFile, JSON.stringify(variables, null, 2));
  const args = [cli, 'store', 'execute', '--store', store, '--query-file', path.join(__dirname, name + '.graphql'), '--variable-file', variableFile, '--json', '--no-input', '--output-file', resultFile];
  if (mutation) args.push('--allow-mutations');
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', env, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(name + ': ' + (result.stderr || result.stdout || result.error?.message));
  const response = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  if (response.errors?.length) throw new Error(name + ': ' + JSON.stringify(response.errors));
  const data = response.data || response;
  for (const value of Object.values(data)) {
    if (value?.userErrors?.length) throw new Error(name + ': ' + JSON.stringify(value.userErrors));
  }
  return data;
}
function save(state) { fs.writeFileSync(statePath, JSON.stringify(state, null, 2)); }

try {
  if (process.argv.includes('--publish')) {
    const state = JSON.parse(fs.readFileSync(statePath));
    if (state.store !== store || state.products.length !== 40) throw new Error('Unexpected product-group setup state.');
    const live = execute('read-products', {});
    const parent = live.parent.nodes.find(product => product.id === state.parentId);
    if (!parent || parent.familyProducts?.value !== JSON.stringify(state.products.map(product => product.id))) throw new Error('The parent group changed; refusing to publish stale setup data.');
    const publicationVariables = JSON.parse(fs.readFileSync(path.join(directory, 'publish-family-items-variables.json')));
    if (publicationVariables.publicationId !== state.publicationId || state.products.some((product, index) => publicationVariables['id' + index] !== product.id)) throw new Error('The publication list does not match the verified group.');
    state.products.forEach(product => { product.wasPublished = Boolean(live.products.nodes.find(item => item.id === product.id)?.onlineStoreUrl); });
    save(state);
    execute('publish-family-items', publicationVariables, true);
    execute('update-parent', { product: { id: state.parentId, status: 'ACTIVE', templateSuffix: 'product-family' } }, true);
    execute('publish-parent', { id: state.parentId, input: [{ publicationId: state.publicationId }] }, true);
    state.published = true;
    state.productUrl = 'https://' + store + '/products/' + state.parentHandle;
    state.adminUrl = 'https://admin.shopify.com/store/' + store.split('.')[0] + '/products/' + state.parentId.split('/').pop();
    save(state);
    console.log(JSON.stringify({ parent: state.title, products: state.products.length, url: state.productUrl, adminUrl: state.adminUrl, published: true }, null, 2));
    process.exit(0);
  }

  const live = execute('read-products', {});
  let products = [...live.products.nodes];
  let page = live.products;
  while (page.pageInfo.hasNextPage) {
    page = execute('read-products', { after: page.pageInfo.endCursor }, false, '-next').products;
    products.push(...page.nodes);
  }
  const selected = sample.map(row => {
    const product = products.find(product => product.handle === row.source['URL handle']);
    if (!product) throw new Error('The selected product is not in this store: ' + row.source.Title);
    if (product.status !== 'ACTIVE' || product.variants.nodes.length !== 1 || product.variants.nodes[0].title !== 'Default Title') throw new Error('Product must be active and have one default variant: ' + product.title);
    if (product.variants.nodes[0].sku !== row.source.SKU) throw new Error('SKU mismatch: ' + product.title);
    return { id: product.id, title: product.title, handle: product.handle, sku: product.variants.nodes[0].sku,
      variantId: product.variants.nodes[0].id, price: product.variants.nodes[0].price,
      swatchColor: row.swatchColor, colorImage: row.colorImage, swatchSource: row.swatchSource };
  });
  if (selected.length !== 40 || new Set(selected.map(product => product.id)).size !== 40) throw new Error('Expected 40 distinct products.');
  const publication = live.publications.nodes.find(publication => publication.name === 'Online Store');
  if (!publication) throw new Error('Online Store publication was not found.');
  const definitions = [
    { name: 'Products in this group', namespace: 'custom', key: 'family_products', type: 'list.product_reference', ownerType: 'PRODUCT', pin: true,
      description: 'For parent product pages: choose up to 50 individual products in the order you want to display. Their existing SKUs, prices and inventory stay separate.',
      access: { storefront: 'PUBLIC_READ' }, validations: [{ name: 'list.max', value: '50' }] },
    { name: 'Color swatch', namespace: 'custom', key: 'swatch_color', type: 'color', ownerType: 'PRODUCT', pin: true,
      description: 'Optional color shown for this individual product in a product-family grid.', access: { storefront: 'PUBLIC_READ' } },
    { name: 'Color preview image', namespace: 'custom', key: 'color_image', type: 'url', ownerType: 'PRODUCT', pin: true,
      description: 'Optional public image URL for this individual color in a product-family preview. Leave blank to use the product image.', access: { storefront: 'PUBLIC_READ' } },
  ];
  const definitionIds = {};
  for (const definition of definitions) {
    const existing = live.metafieldDefinitions.nodes.find(value => value.key === definition.key && value.namespace === definition.namespace);
    if (existing && existing.type.name !== definition.type) throw new Error('Existing metafield has an incompatible type: ' + definition.key);
    const created = existing || execute('create-definition', { definition }, true, '-' + definition.key).metafieldDefinitionCreate.createdDefinition;
    definitionIds[definition.key] = created.id;
    console.log('Ready: ' + definition.name);
  }
  let parent = live.parent.nodes.find(product => product.handle === 'olo-premium-markers-brush');
  if (parent && !parent.familyProducts) throw new Error('A product already uses the intended parent handle and is not a configured family. No existing product was overwritten.');
  if (!parent) {
    const imageSources = [sample[0].source['Product image URL'], sample.find(row => row.source.SKU.startsWith('OMB-R0-'))?.colorImage, sample.find(row => row.source.SKU === 'OMB-ZERO').colorImage].filter(Boolean);
    const created = execute('create-parent', {
      product: { title: 'OLO Premium Markers - Brush', handle: 'olo-premium-markers-brush', vendor: 'OLO', productType: 'Marker collections', status: 'DRAFT', templateSuffix: 'product-family',
        descriptionHtml: '<p>Explore OLO’s premium alcohol-based brush markers and build your own color palette. The patented free-flow ink system delivers a smooth, controlled flow, while the flexible brush nib makes it easy to vary your stroke.</p><ul><li>2 ml of ink in each half marker</li><li>Flexible brush nib</li><li>Use an OLO Connector Ring to combine two half markers</li><li>Made in Japan</li></ul>',
        seo: { title: 'OLO Premium Brush Markers | Shop Individual Colors', description: 'Explore OLO premium alcohol-based brush markers. Choose individual colors, compare shades, and add your favorite colors to one order.' },
        tags: ['OLO', 'Brush markers', 'Product family'] },
      media: imageSources.map((source, index) => ({ originalSource: source, mediaContentType: 'IMAGE', alt: index === 2 ? 'OLO Zero colorless marker' : 'OLO premium brush marker' })),
    }, true).productCreate.product;
    parent = { ...created, variants: created.variants };
  }
  const state = { store, title: parent.title, parentId: parent.id, parentHandle: parent.handle, parentVariantId: parent.variants.nodes[0].id,
    publicationId: publication.id, definitions: definitionIds, products: selected, published: false };
  save(state);
  const minimumPrice = Math.min(...selected.map(product => Number(product.price))).toFixed(2);
  execute('update-parent-variant', { productId: parent.id, variants: [{ id: state.parentVariantId, price: minimumPrice, compareAtPrice: null, inventoryPolicy: 'DENY', inventoryItem: { tracked: true, sku: 'ACLA-OLO-BRUSH-GROUP' } }] }, true);
  const metafields = selected.flatMap(product => [
    { ownerId: product.id, namespace: 'custom', key: 'swatch_color', type: 'color', value: product.swatchColor },
    { ownerId: product.id, namespace: 'custom', key: 'color_image', type: 'url', value: product.colorImage },
  ]);
  for (let index = 0; index < metafields.length; index += 25) execute('set-metafields', { metafields: metafields.slice(index, index + 25) }, true, '-' + index);
  execute('set-metafields', { metafields: [{ ownerId: parent.id, namespace: 'custom', key: 'family_products', type: 'list.product_reference', value: JSON.stringify(selected.map(product => product.id)) }] }, true, '-parent');
  const verified = execute('read-products', {}).parent.nodes.find(product => product.id === parent.id);
  if (verified?.familyProducts?.value !== JSON.stringify(selected.map(product => product.id))) throw new Error('Parent product list did not round-trip correctly.');
  state.prepared = true;
  save(state);
  console.log(JSON.stringify({ parent: state.title, parentId: state.parentId, products: selected.length, variantsPerChild: 1, parentPurchasable: false, published: false }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
