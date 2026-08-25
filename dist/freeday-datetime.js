/* Freeday, datetime picker composer (optional, zero-dependency).
 * Combines a child date picker and time picker into one value. It does not build
 * anything itself, freeday-datepicker.js and freeday-timepicker.js enhance the
 * children; this only listens for their change events and emits a single combined
 * "fdy-datetime-change" (detail {date, time, value}). value is "YYYY-MM-DDTHH:MM"
 * when both parts are set, else "". Icon variants are controlled per child picker
 * (data-fdy-no-icon / <template data-fdy-icon>), so a datetime picker inherits them.
 *
 * Markup: <div data-fdy-datetimepicker>
 *   <div data-fdy-datepicker data-value="2026-07-21"></div>
 *   <div data-fdy-timepicker data-value="14:30"></div></div>
 * State: add data-fdy-disabled or data-fdy-invalid on the wrapper to reflect it onto both
 * child triggers as one control (read-only is adapter-only, a vanilla datetime is interactive).
 */
(function () {
  'use strict';

  function initDatetime(wrap) {
    if (wrap.dataset.fdyDtReady === '1') return;
    wrap.dataset.fdyDtReady = '1';
    wrap.classList.add('fdy-datetimepicker');

    var dp = wrap.querySelector('[data-fdy-datepicker]');
    var tp = wrap.querySelector('[data-fdy-timepicker]');
    if (!dp || !tp) return;

    // Reflect one wrapper-level state onto BOTH child triggers so a datetime reads as a single
    // disabled/invalid control. Deferred with setTimeout(0). NOT a microtask: the timepicker
    // enhancer registers its DOMContentLoaded init AFTER this composer, and microtasks drain
    // *between* listeners (so a microtask would run before the timepicker trigger exists). A
    // macrotask waits until the whole init pass is done and both triggers are built. (readonly is
    // intentionally not supported here: a vanilla datetime is interactive; adapters cover read-only.)
    if (wrap.hasAttribute('data-fdy-disabled') || wrap.hasAttribute('data-fdy-invalid')) {
      var applyState = function () {
        var dpTrig = dp.querySelector('.fdy-datepicker__trigger');
        var tpTrig = tp.querySelector('.fdy-timepicker__trigger');
        if (wrap.hasAttribute('data-fdy-disabled')) {
          if (dpTrig) dpTrig.disabled = true;
          if (tpTrig) tpTrig.disabled = true;
        }
        if (wrap.hasAttribute('data-fdy-invalid')) {
          if (dpTrig) dpTrig.setAttribute('aria-invalid', 'true');
          if (tpTrig) tpTrig.setAttribute('aria-invalid', 'true');
        }
      };
      setTimeout(applyState, 0);
    }

    var date = dp.getAttribute('data-value') || '';
    var time = tp.getAttribute('data-value') || '';

    function emit() {
      var value = (date && time) ? (date + 'T' + time) : '';
      wrap.dispatchEvent(new CustomEvent('fdy-datetime-change', {
        bubbles: true, detail: { date: date, time: time, value: value }
      }));
    }

    // Listen for the children's bubbling change events (order-independent, no need
    // for the child enhancers to have run before this composer).
    wrap.addEventListener('fdy-datepicker-change', function (e) { date = e.detail.value; emit(); });
    wrap.addEventListener('fdy-time-select', function (e) { time = e.detail.value; emit(); });

    var api = {
      wrap: wrap,
      getValue: function () { return (date && time) ? (date + 'T' + time) : ''; }
    };
    wrap._fdyDt = api;
    return api;
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-datetimepicker]')) initDatetime(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-datetimepicker]'), initDatetime);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayDatetime = { init: initDatetime, initAll: initAll };
})();
