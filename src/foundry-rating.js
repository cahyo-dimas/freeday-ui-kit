/* Foundry — rating enhancer (optional, zero-dependency).
 * Fills stars up to the checked radio (and previews on hover) for an interactive
 * [data-fdy-rating] radio group; for [data-fdy-readonly] it fills from data-value.
 * The radios are native — arrow-key selection and form association come for free.
 */
(function () {
  'use strict';

  function initRating(root) {
    if (root.dataset.fdyRatingReady === '1') return;
    root.dataset.fdyRatingReady = '1';

    var stars = Array.prototype.slice.call(root.querySelectorAll('.fdy-rating__star'));
    if (!stars.length) return;

    function fill(n) {
      stars.forEach(function (s, i) { s.classList.toggle('is-filled', i < n); });
    }

    if (root.hasAttribute('data-fdy-readonly')) {
      fill(parseInt(root.getAttribute('data-value'), 10) || 0);
      return;
    }

    var inputs = stars.map(function (s) { return s.querySelector('input'); });
    function current() {
      for (var i = 0; i < inputs.length; i++) { if (inputs[i] && inputs[i].checked) return i + 1; }
      return 0;
    }

    fill(current());
    root.addEventListener('change', function () { fill(current()); });
    stars.forEach(function (s, i) {
      s.addEventListener('mouseenter', function () { fill(i + 1); });
    });
    root.addEventListener('mouseleave', function () { fill(current()); });
  }

  function initAll(context) {
    Array.prototype.forEach.call((context || document).querySelectorAll('[data-fdy-rating]'), initRating);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FoundryRating = { init: initRating, initAll: initAll };
})();
