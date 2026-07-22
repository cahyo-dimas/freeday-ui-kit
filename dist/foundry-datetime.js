/* Foundry — datetime picker composer (optional, zero-dependency).
 * Combines a child date picker and time picker into one value. It does not build
 * anything itself — foundry-datepicker.js and foundry-timepicker.js enhance the
 * children; this only listens for their change events and emits a single combined
 * "fdy-datetime-change" (detail {date, time, value}). value is "YYYY-MM-DDTHH:MM"
 * when both parts are set, else "". Icon variants are controlled per child picker
 * (data-fdy-no-icon / <template data-fdy-icon>), so a datetime picker inherits them.
 *
 * Markup: <div data-fdy-datetimepicker>
 *   <div data-fdy-datepicker data-value="2026-07-21"></div>
 *   <div data-fdy-timepicker data-value="14:30"></div></div>
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

    var date = dp.getAttribute('data-value') || '';
    var time = tp.getAttribute('data-value') || '';

    function emit() {
      var value = (date && time) ? (date + 'T' + time) : '';
      wrap.dispatchEvent(new CustomEvent('fdy-datetime-change', {
        bubbles: true, detail: { date: date, time: time, value: value }
      }));
    }

    // Listen for the children's bubbling change events (order-independent — no need
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
    Array.prototype.forEach.call((context || document).querySelectorAll('[data-fdy-datetimepicker]'), initDatetime);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FoundryDatetime = { init: initDatetime, initAll: initAll };
})();
