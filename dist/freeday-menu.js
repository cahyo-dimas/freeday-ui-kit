/* Freeday — menu enhancer (optional, zero-dependency).
 * Menu-button pattern (WAI-ARIA APG): a trigger with aria-haspopup="menu" toggles a
 * role="menu" popup of role="menuitem" buttons. Also powers the split button
 * (main action + attached caret toggle). Auto-inits [data-fdy-menu].
 *
 * Markup: <div data-fdy-menu><button aria-haspopup="menu" aria-expanded="false">…</button>
 *   <ul class="fdy-menu" role="menu" hidden><li role="none">
 *     <button class="fdy-menu__item" role="menuitem">…</button></li>…</ul></div>
 * Keyboard: trigger ↓/Enter/Space opens to first item, ↑ opens to last; in the menu
 * ↑/↓/Home/End move, Esc closes (focus → trigger), Tab closes; activating an item closes.
 */
(function () {
  'use strict';

  function menuItems(menu) {
    return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'))
      .filter(function (i) { return !i.disabled && !i.hidden; });
  }

  function initMenu(wrap) {
    if (wrap.dataset.fdyMenuReady === '1') return;
    wrap.dataset.fdyMenuReady = '1';
    var trigger = wrap.querySelector('[aria-haspopup="menu"]');
    var menu = wrap.querySelector('.fdy-menu, [role="menu"]');
    if (!trigger || !menu) return;

    Array.prototype.forEach.call(menu.querySelectorAll('[role="menuitem"]'), function (i) {
      i.setAttribute('tabindex', '-1');
    });
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');

    function focusAt(index) {
      var its = menuItems(menu);
      if (!its.length) return;
      its[(index + its.length) % its.length].focus();
    }
    var _pop = null;
    function popCtl() { if (_pop === null && window.FreedayPopover) _pop = window.FreedayPopover.attach(menu, trigger, { matchWidth: false }); return _pop; }
    function open(index) {
      var p = popCtl(); if (p) p.show(); else menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDocClick, true);
      focusAt(index);
    }
    function close(returnFocus) {
      if (menu.hidden) return;
      var p = popCtl(); if (p) p.hide(); else menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDocClick, true);
      if (returnFocus === true) trigger.focus();
    }
    function onDocClick(e) { if (!wrap.contains(e.target)) close(false); }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) open(0); else close(false);
    });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); open(-1); }
    });
    menu.addEventListener('keydown', function (e) {
      var its = menuItems(menu);
      var cur = its.indexOf(document.activeElement);
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); focusAt(cur + 1); break;
        case 'ArrowUp': e.preventDefault(); focusAt(cur - 1); break;
        case 'Home': e.preventDefault(); focusAt(0); break;
        case 'End': e.preventDefault(); focusAt(its.length - 1); break;
        case 'Escape': e.preventDefault(); close(true); break;
        case 'Tab': close(false); break;
        default: break;
      }
    });
    menu.addEventListener('click', function (e) {
      var item = e.target.closest('[role="menuitem"]');
      if (item && !item.disabled) close(true);
    });
  }

  function initAll(ctx) {
    Array.prototype.forEach.call((ctx || document).querySelectorAll('[data-fdy-menu]'), initMenu);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayMenu = { init: initMenu, initAll: initAll };
})();
