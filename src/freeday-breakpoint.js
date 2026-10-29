/* Freeday, breakpoint provider (optional, zero-dependency).
 * The MudBreakpointProvider equivalent for JS consumers: stamps the current breakpoint on
 * <html data-breakpoint="xs|sm|md|lg|xl"> and emits a bubbling "fdy-breakpoint-change"
 * CustomEvent (detail {breakpoint}) whenever it changes. Also fills any element with
 * [data-fdy-breakpoint-label] with the current name. Read it live via FreedayBreakpoint.get().
 * Scale (min-width, px): sm 600 · md 960 · lg 1280 · xl 1920 (matches breakpoints.css).
 */
(function () {
  'use strict';

  var STEPS = [['xl', 1920], ['lg', 1280], ['md', 960], ['sm', 600], ['xs', 0]];

  function current() {
    var w = window.innerWidth;
    for (var i = 0; i < STEPS.length; i++) {
      if (w >= STEPS[i][1]) return STEPS[i][0];
    }
    return 'xs';
  }

  var root = document.documentElement;
  var last = null;

  function update() {
    var bp = current();
    if (bp === last) return;
    last = bp;
    root.setAttribute('data-breakpoint', bp);
    fillLabels(document);
    root.dispatchEvent(new CustomEvent('fdy-breakpoint-change', { bubbles: true, detail: { breakpoint: bp } }));
  }

  /* Also run over late-mounted markup by the stack helpers, which find it through initAll: a label
     rendered after load otherwise stayed empty until the next breakpoint change. */
  function fillLabels(context) {
    var ctx = context || document;
    var bp = last || current();
    if (ctx.matches && ctx.matches('[data-fdy-breakpoint-label]')) ctx.textContent = bp;
    Array.prototype.forEach.call(ctx.querySelectorAll('[data-fdy-breakpoint-label]'), function (el) {
      el.textContent = bp;
    });
  }

  window.addEventListener('resize', update, { passive: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }

  window.FreedayBreakpoint = {
    initAll: fillLabels,
    get: function () { return last || current(); },
    current: current,
    // true if the current breakpoint is `name` or wider (e.g. is('md') → md, lg, or xl)
    isUp: function (name) {
      var order = ['xs', 'sm', 'md', 'lg', 'xl'];
      return order.indexOf(this.get()) >= order.indexOf(name);
    }
  };
})();
