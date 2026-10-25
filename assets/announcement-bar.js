import { Component } from '@theme/component';

/**
 * Announcement slideshow and measured, continuous marquee. The original messages
 * remain accessible; visual copies never add duplicate keyboard stops.
 * @typedef {object} Refs
 * @property {HTMLElement[]} [slides]
 * @property {HTMLElement} [viewport]
 * @property {HTMLElement} [track]
 * @property {HTMLElement} [source]
 * @property {HTMLButtonElement} [pauseButton]
 * @extends {Component<Refs>}
 */
export class AnnouncementBar extends Component {
  #current = 0;
  #interval;
  #controller;
  #observer;
  #animation;
  #frame;
  #signature = '';
  #userPaused = false;
  #hoverPaused = false;
  #focusPaused = false;
  #motion;

  connectedCallback() {
    super.connectedCallback();
    this.#initialize();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#cleanup();
    this.#initialize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#cleanup();
  }

  #initialize() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.#motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.#motion.addEventListener('change', this.#refresh, { signal });
    document.addEventListener('visibilitychange', this.#syncPlayback, { signal });
    this.addEventListener('pointerenter', () => {
      this.#hoverPaused = this.hasAttribute('data-pause-on-hover');
      this.#syncPlayback();
    }, { signal });
    this.addEventListener('pointerleave', () => {
      this.#hoverPaused = false;
      this.#syncPlayback();
    }, { signal });
    this.addEventListener('focusin', (event) => {
      this.#focusPaused = event.target instanceof Element && Boolean(event.target.closest('.announcement-bar__slide'));
      this.#syncPlayback();
      // Focusable originals must remain visible, including in a rightward loop.
      if (event.target instanceof HTMLElement && this.refs.source?.contains(event.target)) {
        if (this.#animation) this.#animation.currentTime = this.dataset.direction === 'right'
          ? Math.max(0, Number(this.#animation.effect?.getTiming().duration) - 0.01) : 0;
        event.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      }
    }, { signal });
    this.addEventListener('focusout', (event) => {
      this.#focusPaused = event.relatedTarget instanceof Element && Boolean(event.relatedTarget.closest('.announcement-bar__slide'));
      this.#syncPlayback();
    }, { signal });
    this.addEventListener('shopify:block:select', this.#selectBlock, { signal });
    this.addEventListener('shopify:block:deselect', () => {
      this.#focusPaused = this.contains(document.activeElement);
      this.#syncPlayback();
    }, { signal });
    if (this.dataset.mode === 'marquee' && this.refs.source && this.refs.viewport) {
      this.#observer = new ResizeObserver(this.#scheduleMeasure);
      this.#observer.observe(this.refs.source);
      this.#observer.observe(this.refs.viewport);
      document.fonts?.ready.then(() => { if (!signal.aborted) this.#scheduleMeasure(); });
    }
    this.#refresh();
  }

  #refresh = () => {
    this.#signature = '';
    this.#animation?.cancel();
    this.#animation = undefined;
    this.#removeCopies();
    this.removeAttribute('data-ready');
    this.#userPaused = false;
    if (this.dataset.mode === 'marquee') {
      if (!this.#motion?.matches) {
        this.setAttribute('data-ready', '');
        this.#scheduleMeasure();
      }
    } else if (this.dataset.mode !== 'static') {
      this.current = Math.min(this.#current, Math.max(0, (this.refs.slides?.length ?? 1) - 1));
      if (this.autoplay && !this.#motion?.matches) this.setAttribute('data-ready', '');
    }
    this.#syncPlayback();
  };

  #scheduleMeasure = () => {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#measure();
    });
  };

  #measure() {
    const { track, source, viewport } = this.refs;
    if (!track || !source || !viewport || this.#motion?.matches || !this.isConnected) return;
    const stride = source.getBoundingClientRect().width;
    const width = viewport.clientWidth;
    if (!stride || !width || !source.children.length) return;
    const speed = Math.max(10, Number(this.dataset.marqueeSpeed) || 40);
    const signature = `${stride}:${width}:${speed}:${this.dataset.direction}`;
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.#animation?.cancel();
    this.#removeCopies();
    // One extra repeat covers the viewport throughout the entire translation.
    const copies = Math.ceil(width / stride) + 1;
    for (let i = 0; i < copies; i++) {
      const clone = /** @type {HTMLElement} */ (source.cloneNode(true));
      clone.setAttribute('data-announcement-copy', '');
      clone.setAttribute('aria-hidden', 'true');
      for (const node of [clone, ...clone.querySelectorAll('*')]) {
        node.removeAttribute('ref');
        node.removeAttribute('id');
        for (const attribute of [...node.attributes]) {
          if (attribute.name.startsWith('data-shopify-editor')) node.removeAttribute(attribute.name);
        }
        if (node.matches('a, button, input, select, textarea, [tabindex]')) node.setAttribute('tabindex', '-1');
      }
      track.append(clone);
    }
    const positions = [`translate3d(0, 0, 0)`, `translate3d(${-stride}px, 0, 0)`];
    if (this.dataset.direction === 'right') positions.reverse();
    this.#animation = track.animate(positions.map(transform => ({ transform })), {
      duration: stride / speed * 1000,
      iterations: Infinity,
      easing: 'linear',
    });
    this.#syncPlayback();
  }

  #removeCopies() {
    for (const copy of this.querySelectorAll('[data-announcement-copy]')) copy.remove();
    if (this.refs.viewport) this.refs.viewport.scrollLeft = 0;
  }

  #syncPlayback = () => {
    const paused = this.#userPaused || this.#hoverPaused || this.#focusPaused || document.hidden || this.#motion?.matches;
    if (this.#animation) {
      if (paused) this.#animation.pause();
      else this.#animation.play();
    }
    this.suspend();
    if (this.dataset.mode !== 'marquee' && this.autoplay && !paused) {
      this.#interval = setInterval(() => this.next(), this.autoplayInterval);
    }
    const button = this.refs.pauseButton;
    if (button) {
      button.setAttribute('aria-pressed', String(this.#userPaused));
      button.setAttribute('aria-label', (this.#userPaused ? this.dataset.playLabel : this.dataset.pauseLabel) ?? '');
    }
  };

  /** Toggle the visitor's persistent pause preference. @param {Event} _event */
  togglePlayback(_event) {
    this.#userPaused = !this.#userPaused;
    this.#syncPlayback();
  }

  /** Preserve the slideshow's public arrow handlers. */
  next() { this.current += 1; }
  previous() { this.current -= 1; }
  play() { this.#userPaused = false; this.#syncPlayback(); }
  pause() { this.#userPaused = true; this.#syncPlayback(); }
  resume() { this.#syncPlayback(); }
  suspend() { clearInterval(this.#interval); this.#interval = undefined; }
  get paused() { return this.#userPaused; }
  get autoplay() { return Boolean(this.autoplayInterval); }
  get autoplayInterval() {
    const seconds = Number(this.getAttribute('autoplay'));
    return seconds > 0 ? seconds * 1000 : undefined;
  }
  get current() { return this.#current; }
  set current(value) {
    this.#current = value;
    const slides = this.refs.slides ?? [];
    if (!slides.length) return;
    const active = ((value % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== active)));
  }

  /** Preview selected messages without motion in the theme editor. @param {Event} event */
  #selectBlock = (event) => {
    this.#focusPaused = true;
    if (this.dataset.mode === 'slideshow') {
      const index = this.refs.slides?.findIndex(slide => slide.contains(/** @type {Node} */ (event.target)));
      if (index !== undefined && index >= 0) this.current = index;
    } else if (this.#animation) {
      this.#animation.currentTime = this.dataset.direction === 'right'
        ? Math.max(0, Number(this.#animation.effect?.getTiming().duration) - 0.01) : 0;
      if (event.target instanceof HTMLElement) event.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
    this.#syncPlayback();
  };

  #cleanup() {
    this.#controller?.abort();
    this.#observer?.disconnect();
    this.#animation?.cancel();
    this.suspend();
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#animation = undefined;
    this.#signature = '';
    this.#hoverPaused = false;
    this.#focusPaused = false;
    this.#removeCopies();
    this.removeAttribute('data-ready');
  }
}

if (!customElements.get('announcement-bar-component')) {
  customElements.define('announcement-bar-component', AnnouncementBar);
}
