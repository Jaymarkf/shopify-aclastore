import { Component } from '@theme/component';

/**
 * Native menu brand panels. The surrounding HeaderMenu owns the top-level disclosure.
 * @typedef {object} BrandRefs
 * @property {HTMLButtonElement[]} [toggles]
 * @property {HTMLUListElement[]} [panels]
 * @extends {Component<BrandRefs>}
 */
class AclaBrandMenu extends Component {
  #controller;
  #activeButton;
  #observer = new ResizeObserver(() => this.#measure());

  connectedCallback() {
    super.connectedCallback();
    this.#controller = new AbortController();
    this.addEventListener('keydown', this.#handleKeydown, { signal: this.#controller.signal });
    this.addEventListener('pointerleave', this.closeBrands, { signal: this.#controller.signal });
  }

  updatedCallback() {
    super.updatedCallback();
    this.closeBrands();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#controller?.abort();
    this.#observer.disconnect();
    this.#activeButton = undefined;
  }

  /** @param {PointerEvent} event */
  openBrand = (event) => {
    if (!(event.target instanceof Element) || event.pointerType === 'touch') return;
    const button = event.target.closest('[data-brand-index]')?.querySelector('button');
    if (button instanceof HTMLButtonElement) this.#open(button);
  };

  /** @param {MouseEvent} event */
  toggleBrand = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.getAttribute('aria-expanded') === 'true') this.closeBrands();
    else this.#open(button);
  };

  closeBrands = () => {
    this.#observer.disconnect();
    for (const button of this.refs.toggles || []) button.setAttribute('aria-expanded', 'false');
    for (const panel of this.refs.panels || []) panel.hidden = true;
    this.#activeButton = undefined;
    this.style.removeProperty('--acla-brand-panel-height');
  };

  /** @param {HTMLButtonElement} button */
  #open(button) {
    const panel = this.#panel(button);
    if (!panel) return;
    this.closeBrands();
    this.#activeButton = button;
    button.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    this.#observer.observe(panel);
    this.#measure();
  }

  /** @param {HTMLButtonElement} button */
  #panel(button) {
    return (this.refs.panels || []).find(panel => panel.id === button.getAttribute('aria-controls'));
  }

  #measure() {
    if (!this.#activeButton) return;
    const panel = this.#panel(this.#activeButton);
    if (panel) this.style.setProperty('--acla-brand-panel-height', `${panel.getBoundingClientRect().height}px`);
  }

  /** @param {KeyboardEvent} event */
  #handleKeydown = (event) => {
    if (!(event.target instanceof Element)) return;
    const brand = event.target.closest('[data-brand-index]');
    const button = brand?.querySelector('button');
    if (!(button instanceof HTMLButtonElement)) return;
    const enterKey = getComputedStyle(this).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const exitKey = enterKey === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';
    if (event.key === enterKey && !event.target.closest('.acla-brand-menu__families')) {
      event.preventDefault();
      event.stopPropagation();
      this.#open(button);
      this.#panel(button)?.querySelector('a')?.focus();
    } else if (this.#activeButton && (event.key === 'Escape' || event.key === exitKey)) {
      event.preventDefault();
      event.stopPropagation();
      const activeButton = this.#activeButton;
      this.closeBrands();
      activeButton.focus();
    }
  };
}

if (!customElements.get('acla-brand-menu')) customElements.define('acla-brand-menu', AclaBrandMenu);
