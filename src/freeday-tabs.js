/* Freeday — tabs enhancer (optional, zero-dependency, WAI-ARIA APG tabs).
 * Auto-inits every [data-fdy-tabs]. Roving tabindex + arrow/Home/End nav.
 *
 * Markup: a [data-fdy-tabs] with a [role="tablist"] of
 * <button role="tab" aria-controls="PANEL" aria-selected> and matching
 * <div role="tabpanel" id="PANEL" aria-labelledby="TAB" [hidden]>.
 */
(function () {
  'use strict';

  function initTabs(root) {
    if (root.dataset.fdyTabsReady === '1') return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;
    root.dataset.fdyTabsReady = '1';

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
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); break;
          case 'ArrowLeft':
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
