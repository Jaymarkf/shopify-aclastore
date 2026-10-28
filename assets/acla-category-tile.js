import { Component } from '@theme/component';

/** Keep the native slideshow in sync with unsaved theme-editor block changes. */
class CategoryTile extends Component {
  #observer;
  #controller;
  #frame;
  #selectionFrame;
  #slides = [];
  #visibleSignature = '';
  #editingSlide;

  connectedCallback() {
    super.connectedCallback();
    this.#controller = new AbortController();
    this.#observer = new MutationObserver(() => this.#schedule());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'hidden'],
    });
    this.addEventListener('shopify:block:select', this.#selectBlock, { signal: this.#controller.signal });
    this.addEventListener('shopify:block:deselect', this.#deselectBlock, { signal: this.#controller.signal });
    const controller = this.#controller;
    customElements.whenDefined('slideshow-component').then(() => {
      if (!controller.signal.aborted) this.#schedule();
    });
  }

  updatedCallback() {
    super.updatedCallback();
    this.#schedule();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#controller?.abort();
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#frame);
    cancelAnimationFrame(this.#selectionFrame);
    this.#frame = undefined;
    this.#slides = [];
    this.#visibleSignature = '';
    this.#editingSlide = undefined;
  }

  #schedule() {
    if (this.#frame !== undefined) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#sync();
    });
  }

  #selectBlock = event => {
    if (!(event.target instanceof Element)) return;
    const slide = event.target.closest('slideshow-slide');
    if (!slide || slide.closest('acla-category-tile') !== this) return;
    this.#editingSlide = slide;
    this.#schedule();
  };

  #deselectBlock = () => {
    this.#editingSlide = undefined;
  };

  #sync() {
    if (!customElements.get('slideshow-component')) return;
    const carousel = this.querySelector(':scope > slideshow-component');
    const scroller = carousel?.querySelector(':scope > slideshow-container > slideshow-slides');
    if (!carousel || !scroller || !this.isConnected) return;
    // The editor can insert the first new block beside the carousel before its
    // parent is re-rendered. Keep those actual block nodes in the live track.
    const nested = [...this.querySelectorAll('.acla-category-tile__nested-slide')].filter(slide => slide.closest('acla-category-tile') === this);
    if (nested.some(slide => slide.parentElement !== scroller)) scroller.append(...nested);
    const slides = [...scroller.querySelectorAll(':scope > slideshow-slide')];
    const visible = slides.filter(slide => !slide.hidden);
    const configured = visible.filter(slide => slide.querySelector('img')?.getAttribute('src')?.trim());
    this.toggleAttribute('data-multiple-slides', configured.length > 1);
    this.dataset.slideCount = String(configured.length);

    const signature = visible.map(slide => slide.getAttribute('slide-id')).join('|');
    const changed = slides.length !== this.#slides.length || slides.some((slide, i) => slide !== this.#slides[i]) || signature !== this.#visibleSignature;
    const current = visible[Number(carousel.current)];
    const selected = this.#editingSlide && visible.includes(this.#editingSlide)
      ? this.#editingSlide
      : configured.includes(current) ? current : configured[0] || visible[0];
    this.#slides = slides;
    this.#visibleSignature = signature;
    if (!changed) {
      if (this.#editingSlide && selected) carousel.select?.({ id: selected.getAttribute('slide-id') }, undefined, { animate: false });
      return;
    }

    // Native slideshow initialization depends on its initial DOM. Reconnect only
    // that component when blocks change, moving (not cloning) merchant block nodes.
    const focused = this.contains(document.activeElement) ? document.activeElement : null;
    const placeholder = document.createComment('category-carousel');
    carousel.replaceWith(placeholder);
    const replacement = carousel.cloneNode(false);
    for (const attribute of ['in-viewport', 'transitioning', 'dragging', 'disabled', 'actioned']) replacement.removeAttribute(attribute);
    replacement.setAttribute('initial-slide', '0');
    replacement.append(...carousel.childNodes);
    placeholder.replaceWith(replacement);
    const controller = this.#controller;
    cancelAnimationFrame(this.#selectionFrame);
    this.#selectionFrame = requestAnimationFrame(() => {
      this.#selectionFrame = requestAnimationFrame(() => {
        if (controller.signal.aborted || !replacement.isConnected) return;
        if (selected) replacement.select?.({ id: selected.getAttribute('slide-id') }, undefined, { animate: false });
        if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
      });
    });
  }
}

if (!customElements.get('acla-category-tile')) customElements.define('acla-category-tile', CategoryTile);
