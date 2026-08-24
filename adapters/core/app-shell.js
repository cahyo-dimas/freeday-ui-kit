// Freeday — framework-agnostic app-shell behaviour (DOM helpers, zero dependencies).
//
// The focus trap, `inert` bookkeeping and focus restore shared by FdyAppShell in the Vue, React and
// Blazor adapters. Kept here — plain ESM with a .d.ts sidecar — for the same reason as
// table-model.js: three copies of a focus trap is three chances to write it differently, and the
// one that gets it wrong strands a keyboard user with no way out of a nav panel.
//
// The vanilla enhancer (src/freeday-app-shell.js) deliberately does NOT import this: dist/freeday.js
// is a plain IIFE concatenation with no module system. That leaves exactly two implementations, and
// browser/adapter.mjs holds them to the same observable behaviour.
//
// State stays with the caller. These functions read and write the DOM and nothing else, so a
// controlled wrapper can own `navOpen` as a prop and still get the parts that are easy to forget.

import { breakpoints } from '../../tokens/breakpoints.mjs';

/** The media query the shell switches at — the same 721px app-shell.css uses. */
export const NAV_QUERY = `(min-width: ${breakpoints.nav}px)`;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),'
  + ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The shell's parts, or nulls. Callers pass the root element they rendered.
 * @param {HTMLElement} root
 */
export function shellParts(root) {
  return {
    sidebar: root.querySelector('.fdy-app__sidebar'),
    content: root.querySelector('.fdy-app__content'),
    toggle: root.querySelector('.fdy-app__navtoggle'),
    backdrop: root.querySelector('.fdy-app__backdrop'),
  };
}

/**
 * Focusable descendants, in tab order, that are actually rendered.
 * getClientRects() rather than offsetParent: an overlay sidebar is position:fixed, and a fixed
 * element reports no offsetParent at all — filtering on that calls every nav item invisible.
 * @param {HTMLElement} el
 * @returns {HTMLElement[]}
 */
export function focusablesIn(el) {
  return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), (node) => node.getClientRects().length > 0);
}

/**
 * Reconcile the parts of the shell that are not classes: `inert` and `aria-expanded`.
 *
 * One rule, both modes — the sidebar is inert whenever the nav is not visible. `width:0` (collapsed)
 * and `translateX(-100%)` (off-canvas) hide a panel from the eye and neither hides it from the
 * keyboard, so without this a nav nobody can see still swallows Tab on the way into the page.
 * The content is inert only while the nav is an open overlay.
 *
 * @param {HTMLElement} root
 * @param {{navVisible: boolean, overlay: boolean}} state
 */
export function applyShellState(root, state) {
  const { sidebar, content, toggle } = shellParts(root);
  if (toggle) toggle.setAttribute('aria-expanded', String(state.navVisible));
  setInert(sidebar, !state.navVisible);
  setInert(content, state.overlay && state.navVisible);
}

/**
 * Move focus into the panel, and hand back whatever had it — the caller keeps that until close.
 * @param {HTMLElement} root
 * @returns {Element|null} the element that was focused before
 */
export function focusPanel(root) {
  const previous = document.activeElement;
  const { sidebar } = shellParts(root);
  if (sidebar === null) return previous;
  const first = focusablesIn(sidebar)[0];
  if (first !== undefined) {
    first.focus();
  } else {
    sidebar.setAttribute('tabindex', '-1');
    sidebar.focus();
  }
  return previous;
}

/**
 * Put focus back where it came from. Anything gone, detached, or the body itself falls back to the
 * toggle: document.body is where a keyboard user gets stranded with nothing to press.
 * @param {HTMLElement} root
 * @param {Element|null} previous
 */
export function restoreFocus(root, previous) {
  const { toggle } = shellParts(root);
  const usable = previous !== null && previous !== document.body && document.contains(previous)
    && typeof previous.focus === 'function';
  const target = usable ? previous : toggle;
  if (target !== null && typeof target.focus === 'function') target.focus();
}

/**
 * Cycle Tab inside the panel. Call from a keydown handler while the overlay is open.
 * `inert` on the content stops Tab reaching the page; without this the focus would still walk out
 * of the document into the browser's own chrome.
 * @param {HTMLElement} root
 * @param {KeyboardEvent} event
 * @returns {boolean} true when focus was moved
 */
export function trapTab(root, event) {
  if (event.key !== 'Tab') return false;
  const { sidebar } = shellParts(root);
  if (sidebar === null) return false;
  const items = focusablesIn(sidebar);
  if (items.length === 0) {
    event.preventDefault();
    return false;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

function setInert(el, on) {
  if (el === null) return;
  if (on) el.setAttribute('inert', '');
  else el.removeAttribute('inert');
}
