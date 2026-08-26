/* Freeday, time picker enhancer (optional, zero-dependency).
 * Builds an input-styled trigger + scrollable time-list popover (WAI-ARIA listbox)
 * from an empty [data-fdy-timepicker] wrapper. 24h HH:MM. Options run from
 * data-min (default 00:00) to data-max (default 23:59) every data-step minutes
 * (default 30). Attributes: data-value, data-label, data-placeholder.
 *
 * Icon variants (Freeday convention, same as the date picker): [data-fdy-no-icon]
 * omits the icon; a [data-fdy-icon] child supplies a custom SVG; otherwise a clock.
 *
 * Keyboard: trigger opens on click / Enter / Space / ArrowDown; in the list,
 * Up/Down move, Home/End jump, Enter/Space select, Esc closes (focus returns to
 * the trigger). Emits a bubbling "fdy-time-select" CustomEvent (detail {value}).
 */
(function () {
  'use strict';

  /* User-facing strings, overridable per element with `data-fdy-text-<key>`. One entry, and it
   * still needed the table: it reached the DOM as an argument to a helper, which is how it sat
   * outside every string guard until 2.2.0. */
  var TEXT = {
    label: 'Choose a time'
  };
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

  var seq = 0;
  var CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function valid(s) { return /^\d{1,2}:\d{2}$/.test(s || ''); }
  function toMin(s) { var p = s.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function norm(s) { return valid(s) ? fromMin(toMin(s)) : ''; }

  function initTime(wrap) {
    if (wrap.dataset.fdyTpReady === '1') return;
    wrap.dataset.fdyTpReady = '1';
    wrap.classList.add('fdy-timepicker');

    var label = wrap.getAttribute('data-label') || textOf(wrap, 'label');
    var placeholder = wrap.getAttribute('data-placeholder') || '--:--';
    var step = Math.max(1, parseInt(wrap.getAttribute('data-step') || '30', 10));
    var minM = valid(wrap.getAttribute('data-min')) ? toMin(wrap.getAttribute('data-min')) : 0;
    var maxM = valid(wrap.getAttribute('data-max')) ? toMin(wrap.getAttribute('data-max')) : 23 * 60 + 59;
    var value = norm(wrap.getAttribute('data-value'));

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fdy-timepicker__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', label);
    var valueSpan = document.createElement('span');
    valueSpan.className = 'fdy-timepicker__value';
    trigger.appendChild(valueSpan);
    if (!wrap.hasAttribute('data-fdy-no-icon')) {
      var customIcon = wrap.querySelector('[data-fdy-icon]');
      var icon = document.createElement('span');
      icon.className = 'fdy-timepicker__icon';
      icon.innerHTML = customIcon ? customIcon.innerHTML : CLOCK;
      if (customIcon) customIcon.remove();
      trigger.appendChild(icon);
    }

    var panel = document.createElement('ul');
    panel.className = 'fdy-timepicker__panel';
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', label);
    panel.tabIndex = -1;
    panel.hidden = true;

    var opts = [];
    for (var m = minM; m <= maxM; m += step) {
      var t = fromMin(m);
      var li = document.createElement('li');
      seq += 1; li.id = 'fdy-tp-opt-' + seq;
      li.className = 'fdy-timepicker__opt';
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', t);
      li.setAttribute('aria-selected', t === value ? 'true' : 'false');
      li.textContent = t;
      panel.appendChild(li);
      opts.push(li);
    }

    wrap.appendChild(trigger);
    wrap.appendChild(panel);

    var active = -1;

    function updateDisplay() {
      if (value) {
        valueSpan.textContent = value;
        valueSpan.classList.remove('fdy-timepicker__value--placeholder');
      } else {
        valueSpan.textContent = placeholder;
        valueSpan.classList.add('fdy-timepicker__value--placeholder');
      }
    }
    function indexOfValue() {
      for (var i = 0; i < opts.length; i++) { if (opts[i].getAttribute('data-value') === value) return i; }
      return -1;
    }
    function setActive(i) {
      if (active >= 0 && opts[active]) opts[active].classList.remove('is-active');
      active = i;
      if (i >= 0 && opts[i]) {
        opts[i].classList.add('is-active');
        panel.setAttribute('aria-activedescendant', opts[i].id);
        opts[i].scrollIntoView({ block: 'nearest' });
      } else {
        panel.removeAttribute('aria-activedescendant');
      }
    }
    var _pop = null;
    function popCtl() { if (_pop === null && window.FreedayPopover) _pop = window.FreedayPopover.attach(panel, trigger); return _pop; }
    function open() {
      if (!panel.hidden) return;
      var p = popCtl(); if (p) p.show(); else panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('is-open');
      var i = indexOfValue();
      setActive(i >= 0 ? i : 0);
      panel.focus();
      document.addEventListener('click', onDoc, true);
    }
    function close(returnFocus) {
      if (panel.hidden) return;
      var p = popCtl(); if (p) p.hide(); else panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.classList.remove('is-open');
      panel.removeAttribute('aria-activedescendant');
      document.removeEventListener('click', onDoc, true);
      if (returnFocus === true) trigger.focus();
    }
    function onDoc(e) { if (!wrap.contains(e.target)) close(false); }
    function choose(i) {
      if (i < 0 || i >= opts.length) return;
      value = opts[i].getAttribute('data-value');
      for (var j = 0; j < opts.length; j++) opts[j].setAttribute('aria-selected', j === i ? 'true' : 'false');
      updateDisplay();
      wrap.dispatchEvent(new CustomEvent('fdy-time-select', { bubbles: true, detail: { value: value } }));
      close(true);
    }

    trigger.addEventListener('click', function () { panel.hidden ? open() : close(true); });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); }
    });
    panel.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setActive(Math.min(opts.length - 1, active + 1)); break;
        case 'ArrowUp': e.preventDefault(); setActive(Math.max(0, active - 1)); break;
        case 'Home': e.preventDefault(); setActive(0); break;
        case 'End': e.preventDefault(); setActive(opts.length - 1); break;
        case 'Enter': case ' ': e.preventDefault(); choose(active); break;
        case 'Escape': e.preventDefault(); close(true); break;
        case 'Tab': close(false); break;
        default: break;
      }
    });
    panel.addEventListener('click', function (e) {
      var li = e.target.closest('[role="option"]');
      if (li) choose(opts.indexOf(li));
    });

    updateDisplay();

    var api = {
      wrap: wrap,
      getValue: function () { return value; },
      clear: function () { value = ''; for (var i = 0; i < opts.length; i++) opts[i].setAttribute('aria-selected', 'false'); updateDisplay(); }
    };
    wrap._fdyTp = api;
    return api;
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-timepicker]')) initTime(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-timepicker]'), initTime);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayTimepicker = { init: initTime, initAll: initAll };
})();
