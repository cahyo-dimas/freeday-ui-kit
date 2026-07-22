/* Foundry — slider value binding (optional, zero-dependency).
 * Mirrors a [data-fdy-slider] range input's value into <output for="inputId">, with an
 * optional prefix/suffix on the output (data-fdy-prefix / data-fdy-suffix). The range itself
 * is a native input — keyboard and ARIA are built in; this only updates the visible readout.
 */
(function () {
  'use strict';

  function formatted(out, value) {
    return (out.getAttribute('data-fdy-prefix') || '') + value + (out.getAttribute('data-fdy-suffix') || '');
  }

  function initSlider(input) {
    if (input.dataset.fdySliderReady === '1') return;
    input.dataset.fdySliderReady = '1';
    var out = input.id ? document.querySelector('output[for="' + input.id + '"]') : null;
    if (!out) return;
    function sync() { out.textContent = formatted(out, input.value); }
    input.addEventListener('input', sync);
    sync();
  }

  function initAll(context) {
    Array.prototype.forEach.call((context || document).querySelectorAll('[data-fdy-slider]'), initSlider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FoundrySlider = { init: initSlider, initAll: initAll };
})();
