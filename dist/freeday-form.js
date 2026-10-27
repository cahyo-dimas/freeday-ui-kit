/* Freeday, form validation enhancer (optional, zero-dependency).
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
 * Timing: validates on submit (blocks, reveals + focuses the first invalid control); after
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
  /* User-facing strings. English by default since 2.0.0, documented and deliberate for the raw
   * enhancer path, and overridable at three levels, narrowest first: `data-fdy-msg-<alias>` on
   * the field, `data-fdy-msg` on the field, then `data-fdy-text-<alias>` on the FORM. The form
   * level is what a host in another language needs: it sets nine messages once instead of on
   * every input.
   * Keeping them in ONE table is also what lets a guard prove none is hard-coded further down. */
  var TEXT = {
    required: 'Required.',
    type: 'Invalid format.',
    pattern: 'Doesn’t match the required format.',
    minlength: 'Too short.',
    maxlength: 'Too long.',
    min: 'Too small.',
    max: 'Too large.',
    step: 'Not a valid step.',
    mismatch: 'Values don’t match.',
    invalid: 'Invalid.'
  };
  /* Kebab-cased for the lookup, see the note in the other enhancers: HTML lowercases attribute
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

  /* A kit control (combo, datepicker, monthpicker, timepicker, cascade) is NOT a form control.
   * Its trigger is a <button>, so `willValidate` is false and `form.elements` never offers it --
   * `required` on one meant nothing, and a form could not demand that it be filled (#096).
   *
   * Nothing here names a component. Two attributes carry it:
   *   data-fdy-required  the app asking for it, on the control's ROOT
   *   data-value         the live value, which every value-bearing kit control now mirrors
   * and the element that takes aria-invalid and focus is found by `aria-haspopup`, which every
   * popup-style kit trigger already sets. `FdyAutocomplete` and `FdyCfl` are absent on purpose:
   * they render a real <input>, so the NATIVE `required` is what fits them, and routing them
   * through here would give one field two sources of truth. No prop exposes that yet, which is a
   * separate gap and is written down in NEXT-UP.md rather than half-closed here. */
  function kitRoots(form) {
    return Array.prototype.slice.call(form.querySelectorAll('[data-fdy-required]'));
  }

  /* The trigger, or the root itself if a control ever ships without one, so a missing trigger
     degrades to a visible error rather than a thrown TypeError. */
  function kitAria(root) {
    return root.querySelector('[aria-haspopup]') || root;
  }

  function kitMessage(root) {
    if ((root.getAttribute('data-value') || '') !== '') return '';
    var form = root.closest('form');
    return root.getAttribute('data-fdy-msg-required')
      || root.getAttribute('data-fdy-msg')
      || textOf(form, 'required');
  }

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

  /* focus() on a control that is not rendered does nothing and reports nothing: the field turns red
   * where nobody can see it, and the submit reads as a dead button (#059). So whatever hides the
   * control is undone first, each through that component's own control, so its state agrees with
   * what is shown:
   *   closed <details>        opened (accordion, tree, nav group)
   *   hidden [role=tabpanel]  its tab is clicked; freeday-tabs selects on click
   *   hidden .fdy-step-panel  its step button is clicked. A step not yet reached has a disabled
   *                           button, so this only ever goes BACK and never skips a step guard.
   * Anything else that hides it belongs to the app, and is left alone. */
  function reveal(el) {
    for (var node = el.parentElement; node; node = node.parentElement) {
      if (node.localName === 'details' && !node.open) {
        node.open = true;
      } else if (node.hidden && node.getAttribute('role') === 'tabpanel' && node.id) {
        var tab = Array.prototype.filter.call(document.querySelectorAll('[role="tab"]'), function (t) {
          return t.getAttribute('aria-controls') === node.id;
        })[0];
        if (tab) tab.click();
      } else if (node.hidden && node.classList.contains('fdy-step-panel')) {
        var stepper = node.closest('[data-fdy-stepper]');
        if (!stepper) continue;
        var index = Array.prototype.indexOf.call(stepper.querySelectorAll('.fdy-step-panel'), node);
        var btn = stepper.querySelectorAll('.fdy-step__btn')[index];
        if (btn && !btn.disabled) btn.click();
      }
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
    function validateKit(root) {
      var msg = kitMessage(root);
      paint(kitAria(root), msg);
      return !msg;
    }
    /* The value lives in an attribute, and each control changes it through its own event name
       (fdy-change, fdy-datepicker-change, fdy-time-select, fdy-cascade-change). Observing the
       attribute is what keeps this enhancer from having to know any of them. */
    function kitLiveBind(root) {
      if (root.dataset.fdyKitBound === '1') return;
      root.dataset.fdyKitBound = '1';
      new MutationObserver(function () {
        if (submitted || eager) validateKit(root);
      }).observe(root, { attributes: true, attributeFilter: ['data-value'] });
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
    kitRoots(form).forEach(kitLiveBind);

    form.addEventListener('submit', function (e) {
      submitted = true;
      var invalid = [];
      Array.prototype.forEach.call(controls(), function (el) {
        liveBind(el);
        if (!validateOne(el)) invalid.push(el);
      });
      kitRoots(form).forEach(function (root) {
        kitLiveBind(root);
        if (!validateKit(root)) invalid.push(kitAria(root));
      });
      /* DOM order, not native-then-kit: `invalid[0]` is what gets revealed and focused, and a
         reader sent to the second field while the first is also red learns the wrong thing. */
      invalid.sort(function (a, b) {
        var rel = a.compareDocumentPosition(b);
        if (rel & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (rel & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      if (invalid.length) {
        e.preventDefault();
        reveal(invalid[0]);
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
        kitRoots(form).forEach(function (root) { if (!validateKit(root)) invalid.push(kitAria(root)); });
        return invalid;
      },
      reset: function () {
        submitted = false;
        Array.prototype.forEach.call(controls(), function (el) { paint(el, ''); });
        kitRoots(form).forEach(function (root) { paint(kitAria(root), ''); });
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
