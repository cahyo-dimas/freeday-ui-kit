/* Freeday — form validation enhancer (optional, zero-dependency).
 * Wires the native Constraint Validation API to accessible inline errors on any
 * [data-fdy-validate] <form>. Native-first: constraints come from the standard
 * markup attributes (required, type, pattern, min/max, minlength/maxlength, step);
 * this only handles presentation + the accessible plumbing.
 *
 * Per control it toggles aria-invalid (which the CSS mirrors to the --error border)
 * and shows the message in a linked [data-fdy-error] element (auto-created inside
 * the .fdy-field if absent, and wired via aria-describedby).
 *
 * Custom messages via data attributes on the control (first match wins):
 *   data-fdy-msg-required | -type | -pattern | -minlength | -maxlength |
 *   data-fdy-msg-min | -max | -step | -mismatch, then generic data-fdy-msg.
 * Cross-field match (e.g. confirm password): data-fdy-match="#otherId".
 *
 * Timing: validates on submit (blocks + focuses the first invalid control); after
 * the first submit attempt each field re-validates on input/blur so errors clear
 * live. Add data-fdy-eager to validate on blur from the start.
 *
 * Emits bubbling CustomEvents on the form: "fdy-form-invalid" (detail {invalid:[]})
 * and "fdy-form-valid". Exposes window.FreedayForm.
 */
(function () {
  'use strict';

  var seq = 0;

  // ValidityState key -> friendly data-attribute alias.
  var ALIAS = {
    valueMissing: 'required',
    typeMismatch: 'type',
    patternMismatch: 'pattern',
    tooShort: 'minlength',
    tooLong: 'maxlength',
    rangeUnderflow: 'min',
    rangeOverflow: 'max',
    stepMismatch: 'step',
    badInput: 'type',
    customError: 'mismatch'
  };
  /* User-facing strings. Indonesian by default — documented and deliberate for the raw enhancer
   * path — and overridable at three levels, narrowest first: `data-fdy-msg-<alias>` on the field,
   * `data-fdy-msg` on the field, then `data-fdy-text-<alias>` on the FORM. The form level is what
   * a host in another language needs: it sets nine messages once instead of on every input.
   * Keeping them in ONE table is also what lets a guard prove none is hard-coded further down. */
  var TEXT = {
    required: 'Wajib diisi.',
    type: 'Format tidak valid.',
    pattern: 'Format tidak sesuai.',
    minlength: 'Terlalu pendek.',
    maxlength: 'Terlalu panjang.',
    min: 'Nilai terlalu kecil.',
    max: 'Nilai terlalu besar.',
    step: 'Nilai tidak sesuai kelipatan.',
    mismatch: 'Nilai tidak cocok.',
    invalid: 'Tidak valid.'
  };
  /* Kebab-cased for the lookup — see the note in the other enhancers: HTML lowercases attribute
     names, so `data-fdy-text-filter-text` and `data-fdy-text-filtertext` are different attributes
     and only one of them is what an author would write. */
  function textOf(root, key) {
    if (!root || !root.getAttribute) return TEXT[key];
    var kebab = root.getAttribute('data-fdy-text-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }));
    var custom = kebab != null && kebab !== '' ? kebab : root.getAttribute('data-fdy-text-' + key);
    return custom != null && custom !== '' ? custom : TEXT[key];
  }
  var VALIDITY_KEYS = ['valueMissing', 'typeMismatch', 'patternMismatch', 'tooShort', 'tooLong', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'badInput'];

  function isCandidate(el) {
    if (el.disabled || el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.type === 'reset') return false;
    return typeof el.checkValidity === 'function' && el.willValidate;
  }

  function fieldOf(el) { return el.closest('.fdy-field') || el.parentElement; }

  function ensureErrorEl(el) {
    var field = fieldOf(el);
    var errEl = field ? field.querySelector('[data-fdy-error]') : null;
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'fdy-help fdy-help--error';
      errEl.setAttribute('data-fdy-error', '');
      errEl.hidden = true;
      (field || el.parentElement).appendChild(errEl);
    }
    if (!errEl.id) { seq += 1; errEl.id = 'fdy-err-' + seq; }
    // Link the control to its message without clobbering existing describedby.
    var described = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (described.indexOf(errEl.id) === -1) { described.push(errEl.id); el.setAttribute('aria-describedby', described.join(' ')); }
    return errEl;
  }

  function messageFor(el) {
    // Cross-field match runs first (drives customError via setCustomValidity).
    el.setCustomValidity('');
    var matchSel = el.getAttribute('data-fdy-match');
    if (matchSel) {
      var other = document.querySelector(matchSel);
      if (other && el.value !== other.value) {
        el.setCustomValidity(el.getAttribute('data-fdy-msg-mismatch') || el.getAttribute('data-fdy-msg') || textOf(el.form || el.closest('form'), 'mismatch'));
      }
    }
    if (el.validity.valid) return '';
    var alias = el.validity.customError ? 'mismatch' : null;
    if (!alias) {
      for (var i = 0; i < VALIDITY_KEYS.length; i++) {
        if (el.validity[VALIDITY_KEYS[i]]) { alias = ALIAS[VALIDITY_KEYS[i]]; break; }
      }
    }
    var custom = alias ? el.getAttribute('data-fdy-msg-' + alias) : null;
    var form = el.form || el.closest('form');
    return custom || el.getAttribute('data-fdy-msg') || (alias && textOf(form, alias)) || el.validationMessage || textOf(form, 'invalid');
  }

  function paint(el, message) {
    var errEl = ensureErrorEl(el);
    if (message) {
      el.setAttribute('aria-invalid', 'true');
      errEl.textContent = message;
      errEl.hidden = false;
    } else {
      el.removeAttribute('aria-invalid');
      errEl.textContent = '';
      errEl.hidden = true;
    }
  }

  function initForm(form) {
    if (form.dataset.fdyFormReady === '1') return;
    form.dataset.fdyFormReady = '1';
    form.setAttribute('novalidate', '');
    var eager = form.hasAttribute('data-fdy-eager');
    var submitted = false;

    function controls() {
      return Array.prototype.filter.call(form.elements, isCandidate);
    }
    function validateOne(el) {
      var msg = messageFor(el);
      paint(el, msg);
      return !msg;
    }
    function liveBind(el) {
      if (el.dataset.fdyFieldBound === '1') return;
      el.dataset.fdyFieldBound = '1';
      var live = function () { if (submitted || eager) validateOne(el); };
      el.addEventListener('blur', live, true);
      el.addEventListener('input', function () { if ((submitted || eager) && el.getAttribute('aria-invalid') === 'true') validateOne(el); });
    }

    Array.prototype.forEach.call(controls(), liveBind);

    form.addEventListener('submit', function (e) {
      submitted = true;
      var invalid = [];
      Array.prototype.forEach.call(controls(), function (el) {
        liveBind(el);
        if (!validateOne(el)) invalid.push(el);
      });
      if (invalid.length) {
        e.preventDefault();
        invalid[0].focus();
        form.dispatchEvent(new CustomEvent('fdy-form-invalid', { bubbles: true, detail: { invalid: invalid } }));
      } else {
        form.dispatchEvent(new CustomEvent('fdy-form-valid', { bubbles: true }));
      }
    });

    var api = {
      form: form,
      validate: function () {
        submitted = true;
        var invalid = [];
        Array.prototype.forEach.call(controls(), function (el) { if (!validateOne(el)) invalid.push(el); });
        return invalid;
      },
      reset: function () {
        submitted = false;
        Array.prototype.forEach.call(controls(), function (el) { paint(el, ''); });
      }
    };
    form._fdyForm = api;
    return api;
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-validate]')) initForm(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-validate]'), initForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayForm = { init: initForm, initAll: initAll };
})();
