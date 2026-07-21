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

    function colIndexOf(button) {
      var th = button.closest('th');
      return th ? th.cellIndex : -1;
    }

    function filtered() {
      if (!filter) return allRows.slice();
      var q = filter.toLowerCase();
      return allRows.filter(function (row) {
        return row.textContent.toLowerCase().indexOf(q) !== -1;
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
    });

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
