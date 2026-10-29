/* Freeday, list search enhancer (optional, zero-dependency). Note #061.
 * Turns an .fdy-input-group into a search box that searches while the reader pauses, at once on
 * Enter, and has a clear button. All three paths end in ONE bubbling event on the group,
 * "fdy-search" {term}, so an app listens once instead of wiring keyup, a timer and a click.
 *
 * Markup (the group, not a new block; the clear button is yours, so is its aria-label):
 *   <div class="fdy-input-group" data-fdy-search [data-fdy-search-delay="400"]>
 *     <span class="fdy-input-group__addon fdy-input-group__addon--icon">…svg…</span>
 *     <input class="fdy-input" type="text" aria-label="Search orders">
 *     <button type="button" class="fdy-input-group__btn" data-fdy-search-clear aria-label="Clear search">×</button>
 *   </div>
 *
 * type="text", not "search": WebKit's own × is unthemed and fires no Enter, which is what made
 * clearing a field leave the old rows on screen until somebody pressed Enter on an empty box.
 * The clear button is hidden while the box is empty. Clearing writes through the native value
 * setter and fires a native `input`, so v-model, a React onChange and Blazor @bind all follow.
 * `term` is trimmed; "" means "show everything again". Exposes window.FreedaySearch.
 */
(function () {
  'use strict';

  var DEFAULT_DELAY = 400;
  var nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  function initSearch(root) {
    if (root.dataset.fdySearchReady === '1') return;
    if (root.closest('[data-fdy-ignore]')) return;
    var input = root.querySelector('input');
    if (!input) return;
    root.dataset.fdySearchReady = '1';
    var clearBtn = root.querySelector('[data-fdy-search-clear]');
    var delayAttr = parseInt(root.getAttribute('data-fdy-search-delay'), 10);
    var delay = isNaN(delayAttr) ? DEFAULT_DELAY : delayAttr;
    var timer = null;

    function cancel() { if (timer !== null) { clearTimeout(timer); timer = null; } }
    function emit() {
      cancel();
      root.dispatchEvent(new CustomEvent('fdy-search', { bubbles: true, detail: { term: input.value.trim() } }));
    }
    function syncClear() { if (clearBtn) clearBtn.hidden = input.value === ''; }

    input.addEventListener('input', function () {
      syncClear();
      cancel();
      timer = setTimeout(emit, delay);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault(); // inside a <form>, Enter would submit it as well
      emit();
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        nativeValue.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        emit(); // at once, and it cancels the pause the input event just started
        input.focus();
      });
    }
    syncClear();
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-search]')) initSearch(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-search]'), initSearch);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedaySearch = { init: initSearch, initAll: initAll };
})();
