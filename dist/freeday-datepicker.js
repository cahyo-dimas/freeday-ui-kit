/* Freeday, date picker enhancer (optional, zero-dependency).
 * Builds an input-styled trigger + calendar popover from an empty wrapper.
 * Locale comes from <html lang> (via Intl), month/weekday/value formatting is not hardcoded.
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

  /* The page's own `lang` wins, which is the better escape hatch than any attribute the kit
     could invent: an Indonesian app writes <html lang="id"> and gets Indonesian month and
     weekday names back automatically. The FALLBACK follows the kit's default language, or a
     page without `lang` would read English labels around Indonesian month names. */
  var LOCALE = document.documentElement.getAttribute('lang') || 'en';
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
  var monthCellFmt = new Intl.DateTimeFormat(LOCALE, { month: 'short' });
  var monthNameFmt = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });

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

    var placeholder = wrap.getAttribute('data-placeholder') || 'Choose a date';
    var label = wrap.getAttribute('data-label') || 'Date';
    var selected = parseISO(wrap.getAttribute('data-value'));
    var minDate = parseISO(wrap.getAttribute('data-min'));
    var maxDate = parseISO(wrap.getAttribute('data-max'));
    var rangeStart = null, rangeEnd = null; // for in-range shading
    var view = startOfDay(selected || new Date());
    view = new Date(view.getFullYear(), view.getMonth(), 1);
    var focusDate = null;
    /* 'days' | 'months', the calendar drills one level up rather than growing furniture beside the
       title. Before this, the only pointer route to another month was one click per month: from
       August 2026 to March 2022 is fifty-three of them. Shift+PageUp already jumped a year, but a
       shortcut nobody can see is not an affordance — the repo's own test helper clicked "previous
       month" twenty-four times to reach a date two years back. */
    var mode = 'days';
    var focusMonth = null;
    var focusYear = null;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fdy-datepicker__trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', label);
    var valueSpan = document.createElement('span');
    valueSpan.className = 'fdy-datepicker__value';
    trigger.appendChild(valueSpan);
    // Icon variants (Freeday convention for JS-built controls): [data-fdy-no-icon] omits the
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

    function monthDisabled(year, month) {
      var last = new Date(year, month + 1, 0);
      var first = new Date(year, month, 1);
      if (minDate && startOfDay(last).getTime() < startOfDay(minDate).getTime()) return true;
      if (maxDate && startOfDay(first).getTime() > startOfDay(maxDate).getTime()) return true;
      return false;
    }

    function titleButton(text, aria, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fdy-cal__title';
      b.id = uid('fdy-cal-title');
      b.textContent = text;
      b.setAttribute('aria-label', aria);
      b.addEventListener('click', onClick);
      return b;
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
      if (mode === 'years') { renderYears(); return; }
      if (mode === 'months') { renderMonths(); return; }
      panel.innerHTML = '';
      var head = document.createElement('div');
      head.className = 'fdy-cal__head';
      var title = titleButton(monthFmt.format(view), monthFmt.format(view) + ', choose month', function () {
        mode = 'months';
        focusMonth = view.getMonth();
        render();
        focusMonthCell();
      });
      panel.setAttribute('aria-labelledby', title.id);
      head.appendChild(navButton('‹', 'Previous month', function () { view = addMonths(view, -1); render(); }));
      head.appendChild(title);
      head.appendChild(navButton('›', 'Next month', function () { view = addMonths(view, 1); render(); }));
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

    function renderMonths() {
      panel.innerHTML = '';
      var year = view.getFullYear();
      var head = document.createElement('div');
      head.className = 'fdy-cal__head';
      var title = titleButton(String(year), year + ', choose year', function () {
        mode = 'years';
        focusYear = year;
        render();
        focusYearCell();
      });
      panel.setAttribute('aria-labelledby', title.id);
      head.appendChild(navButton('‹', 'Previous year', function () { view = addMonths(view, -12); render(); focusMonthCell(); }));
      head.appendChild(title);
      head.appendChild(navButton('›', 'Next year', function () { view = addMonths(view, 12); render(); focusMonthCell(); }));
      panel.appendChild(head);

      var grid = document.createElement('div');
      grid.className = 'fdy-cal__grid fdy-cal__grid--months';
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-labelledby', title.id);
      var today = new Date();
      if (focusMonth === null) focusMonth = view.getMonth();
      for (var m = 0; m < 12; m++) {
        var cellDate = new Date(year, m, 1);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fdy-cal__month';
        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('aria-label', monthNameFmt.format(cellDate));
        btn.textContent = monthCellFmt.format(cellDate);
        if (today.getFullYear() === year && today.getMonth() === m) btn.classList.add('is-today');
        if (selected && selected.getFullYear() === year && selected.getMonth() === m) {
          btn.classList.add('is-selected');
          btn.setAttribute('aria-selected', 'true');
        }
        if (monthDisabled(year, m)) btn.disabled = true;
        btn.tabIndex = m === focusMonth ? 0 : -1;
        btn.addEventListener('click', (function (mm) { return function () { openMonth(mm); }; })(m));
        grid.appendChild(btn);
      }
      grid.addEventListener('keydown', onMonthKey);
      panel.appendChild(grid);
    }

    /* A page of twelve years, aligned so pages TILE: 2016-2027, 2028-2039. Anchoring the page on
       the year in view instead would make ‹ and › land on overlapping windows, and the same year
       would appear at a different spot every time you stepped. */
    var YEARS_PER_PAGE = 12;
    function yearPageStart(y) { return Math.floor(y / YEARS_PER_PAGE) * YEARS_PER_PAGE; }

    /* A year is only unreachable when EVERY month in it falls outside min/max, the same rule
       monthDisabled applies one level down, for the same reason: a bound that sits inside the year
       disables neither end. */
    function yearDisabled(y) {
      if (minDate && new Date(y, 11, 31) < startOfDay(minDate)) return true;
      if (maxDate && new Date(y, 0, 1) > startOfDay(maxDate)) return true;
      return false;
    }

    function renderYears() {
      panel.innerHTML = '';
      var start = yearPageStart(view.getFullYear());
      var end = start + YEARS_PER_PAGE - 1;
      var head = document.createElement('div');
      head.className = 'fdy-cal__head';
      var title = titleButton(start + ' – ' + end, start + ' to ' + end + ', back to months', function () {
        mode = 'months';
        focusMonth = view.getMonth();
        render();
        focusMonthCell();
      });
      panel.setAttribute('aria-labelledby', title.id);
      head.appendChild(navButton('‹', 'Previous years', function () { moveYearFocus(focusYear - YEARS_PER_PAGE); }));
      head.appendChild(title);
      head.appendChild(navButton('›', 'Next years', function () { moveYearFocus(focusYear + YEARS_PER_PAGE); }));
      panel.appendChild(head);

      var grid = document.createElement('div');
      grid.className = 'fdy-cal__grid fdy-cal__grid--years';
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-labelledby', title.id);
      var thisYear = new Date().getFullYear();
      if (focusYear === null) focusYear = view.getFullYear();
      for (var i = 0; i < YEARS_PER_PAGE; i++) {
        var y = start + i;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fdy-cal__year';
        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('aria-label', String(y));
        btn.textContent = String(y);
        if (y === thisYear) btn.classList.add('is-today');
        if (selected && selected.getFullYear() === y) {
          btn.classList.add('is-selected');
          btn.setAttribute('aria-selected', 'true');
        }
        if (yearDisabled(y)) btn.disabled = true;
        btn.tabIndex = y === focusYear ? 0 : -1;
        btn.addEventListener('click', (function (yy) { return function () { openYear(yy); }; })(y));
        grid.appendChild(btn);
      }
      grid.addEventListener('keydown', onYearKey);
      panel.appendChild(grid);
    }

    function focusYearCell() {
      var cell = panel.querySelector('.fdy-cal__year[tabindex="0"]');
      if (cell) cell.focus();
    }

    /* Picking a year is navigation, exactly like picking a month: it drops to the month grid of
       that year. Nothing is committed until a DAY is chosen. */
    function openYear(y) {
      view = new Date(y, view.getMonth(), 1);
      focusMonth = view.getMonth();
      mode = 'months';
      render();
      focusMonthCell();
    }

    function moveYearFocus(y) {
      focusYear = y;
      view = new Date(y, view.getMonth(), 1);
      render();
      focusYearCell();
    }

    function onYearKey(e) {
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft': moveYearFocus(focusYear - 1); break;
        case 'ArrowRight': moveYearFocus(focusYear + 1); break;
        case 'ArrowUp': moveYearFocus(focusYear - 3); break;
        case 'ArrowDown': moveYearFocus(focusYear + 3); break;
        case 'Home': moveYearFocus(yearPageStart(focusYear)); break;
        case 'End': moveYearFocus(yearPageStart(focusYear) + YEARS_PER_PAGE - 1); break;
        case 'PageUp': moveYearFocus(focusYear - YEARS_PER_PAGE); break;
        case 'PageDown': moveYearFocus(focusYear + YEARS_PER_PAGE); break;
        case 'Enter':
        case ' ': openYear(focusYear); break;
        case 'Escape': close(true); break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    }

    function focusMonthCell() {
      var cell = panel.querySelector('.fdy-cal__month[tabindex="0"]');
      if (cell) cell.focus();
    }

    /* Picking a month is navigation, not selection: it drops back to the day grid with the roving
       cell clamped into the new month, so nothing is committed until a DAY is chosen. */
    function openMonth(m) {
      var dim = new Date(view.getFullYear(), m + 1, 0).getDate();
      var day = focusDate ? Math.min(focusDate.getDate(), dim) : 1;
      view = new Date(view.getFullYear(), m, 1);
      focusDate = new Date(view.getFullYear(), m, day);
      mode = 'days';
      render();
      focusFocusDate();
    }

    function moveMonthFocus(index, yearDelta) {
      if (yearDelta) view = addMonths(view, yearDelta * 12);
      focusMonth = (index + 12) % 12;
      render();
      focusMonthCell();
    }

    function onMonthKey(e) {
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft': moveMonthFocus(focusMonth - 1, 0); break;
        case 'ArrowRight': moveMonthFocus(focusMonth + 1, 0); break;
        case 'ArrowUp': moveMonthFocus(focusMonth - 3, 0); break;
        case 'ArrowDown': moveMonthFocus(focusMonth + 3, 0); break;
        case 'Home': moveMonthFocus(0, 0); break;
        case 'End': moveMonthFocus(11, 0); break;
        case 'PageUp': moveMonthFocus(focusMonth, -1); break;
        case 'PageDown': moveMonthFocus(focusMonth, 1); break;
        case 'Enter':
        case ' ': openMonth(focusMonth); break;
        case 'Escape': close(true); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
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

    var _pop = null;
    function popCtl() { if (_pop === null && window.FreedayPopover) _pop = window.FreedayPopover.attach(panel, trigger); return _pop; }
    function open() {
      if (!panel.hidden) return;
      mode = 'days';
      focusDate = selected || focusDate || new Date();
      view = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
      var p = popCtl(); if (p) p.show(); else panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('is-open');
      render();
      focusFocusDate();
      document.addEventListener('click', onDocClick, true);
    }

    function close(returnFocus) {
      if (panel.hidden) return;
      var p = popCtl(); if (p) p.hide(); else panel.hidden = true;
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
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-daterange]')) initRange(root);
    if (root.matches && root.matches('[data-fdy-datepicker]')) initPicker(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-daterange]'), initRange);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-datepicker]'), initPicker);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayDatepicker = { init: initPicker, initAll: initAll };
})();
