import { Component } from '@theme/component';

/**
 * Click-operated category rows. Native header-menu owns the outer disclosure.
 * @typedef {object} BrandRefs
 * @property {HTMLButtonElement[]} [toggles]
 * @property {HTMLDivElement[]} [panels]
 * @extends {Component<BrandRefs>}
 */
class AclaBrandMenu extends Component {
  #controller;
  #activeButton;

  connectedCallback() {
    super.connectedCallback();
    this.#controller = new AbortController();
    this.addEventListener('keydown', this.#handleKeydown, { signal: this.#controller.signal });
  }

  updatedCallback() {
    super.updatedCallback();
    this.closeBrands();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#controller?.abort();
    this.#activeButton = undefined;
  }

  /** Toggle a category row from its label or chevron. @param {MouseEvent} event */
  toggleBrand = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.getAttribute('aria-expanded') === 'true') this.closeBrands();
    else this.#open(button);
  };

  /** Public method: the outer disclosure resets nested rows when it closes. */
  closeBrands = () => {
    for (const button of this.refs.toggles || []) button.setAttribute('aria-expanded', 'false');
    for (const panel of this.refs.panels || []) panel.hidden = true;
    this.#activeButton = undefined;
  };

  /** @param {HTMLButtonElement} button */
  #open(button) {
    const panel = this.#panel(button);
    if (!panel) return;
    this.closeBrands();
    this.#activeButton = button;
    button.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
  }

  /** @param {HTMLButtonElement} button */
  #panel(button) {
    return (this.refs.panels || []).find(panel => panel.id === button.getAttribute('aria-controls'));
  }

  /** @param {KeyboardEvent} event */
  #handleKeydown = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (event.key === 'ArrowDown' && button instanceof HTMLButtonElement && this.contains(button)) {
      event.preventDefault();
      event.stopPropagation();
      this.#open(button);
      this.#panel(button)?.querySelector('a')?.focus();
    } else if (this.#activeButton && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      const activeButton = this.#activeButton;
      this.closeBrands();
      activeButton.focus();
    }
  };
}

if (!customElements.get('acla-brand-menu')) customElements.define('acla-brand-menu', AclaBrandMenu);
