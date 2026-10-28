import { Component } from '@theme/component';

/**
 * Complete-family savings and shared card prices, using the shopping grid's index.
 * One metadata request supplies the badge, MSRP range, and lowest selling price.
 * @extends {Component<{label: HTMLElement}>}
 */
class SavingsBadge extends Component {
  requiredRefs = ['label'];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('acla:family-prices-ready', this.onPricesReady);
    this.observe();
  }

  updatedCallback() {
    super.updatedCallback();
    this.observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('acla:family-prices-ready', this.onPricesReady);
    this.controller?.abort();
    this.observer?.disconnect();
  }

  /** Retry the badge when the matching family grid successfully retries its index. */
  onPricesReady = event => {
    if (this.hidden && this.dataset.indexUrl && event.detail?.indexUrl === this.dataset.indexUrl) this.start();
  };

  observe() {
    this.controller?.abort();
    this.observer?.disconnect();
    // The badge starts hidden; its price container still has a visible box.
    this.observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      this.observer.disconnect();
      this.start();
    }, { rootMargin: '300px' });
    if (this.parentElement) this.observer.observe(this.parentElement);
  }

  async start() {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.hidden = true;
    try {
      const { loadCollectionIndex, savingsPercent } = await import(this.dataset.scaleModule);
      let entries;
      if (this.dataset.indexUrl) {
        const index = await loadCollectionIndex(this.dataset.indexUrl, controller.signal);
        entries = index.map(row => ({ price: row[3], comparePrice: row[7], checkoutRate: row[8] }));
      } else {
        const response = await fetch(this.dataset.catalogUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('Savings catalog unavailable');
        const document = new DOMParser().parseFromString(await response.text(), 'text/html');
        entries = JSON.parse(document.querySelector('[data-family-savings]')?.textContent || 'null');
        if (!Array.isArray(entries)) throw new Error('Invalid savings catalog');
      }
      if (controller.signal.aborted || !this.isConnected) return;
      if (!entries.length) throw new Error('Empty family pricing');
      this.updatePriceSummary(entries);
      const percentages = entries.map(row => savingsPercent(row.price, row.comparePrice, row.checkoutRate));
      const minimum = percentages.reduce((value, rate) => Math.min(value, rate), 100);
      const maximum = percentages.reduce((value, rate) => Math.max(value, rate), 0);
      if (!maximum) return;
      this.refs.label.textContent = this.dataset.upTo.replace('[percent]', maximum);
      this.title = this.dataset.range.replace('[minimum]', minimum).replace('[maximum]', maximum);
      this.dataset.savingsMin = String(minimum);
      this.dataset.savingsMax = String(maximum);
      this.hidden = false;
    } catch {
      // No guessed percentage when the complete catalog cannot be read.
      if (controller.signal.aborted || !this.isConnected) return;
      const summary = this.closest('[data-family-price-summary]');
      const msrp = summary?.querySelector('[data-family-card-msrp]');
      if (msrp) {
        msrp.textContent = summary.dataset.msrpFallback;
        msrp.removeAttribute('aria-busy');
        msrp.removeAttribute('aria-label');
      }
    }
  }

  /**
   * Update only this price container, preserving native individual/variant prices.
   * @param {Array<{price: number, comparePrice: number}>} entries - Full assigned catalog.
   */
  updatePriceSummary(entries) {
    const summary = this.closest('[data-family-price-summary]');
    if (!summary) return;
    const formatter = new Intl.NumberFormat(summary.dataset.priceLocale, {
      style: 'currency',
      currency: summary.dataset.priceCurrency,
      currencyDisplay: summary.dataset.priceCurrencyCode === 'true' ? 'code' : 'symbol',
    });
    const money = cents => formatter.format(cents / 100);
    let minimum = Infinity;
    let maximum = -Infinity;
    let listMinimum = Infinity;
    let listMaximum = 0;
    for (const entry of entries) {
      const price = Number(entry.price);
      const comparePrice = Number(entry.comparePrice);
      if (Number.isFinite(price) && price >= 0) {
        minimum = Math.min(minimum, price);
        maximum = Math.max(maximum, price);
      }
      if (Number.isFinite(comparePrice) && comparePrice > 0) {
        listMinimum = Math.min(listMinimum, comparePrice);
        listMaximum = Math.max(listMaximum, comparePrice);
      }
    }
    const msrp = summary.querySelector('[data-family-card-msrp]');
    if (msrp) {
      msrp.textContent = listMaximum > 0
        ? listMinimum === listMaximum ? money(listMinimum) : `${money(listMinimum)} – ${money(listMaximum)}`
        : summary.dataset.msrpUnavailable;
      msrp.removeAttribute('aria-busy');
      msrp.removeAttribute('aria-label');
    }
    const listPrice = summary.querySelector('[data-family-msrp]');
    if (listPrice) listPrice.hidden = false;
    const selling = summary.querySelector('[data-family-card-selling]');
    if (selling && Number.isFinite(minimum)) selling.textContent = money(minimum);
    const from = summary.querySelector('[data-family-card-from]');
    if (from) from.hidden = !Number.isFinite(minimum) || minimum === maximum;
    summary.dataset.familyPricesReady = 'true';
  }
}

if (!customElements.get('acla-savings-badge')) customElements.define('acla-savings-badge', SavingsBadge);
