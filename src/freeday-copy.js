/* Freeday, copy-to-clipboard enhancer (optional, zero-dependency). Note #062.
 * A button carrying data-fdy-copy="<value>" copies that value and says so with a toast. For
 * reference values a reader takes elsewhere: an external document number, an event ID.
 *
 *   <dd><span class="fdy-mono">INV-2026-00042</span>
 *     <button type="button" class="fdy-btn fdy-btn--ghost fdy-btn--icon fdy-btn--sm"
 *             data-fdy-copy="INV-2026-00042" aria-label="Copy invoice number">…svg…</button></dd>
 *
 * The value is the attribute, not a lookup of some neighbour's text: a framework writes it from
 * the same variable as the visible text, and a row of a table needs no ids to find its own cell.
 * One delegated listener on the document, so buttons rendered later need no hydration.
 *
 * The Clipboard API exists only in a secure context. Over plain http writeText is missing, and a
 * copy that silently did nothing is the failure this refuses: the reader is told to copy by hand.
 * Emits bubbling "fdy-copy" {value, ok} on the button. A click inside a clickable table row still
 * reaches the row's own handler; stop it there if the row should not open. Exposes window.FreedayCopy.
 */
(function () {
  'use strict';

  /* User-facing strings, English by default and overridable per button with data-fdy-text-<key>,
   * like every other enhancer's. */
  var TEXT = {
    copied: 'Copied.',
    failed: 'Could not copy. Select the text and copy it manually.'
  };
  function textOf(el, key) {
    var custom = el.getAttribute('data-fdy-text-' + key);
    return custom != null && custom !== '' ? custom : TEXT[key];
  }

  function report(btn, value, ok) {
    if (window.Freeday && typeof window.Freeday.toast === 'function') {
      window.Freeday.toast(ok
        ? { variant: 'success', message: textOf(btn, 'copied'), key: 'fdy-copy' }
        : { variant: 'danger', message: textOf(btn, 'failed'), key: 'fdy-copy', timeout: 0 });
    }
    btn.dispatchEvent(new CustomEvent('fdy-copy', { bubbles: true, detail: { value: value, ok: ok } }));
  }

  function copy(btn) {
    var value = btn.getAttribute('data-fdy-copy') || '';
    if (value === '') return;
    var clip = navigator.clipboard;
    if (!clip || typeof clip.writeText !== 'function') { report(btn, value, false); return; }
    clip.writeText(value).then(
      function () { report(btn, value, true); },
      function () { report(btn, value, false); }
    );
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-fdy-copy]');
    if (btn && !btn.disabled) copy(btn);
  });

  window.FreedayCopy = { copy: copy };
})();
