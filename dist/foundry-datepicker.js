/* Foundry — date picker enhancer (optional, zero-dependency).
 * Builds an input-styled trigger + calendar popover from an empty wrapper.
 * Locale comes from <html lang> (via Intl) — month/weekday/value formatting is not hardcoded.
 *
 * Markup contract:
 *  - Single:  <div data-fdy-datepicker data-value="2026-07-21" data-label="Tanggal unggah"
 *               data-placeholder="Pilih tanggal" data-min="2026-01-01" data-max="2026-12-31"></div>
 *  - Range:   <div data-fdy-daterange role="group" aria-label="Rentang tanggal">
 *               <div data-fdy-datepicker data-role="from" data-placeholder="Dari"></div>
 *               <span class="fdy-daterange__sep">–</span>
 *               <div data-fdy-datepicker data-role="to" data-placeholder="Sampai"></div>
 *             </div>
 *    The range links the two: the end can never precede the start (out-of-range days disable).
 *
 * Emits a bubbling "fdy-datepicker-change" CustomEvent on the wrapper: detail {value, date}.
 * Keyboard in the grid: ←/→ ±1 day, ↑/↓ ±1 week, Home/End week edge, PageUp/Down ±month,
 * Shift+PageUp/Down ±year, Enter/Space select, Esc close (focus returns to the trigger).
 */
(function () {
  'use strict';

  var LOCALE = document.documentElement.getAttribute('lang') || 'id';
  var uidSeq = 0;
  function uid(p) { uidSeq += 1; return p + '-' + uidSeq; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    if (!s) return null;
    var p = String(s).split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function sameDay(a, b) { return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { var x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

  var monthFmt = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
  var valueFmt = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
  var dayLabelFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function weekdayHeaders() {
    var monday = new Date(2024, 0, 1); // a known Monday
    var fmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });
    var out = [];
    for (var i = 0; i < 7; i++) out.push(fmt.format(addDays(monday, i)));
    return out;
  }

  var CAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>';

  function initPicker(wrap) {
    if (wrap.dataset.fdyDpReady === '1') return wrap._fdyDp || null;
    wrap.dataset.fdyDpReady = '1';
    wrap.classList.add('fdy-datepicker');

    var placeholder = wrap.getAttribute('data-placeholder') || 'Pilih tanggal';
    var label = wrap.getAttribute('data-label') || 'Tanggal';
    var selected = parseISO(wrap.getAttribute('data-value'));
    var minDate = parseISO(wrap.getAttribute('data-min'));
    var maxDate = parseISO(wrap.getAttribute('data-max'));
    var rangeStart = null, rangeEnd = null; // for in-range shading
    var view = startOfDay(selected || new Date());
    view = new Date(view.getFullYear(), view.getMonth(), 1);
    var focusDate = null;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fdy-datepicker__trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', label);
    var valueSpan = document.createElement('span');
    valueSpan.className = 'fdy-datepicker__value';
    trigger.appendChild(valueSpan);
    // Icon variants (Foundry convention for JS-built controls): [data-fdy-no-icon] omits the
    // icon; a [data-fdy-icon] child supplies a custom SVG; otherwise the default calendar.
    if (!wrap.hasAttribute('data-fdy-no-icon')) {
      var customIcon = wrap.querySelector('[data-fdy-icon]');
      var icon = document.createElement('span');
      icon.className = 'fdy-datepicker__icon';
      icon.innerHTML = customIcon ? customIcon.innerHTML : CAL_ICON;
      if (customIcon) customIcon.remove();
      trigger.appendChild(icon);
    }

    var panel = document.createElement('div');
    panel.className = 'fdy-datepicker__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', label);
    panel.hidden = true;

    wrap.appendChild(trigger);
    wrap.appendChild(panel);

    function updateDisplay() {
      if (selected) {
        valueSpan.textContent = valueFmt.format(selected);
        valueSpan.classList.remove('fdy-datepicker__value--placeholder');
      } else {
        valueSpan.textContent = placeholder;
        valueSpan.classList.add('fdy-datepicker__value--placeholder');
      }
    }

    function isDisabled(d) {
      if (minDate && startOfDay(d).getTime() < startOfDay(minDate).getTime()) return true;
      if (maxDate && startOfDay(d).getTime() > startOfDay(maxDate).getTime()) return true;
      return false;
    }

    function navButton(glyph, aria, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fdy-cal__nav';
      b.textContent = glyph;
      b.setAttribute('aria-label', aria);
      b.addEventListener('click', onClick);
      return b;
    }

    function render() {
      panel.innerHTML = '';
      var head = document.createElement('div');
      head.className = 'fdy-cal__head';
      var title = document.createElement('div');
      title.className = 'fdy-cal__title';
      title.id = uid('fdy-cal-title');
      title.textContent = monthFmt.format(view);
      panel.setAttribute('aria-labelledby', title.id);
      head.appendChild(navButton('‹', 'Bulan sebelumnya', function () { view = addMonths(view, -1); render(); }));
      head.appendChild(title);
      head.appendChild(navButton('›', 'Bulan berikutnya', function () { view = addMonths(view, 1); render(); }));
      panel.appendChild(head);

      var grid = document.createElement('div');
      grid.className = 'fdy-cal__grid';
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-labelledby', title.id);
      weekdayHeaders().forEach(function (w) {
        var c = document.createElement('div');
        c.className = 'fdy-cal__dow';
        c.setAttribute('role', 'columnheader');
        c.setAttribute('aria-label', w);
        c.textContent = w;
        grid.appendChild(c);
      });

      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var offset = (first.getDay() + 6) % 7; // Monday-first
      var startCell = addDays(first, -offset);
      var today = new Date();
      if (!focusDate) focusDate = selected || today;
      // Keep the roving cell inside the visible month so the grid is always keyboard-reachable.
      if (focusDate.getMonth() !== view.getMonth() || focusDate.getFullYear() !== view.getFullYear()) {
        var dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        focusDate = new Date(view.getFullYear(), view.getMonth(), Math.min(focusDate.getDate(), dim));
      }

      for (var i = 0; i < 42; i++) {
        var d = addDays(startCell, i);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fdy-cal__day';
        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('aria-label', dayLabelFmt.format(d));
        btn.textContent = d.getDate();
        if (d.getMonth() !== view.getMonth()) btn.classList.add('is-outside');
        if (sameDay(d, today)) btn.classList.add('is-today');
        if (selected && sameDay(d, selected)) { btn.classList.add('is-selected'); btn.setAttribute('aria-selected', 'true'); }
        if (rangeStart && rangeEnd) {
          var t = startOfDay(d).getTime();
          if (t > startOfDay(rangeStart).getTime() && t < startOfDay(rangeEnd).getTime()) btn.classList.add('in-range');
        }
        if (isDisabled(d)) btn.disabled = true;
        btn.tabIndex = sameDay(d, focusDate) ? 0 : -1;
        btn._date = d;
        btn.addEventListener('click', (function (dd) { return function () { pick(dd); }; })(d));
        grid.appendChild(btn);
      }
      grid.addEventListener('keydown', onGridKey);
      panel.appendChild(grid);
    }

    function focusFocusDate() {
      var cell = panel.querySelector('.fdy-cal__day[tabindex="0"]');
      if (cell) cell.focus();
    }

    function moveFocus(next) {
      focusDate = next;
      if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
        view = new Date(next.getFullYear(), next.getMonth(), 1);
      }
      render();
      focusFocusDate();
    }

    function onGridKey(e) {
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft': moveFocus(addDays(focusDate, -1)); break;
        case 'ArrowRight': moveFocus(addDays(focusDate, 1)); break;
        case 'ArrowUp': moveFocus(addDays(focusDate, -7)); break;
        case 'ArrowDown': moveFocus(addDays(focusDate, 7)); break;
        case 'Home': moveFocus(addDays(focusDate, -((focusDate.getDay() + 6) % 7))); break;
        case 'End': moveFocus(addDays(focusDate, 6 - ((focusDate.getDay() + 6) % 7))); break;
        case 'PageUp': moveFocus(addMonths(focusDate, e.shiftKey ? -12 : -1)); break;
        case 'PageDown': moveFocus(addMonths(focusDate, e.shiftKey ? 12 : 1)); break;
        case 'Enter':
        case ' ': pick(focusDate); break;
        case 'Escape': close(true); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    }

    function pick(d) {
      if (isDisabled(d)) return;
      selected = startOfDay(d);
      focusDate = selected;
      updateDisplay();
      wrap.dispatchEvent(new CustomEvent('fdy-datepicker-change', {
        bubbles: true, detail: { value: toISO(selected), date: new Date(selected) }
      }));
      close(true);
    }

    function open() {
      if (!panel.hidden) return;
      focusDate = selected || focusDate || new Date();
      view = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('is-open');
      render();
      focusFocusDate();
      document.addEventListener('click', onDocClick, true);
    }

    function close(returnFocus) {
      if (panel.hidden) return;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.classList.remove('is-open');
      document.removeEventListener('click', onDocClick, true);
      if (returnFocus === true) trigger.focus();
    }

    function onDocClick(e) {
      if (!wrap.contains(e.target)) close(false);
    }

    trigger.addEventListener('click', function () { panel.hidden ? open() : close(true); });

    updateDisplay();

    var api = {
      wrap: wrap,
      getValue: function () { return selected ? toISO(selected) : ''; },
      clear: function () { selected = null; updateDisplay(); if (!panel.hidden) render(); },
      setMin: function (iso) { minDate = parseISO(iso); if (!panel.hidden) render(); },
      setMax: function (iso) { maxDate = parseISO(iso); if (!panel.hidden) render(); },
      setRange: function (fromIso, toIso) {
        rangeStart = parseISO(fromIso);
        rangeEnd = parseISO(toIso);
        if (!panel.hidden) render();
      }
    };
    wrap._fdyDp = api;
    return api;
  }

  function initRange(root) {
    if (root.dataset.fdyDrReady === '1') return;
    root.dataset.fdyDrReady = '1';
    var fromEl = root.querySelector('[data-fdy-datepicker][data-role="from"]');
    var toEl = root.querySelector('[data-fdy-datepicker][data-role="to"]');
    if (!fromEl || !toEl) return;
    var fromApi = initPicker(fromEl);
    var toApi = initPicker(toEl);
    if (!fromApi || !toApi) return;

    function sync() {
      var f = fromApi.getValue();
      var t = toApi.getValue();
      toApi.setMin(f || null);   // end can't precede start (one-directional, per Foundation)
      fromApi.setRange(f, t);     // start stays free — picking a later start clears the end below
      toApi.setRange(f, t);
    }
    fromEl.addEventListener('fdy-datepicker-change', function () {
      var f = fromApi.getValue(), t = toApi.getValue();
      if (f && t && t < f) toApi.clear();
      sync();
    });
    toEl.addEventListener('fdy-datepicker-change', function () {
      var f = fromApi.getValue(), t = toApi.getValue();
      if (f && t && t < f) fromApi.clear();
      sync();
    });
    sync();
  }

  function initAll(context) {
    var ctx = context || document;
    Array.prototype.forEach.call(ctx.querySelectorAll('[data-fdy-daterange]'), initRange);
    Array.prototype.forEach.call(ctx.querySelectorAll('[data-fdy-datepicker]'), initPicker);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FoundryDatepicker = { init: initPicker, initAll: initAll };
})();
