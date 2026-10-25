import { Component } from '@theme/component';
import { StandardEvents } from '@shopify/events';

const seed = document.querySelector('[data-acla-cart-snapshot]');
const indicators = new Set();
let quantities = new Map();
let memberships = [];
let familyQuantities = new Map();
let revision = 0;
let pendingUpdates = 0;
let refreshController;
let refreshTimer;
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('acla-cart-updates') : null;

function applyCart(cart) {
  if (!Array.isArray(cart?.items)) return;
  quantities = new Map();
  for (const item of cart.items) {
    const productId = String(item.product_id);
    quantities.set(productId, (quantities.get(productId) || 0) + Number(item.quantity || 0));
  }
  familyQuantities = new Map();
  const seen = new Set();
  for (const [productId, familyId] of memberships) {
    const key = `${productId}:${familyId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    familyQuantities.set(familyId, (familyQuantities.get(familyId) || 0) + (quantities.get(productId) || 0));
  }
  indicators.forEach(indicator => indicator.renderQuantity());
  document.dispatchEvent(new CustomEvent('acla:cart-snapshot', { detail: { cart } }));
}

async function refreshCart() {
  if (pendingUpdates > 0 || !seed?.dataset.cartUrl) return;
  refreshController?.abort();
  const controller = new AbortController();
  refreshController = controller;
  const requestRevision = revision;
  try {
    const response = await fetch(seed.dataset.cartUrl, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
    if (!response.ok) return;
    const cart = await response.json();
    if (seed.dataset.familyUrl && cart.items?.length) {
      try {
        const familyResponse = await fetch(seed.dataset.familyUrl, { cache: 'no-store', signal: controller.signal });
        if (familyResponse.ok) {
          const html = new DOMParser().parseFromString(await familyResponse.text(), 'text/html');
          const value = JSON.parse(html.querySelector('[data-family-memberships]')?.textContent || 'null');
          if (Array.isArray(value) && !controller.signal.aborted && requestRevision === revision) memberships = value;
        }
      } catch {
        // A group lookup failure must not block the current per-product cart quantities.
      }
    }
    if (!controller.signal.aborted && requestRevision === revision && pendingUpdates === 0) applyCart(cart);
  } catch {
    return;
  } finally {
    if (refreshController === controller) refreshController = null;
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshCart, 60);
}

class AclaCartStatus extends Component {
  static observedAttributes = ['data-cart-product-ids', 'data-cart-family-id'];

  connectedCallback() {
    super.connectedCallback();
    indicators.add(this);
    this.renderQuantity();
  }

  updatedCallback() {
    super.updatedCallback();
    this.renderQuantity();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    indicators.delete(this);
  }

  attributeChangedCallback() {
    if (this.isConnected) this.renderQuantity();
  }

  renderQuantity() {
    let ids;
    try { ids = JSON.parse(this.dataset.cartProductIds || '[]'); } catch { return; }
    const quantity = this.dataset.cartFamilyId
      ? familyQuantities.get(this.dataset.cartFamilyId) || 0
      : [...new Set(ids.map(String))].reduce((total, id) => total + (quantities.get(id) || 0), 0);
    this.hidden = quantity === 0;
    this.dataset.cartQuantity = String(quantity);
    const label = this.querySelector('[data-cart-status-label]');
    if (label) label.textContent = (this.dataset.label || '').replace('[quantity]', String(quantity));
    const row = this.closest('[data-family-item]');
    if (row) row.classList.toggle('is-in-cart', quantity > 0);
  }
}

try { memberships = JSON.parse(document.querySelector('[data-acla-family-snapshot]')?.textContent || '[]'); } catch { memberships = []; }
try { applyCart(JSON.parse(seed?.textContent || '{"items":[]}')); } catch { applyCart({ items: [] }); }
if (!customElements.get('acla-cart-status')) customElements.define('acla-cart-status', AclaCartStatus);

document.addEventListener(StandardEvents.cartLinesUpdate, event => {
  const eventRevision = ++revision;
  pendingUpdates++;
  refreshController?.abort();
  Promise.resolve(event.promise).then(result => {
    if (eventRevision !== revision) return;
    const items = result?.detail?.items || result?.cart?.items;
    if (Array.isArray(items)) applyCart({ items });
  }).catch(() => {}).finally(() => {
    pendingUpdates--;
    channel?.postMessage('changed');
    if (pendingUpdates === 0) scheduleRefresh();
  });
});

channel?.addEventListener('message', scheduleRefresh);
window.addEventListener('pageshow', event => { if (event.persisted) scheduleRefresh(); });
window.addEventListener('focus', scheduleRefresh);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleRefresh(); });
window.addEventListener('pagehide', () => {
  clearTimeout(refreshTimer);
  refreshController?.abort();
});
scheduleRefresh();
