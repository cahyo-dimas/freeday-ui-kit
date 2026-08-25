/* Freeday — input mask + password reveal enhancer (optional, zero-dependency).
 *
 * [data-fdy-mask]="pattern" formats a text input as you type. Placeholders:
 *   #  a digit (0-9)      A  a letter (a-z/A-Z)      *  a letter or digit
 * Any other pattern char is a literal, inserted automatically
 *   (e.g. "####-####-####", "(###) ###-####", "##/##/####").
 * The raw (unmasked) value is mirrored to el.dataset.fdyRaw and the bubbling
 * "fdy-mask" CustomEvent (detail {value, raw}). A native input event is
 * re-dispatched so validation / framework bindings observe the change.
 *
 * [data-fdy-password] on a password <input class="fdy-input"> wraps it in the
 * input-group chrome and adds a show/hide toggle (type swap + aria-pressed).
 */
(function () {
  'use strict';

  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.85"></path><path d="m3 3 18 18"></path></svg>';

  function matches(placeholder, ch) {
    if (placeholder === '#') return /\d/.test(ch);
    if (placeholder === 'A') return /[a-zA-Z]/.test(ch);
    if (placeholder === '*') return /[a-zA-Z0-9]/.test(ch);
    return false;
  }
  function isPlaceholder(ch) { return ch === '#' || ch === 'A' || ch === '*'; }

  // Keep only characters the pattern's placeholders could accept.
  function rawOf(pattern, value) {
    var allowDigit = pattern.indexOf('#') !== -1 || pattern.indexOf('*') !== -1;
    var allowAlpha = pattern.indexOf('A') !== -1 || pattern.indexOf('*') !== -1;
    var out = '';
    for (var i = 0; i < value.length; i++) {
      var c = value[i];
      if ((allowDigit && /\d/.test(c)) || (allowAlpha && /[a-zA-Z]/.test(c))) out += c;
    }
    return out;
  }
  function format(pattern, raw) {
    var out = '', ri = 0;
    for (var pi = 0; pi < pattern.length && ri < raw.length; pi++) {
      var p = pattern[pi];
      if (isPlaceholder(p)) {
        while (ri < raw.length && !matches(p, raw[ri])) ri++;
        if (ri < raw.length) { out += raw[ri]; ri++; }
      } else {
        out += p;
      }
    }
    return out;
  }


  /* User-facing strings. Indonesian by default — documented and deliberate for the raw enhancer
   * path, and every one overridable per element, so a host that speaks another language (the
   * Blazor adapters, an English app on the raw path) supplies its own without forking this file.
   * Keeping them in ONE table is also what lets a guard prove none is hard-coded further down. */
  var TEXT = {
    show: 'Show password',
    hide: 'Hide password'
  };
  /* HTML lowercases attribute names, so a camelCase key like `filterText` can only ever be written
     as `data-fdy-text-filtertext`, while the kebab form anybody would reach for,
     `data-fdy-text-filter-text`, becomes a DIFFERENT attribute the enhancer never reads, and the
     override fails silently. So the key is kebab-cased for the lookup; the run-together spelling
     still resolves, for markup written against 1.39.0. */
  function textAttr(root, key) {
    if (!root || !root.getAttribute) return null;
    var kebab = root.getAttribute('data-fdy-text-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }));
    return kebab != null && kebab !== '' ? kebab : root.getAttribute('data-fdy-text-' + key);
  }
  function textOf(root, key, vars) {
    var custom = textAttr(root, key);
    var s = custom != null && custom !== '' ? custom : TEXT[key];
    if (vars) for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  function initMask(el) {
    if (el.dataset.fdyMaskReady === '1') return;
    el.dataset.fdyMaskReady = '1';
    var pattern = el.getAttribute('data-fdy-mask') || '';
    if (!pattern) return;
    el.setAttribute('inputmode', pattern.indexOf('A') === -1 ? 'numeric' : 'text');

    function apply() {
      var raw = rawOf(pattern, el.value);
      var formatted = format(pattern, raw);
      if (formatted !== el.value) {
        el.value = formatted;
        // Masked entry is left-to-right; park the caret at the end.
        try { el.setSelectionRange(formatted.length, formatted.length); } catch (err) { /* number/date inputs */ }
      }
      el.dataset.fdyRaw = raw;
      el.dispatchEvent(new CustomEvent('fdy-mask', { bubbles: true, detail: { value: formatted, raw: raw } }));
    }
    el.addEventListener('input', apply);
    if (el.value) apply();
  }

  function initReveal(input) {
    if (input.dataset.fdyPwReady === '1') return;
    input.dataset.fdyPwReady = '1';

    var group = document.createElement('span');
    group.className = 'fdy-input-group';
    input.parentNode.insertBefore(group, input);
    group.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fdy-input-group__btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', textOf(input, 'show'));
    btn.innerHTML = EYE;
    btn.addEventListener('click', function () {
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      btn.setAttribute('aria-pressed', reveal ? 'true' : 'false');
      btn.setAttribute('aria-label', reveal ? textOf(input, 'hide') : textOf(input, 'show'));
      btn.innerHTML = reveal ? EYE_OFF : EYE;
      input.focus();
    });
    group.appendChild(btn);
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-mask]')) initMask(root);
    if (root.matches && root.matches('[data-fdy-password]')) initReveal(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-mask]'), initMask);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-password]'), initReveal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayMask = { initMask: initMask, initReveal: initReveal, initAll: initAll };
})();
