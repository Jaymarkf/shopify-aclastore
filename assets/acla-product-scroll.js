import { Component } from '@theme/component';
import { getScrollContainer } from '@theme/scroll-container';

/**
 * Quarter-page navigation using Horizon's desktop/mobile scroll container.
 * @extends {Component<{button: HTMLButtonElement, progress: HTMLElement}>}
 */
class ProductScroll extends Component {
  requiredRefs = ['button', 'progress'];
  direction = 'down';
  target = null;
  anchorBottom = false;
  frame = null;
  previousMaximum = 0;
  previousTop = 0;

  connectedCallback() {
    super.connectedCallback();
    this.connect();
  }

  updatedCallback() {
    super.updatedCallback();
    this.disconnect();
    this.connect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
  }

  connect() {
    this.controller = new AbortController();
    const { signal } = this.controller;
    document.addEventListener('scroll', this.scheduleUpdate, { capture: true, passive: true, signal });
    window.addEventListener('resize', this.interrupt, { passive: true, signal });
    window.addEventListener('pageshow', this.interrupt, { signal });
    window.visualViewport?.addEventListener('resize', this.scheduleUpdate, { passive: true, signal });
    document.addEventListener('wheel', this.interrupt, { passive: true, signal });
    document.addEventListener('touchstart', this.onTouchStart, { passive: true, signal });
    document.addEventListener('pointerdown', this.onTouchStart, { passive: true, signal });
    document.addEventListener('keydown', this.onKeyDown, { signal });
    document.addEventListener('input', this.interrupt, { signal });
    this.obstructions = [...document.querySelectorAll('.acla-family__order-bar, .sticky-add-to-cart__bar')];
    this.resizeObserver = new ResizeObserver(this.scheduleUpdate);
    for (const element of [document.querySelector('#MainContent'), document.querySelector('footer'), ...this.obstructions]) {
      if (element) this.resizeObserver.observe(element);
    }
    this.more = document.querySelector('[data-family-more]');
    this.moreObserver = new MutationObserver(this.scheduleUpdate);
    if (this.more) this.moreObserver.observe(this.more, { attributes: true, attributeFilter: ['hidden'] });
    this.scheduleUpdate();
  }

  disconnect() {
    this.controller?.abort();
    this.resizeObserver?.disconnect();
    this.moreObserver?.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.target = null;
    this.anchorBottom = false;
  }

  scheduleUpdate = () => {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      if (this.isConnected) this.update();
    });
  };

  interrupt = () => {
    this.target = null;
    this.anchorBottom = false;
    this.scheduleUpdate();
  };

  /** @param {TouchEvent | PointerEvent} event */
  onTouchStart = event => {
    if (event.target instanceof Node && !this.contains(event.target)) this.interrupt();
  };

  /** @param {KeyboardEvent} event */
  onKeyDown = event => {
    if (event.target instanceof Node && !this.contains(event.target) && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) this.interrupt();
  };

  waitingForItems() {
    return this.more && !this.more.hidden && this.more.querySelector('[data-retry-options]')?.hidden;
  }

  /** Stop at a lazy-loading checkpoint rather than jumping past it into the footer. */
  destination(root, desired) {
    if (!this.waitingForItems()) return desired;
    const viewportTop = root === document.scrollingElement ? 0 : root.getBoundingClientRect().top;
    const checkpoint = root.scrollTop + this.more.getBoundingClientRect().top - viewportTop - root.clientHeight + 160;
    if (checkpoint < root.scrollTop - 2) return desired;
    return Math.max(0, Math.min(desired, checkpoint));
  }

  update() {
    const root = getScrollContainer();
    const maximum = Math.max(0, root.scrollHeight - root.clientHeight);
    const top = Math.max(0, Math.min(maximum, root.scrollTop));
    if (this.anchorBottom && this.previousMaximum > 0 && maximum !== this.previousMaximum) {
      this.target = this.destination(root, maximum);
      root.scrollTo({ top: this.target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    this.hidden = maximum < 2;
    // A growing lazy-loaded list has not reached its final bottom yet.
    if (maximum > this.previousMaximum + 2 && this.previousTop >= this.previousMaximum - 2) this.direction = 'down';
    const loadingMore = this.waitingForItems() && this.more.getBoundingClientRect().bottom >= 0;
    if (top <= 2) this.direction = 'down';
    else if (top >= maximum - 2 && !loadingMore) this.direction = 'up';
    this.previousMaximum = maximum;
    this.previousTop = top;
    if (this.target !== null && Math.abs(top - this.target) <= 2) this.target = null;
    this.dataset.direction = this.direction;
    this.refs.button.setAttribute('aria-label', this.direction === 'up' ? this.dataset.upLabel : this.dataset.downLabel);
    this.refs.progress.textContent = `${maximum ? top >= maximum - 2 ? 100 : Math.min(99, Math.round(top * 100 / maximum)) : 0}%`;
    let obstruction = 0;
    for (const element of this.obstructions) {
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height && rect.top < innerHeight && rect.bottom >= innerHeight - 20 && getComputedStyle(element).visibility !== 'hidden') {
        obstruction = Math.max(obstruction, innerHeight - rect.top);
      }
    }
    this.style.setProperty('--acla-scroll-obstruction', `${Math.ceil(obstruction)}px`);
    if (this.waitingForItems()) {
      const checkpoint = this.more.getBoundingClientRect();
      if (checkpoint.top <= innerHeight && checkpoint.bottom >= 0) {
        this.more.dispatchEvent(new CustomEvent('acla:scroll-checkpoint', { bubbles: true }));
      }
    }
  }

  /** Moves one quarter of the current scrollable page; repeated clicks advance the planned target. */
  step() {
    if (document.documentElement.hasAttribute('scroll-lock')) return;
    this.update();
    const root = getScrollContainer();
    const maximum = Math.max(0, root.scrollHeight - root.clientHeight);
    const start = this.target ?? root.scrollTop;
    this.target = Math.max(0, Math.min(maximum, start + maximum / 4 * (this.direction === 'up' ? -1 : 1)));
    this.anchorBottom = this.direction === 'down' && this.target >= maximum - 2;
    if (this.direction === 'down') this.target = this.destination(root, this.target);
    root.scrollTo({ top: this.target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    this.scheduleUpdate();
  }
}

if (!customElements.get('acla-product-scroll')) customElements.define('acla-product-scroll', ProductScroll);
