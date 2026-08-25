/* Freeday, slider value binding (optional, zero-dependency).
 * Mirrors a [data-fdy-slider] range input's value into <output for="inputId">, with an
 * optional prefix/suffix on the output (data-fdy-prefix / data-fdy-suffix). The range itself
 * is a native input, keyboard and ARIA are built in; this only updates the visible readout.
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
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-slider]')) initSlider(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-slider]'), initSlider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedaySlider = { init: initSlider, initAll: initAll };
})();
