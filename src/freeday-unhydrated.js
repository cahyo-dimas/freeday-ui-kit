/* Freeday, un-hydrated hook warning (optional, zero-dependency, no markup of its own).
 * Every enhancer marks the element it took over (`data-fdy-*-ready`). Markup that no initAll()
 * ever reached carries the hook and not the mark, and it fails in the worst way available: it
 * renders, looks finished, and does nothing, with no error anywhere. A `data-fdy-validate` form
 * outside the subtree handed to useFreeday() neither paints a message nor fires fdy-form-valid,
 * so its save button reads as dead (CATATAN-FREEDAY §10). The enhancer knows the attribute is
 * there; the person who wrote it does not.
 *
 * So on the first click, focus or submit inside such an element this logs ONE console.warn per
 * element, naming the hook, with the element itself as the second argument so devtools links it.
 * Interaction, not load, is the trigger on purpose: a framework mounts and hydrates in between,
 * and only once a person is touching the widget is "not enhanced yet" the same as "never".
 *
 * HOOKS pairs each hook selector with the ready flag its enhancer stamps on THAT element and the
 * namespace that owns it. A hook whose enhancer is not loaded is skipped: that is a different
 * mistake, and this message would misname it. test/docs.test.mjs fails if an enhancer gains a
 * ready flag this table does not list.
 *
 * `data-fdy-ignore` on an element or any ancestor is the sanctioned way out: every enhancer skips
 * that subtree, and this stays quiet about it. It is for markup whose behaviour something else
 * owns: the kit's own Vue/React FdyDrawer, and kit classes an app uses for their look
 * alone (CATATAN-FREEDAY §14: a chip matrix the app drives itself).
 *
 * The same click also checks `.fdy-btn--stretch`, the other kit piece whose misuse renders fine and
 * fails silently. Its overlay covers the nearest ancestor that is a containing block. With none but
 * <body>/<html>, it covers the whole page: every tap anywhere lands on that one button, and nothing
 * looks wrong (CATATAN-FREEDAY §19: a sign-out button that took every tap on a settings screen).
 * A second stretched target inside the area one covers overlaps it the same way, and the last one
 * in the DOM takes every tap meant for the other. A misplaced overlay makes itself the click target of
 * whatever is tapped, so the first tap anywhere on the page is enough to report it. Hit-testing
 * clicks in e2e tests reach it too.
 */
(function () {
  'use strict';

  var HOOKS = [
    ['[data-fdy-app]', 'fdyAppShellReady', 'FreedayAppShell'],
    ['[data-fdy-autocomplete]', 'fdyAcReady', 'FreedayAutocomplete'],
    ['[data-fdy-carousel]', 'fdyCarouselReady', 'FreedayCarousel'],
    ['[data-fdy-cascade]', 'fdyCascadeReady', 'FreedayCascade'],
    ['[data-fdy-cfl]', 'fdyCflBound', 'FreedayCfl'],
    ['[data-fdy-cfl-open]', 'fdyCflBound', 'FreedayCfl'],
    ['[data-fdy-chart]', 'fdyChartReady', 'FreedayChart'],
    ['[data-fdy-chips]', 'fdyChipsReady', 'FreedayChip'],
    ['.fdy-chip__remove', 'fdyChipRmReady', 'FreedayChip'],
    ['[data-fdy-datepicker]', 'fdyDpReady', 'FreedayDatepicker'],
    ['[data-fdy-daterange]', 'fdyDrReady', 'FreedayDatepicker'],
    ['[data-fdy-datetimepicker]', 'fdyDtReady', 'FreedayDatetime'],
    ['[data-fdy-drawer]', 'fdyDrawerBound', 'FreedayDrawer'],
    ['.fdy-drawer', 'fdyDrawerReady', 'FreedayDrawer'],
    ['[data-fdy-validate]', 'fdyFormReady', 'FreedayForm'],
    ['[data-fdy-mask]', 'fdyMaskReady', 'FreedayMask'],
    ['[data-fdy-password]', 'fdyPwReady', 'FreedayMask'],
    ['[data-fdy-menu]', 'fdyMenuReady', 'FreedayMenu'],
    ['[data-fdy-number]', 'fdyNumberReady', 'FreedayNumber'],
    ['[data-fdy-rating]', 'fdyRatingReady', 'FreedayRating'],
    ['[data-fdy-search]', 'fdySearchReady', 'FreedaySearch'],
    ['[data-fdy-combo]', 'fdyComboReady', 'FreedayCombo'],
    ['[data-fdy-slider]', 'fdySliderReady', 'FreedaySlider'],
    ['[data-fdy-sortable]', 'fdySortableReady', 'FreedaySortable'],
    ['[data-fdy-stepper]', 'fdyStepperReady', 'FreedayStepper'],
    ['[data-fdy-table]', 'fdyTableReady', 'FreedayTable'],
    ['[data-fdy-tabs]', 'fdyTabsReady', 'FreedayTabs'],
    ['[data-fdy-timepicker]', 'fdyTpReady', 'FreedayTimepicker'],
    ['[data-fdy-tree]', 'fdyTreeReady', 'FreedayTree'],
    ['[data-fdy-dropzone]', 'fdyUploadReady', 'FreedayUpload']
  ];

  var warned = typeof WeakSet === 'function' ? new WeakSet() : null;

  function check(e) {
    if (!warned || !e.target || !e.target.closest) return;
    for (var i = 0; i < HOOKS.length; i++) {
      var hook = HOOKS[i];
      if (!window[hook[2]]) continue;
      var el = e.target.closest(hook[0]);
      if (!el || el.dataset[hook[1]] === '1' || warned.has(el) || el.closest('[data-fdy-ignore]')) continue;
      warned.add(el);
      console.warn('Freeday: this ' + hook[0] + ' was never enhanced, so it does nothing. Either it is '
        + 'outside every initAll() scope (Vue/React: inside the element given to useFreeday(); Blazor: '
        + 'FreedayBlazor.initAll after render; anything else: ' + hook[2] + '.initAll(el) once it is in '
        + 'the DOM), or its markup lacks a part the enhancer needs (see COMPONENTS.md). If the app '
        + 'drives this element itself on purpose, mark it or an ancestor data-fdy-ignore.', el);
    }
  }

  /* What an absolutely positioned box resolves against: the nearest ancestor that is positioned or
     that a transform, filter, perspective, containment or will-change of those turns into a
     containing block. null means the initial containing block, i.e. the viewport. */
  function anchorOf(el) {
    for (var n = el.parentElement; n; n = n.parentElement) {
      var s = getComputedStyle(n);
      if (s.position !== 'static' || s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none'
        || (s.backdropFilter && s.backdropFilter !== 'none')
        || /layout|paint|strict|content/.test(s.contain || '')
        || (s.containerType && s.containerType !== 'normal')
        || /transform|filter|perspective/.test(s.willChange || '')) return n;
    }
    return null;
  }

  function checkStretch(e) {
    var btn = warned && e.target && e.target.closest ? e.target.closest('.fdy-btn--stretch') : null;
    if (!btn || warned.has(btn)) return;
    var host = anchorOf(btn);
    if (host === null || host === document.body || host === document.documentElement) {
      warned.add(btn);
      console.warn('Freeday: this .fdy-btn--stretch has no containing block below <body>, so its hit '
        + 'area covers the whole page and a tap anywhere lands on it. Put it in a .fdy-card or '
        + '.fdy-list__row, make the element it should cover position:relative, or drop the modifier '
        + 'if the button is not meant to cover anything.', btn);
      return;
    }
    /* Any other rendered target in the covered area counts, even one inside a card of its own: this
       overlay paints over that card as well. */
    var rivals = Array.prototype.filter.call(host.querySelectorAll('.fdy-btn--stretch'), function (o) {
      return o !== btn && o.getClientRects().length > 0;
    });
    if (rivals.length === 0) return;
    warned.add(btn);
    console.warn('Freeday: this .fdy-btn--stretch shares its covered area with ' + rivals.length + ' other '
      + 'stretched target(s), so the last one in the DOM takes every tap in it, including taps meant '
      + 'for the others. Give each one its own .fdy-card / .fdy-list__row, or make each one\'s own '
      + 'container position:relative.', btn, host);
  }

  ['click', 'focusin', 'submit'].forEach(function (type) {
    document.addEventListener(type, check, true);
  });
  document.addEventListener('click', checkStretch, true);

  window.FreedayUnhydrated = { hooks: HOOKS };
})();
