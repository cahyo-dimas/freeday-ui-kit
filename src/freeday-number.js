/* Freeday, number field enhancer (optional, zero-dependency).
 * Gives a native <input type="number"> its increment/decrement affordance back, on the kit's terms:
 * .fdy-input hides the user agent's own spin buttons (unthemeable OS widgets), so this puts two real
 * buttons in an .fdy-input-group instead. No new block, the group already owns the shared border,
 * :focus-within ring and error promotion.
 *
 * Markup contract:
 *  <div class="fdy-input-group" data-fdy-number>
 *    <button type="button" class="fdy-input-group__btn" data-fdy-number-step="-1"
 *            tabindex="-1" aria-label="Kurangi">−</button>
 *    <input class="fdy-input" type="number" min="0" max="10" step="1" value="1" aria-label="…">
 *    <button type="button" class="fdy-input-group__btn" data-fdy-number-step="1"
 *            tabindex="-1" aria-label="Tambah">+</button>
 *  </div>
 *
 * No custom event: the input is the source of truth, so stepping dispatches native bubbling `input`
 * and `change`. v-model / onChange / @bind bind to the input directly, exactly as they would without
 * this enhancer.
 *
 * The buttons are deliberately OUT of the tab order (tabindex="-1"): the input is already focusable
 * and ArrowUp/ArrowDown already step it, so two extra tab stops per field would cost every keyboard
 * user something and buy nothing. They keep an aria-label, so pointer and browse-mode users still
 * get a named control.
 */
(function () {
  'use strict';

  function initNumber(root) {
    if (root.dataset.fdyNumberReady === '1') return;

    var input = root.querySelector('input[type="number"]');
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-fdy-number-step]'));
    if (!input || !buttons.length) return;
    root.dataset.fdyNumberReady = '1';

    /* step="any" means there is no defined increment, and stepUp()/stepDown() throw InvalidStateError
       on such a field. A stepper cannot express it, so the buttons stay visibly disabled rather than
       failing on click. Read live, not captured: `step` is one of the attributes watched below. */
    function stepless() {
      return (input.getAttribute('step') || '').toLowerCase() === 'any';
    }

    function frozen() {
      return stepless() || input.disabled || input.readOnly;
    }

    /* Bounds are read from the input, never recomputed: stepUp()/stepDown() already clamp to
       min/max/step, so these two only decide whether the button tells the truth about what it does. */
    function atLimit(direction) {
      var bound = direction > 0 ? input.max : input.min;
      if (bound === '' || input.value === '') return false;
      var value = Number(input.value);
      var limit = Number(bound);
      if (isNaN(value) || isNaN(limit)) return false;
      return direction > 0 ? value >= limit : value <= limit;
    }

    function sync() {
      buttons.forEach(function (btn) {
        var direction = Number(btn.getAttribute('data-fdy-number-step')) < 0 ? -1 : 1;
        btn.disabled = frozen() || atLimit(direction);
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (frozen()) return;
        if (Number(btn.getAttribute('data-fdy-number-step')) < 0) input.stepDown();
        else input.stepUp();
        /* The value changed without the user typing, so say so the way the platform does, frameworks
           listen to these, not to a kit-specific event. */
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
      });
    });

    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    /* Typing is not the only thing that moves a bound: a framework flips `disabled` or recomputes
       `max` without any event firing, and a button that still looks enabled but no longer does
       anything is the lie this state machine exists to avoid. */
    new MutationObserver(sync).observe(input, {
      attributes: true,
      attributeFilter: ['disabled', 'readonly', 'min', 'max', 'step'],
    });
    sync();
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-number]')) initNumber(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-number]'), initNumber);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayNumber = { init: initNumber, initAll: initAll };
})();
