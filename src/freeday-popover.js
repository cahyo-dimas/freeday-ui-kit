/* Freeday, popover positioning helper (optional, zero-dependency).
 * Lifts a dropdown panel into the top layer via the native Popover API so it escapes ANY
 * ancestor overflow clip (a .fdy-card with overflow:hidden, an app-shell main with
 * overflow:auto, …), then positions it `fixed` against its trigger, flipping above when
 * there is no room below, and matching the trigger width. The panel stays a DOM child of its
 * component, so focus, outside-click (.closest), and ARIA relationships keep working unchanged.
 *
 * Used by the select/combo, datepicker, timepicker, cascade, autocomplete and menu enhancers;
 * the freeday/vue adapter ships an equivalent `usePopover` composable.
 *
 * attach(panel, trigger, opts) -> { show(), hide() }, where opts is { matchWidth, align } and
 * both are described on place() below. show()/hide() also toggle the panel's [hidden]
 * attribute so callers keep using `!panel.hidden` for open-state and the `:not([hidden])`
 * entrance animation still fires. On browsers without the Popover API it degrades to that
 * [hidden] toggle over the panel's existing absolute-positioned CSS (clipped, but functional).
 */
(function () {
  'use strict';

  var GAP = 4; // ~ --space-1, breathing room between trigger and panel
  var supported = typeof HTMLElement !== 'undefined'
    && typeof HTMLElement.prototype.showPopover === 'function';

  // Position `panel` (already shown, so it has a measurable box) against `trigger`'s rect.
  // opts is the object attach() takes, and both keys are optional:
  //   matchWidth  (default true) floors the panel to the trigger width, right for input-shaped
  //               dropdowns (combo/cascade/date/time), skipped for menus that keep their own min-width.
  //   align       'start' (default) lines the panel's LEFT edge up with the trigger's left edge;
  //               'end' lines its RIGHT edge up with the trigger's right edge, which is what a
  //               control parked in a right-hand gutter needs. The panel is kept inside the
  //               viewport either way, so 'end' near the left edge slides right instead of
  //               hanging off it. freeday-menu.js reads it off `.fdy-menu--end`.
  function place(panel, trigger, opts) {
    var o = opts || {};
    /* Take the panel out of the flow BEFORE measuring anything, because until this runs the panel
     * is still `position:absolute` with `top:calc(100% + …)` from its component's stylesheet. An
     * author rule outranks the popover UA style, and in the top layer that `100%` resolves against
     * the viewport, so a panel that has just been shown sits one viewport height down the page and
     * drags the document's scrollable overflow with it. Where scrollbars take layout space (every
     * Windows and Linux browser; macOS overlay scrollbars hide it completely) the document gains a
     * classic scrollbar for the duration, documentElement.clientWidth drops by its width, and the
     * page relays out 15px narrower. A trigger rect read in that instant is a rect from a layout
     * that is about to be undone by the next three lines: measured 961 instead of 976 for an avatar
     * in a 24px gutter, so the menu landed a scrollbar's width to the left of it. */
    panel.style.position = 'fixed';
    panel.style.margin = '0';
    panel.style.inset = 'auto';                 // clear the UA popover centering
    var r = trigger.getBoundingClientRect();
    if (o.matchWidth !== false) panel.style.minWidth = r.width + 'px'; // at least as wide as the trigger
    var ph = panel.offsetHeight, pw = panel.offsetWidth;
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var below = vh - r.bottom - GAP, above = r.top - GAP;
    // Prefer below; flip above only when it doesn't fit below and above has more room.
    var top = (ph <= below || below >= above) ? (r.bottom + GAP) : Math.max(GAP, r.top - GAP - ph);
    var left = (o.align === 'end') ? (r.right - pw) : r.left;
    /* Clamped on BOTH sides, and that is not belt-and-braces: the first line is what keeps a
       start-aligned panel on screen, the second is what keeps an end-aligned one on screen when
       the panel is wider than the room to the left of its trigger. Keeping only one of them
       trades an overflow on one edge for an overflow on the other. */
    if (left + pw > vw - GAP) left = vw - GAP - pw;
    if (left < GAP) left = GAP;
    panel.style.top = Math.round(top) + 'px';
    panel.style.left = Math.round(left) + 'px';
  }

  function attach(panel, trigger, opts) {
    if (supported) panel.setAttribute('popover', 'manual');
    function reposition() { if (supported && panel.matches(':popover-open')) place(panel, trigger, opts); }
    return {
      show: function () {
        panel.hidden = false;
        if (supported) {
          if (!panel.matches(':popover-open')) panel.showPopover();
          place(panel, trigger, opts);
          window.addEventListener('scroll', reposition, true); // capture: any scrolling ancestor
          window.addEventListener('resize', reposition);
        }
      },
      hide: function () {
        if (supported) {
          window.removeEventListener('scroll', reposition, true);
          window.removeEventListener('resize', reposition);
          if (panel.matches(':popover-open')) panel.hidePopover();
        }
        panel.hidden = true;
      }
    };
  }

  window.FreedayPopover = { attach: attach, place: place, supported: supported };
})();
