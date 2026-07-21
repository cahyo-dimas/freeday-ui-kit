/* Foundry — data-table enhancer (optional, zero-dependency).
 * Adds client-side search, column sort, pagination and row selection to any
 * [data-fdy-table]. Progressive enhancement over a plain semantic <table>;
 * in a framework app, do this server- or store-side instead.
 *
 * Markup contract (see docs): a `.fdy-datatable[data-fdy-table]` containing a
 * `.fdy-table-toolbar` (with `[data-fdy-table-search]`, `[data-fdy-table-count]`),
 * a `<table class="fdy-table">` whose sortable headers hold
 * `<button class="fdy-table__sortbtn" data-fdy-sort[="number"]>`, optional
 * selection checkboxes (`[data-fdy-select-all]`, `[data-fdy-row-select]`), and a
 * `.fdy-table-footer` (with `[data-fdy-table-info]`, `[data-fdy-table-pagination]`).
 * Numeric columns should give each cell a `data-sort-value`.
 *
 * Column filters: mark a header `<th data-fdy-filter="text|enum|number">` and a funnel
 * button is injected; text filters by contains, enum by a value checklist, number by a
 * min/max range. All active column filters AND the global search must pass (logical AND).
 *
 * Bulk actions: an optional `[data-fdy-table-bulk]` bar (hidden by default) with a
 * `[data-fdy-table-bulk-count]` label and a `[data-fdy-table-bulk-clear]` button shows
 * while any row is selected.
 *
 * Emits a bubbling "fdy-table-change" CustomEvent (detail: {shown, total, page}).
 */
(function () {
  'use strict';

  function cellText(row, index) {
    var cell = row.cells[index];
    if (!cell) return '';
    return (cell.getAttribute('data-sort-value') != null
      ? cell.getAttribute('data-sort-value')
      : cell.textContent).trim();
  }

  function initTable(root) {
    if (root.dataset.fdyTableReady === '1') return;
    var table = root.querySelector('table.fdy-table');
    var tbody = table && table.querySelector('tbody');
    if (!table || !tbody) return;
    root.dataset.fdyTableReady = '1';

    var allRows = Array.prototype.slice.call(tbody.querySelectorAll(':scope > tr'));
    var searchInput = root.querySelector('[data-fdy-table-search]');
    var countEl = root.querySelector('[data-fdy-table-count]');
    var infoEl = root.querySelector('[data-fdy-table-info]');
    var pagerEl = root.querySelector('[data-fdy-table-pagination]');
    var selectAll = root.querySelector('[data-fdy-select-all]');
    var pageSize = parseInt(root.getAttribute('data-page-size'), 10) || 0; // 0 = no pagination

    var sortButtons = Array.prototype.slice.call(root.querySelectorAll('.fdy-table__sortbtn[data-fdy-sort]'));
    var sortCol = -1;   // column index currently sorted
    var sortDir = 0;    // 1 asc, -1 desc
    var sortType = 'text';
    var filter = '';
    var page = 1;

    var colFilters = {};   // colIndex -> {type, text, set, min, max}
    var openPopover = null;
    var bulkBar = root.querySelector('[data-fdy-table-bulk]');
    var bulkCount = root.querySelector('[data-fdy-table-bulk-count]');
    var bulkClear = root.querySelector('[data-fdy-table-bulk-clear]');

    function colIndexOf(button) {
      var th = button.closest('th');
      return th ? th.cellIndex : -1;
    }

    function parseNum(s) {
      var n = parseFloat(String(s).replace(/[^\d.-]/g, ''));
      return isNaN(n) ? null : n;
    }

    function passesColumnFilters(row) {
      for (var idx in colFilters) {
        if (!Object.prototype.hasOwnProperty.call(colFilters, idx)) continue;
        var f = colFilters[idx];
        var raw = cellText(row, Number(idx));
        if (f.type === 'text') {
          if (f.text && raw.toLowerCase().indexOf(f.text.toLowerCase()) === -1) return false;
        } else if (f.type === 'enum') {
          if (f.set && f.set.size && !f.set.has(raw)) return false;
        } else if (f.type === 'number') {
          var v = parseNum(raw);
          if (f.min != null && (v == null || v < f.min)) return false;
          if (f.max != null && (v == null || v > f.max)) return false;
        }
      }
      return true;
    }

    function filtered() {
      var q = filter.toLowerCase();
      return allRows.filter(function (row) {
        if (q && row.textContent.toLowerCase().indexOf(q) === -1) return false;
        return passesColumnFilters(row);
      });
    }

    function sorted(rows) {
      if (sortCol < 0 || sortDir === 0) return rows;
      var copy = rows.slice();
      copy.sort(function (a, b) {
        var av = cellText(a, sortCol);
        var bv = cellText(b, sortCol);
        var cmp;
        if (sortType === 'number') {
          cmp = (parseFloat(av.replace(/[^\d.-]/g, '')) || 0) - (parseFloat(bv.replace(/[^\d.-]/g, '')) || 0);
        } else {
          cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
        }
        return cmp * sortDir;
      });
      return copy;
    }

    function syncSelectAll(visibleRows) {
      if (!selectAll) return;
      var boxes = visibleRows
        .map(function (r) { return r.querySelector('[data-fdy-row-select]'); })
        .filter(Boolean);
      var checked = boxes.filter(function (b) { return b.checked; }).length;
      selectAll.checked = boxes.length > 0 && checked === boxes.length;
      selectAll.indeterminate = checked > 0 && checked < boxes.length;
    }

    function buildPager(totalPages) {
      if (!pagerEl) return;
      pagerEl.innerHTML = '';
      if (totalPages <= 1) return;
      var ul = document.createElement('ul');
      ul.className = 'fdy-pagination__list';

      function addBtn(label, targetPage, opts) {
        opts = opts || {};
        var li = document.createElement('li');
        var el = document.createElement(opts.disabled || opts.current ? 'span' : 'button');
        el.className = 'fdy-pagination__link';
        el.textContent = label;
        if (opts.disabled) el.setAttribute('aria-disabled', 'true');
        if (opts.current) el.setAttribute('aria-current', 'page');
        if (opts.label) el.setAttribute('aria-label', opts.label);
        if (!opts.disabled && !opts.current) {
          el.type = 'button';
          el.addEventListener('click', function () { page = targetPage; render(); });
        }
        li.appendChild(el);
        ul.appendChild(li);
      }
      function addEllipsis() {
        var li = document.createElement('li');
        var sp = document.createElement('span');
        sp.className = 'fdy-pagination__ellipsis';
        sp.textContent = '…';
        li.appendChild(sp);
        ul.appendChild(li);
      }

      addBtn('‹', page - 1, { disabled: page === 1, label: 'Sebelumnya' });
      var pages = [];
      for (var p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) pages.push(p);
        else if (pages[pages.length - 1] !== '…') pages.push('…');
      }
      pages.forEach(function (p) {
        if (p === '…') addEllipsis();
        else addBtn(String(p), p, { current: p === page });
      });
      addBtn('›', page + 1, { disabled: page === totalPages, label: 'Berikutnya' });
      pagerEl.appendChild(ul);
    }

    // --- Bulk-action bar ---------------------------------------------------
    function selectedRows() {
      return allRows.filter(function (r) {
        var b = r.querySelector('[data-fdy-row-select]');
        return b && b.checked;
      });
    }
    function updateBulk() {
      if (!bulkBar) return;
      var n = selectedRows().length;
      bulkBar.hidden = n === 0;
      if (bulkCount) bulkCount.textContent = n + ' dipilih';
    }
    function clearSelection() {
      allRows.forEach(function (r) {
        var b = r.querySelector('[data-fdy-row-select]');
        if (b) b.checked = false;
        r.setAttribute('aria-selected', 'false');
      });
      if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
      updateBulk();
    }

    // --- Column filters ----------------------------------------------------
    function closePopover(returnFocus) {
      if (!openPopover) return;
      var btn = openPopover._trigger;
      openPopover.remove();
      openPopover = null;
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
      if (returnFocus === true && btn) btn.focus();  // only on keyboard/button dismissal
    }
    function closeOnScroll() { closePopover(false); }
    function markActive(button, active) {
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    function filterTitle(text) {
      var t = document.createElement('div');
      t.className = 'fdy-filter__title';
      t.textContent = text;
      return t;
    }
    function numberInput(placeholder, value) {
      var i = document.createElement('input');
      i.className = 'fdy-input';
      i.type = 'text';
      i.inputMode = 'numeric';
      i.placeholder = placeholder;
      i.value = value != null ? value : '';
      return i;
    }
    function distinctValues(idx) {
      var seen = {};
      var out = [];
      allRows.forEach(function (r) {
        var v = cellText(r, idx);
        if (v && !seen[v]) { seen[v] = 1; out.push(v); }
      });
      out.sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
      return out;
    }
    function openFilterPopover(type, idx, btn) {
      var pop = document.createElement('div');
      pop.className = 'fdy-filter';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', 'Filter kolom');
      var f = colFilters[idx] || { type: type };

      if (type === 'text') {
        pop.appendChild(filterTitle('Berisi teks'));
        var inp = document.createElement('input');
        inp.className = 'fdy-input';
        inp.type = 'search';
        inp.placeholder = 'Berisi…';
        inp.value = f.text || '';
        inp.addEventListener('input', function () {
          f.text = inp.value.trim();
          colFilters[idx] = f;
          markActive(btn, !!f.text);
          page = 1; render();
        });
        pop.appendChild(inp);
      } else if (type === 'enum') {
        pop.appendChild(filterTitle('Tampilkan nilai'));
        var list = document.createElement('div');
        list.className = 'fdy-filter__list';
        var set = f.set || new Set();
        distinctValues(idx).forEach(function (val) {
          var lab = document.createElement('label');
          lab.className = 'fdy-filter__check';
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'fdy-checkbox';
          cb.checked = set.has(val);
          cb.addEventListener('change', function () {
            if (cb.checked) set.add(val); else set.delete(val);
            f.set = set; colFilters[idx] = f;
            markActive(btn, set.size > 0);
            page = 1; render();
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(val));
          list.appendChild(lab);
        });
        pop.appendChild(list);
      } else if (type === 'number') {
        pop.appendChild(filterTitle('Rentang nilai'));
        var range = document.createElement('div');
        range.className = 'fdy-filter__range';
        var minI = numberInput('Min', f.min);
        var maxI = numberInput('Maks', f.max);
        var applyRange = function () {
          f.min = minI.value !== '' ? parseNum(minI.value) : null;
          f.max = maxI.value !== '' ? parseNum(maxI.value) : null;
          colFilters[idx] = f;
          markActive(btn, f.min != null || f.max != null);
          page = 1; render();
        };
        minI.addEventListener('input', applyRange);
        maxI.addEventListener('input', applyRange);
        var sep = document.createElement('span');
        sep.textContent = '–';
        range.appendChild(minI); range.appendChild(sep); range.appendChild(maxI);
        pop.appendChild(range);
      }

      var foot = document.createElement('div');
      foot.className = 'fdy-filter__foot';
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'fdy-btn fdy-btn--ghost fdy-btn--sm';
      reset.textContent = 'Reset';
      reset.addEventListener('click', function () {
        delete colFilters[idx];
        markActive(btn, false);
        page = 1; render();
        closePopover(true);
      });
      var done = document.createElement('button');
      done.type = 'button';
      done.className = 'fdy-btn fdy-btn--sm';
      done.textContent = 'Tutup';
      done.addEventListener('click', function () { closePopover(true); });
      foot.appendChild(reset); foot.appendChild(done);
      pop.appendChild(foot);

      document.body.appendChild(pop);
      pop._trigger = btn;
      var rect = btn.getBoundingClientRect();
      pop.style.top = (rect.bottom + 4) + 'px';
      pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 8)) + 'px';
      openPopover = pop;
      window.addEventListener('scroll', closeOnScroll, true);
      window.addEventListener('resize', closeOnScroll);
      var firstControl = pop.querySelector('input, button');
      if (firstControl) firstControl.focus();
    }
    function buildColumnFilters() {
      Array.prototype.forEach.call(table.querySelectorAll('thead th[data-fdy-filter]'), function (th) {
        var type = th.getAttribute('data-fdy-filter');
        var idx = th.cellIndex;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fdy-table__filterbtn';
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Filter kolom');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v5l-4 2v-7z"></path></svg>';
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var wasOpen = openPopover && openPopover._trigger === btn;
          closePopover();
          if (!wasOpen) openFilterPopover(type, idx, btn);
        });
        th.appendChild(btn);
      });
    }

    function render() {
      var view = sorted(filtered());
      var total = view.length;
      var totalPages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      if (page > totalPages) page = totalPages;
      if (page < 1) page = 1;

      var start = pageSize ? (page - 1) * pageSize : 0;
      var slice = pageSize ? view.slice(start, start + pageSize) : view;

      // Hide every row, then append the visible slice in order (reorders DOM).
      allRows.forEach(function (row) { row.style.display = 'none'; });
      slice.forEach(function (row) {
        row.style.display = '';
        tbody.appendChild(row);
      });

      var shownFrom = total === 0 ? 0 : start + 1;
      var shownTo = start + slice.length;
      if (countEl) countEl.textContent = total + ' baris';
      if (infoEl) infoEl.textContent = 'Menampilkan ' + shownFrom + '–' + shownTo + ' dari ' + total;
      buildPager(totalPages);
      syncSelectAll(slice);
      updateBulk();

      root.dispatchEvent(new CustomEvent('fdy-table-change', {
        bubbles: true,
        detail: { shown: slice.length, total: total, page: page }
      }));
    }

    sortButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var index = colIndexOf(button);
        if (index < 0) return;
        var th = button.closest('th');
        if (sortCol === index) {
          sortDir = sortDir === 1 ? -1 : 1;
        } else {
          sortCol = index;
          sortDir = 1;
          sortType = button.getAttribute('data-fdy-sort') === 'number' ? 'number' : 'text';
        }
        // Reset all header sort indicators, set the active one.
        sortButtons.forEach(function (b) {
          var h = b.closest('th');
          if (h) h.removeAttribute('aria-sort');
        });
        if (th) th.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
        page = 1;
        render();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filter = searchInput.value.trim();
        page = 1;
        render();
      });
    }

    if (selectAll) {
      selectAll.addEventListener('change', function () {
        var start = pageSize ? (page - 1) * pageSize : 0;
        var view = sorted(filtered());
        var slice = pageSize ? view.slice(start, start + pageSize) : view;
        slice.forEach(function (row) {
          var box = row.querySelector('[data-fdy-row-select]');
          if (box) {
            box.checked = selectAll.checked;
            row.setAttribute('aria-selected', selectAll.checked ? 'true' : 'false');
          }
        });
        selectAll.indeterminate = false;
        updateBulk();
      });
    }

    tbody.addEventListener('change', function (e) {
      var box = e.target.closest('[data-fdy-row-select]');
      if (!box) return;
      var row = box.closest('tr');
      if (row) row.setAttribute('aria-selected', box.checked ? 'true' : 'false');
      var view = sorted(filtered());
      var start = pageSize ? (page - 1) * pageSize : 0;
      var slice = pageSize ? view.slice(start, start + pageSize) : view;
      syncSelectAll(slice);
      updateBulk();
    });

    if (bulkClear) bulkClear.addEventListener('click', clearSelection);

    // Dismiss an open filter popover on outside click or Escape.
    document.addEventListener('click', function (e) {
      if (!openPopover) return;
      var t = openPopover._trigger;
      if (!openPopover.contains(e.target) && e.target !== t && (!t || !t.contains(e.target))) {
        closePopover();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openPopover) closePopover(true);
    });

    buildColumnFilters();
    render();
  }

  function initAll(context) {
    Array.prototype.forEach.call(
      (context || document).querySelectorAll('[data-fdy-table]'),
      initTable
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FoundryTable = { init: initTable, initAll: initAll };
})();
