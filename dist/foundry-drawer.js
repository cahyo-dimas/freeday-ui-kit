/* Foundry — drawer enhancer (optional, zero-dependency).
 * A trigger [data-fdy-drawer="drawerId"] opens the <dialog class="fdy-drawer" id="drawerId">
 * as a modal side panel (native showModal gives focus-trap, Esc, and return-focus). Clicking
 * the backdrop or any [data-close] inside closes it.
 */
(function () {
  'use strict';

  function initDrawer(dialog) {
    if (dialog.dataset.fdyDrawerReady === '1') return;
    dialog.dataset.fdyDrawerReady = '1';
    // Click on the backdrop (target is the dialog box itself) closes it.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    Array.prototype.forEach.call(dialog.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', function () { dialog.close(); });
    });
  }

  function initTriggers(context) {
    var ctx = context || document;
    Array.prototype.forEach.call(ctx.querySelectorAll('[data-fdy-drawer]'), function (btn) {
      if (btn.dataset.fdyDrawerBound === '1') return;
      var dialog = document.getElementById(btn.getAttribute('data-fdy-drawer'));
      if (!dialog) return;
      initDrawer(dialog);
      btn.dataset.fdyDrawerBound = '1';
      btn.addEventListener('click', function () {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });
    });
    // Init any drawer dialogs even without a wired trigger (backdrop/close still work).
    Array.prototype.forEach.call(ctx.querySelectorAll('.fdy-drawer'), initDrawer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initTriggers(); });
  } else {
    initTriggers();
  }

  window.FoundryDrawer = { init: initTriggers };
})();
