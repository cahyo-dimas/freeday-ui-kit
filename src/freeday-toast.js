/* Freeday, toast API (optional, zero-dependency).
 * Freeday.toast({ variant, title, message, timeout, key }) shows a transient
 * notification in a live region (created on first use). Returns the element.
 *   variant: 'success' | 'warning' | 'danger' | 'info' (default: neutral)
 *   timeout: ms before auto-dismiss (default 4000; 0 = sticky)
 *   key:     optional stable id, a new toast with the same key REPLACES the
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
      /* `manual`, not `auto`: an auto popover light-dismisses on an outside click and closes
         itself the moment another popover opens. A toast is dismissed by its timer or its own
         close button, by nobody else. */
      region.setAttribute('popover', 'manual');
      document.body.appendChild(region);
    }
    return region;
  }

  /* Put the region in the TOP LAYER, above any open <dialog>.
   *
   * A modal dialog lives in the top layer, where z-index does not reach, so a toast raised by an
   * action taken inside a modal was painted behind that modal's backdrop, which is where an error
   * message is least useful. showPopover() joins the same layer, and membership there is ordered by
   * when you joined: hide-then-show re-joins at the top, so a toast shown while a dialog is open
   * lands above it rather than under the dialog that was opened after the last toast.
   *
   * Guarded twice on purpose. `showPopover` is absent before Chrome 114 / Safari 17 / Firefox 125,
   * and the call throws if the element is disconnected or already open, in every one of those
   * cases the region stays an ordinary fixed block at z-index 200, which is what it has always
   * been. A notification must never be the thing that throws.
   */
  function raise(node) {
    if (!node || typeof node.showPopover !== 'function') return;
    try {
      if (node.matches(':popover-open')) node.hidePopover();
      node.showPopover();
    } catch (e) {
      /* Not reachable through the guards above, but a toast is on the error path itself: if
         raising it fails the message still has to appear, one layer down. */
    }
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


  /* User-facing strings. Indonesian by default, documented and deliberate for the raw enhancer
   * path, and every one overridable per element, so a host that speaks another language (the
   * Blazor adapters, an English app on the raw path) supplies its own without forking this file.
   * Keeping them in ONE table is also what lets a guard prove none is hard-coded further down. */
  var TEXT = {
    close: 'Close'
  };
  /* HTML lowercases attribute names, so a camelCase key like `filterText` can only ever be written
     as `data-fdy-text-filtertext`, while the kebab form anybody would reach for,
     `data-fdy-text-filter-text`, becomes a DIFFERENT attribute the enhancer never reads, and the
     override fails silently. So the key is kebab-cased for the lookup; the run-together spelling
     still resolves, for markup written against 1.39.0. */
  function textAttr(root, key) {
    if (!root || !root.getAttribute) return null;
    var kebab = root.getAttribute('data-fdy-text-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }));
    return kebab != null && kebab !== '' ? kebab : root.getAttribute('data-fdy-text-' + key);
  }
  function textOf(root, key, vars) {
    var custom = textAttr(root, key);
    var s = custom != null && custom !== '' ? custom : TEXT[key];
    if (vars) for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
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
    close.setAttribute('aria-label', opts.closeLabel || TEXT.close);
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
    // Raised per toast, not once at startup: a dialog opened AFTER the region joined the top layer
    // would otherwise sit above it, which is the exact case this fixes.
    raise(region);

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
