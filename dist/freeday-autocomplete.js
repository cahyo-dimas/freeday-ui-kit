/* Freeday, autocomplete enhancer (optional, zero-dependency).
 * Editable combobox (WAI-ARIA APG): a text input filters a role="listbox" of role="option"
 * items as you type; select fills the input. Auto-inits [data-fdy-autocomplete]. Options are
 * markup filtered client-side and read from the list each time they are used, so an app that
 * re-renders them (after a server-side search) is heard without re-initialising. A host that
 * renders once uses FreedayAutocomplete.setOptions(root, labels).
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
    if (root.closest('[data-fdy-ignore]')) return;
    root.dataset.fdyAcReady = '1';

    var input = root.querySelector('input[role="combobox"]') || root.querySelector('input');
    root._fdyInvalid = !!input && input.getAttribute('aria-invalid') === 'true';
    var listbox = root.querySelector('[role="listbox"]');
    if (!input || !listbox) return;
    var emptyEl = listbox.querySelector('.fdy-autocomplete__empty');
    var active = -1;

    /* Read from the list every time, not captured once at init: options rendered later were never
       seen, and the ready flag refused the re-init that would have found them (#123). */
    function allOptions() {
      return Array.prototype.slice.call(listbox.querySelectorAll('[role="option"]')).map(function (o) {
        if (!o.id) { seq += 1; o.id = 'fdy-ac-opt-' + seq; }
        o.dataset.label = o.textContent.trim();
        return o;
      });
    }
    allOptions();
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');

    function visible() { return allOptions().filter(function (o) { return !o.hidden; }); }
    function clearHighlight() { allOptions().forEach(function (o) { o.classList.remove('is-highlighted'); }); }

    var _pop = null;
    function popCtl() { if (_pop === null && window.FreedayPopover) _pop = window.FreedayPopover.attach(listbox, input); return _pop; }
    function open() {
      /* The input carries these natively; a disabled one fires nothing, but a READONLY one still
         takes focus and clicks, and the list used to open over a field nobody can edit. */
      if (input.readOnly || input.disabled) return;
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
      showAll();
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

    /* A list opens whole; only typing narrows it. A value that was already in the field (a default,
       a saved record) is not a query, and filtering by it opened a one-item list that looked broken
       (#115). Reset on close, so the arrow keys reopen it whole as well. */
    function showAll() {
      var options = allOptions();
      options.forEach(function (o) { o.hidden = false; });
      if (emptyEl) emptyEl.hidden = options.length !== 0;
    }

    function applyFilter() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      allOptions().forEach(function (o) {
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
      allOptions().forEach(function (o) { o.setAttribute('aria-selected', o === opt ? 'true' : 'false'); });
      close();
      root.dispatchEvent(new CustomEvent('fdy-autocomplete-select', { bubbles: true, detail: { value: opt.dataset.label, option: opt } }));
    }

    input.addEventListener('input', applyFilter);
    input.addEventListener('focus', function () {
      if (!listbox.hidden) return;
      showAll();
      open();
    });
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

    /* For a host that renders its markup once (Blazor): the list and the text are pushed in, silently.
       New options are filtered by what is typed if the list is open, and shown whole otherwise. */
    root._fdyAc = {
      setOptions: function (labels) {
        allOptions().forEach(function (o) { o.remove(); });
        (labels || []).forEach(function (label) {
          var li = document.createElement('li');
          li.className = 'fdy-autocomplete__option';
          li.setAttribute('role', 'option');
          li.textContent = label;
          listbox.insertBefore(li, emptyEl);
        });
        allOptions();
        if (listbox.hidden) showAll(); else applyFilter();
      },
      setValue: function (text) {
        input.value = text || '';
        allOptions().forEach(function (o) { o.setAttribute('aria-selected', o.dataset.label === input.value ? 'true' : 'false'); });
      }
    };
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

  /* Same contract as the combo's: the states live on the input natively, and a host that stops
     re-rendering after hydration needs a way to change them afterwards. */
  function setState(root, state) {
    var input = root ? root.querySelector('input') : null;
    if (!input || !state) return;
    if (state.disabled != null) input.disabled = !!state.disabled;
    if (state.readonly != null) input.readOnly = !!state.readonly;
    /* Only when the HOST changes it: an unchanged push must not erase what freeday-form.js painted (#114). */
    if (state.invalid != null && !!state.invalid !== root._fdyInvalid) {
      root._fdyInvalid = !!state.invalid;
      if (state.invalid) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    /* Native `required` on the input itself: it is editable, so constraint validation applies (#114). */
    if (state.required != null) input.required = !!state.required;
  }

  function setValue(root, text) { if (root && root._fdyAc) root._fdyAc.setValue(text); }
  function setOptions(root, labels) { if (root && root._fdyAc) root._fdyAc.setOptions(labels); }

  window.FreedayAutocomplete = { init: initAutocomplete, initAll: initAll, setState: setState, setValue: setValue, setOptions: setOptions };
})();
