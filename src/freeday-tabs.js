/* Freeday, tabs enhancer (optional, zero-dependency, WAI-ARIA APG tabs).
 * Auto-inits every [data-fdy-tabs]. Roving tabindex + arrow/Home/End nav.
 *
 * Markup: a [data-fdy-tabs] with a [role="tablist"] of
 * <button role="tab" aria-controls="PANEL" aria-selected> and matching
 * <div role="tabpanel" id="PANEL" aria-labelledby="TAB" [hidden]>.
 *
 * The arrow AXIS comes from the tablist's `aria-orientation`: `vertical` answers to Up and
 * Down, anything else to Left and Right. One axis per tablist, which is what APG maps, and the
 * other pair is left entirely alone rather than bound as a second axis: Left and Right over a
 * column of tabs belong to whatever else is on the page, and a widget that preventDefaults a key
 * it has no meaning for has taken it from the page silently. Home/End answer on both.
 *
 * `.fdy-tabs--picker-narrow` on the root: this builds a `.fdy-tabs__picker` holding one combo of
 * the same tabs, first in the root, and keeps the two in step both ways. tabs.css shows it instead
 * of the list in a container of 40rem or less. It needs freeday-select.js (FreedayCombo), which
 * dist/freeday.js carries; without it the list simply stays. A picker the author wrote is left alone.
 */
(function () {
  'use strict';

  /* The picker's accessible name when the tablist has none of its own to lend it. */
  var TEXT = {
    picker: 'Section'
  };
  function textOf(root, key) {
    var kebab = key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
    var custom = root.getAttribute('data-fdy-text-' + kebab);
    return custom != null && custom !== '' ? custom : TEXT[key];
  }
  var uidSeq = 0;
  function uid(p) { uidSeq += 1; return p + '-' + uidSeq; }

  /* The combo freeday-select.js reads, built from the tabs themselves: one option per tab, its value
     the tab's id. Named by the tablist's own label when it has one, so the two read as one control. */
  function buildPicker(root, list, tabs) {
    var wrap = document.createElement('div');
    wrap.className = 'fdy-tabs__picker';
    var combo = document.createElement('div');
    combo.className = 'fdy-combo';
    combo.setAttribute('data-fdy-combo', '');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'fdy-combo__button';
    button.setAttribute('role', 'combobox');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    var value = document.createElement('span');
    value.className = 'fdy-combo__value';
    value.id = uid('fdy-tabs-picker-value');
    button.appendChild(value);
    var labelledby = list ? list.getAttribute('aria-labelledby') : null;
    var label = list ? list.getAttribute('aria-label') : null;
    if (labelledby) button.setAttribute('aria-labelledby', labelledby + ' ' + value.id);
    else button.setAttribute('aria-label', label || textOf(root, 'picker'));
    var listbox = document.createElement('ul');
    listbox.className = 'fdy-combo__listbox';
    listbox.setAttribute('role', 'listbox');
    listbox.hidden = true;
    tabs.forEach(function (tab) {
      if (!tab.id) tab.id = uid('fdy-tab');
      var opt = document.createElement('li');
      opt.className = 'fdy-combo__option';
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-value', tab.id);
      opt.setAttribute('aria-selected', 'false');
      var check = document.createElement('span');
      check.className = 'fdy-combo__check';
      opt.appendChild(check);
      opt.appendChild(document.createTextNode((tab.textContent || '').replace(/\s+/g, ' ').trim()));
      listbox.appendChild(opt);
    });
    combo.appendChild(button);
    combo.appendChild(listbox);
    wrap.appendChild(combo);
    root.insertBefore(wrap, root.firstChild);
    return combo;
  }

  function initTabs(root) {
    if (root.dataset.fdyTabsReady === '1') return;
    if (root.closest('[data-fdy-ignore]')) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;
    root.dataset.fdyTabsReady = '1';

    /* The look follows `.fdy-tabs--vertical`, the behaviour follows `aria-orientation`, and this
       makes the second agree with the first so an app states the axis once. The attribute always
       wins when it is there: it is what an assistive technology announces, so nothing here may
       overwrite one an author wrote. */
    var list = root.querySelector('[role="tablist"]');
    if (list !== null && list.getAttribute('aria-orientation') === null
        && root.classList.contains('fdy-tabs--vertical')) {
      list.setAttribute('aria-orientation', 'vertical');
    }
    var vertical = list !== null && list.getAttribute('aria-orientation') === 'vertical';
    var picker = null;
    if (root.classList.contains('fdy-tabs--picker-narrow') && window.FreedayCombo
        && root.querySelector(':scope > .fdy-tabs__picker') === null) {
      picker = buildPicker(root, list, tabs);
      window.FreedayCombo.init(picker);
      picker.addEventListener('fdy-change', function (e) {
        var id = e.detail && e.detail.value;
        var tab = tabs.filter(function (t) { return t.id === id; })[0];
        if (tab) select(tab, false);
      });
    }
    var NEXT_KEY = vertical ? 'ArrowDown' : 'ArrowRight';
    var PREV_KEY = vertical ? 'ArrowUp' : 'ArrowLeft';

    function panelFor(tab) {
      var id = tab.getAttribute('aria-controls');
      return id ? document.getElementById(id) : null;
    }
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = panelFor(t);
        if (panel) panel.hidden = !on;
      });
      /* Silent: setValue raises no fdy-change, so the picker cannot echo a pick back here. */
      if (picker) window.FreedayCombo.setValue(picker, tab.id);
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        switch (e.key) {
          case NEXT_KEY:
            e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); break;
          case PREV_KEY:
            e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length], true); break;
          case 'Home':
            e.preventDefault(); select(tabs[0], true); break;
          case 'End':
            e.preventDefault(); select(tabs[tabs.length - 1], true); break;
        }
      });
    });

    var current = tabs.filter(function (t) {
      return t.getAttribute('aria-selected') === 'true';
    })[0] || tabs[0];
    select(current, false);
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-tabs]')) initTabs(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-tabs]'), initTabs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayTabs = { init: initTabs, initAll: initAll };
})();
