/* Freeday — autocomplete enhancer (optional, zero-dependency).
 * Editable combobox (WAI-ARIA APG): a text input filters a role="listbox" of role="option"
 * items as you type; select fills the input. Auto-inits [data-fdy-autocomplete]. Options are
 * static markup filtered client-side — in an app, fetch/filter server-side and re-render options.
 *
 * Markup: <div data-fdy-autocomplete class="fdy-autocomplete">
 *   <input class="fdy-input" role="combobox" aria-expanded="false" aria-autocomplete="list"
 *          aria-controls="listId" autocomplete="off">
 *   <ul class="fdy-autocomplete__listbox" id="listId" role="listbox" hidden>
 *     <li class="fdy-autocomplete__option" role="option">…</li>…
 *     <li class="fdy-autocomplete__empty" hidden>Tak ada hasil</li></ul></div>
 * Emits a bubbling "fdy-autocomplete-select" CustomEvent (detail {value, option}).
 */
(function () {
  'use strict';

  var seq = 0;

  function initAutocomplete(root) {
    if (root.dataset.fdyAcReady === '1') return;
    root.dataset.fdyAcReady = '1';

    var input = root.querySelector('input[role="combobox"]') || root.querySelector('input');
    var listbox = root.querySelector('[role="listbox"]');
    if (!input || !listbox) return;
    var options = Array.prototype.slice.call(listbox.querySelectorAll('[role="option"]'));
    var emptyEl = listbox.querySelector('.fdy-autocomplete__empty');
    var active = -1;

    options.forEach(function (o) {
      if (!o.id) { seq += 1; o.id = 'fdy-ac-opt-' + seq; }
      o.dataset.label = o.textContent.trim();
    });
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');

    function visible() { return options.filter(function (o) { return !o.hidden; }); }
    function clearHighlight() { options.forEach(function (o) { o.classList.remove('is-highlighted'); }); }

    var _pop = null;
    function popCtl() { if (_pop === null && window.FreedayPopover) _pop = window.FreedayPopover.attach(listbox, input); return _pop; }
    function open() {
      if (!listbox.hidden) return;
      var p = popCtl(); if (p) p.show(); else listbox.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDocClick, true);
    }
    function close() {
      if (listbox.hidden) return;
      var p = popCtl(); if (p) p.hide(); else listbox.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
      clearHighlight();
      document.removeEventListener('click', onDocClick, true);
    }
    function onDocClick(e) { if (!root.contains(e.target)) close(); }

    function highlight(i) {
      var vis = visible();
      clearHighlight();
      if (!vis.length || i < 0 || i >= vis.length) { active = -1; input.removeAttribute('aria-activedescendant'); return; }
      active = i;
      vis[i].classList.add('is-highlighted');
      input.setAttribute('aria-activedescendant', vis[i].id);
      vis[i].scrollIntoView({ block: 'nearest' });
    }

    function applyFilter() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      options.forEach(function (o) {
        var match = !q || o.dataset.label.toLowerCase().indexOf(q) !== -1;
        o.hidden = !match;
        if (match) shown++;
      });
      if (emptyEl) emptyEl.hidden = shown !== 0;
      active = -1;
      input.removeAttribute('aria-activedescendant');
      clearHighlight();
      open();
    }

    function choose(opt) {
      input.value = opt.dataset.label;
      options.forEach(function (o) { o.setAttribute('aria-selected', o === opt ? 'true' : 'false'); });
      close();
      root.dispatchEvent(new CustomEvent('fdy-autocomplete-select', { bubbles: true, detail: { value: opt.dataset.label, option: opt } }));
    }

    input.addEventListener('input', applyFilter);
    input.addEventListener('focus', function () { applyFilter(); });
    input.addEventListener('keydown', function (e) {
      var vis = visible();
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (listbox.hidden) open();
          highlight(active + 1 < vis.length ? active + 1 : 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (listbox.hidden) open();
          highlight(active - 1 >= 0 ? active - 1 : vis.length - 1);
          break;
        case 'Enter':
          if (!listbox.hidden && active >= 0) { e.preventDefault(); choose(vis[active]); }
          break;
        case 'Escape':
          if (!listbox.hidden) { e.preventDefault(); close(); }
          break;
        case 'Tab':
          close();
          break;
        default: break;
      }
    });
    listbox.addEventListener('click', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (opt && !opt.hidden) choose(opt);
    });
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-autocomplete]')) initAutocomplete(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-autocomplete]'), initAutocomplete);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayAutocomplete = { init: initAutocomplete, initAll: initAll };
})();
