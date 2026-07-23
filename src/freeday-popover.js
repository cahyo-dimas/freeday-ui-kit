/* Freeday — popover positioning helper (optional, zero-dependency).
 * Lifts a dropdown panel into the top layer via the native Popover API so it escapes ANY
 * ancestor overflow clip (a .fdy-card with overflow:hidden, an app-shell main with
 * overflow:auto, …), then positions it `fixed` against its trigger — flipping above when
 * there is no room below, and matching the trigger width. The panel stays a DOM child of its
 * component, so focus, outside-click (.closest), and ARIA relationships keep working unchanged.
 *
 * Used by the select/combo, datepicker, timepicker, cascade, autocomplete and menu enhancers;
 * the freeday/vue adapter ships an equivalent `usePopover` composable.
 *
 * attach(panel, trigger) -> { show(), hide() }. show()/hide() also toggle the panel's [hidden]
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
  // matchWidth (default true) floors the panel to the trigger width — right for input-shaped
  // dropdowns (combo/cascade/date/time), skipped for menus that keep their own min-width.
  function place(panel, trigger, matchWidth) {
    var r = trigger.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.margin = '0';
    panel.style.inset = 'auto';                 // clear the UA popover centering
    if (matchWidth !== false) panel.style.minWidth = r.width + 'px'; // at least as wide as the trigger
    var ph = panel.offsetHeight, pw = panel.offsetWidth;
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var below = vh - r.bottom - GAP, above = r.top - GAP;
    // Prefer below; flip above only when it doesn't fit below and above has more room.
    var top = (ph <= below || below >= above) ? (r.bottom + GAP) : Math.max(GAP, r.top - GAP - ph);
    var left = r.left;
    if (left + pw > vw - GAP) left = Math.max(GAP, vw - GAP - pw); // keep within the viewport
    panel.style.top = Math.round(top) + 'px';
    panel.style.left = Math.round(left) + 'px';
  }

  function attach(panel, trigger, opts) {
    var matchWidth = !(opts && opts.matchWidth === false);
    if (supported) panel.setAttribute('popover', 'manual');
    function reposition() { if (supported && panel.matches(':popover-open')) place(panel, trigger, matchWidth); }
    return {
      show: function () {
        panel.hidden = false;
        if (supported) {
          if (!panel.matches(':popover-open')) panel.showPopover();
          place(panel, trigger, matchWidth);
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
