/* Freeday, choose-from-list enhancer (optional, zero-dependency).
 * Wires a searchable master-data picker dialog to read-only fields.
 * Progressive enhancement over a native <dialog>; in a framework app, drive the
 * dialog as a controlled component (fetchPage callback + server cache), not a store.
 *
 * Markup contract (see docs):
 *  - Field group:  [data-fdy-cfl="<dialogId>"], usually a `.fdy-input-group` holding a
 *      read-only `.fdy-input` and a trigger `<button class="fdy-input-group__btn">`.
 *      Optional `data-fdy-cfl-display="<key>"` picks which row dataset key fills the input
 *      (default "value"); optional `data-fdy-cfl-summary="{n} dipilih"` formats the multi label.
 *  - Standalone opener:  [data-fdy-cfl-open="<dialogId>"], opens the dialog with no bound field.
 *  - Dialog:  <dialog id="<dialogId>" class="fdy-modal fdy-modal--cfl"> containing
 *      a `[data-fdy-cfl-search]` input, `.fdy-cfl__row` <tr> rows carrying `data-*` fields,
 *      a `[data-fdy-cfl-empty]` element, and (multi only) `[data-fdy-cfl-multiple]` on the
 *      dialog plus `[data-fdy-cfl-count]` and `[data-fdy-cfl-confirm]` in the footer.
 *
 * Emits a bubbling "fdy-cfl-select" CustomEvent on the field group (or the dialog when
 * opened standalone): detail {row} for single-select, {rows} for multi-select, each a plain
 * object copy of the row's dataset. Consumers fill sibling fields (code → name) from it.
 */
(function () {
  'use strict';

  function rowData(row) {
    var out = {};
    var ds = row.dataset;
    for (var key in ds) { if (Object.prototype.hasOwnProperty.call(ds, key)) out[key] = ds[key]; }
    return out;
  }

  function rowSearchText(row) {
    return (row.getAttribute('data-search') != null ? row.getAttribute('data-search') : row.textContent)
      .toLowerCase();
  }


  /* User-facing strings. English by default since 2.0.0, documented and deliberate for the raw
   * enhancer path, and every one overridable per element with `data-fdy-text-<key>`, so a host
   * that speaks another language (an Indonesian app on the raw path) supplies its own without
   * forking this file. Keeping them in ONE table is also what lets a guard prove none is
   * hard-coded further down. */
  var TEXT = {
    selected: '{n} selected'
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

  function initDialog(dialog) {
    if (dialog.dataset.fdyCflReady === '1') return;
    dialog.dataset.fdyCflReady = '1';

    var search = dialog.querySelector('[data-fdy-cfl-search]');
    var emptyEl = dialog.querySelector('[data-fdy-cfl-empty]');
    var countEl = dialog.querySelector('[data-fdy-cfl-count]');
    var confirmBtn = dialog.querySelector('[data-fdy-cfl-confirm]');
    var multiple = dialog.hasAttribute('data-fdy-cfl-multiple');
    var rows = Array.prototype.slice.call(dialog.querySelectorAll('.fdy-cfl__row'));

    var activeGroup = null;   // field group that opened the dialog (null = standalone)
    var trigger = null;       // control to restore focus to on close

    rows.forEach(function (row) {
      row.setAttribute('tabindex', '-1');
      if (multiple && !row.hasAttribute('aria-selected')) row.setAttribute('aria-selected', 'false');
    });

    function visibleRows() {
      return rows.filter(function (r) { return !r.hidden; });
    }

    function applyFilter() {
      var q = (search ? search.value : '').trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (row) {
        var match = !q || rowSearchText(row).indexOf(q) !== -1;
        row.hidden = !match;
        if (match) shown++;
      });
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    function updateCount() {
      if (!countEl) return;
      var n = rows.filter(function (r) { return r.getAttribute('aria-selected') === 'true'; }).length;
      countEl.textContent = textOf(dialog, 'selected', { n: n });
    }

    function fillGroup(detail) {
      if (!activeGroup) return;
      var input = activeGroup.querySelector('.fdy-input');
      if (input) {
        if (detail.rows) {
          var tpl = activeGroup.getAttribute('data-fdy-cfl-summary') || '{n} selected';
          input.value = detail.rows.length ? tpl.replace('{n}', String(detail.rows.length)) : '';
        } else {
          var key = activeGroup.getAttribute('data-fdy-cfl-display') || 'value';
          input.value = detail.row[key] != null ? detail.row[key] : (detail.row.value || '');
        }
      }
    }

    function emit(detail) {
      (activeGroup || dialog).dispatchEvent(new CustomEvent('fdy-cfl-select', {
        bubbles: true, detail: detail
      }));
    }

    function commitSingle(row) {
      var detail = { row: rowData(row) };
      fillGroup(detail);
      emit(detail);
      dialog.close();
    }

    function toggleSelect(row) {
      var next = row.getAttribute('aria-selected') !== 'true';
      row.setAttribute('aria-selected', String(next));
      var box = row.querySelector('input[type="checkbox"]');
      if (box) box.checked = next;
      updateCount();
    }

    function confirmMulti() {
      var picked = rows.filter(function (r) { return r.getAttribute('aria-selected') === 'true'; });
      var detail = { rows: picked.map(rowData) };
      fillGroup(detail);
      emit(detail);
      dialog.close();
    }

    function focusRow(row) { if (row) row.focus(); }

    function moveFrom(current, delta) {
      var vis = visibleRows();
      var i = vis.indexOf(current);
      if (i === -1) { focusRow(vis[0]); return; }
      var target = i + delta;
      if (target < 0) { if (search) search.focus(); return; }
      if (target >= vis.length) return;
      focusRow(vis[target]);
    }

    if (search) {
      search.addEventListener('input', applyFilter);
      search.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); focusRow(visibleRows()[0]); }
      });
    }

    dialog.addEventListener('click', function (e) {
      var row = e.target.closest('.fdy-cfl__row');
      if (!row || row.hidden) return;
      if (multiple) toggleSelect(row); else commitSingle(row);
    });

    dialog.addEventListener('keydown', function (e) {
      var row = e.target.closest('.fdy-cfl__row');
      if (!row) return;
      var vis = visibleRows();
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); moveFrom(row, 1); break;
        case 'ArrowUp': e.preventDefault(); moveFrom(row, -1); break;
        case 'Home': e.preventDefault(); focusRow(vis[0]); break;
        case 'End': e.preventDefault(); focusRow(vis[vis.length - 1]); break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (multiple) toggleSelect(row); else commitSingle(row);
          break;
        default: break;
      }
    });

    if (confirmBtn) confirmBtn.addEventListener('click', confirmMulti);

    dialog.addEventListener('close', function () {
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
      activeGroup = null;
      trigger = null;
    });

    // Opening API used by triggers below.
    dialog.fdyCflOpen = function (group, opener) {
      activeGroup = group || null;
      trigger = opener || null;
      if (search) search.value = '';
      applyFilter();
      updateCount();
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      if (search) search.focus();
    };
  }

  function bindGroup(group) {
    if (group.dataset.fdyCflBound === '1') return;
    var dialog = document.getElementById(group.getAttribute('data-fdy-cfl'));
    if (!dialog) return;
    initDialog(dialog);
    var opener = group.querySelector('[data-fdy-cfl-trigger], .fdy-input-group__btn');
    if (!opener) return;
    group.dataset.fdyCflBound = '1';
    opener.addEventListener('click', function () { dialog.fdyCflOpen(group, opener); });
  }

  function bindOpener(opener) {
    if (opener.dataset.fdyCflBound === '1') return;
    var dialog = document.getElementById(opener.getAttribute('data-fdy-cfl-open'));
    if (!dialog) return;
    initDialog(dialog);
    opener.dataset.fdyCflBound = '1';
    opener.addEventListener('click', function () { dialog.fdyCflOpen(null, opener); });
  }

  function initTriggers(context) {
    var ctx = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (ctx.matches && ctx.matches('[data-fdy-cfl]')) bindGroup(ctx);
    if (ctx.matches && ctx.matches('[data-fdy-cfl-open]')) bindOpener(ctx);
    Array.prototype.forEach.call(ctx.querySelectorAll('[data-fdy-cfl]'), bindGroup);
    Array.prototype.forEach.call(ctx.querySelectorAll('[data-fdy-cfl-open]'), bindOpener);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initTriggers(); });
  } else {
    initTriggers();
  }

  window.FreedayCfl = { init: initTriggers };
})();
