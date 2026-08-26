/* Freeday, busy overlay (optional, zero-dependency).
 *
 * Freeday.busy({ caption, delay, mark })  block the screen while an operation runs
 * Freeday.idle()                          release it
 *
 * Imperative on purpose, like Freeday.toast(): a component API invites two instances, and two
 * blocking overlays with two captions is the failure this exists to prevent. A second busy() while
 * one is up REPLACES the caption rather than stacking.
 *
 *   caption  what is happening. Announced politely, so make it a sentence a reader would want read
 *            out, not a spinner label. Omitted, it falls back to the kit default, which a page
 *            overrides once with `data-fdy-text-caption` on <html>.
 *   delay    ms to wait before it appears (default 120; 0 shows immediately). An operation that
 *            finishes in 80ms should never flash a scrim — that reads as a glitch, not as progress.
 *   mark     an Element to use instead of the default spinner. Element only, never an HTML string:
 *            a string here would be an injection point in every app that passed user text through.
 *
 * Not a dialog. Interaction is removed with `inert` on everything else, so there is nothing to trap
 * focus against and nothing to dismiss. Focus is parked on the panel and given back on idle(),
 * because the element it was on is inert by then and the browser would otherwise drop it to <body>.
 */
(function () {
  'use strict';

  var DEFAULT_DELAY = 120;

  var TEXT = {
    caption: 'Working…'
  };
  /* The overlay has no root of its own to carry an override — it is created, not hydrated — so the
     lookup goes to <html>, the one element every page has before this runs. Kebab-cased for the
     same reason as everywhere else: HTML lowercases attribute names, so a camelCase key could only
     ever be written run-together and the override would fail silently. */
  function textOf(key) {
    var root = document.documentElement;
    var kebab = root.getAttribute('data-fdy-text-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }));
    var custom = kebab != null && kebab !== '' ? kebab : root.getAttribute('data-fdy-text-' + key);
    return custom != null && custom !== '' ? custom : TEXT[key];
  }

  var node = null;
  var showTimer = null;
  var inerted = [];
  var returnFocusTo = null;

  function build() {
    var el = document.createElement('div');
    el.className = 'fdy-busy';
    el.setAttribute('popover', 'manual');
    el.setAttribute('aria-busy', 'true');
    el.tabIndex = -1;

    var panel = document.createElement('div');
    panel.className = 'fdy-busy__panel';

    var mark = document.createElement('div');
    mark.className = 'fdy-busy__mark';
    // aria-hidden: the caption below is the message. A second announcement from the spinner's own
    // role="status" would say "busy" twice and name nothing.
    mark.setAttribute('aria-hidden', 'true');
    mark.appendChild(defaultMark());

    var caption = document.createElement('p');
    caption.className = 'fdy-busy__caption';
    // role="status" rather than a dialog role: this reports a state, it does not ask a question.
    caption.setAttribute('role', 'status');

    panel.appendChild(mark);
    panel.appendChild(caption);
    el.appendChild(panel);
    return el;
  }

  function defaultMark() {
    var spinner = document.createElement('span');
    spinner.className = 'fdy-spinner fdy-spinner--lg';
    return spinner;
  }

  /** inert everything else, remembering ONLY what we set so an app's own inert is never cleared. */
  function block(on) {
    var i;
    if (on) {
      var kids = document.body.children;
      for (i = 0; i < kids.length; i++) {
        var child = kids[i];
        if (child === node || child.hasAttribute('inert')) continue;
        child.setAttribute('inert', '');
        inerted.push(child);
      }
      return;
    }
    for (i = 0; i < inerted.length; i++) inerted[i].removeAttribute('inert');
    inerted = [];
  }

  function isOpen() {
    return node !== null && node.classList.contains('is-open');
  }

  function setCaption(text) {
    node.querySelector('.fdy-busy__caption').textContent = text;
  }

  function setMark(el) {
    var slot = node.querySelector('.fdy-busy__mark');
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    slot.appendChild(el instanceof Element ? el : defaultMark());
  }

  function show(opts) {
    showTimer = null;
    setCaption(opts.caption == null ? textOf('caption') : String(opts.caption));
    if (opts.mark !== undefined) setMark(opts.mark);

    returnFocusTo = document.activeElement;
    document.body.appendChild(node);
    node.classList.add('is-open');
    // Top layer, so it also covers an open <dialog>. Where the API is missing the z-index in
    // busy.css is the fallback; it cannot clear a modal, and that is stated in COMPONENTS.md.
    if (typeof node.showPopover === 'function') {
      try { node.showPopover(); } catch (e) { /* already open, or not connected yet */ }
    }
    block(true);
    node.focus();
  }

  function busy(options) {
    var opts = options || {};
    if (node === null) node = build();

    // Already up: this is a second owner talking. Update what it says, do not stack.
    if (isOpen()) {
      if (opts.caption != null) setCaption(String(opts.caption));
      if (opts.mark !== undefined) setMark(opts.mark);
      return node;
    }

    var delay = opts.delay == null ? DEFAULT_DELAY : Number(opts.delay);
    if (showTimer !== null) clearTimeout(showTimer);
    if (delay > 0) showTimer = setTimeout(function () { show(opts); }, delay);
    else show(opts);
    return node;
  }

  function idle() {
    // Cancels a pending show too: an operation that beat the delay must leave nothing behind.
    if (showTimer !== null) { clearTimeout(showTimer); showTimer = null; }
    if (node === null || !isOpen()) return;

    block(false);
    if (typeof node.hidePopover === 'function') {
      try { node.hidePopover(); } catch (e) { /* was never in the top layer */ }
    }
    node.classList.remove('is-open');
    if (node.parentNode !== null) node.parentNode.removeChild(node);

    // Give focus back to whatever had it, now that its ancestor is no longer inert.
    if (returnFocusTo !== null && typeof returnFocusTo.focus === 'function' && returnFocusTo.isConnected) {
      returnFocusTo.focus();
    }
    returnFocusTo = null;
  }

  window.Freeday = window.Freeday || {};
  window.Freeday.busy = busy;
  window.Freeday.idle = idle;
})();
