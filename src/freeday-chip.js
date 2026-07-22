/* Freeday — chip enhancer (optional, zero-dependency).
 * Two behaviours, both progressive enhancement:
 *
 * 1. Removable chips — any .fdy-chip__remove button removes its chip and emits a
 *    bubbling "fdy-chip-remove" (detail {value}).
 * 2. Choice / filter groups — a [data-fdy-chips] container of interactive chips
 *    (.fdy-chip--choice / .fdy-chip--filter, each a <button>) toggles aria-pressed
 *    on click. Add data-single for one-at-a-time (radio-like) selection; filter
 *    chips get a leading check when pressed. Emits "fdy-chip-change" on the group
 *    (detail {value, pressed, selected}).
 */
(function () {
  'use strict';

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';

  function initRemove(btn) {
    if (btn.dataset.fdyChipRmReady === '1') return;
    btn.dataset.fdyChipRmReady = '1';
    btn.addEventListener('click', function () {
      var chip = btn.closest('.fdy-chip');
      if (!chip) return;
      var value = chip.getAttribute('data-value');
      if (!value) {
        // Derive the label from the chip text, minus the remove button glyph.
        var clone = chip.cloneNode(true);
        var rm = clone.querySelector('.fdy-chip__remove');
        if (rm) rm.remove();
        value = (clone.textContent || '').trim();
      }
      chip.dispatchEvent(new CustomEvent('fdy-chip-remove', { bubbles: true, detail: { value: value } }));
      chip.remove();
    });
  }

  function initGroup(group) {
    if (group.dataset.fdyChipsReady === '1') return;
    group.dataset.fdyChipsReady = '1';
    var single = group.hasAttribute('data-single');
    if (!group.getAttribute('role')) group.setAttribute('role', 'group');
    var groupLabel = group.getAttribute('data-label');
    if (groupLabel && !group.getAttribute('aria-label')) group.setAttribute('aria-label', groupLabel);

    var chips = Array.prototype.slice.call(group.querySelectorAll('.fdy-chip--choice, .fdy-chip--filter'));
    function valueOf(chip) { return chip.getAttribute('data-value') || (chip.textContent || '').trim(); }
    function selected() {
      return chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }).map(valueOf);
    }

    chips.forEach(function (chip) {
      if (!chip.hasAttribute('aria-pressed')) chip.setAttribute('aria-pressed', 'false');
      if (chip.classList.contains('fdy-chip--filter') && !chip.querySelector('.fdy-chip__check')) {
        var check = document.createElement('span');
        check.className = 'fdy-chip__check';
        check.innerHTML = CHECK;
        chip.insertBefore(check, chip.firstChild);
      }
      chip.addEventListener('click', function () {
        var wasPressed = chip.getAttribute('aria-pressed') === 'true';
        if (single) chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', wasPressed ? 'false' : 'true');
        group.dispatchEvent(new CustomEvent('fdy-chip-change', {
          bubbles: true,
          detail: { value: valueOf(chip), pressed: !wasPressed, selected: selected() }
        }));
      });
    });
  }

  function initAll(context) {
    var root = context || document;
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-chips]'), initGroup);
    Array.prototype.forEach.call(root.querySelectorAll('.fdy-chip__remove'), initRemove);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayChip = { initGroup: initGroup, initRemove: initRemove, initAll: initAll };
})();
