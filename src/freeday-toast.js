/* Freeday — toast API (optional, zero-dependency).
 * Freeday.toast({ variant, title, message, timeout, key }) shows a transient
 * notification in a live region (created on first use). Returns the element.
 *   variant: 'success' | 'warning' | 'danger' | 'info' (default: neutral)
 *   timeout: ms before auto-dismiss (default 4000; 0 = sticky)
 *   key:     optional stable id — a new toast with the same key REPLACES the
 *            existing one in place instead of stacking a duplicate (e.g. a burst
 *            of identical failures shows one toast, refreshed).
 * Freeday.dismiss(nodeOrKey) closes a toast early (pass the returned element or its key).
 * Danger toasts use role="alert"; others role="status".
 */
(function () {
  'use strict';

  var region = null;
  var keyed = {}; // key -> current node, for replace-in-place + dismiss-by-key

  function forget(node) {
    var k = node && node._fdyKey;
    if (k != null && keyed[k] === node) delete keyed[k];
  }

  function ensureRegion() {
    if (region && document.body.contains(region)) return region;
    region = document.querySelector('.fdy-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'fdy-toast-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'false');
      document.body.appendChild(region);
    }
    return region;
  }

  function dismiss(toast) {
    if (typeof toast === 'string') toast = keyed[toast]; // dismiss by key
    if (!toast || toast.dataset.leaving === '1') return;
    forget(toast);
    toast.dataset.leaving = '1';
    toast.classList.add('is-leaving');
    var remove = function () { if (toast.parentNode) toast.parentNode.removeChild(toast); };
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { remove(); return; }
    var done = false;
    var finish = function () { if (!done) { done = true; remove(); } };
    toast.addEventListener('transitionend', finish);
    setTimeout(finish, 400); // fallback if transitionend never fires
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function toast(opts) {
    opts = opts || {};
    var region = ensureRegion();
    var node = el('div', 'fdy-toast' + (opts.variant ? ' fdy-toast--' + opts.variant : ''));
    node.setAttribute('role', opts.variant === 'danger' ? 'alert' : 'status');

    var accent = el('span', 'fdy-toast__accent');
    accent.setAttribute('aria-hidden', 'true');
    var body = el('div', 'fdy-toast__body');
    if (opts.title) body.appendChild(el('div', 'fdy-toast__title', opts.title));
    if (opts.message) body.appendChild(el('div', 'fdy-toast__text', opts.message));

    var close = el('button', 'fdy-toast__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Tutup');
    close.innerHTML = '&times;';
    close.addEventListener('click', function () { dismiss(node); });

    node.appendChild(accent);
    node.appendChild(body);
    node.appendChild(close);

    // Replace-in-place: a same-key toast removes the previous one so bursts don't stack.
    if (opts.key != null) {
      var prev = keyed[opts.key];
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
      node._fdyKey = opts.key;
      keyed[opts.key] = node;
    }
    region.appendChild(node);

    var timeout = opts.timeout == null ? 4000 : opts.timeout;
    if (timeout > 0) setTimeout(function () { dismiss(node); }, timeout);
    return node;
  }

  // Pre-create the live region so the FIRST status toast is reliably announced
  // (some screen readers ignore a live region created in the same tick as its content).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureRegion);
  } else {
    ensureRegion();
  }

  window.Freeday = window.Freeday || {};
  window.Freeday.toast = toast;
  window.Freeday.dismiss = dismiss; // dismiss(nodeOrKey)
})();
