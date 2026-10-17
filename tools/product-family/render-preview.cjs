const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'product-import/product-family');
const toolDirectory = path.join(process.env.TEMP, 'acla-product-tools');
const requireTools = createRequire(path.join(toolDirectory, 'package.json'));
const { Liquid } = requireTools('liquidjs');
const sample = JSON.parse(fs.readFileSync(path.join(output, 'sample-products.json'), 'utf8').replace(/^\uFEFF/, ''));
const translations = require('./translations.json').storefront;
const template = JSON.parse(fs.readFileSync(path.join(root, 'templates/product.product-family.json'), 'utf8'));
const sectionSource = fs.readFileSync(path.join(root, 'sections/acla-product-family.liquid'), 'utf8');
const commerceSource = fs.readFileSync(path.join(root, 'snippets/acla-commerce-status.liquid'), 'utf8');
const css = sectionSource.match(/{% stylesheet %}([\s\S]*?){% endstylesheet %}/)[1] + commerceSource.match(/{% stylesheet %}([\s\S]*?){% endstylesheet %}/)[1];
const javascript = sectionSource.match(/{% javascript %}([\s\S]*?){% endjavascript %}/)[1];
const clean = source => source.replace(/{%\s*(doc|schema|stylesheet|javascript)\s*%}[\s\S]*?{%\s*end\1\s*%}/g, '');
const snippetDirectory = path.join(toolDirectory, 'fixture-snippets');
fs.mkdirSync(snippetDirectory, { recursive: true });
for (const name of ['acla-family-item', 'acla-cart-status', 'acla-promotion-badge']) fs.writeFileSync(path.join(snippetDirectory, name + '.liquid'), clean(fs.readFileSync(path.join(root, 'snippets', name + '.liquid'), 'utf8')));
const liquid = new Liquid({ root: snippetDirectory, extname: '.liquid', strictFilters: false });
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
liquid.registerFilter('t', (key, ...values) => {
  let text = translations[key.replace(/^acla_family\./, '')] || key;
  const variables = Object.fromEntries(values.filter(Array.isArray));
  return text.replace(/{{\s*(\w+)\s*}}/g, (_, name) => variables[name] ?? '');
});
liquid.registerFilter('money', value => '$' + (Number(value) / 100).toFixed(2));
liquid.registerFilter('image_url', image => image?.src || image?.url || image || '');
liquid.registerFilter('image_tag', (src, ...values) => {
  const attributes = Object.fromEntries(values.filter(Array.isArray));
  return '<img src="' + escape(src) + '" width="1200" height="1200" ' + Object.entries(attributes).filter(([key]) => !['widths', 'srcset'].includes(key)).map(([key, value]) => key + '="' + escape(value) + '"').join(' ') + '>';
});
liquid.registerFilter('item_count_for_variant', () => 0);
liquid.registerFilter('placeholder_svg_tag', () => '<svg viewBox="0 0 100 100"></svg>');
const productImage = sample[0].source['Product image URL'];
const products = sample.map((item, index) => {
  const image = { src: productImage, alt: item.label, width: 1200, height: 1200 };
  const quantity = Number(item.source['Inventory quantity']);
  const variant = {
    id: 810000 + index,
    sku: item.source.SKU,
    price: Math.round(Number(item.source.Price) * 100),
    compare_at_price: Math.round(Number(item.source['Compare-at price']) * 100),
    available: quantity > 0,
    inventory_quantity: quantity,
    inventory_management: 'shopify',
    inventory_policy: 'deny',
    quantity_rule: { min: 1, increment: 1, max: null },
  };
  return {
    id: 710000 + index,
    title: item.source.Title,
    handle: item.source['URL handle'],
    url: '/products/' + item.source['URL handle'],
    price: variant.price,
    available: variant.available,
    featured_image: image,
    images: [image],
    has_only_default_variant: true,
    selected_or_first_available_variant: variant,
    metafields: { custom: { swatch_color: { value: item.swatchColor }, color_image: { value: item.colorImage } } },
  };
});
const description = '<ul><li>2 ml of ink in each half marker</li><li>Flexible brush nib for expressive strokes</li><li>Compatible with OLO Connector Rings</li><li>Made in Japan</li></ul><p>Premium alcohol-based markers with a smooth, flexible brush tip and OLO’s patented free-flow ink system. Explore a palette of rich colors and build a combination that’s uniquely yours.</p><p>Choose individual colors for your own palette. Each marker retains its own stock, price, and item number, so you can order exactly what you need.</p><p>Use a connector ring to combine brush and chisel halves, swap colors, and create your preferred combination.</p><p><a href="/pages/marker-care">Read the marker care guide</a></p>';
const context = {
  product: { id: 999999, title: 'OLO Premium Markers - Brush', vendor: 'OLO', description,
    collections: [{ metafields: { custom: { promotion_badge: { value: 'Save 50%' }, promotion_enabled: { value: true } } } }],
    featured_image: { src: productImage, alt: 'OLO premium brush marker with cap removed' },
    images: [
      { src: productImage, alt: 'OLO premium brush marker with cap removed' },
      { src: sample[0].colorImage, alt: sample[0].label + ' brush marker' },
      { src: sample.find(item => item.label === 'Zero')?.colorImage || sample[1].colorImage, alt: 'Zero colorless brush marker' },
    ],
    metafields: { custom: { family_products: { value: products } } },
  },
  section: { id: 'preview-family', settings: template.sections.main.settings, blocks: template.sections.main.block_order.map(id => ({ ...template.sections.main.blocks[id], id })) },
  routes: { root_url: '/', all_products_collection_url: '/collections/all', cart_url: '/cart', cart_add_url: '/cart/add' },
  localization: { country: { currency: { iso_code: 'USD' } } },
  request: { locale: { iso_code: 'en-US' }, origin: 'http://127.0.0.1:8991', design_mode: false },
  shop: { shipping_policy: { body: '' } },
  cart: { items: [] },
};
(async () => {
  const snapshot = await liquid.parseAndRender(clean(commerceSource), context);
  const html = await liquid.parseAndRender(clean(sectionSource), context);
  if (html.includes('acla_family.')) throw new Error('Untranslated preview label.');
  fs.writeFileSync(path.join(output, 'preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ACLA · OLO Brush Markers</title><style>body{margin:0;font-family:Arial,sans-serif}button,a,input,select{-webkit-tap-highlight-color:transparent}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.preview-announcement{background:#173d2d;color:white;text-align:center;font:11px Arial;padding:9px}.preview-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7e9e7;padding:24px 45px;gap:30px}.preview-logo{font-weight:800;font-size:28px;letter-spacing:3px;color:#123a27}.preview-header nav{display:flex;gap:24px;font-size:13px}.preview-header a{color:inherit;text-decoration:none}.preview-search{padding:11px 18px;border:1px solid #dce1dc;color:#777;min-width:220px;font-size:12px}.preview-cart{font-size:13px;white-space:nowrap}.preview-footer{background:#f2f5f2;padding:36px;text-align:center;color:#5a655b;font-size:12px}@media(max-width:749px){.preview-header{padding:20px}.preview-header nav,.preview-search{display:none}.preview-logo{font-size:24px}}' + css + '</style><script type="importmap">{"imports":{"@shopify/events":"https://cdn.shopify.com/storefront/standard-events.js","@theme/component":"/fixture-component.js"}}</script></head><body>' + snapshot + '<script type=\"module\" src=\"/assets/acla-cart-status.js\"></script><div class="preview-announcement">Architects Corner · Art, design &amp; creative supplies</div><header class="preview-header"><a class="preview-logo" href="/">ACLA</a><nav><a href="/collections/all">Shop all</a><a href="/collections/all">Art supplies</a><a href="/collections/all">Markers &amp; pens</a><a href="/collections/all">Brands</a></nav><span class="preview-search">Search art supplies…</span><span class="preview-cart">Bag <span data-test-cart-count>0</span></span></header>' + html + '<footer class="preview-footer">Architects Corner · Los Angeles</footer><script>' + javascript + '</script></body></html>');
  fs.writeFileSync(path.join(output, 'fixture-products.json'), JSON.stringify(products));
  console.log('Rendered exact Liquid section and snippet with 40 sample products.');
})().catch(error => { console.error(error); process.exitCode = 1; });
