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
      if (!el || el.dataset[hook[1]] === '1' || warned.has(el)) continue;
      warned.add(el);
      console.warn('Freeday: this ' + hook[0] + ' was never enhanced, so it does nothing. Either it is '
        + 'outside every initAll() scope (Vue/React: inside the element given to useFreeday(); Blazor: '
        + 'FreedayBlazor.initAll after render; anything else: ' + hook[2] + '.initAll(el) once it is in '
        + 'the DOM), or its markup lacks a part the enhancer needs (see COMPONENTS.md).', el);
    }
  }

  ['click', 'focusin', 'submit'].forEach(function (type) {
    document.addEventListener(type, check, true);
  });

  window.FreedayUnhydrated = { hooks: HOOKS };
})();
