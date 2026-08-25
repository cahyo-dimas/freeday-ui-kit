/* Freeday — app shell enhancer (optional, zero-dependency).
 * Opt in with <div class="fdy-app" data-fdy-app>; the markup is otherwise unchanged.
 *
 * The shell has always shipped the state classes and no behaviour, which left every consumer to
 * assemble the toggle, Escape, focus trap, focus restore and `inert` themselves, and the two
 * hand-rolled copies in this repo's own docs already disagreed about which of those exist. Below
 * 721px the sidebar is an OVERLAY (app-shell.css: position:fixed + translateX(-100%)), so it needs
 * the same treatment a modal drawer gets; at or above 721px it is a column that merely collapses.
 *
 * One rule covers both a hidden nav and a hidden page:
 *   - `__sidebar` is inert whenever the nav is NOT visible. Off-canvas and collapsed panels stay in
 *     the tab order otherwise — translateX(-100%) and width:0 hide a thing from the eye, not from
 *     the keyboard, which is how a nav nobody can see still swallows Tab.
 *   - `__content` is inert only while the nav is an OPEN OVERLAY, so Tab cannot wander behind the
 *     backdrop.
 *
 * Emits a bubbling `fdy-app-nav` CustomEvent (detail {visible}) whenever the nav's visibility
 * changes, and takes `FreedayAppShell.setVisible(root, visible)` from outside. Those two exist for
 * the same reason the other enhancers have them: a host that keeps its own state — the Blazor
 * wrapper binding @bind-NavOpen, an app persisting the collapsed preference — has to be able to
 * hear the change and to drive it, without owning the behaviour twice.
 * FreedayAppShell.init(root) for late-mounted markup.
 */
(function () {
  'use strict';

  /* Must match app-shell.css, which switches at (min-width:721px) / (max-width:720px). */
  var WIDE = '(min-width: 721px)';

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),'
    + ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* getClientRects(), not offsetParent: an overlay sidebar is position:fixed, and a fixed element
     reports no offsetParent at all — filtering on it would call every nav item invisible. */
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), function (el) {
      return el.getClientRects().length > 0;
    });
  }

  function setInert(el, on) {
    if (!el) return;
    if (on) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }

  function initShell(app) {
    if (app.dataset.fdyAppShellReady === '1') return;
    app.dataset.fdyAppShellReady = '1';

    var toggle = app.querySelector('.fdy-app__navtoggle');
    var sidebar = app.querySelector('.fdy-app__sidebar');
    if (!toggle || !sidebar) return;
    var content = app.querySelector('.fdy-app__content');
    var backdrop = app.querySelector('.fdy-app__backdrop');

    var mqWide = window.matchMedia(WIDE);
    var restoreTo = null;
    var lastVisible = null;

    function isOverlayOpen() { return app.classList.contains('fdy-app--nav-open'); }
    function isCollapsed() { return app.classList.contains('fdy-app--nav-collapsed'); }
    function navVisible() { return mqWide.matches ? !isCollapsed() : isOverlayOpen(); }

    /* aria-expanded answers "is the nav showing?" in BOTH modes — the two state classes are the
       kit's business, not the reader's. */
    function sync() {
      var visible = navVisible();
      toggle.setAttribute('aria-expanded', String(visible));
      setInert(sidebar, !visible);
      setInert(content, !mqWide.matches && visible);
      /* Announce only real changes. The first sync() runs at init to describe the state the markup
         arrived in, which is not something a host asked for and must not look like one. */
      if (lastVisible !== null && visible !== lastVisible) {
        app.dispatchEvent(new CustomEvent('fdy-app-nav', { bubbles: true, detail: { visible: visible } }));
      }
      lastVisible = visible;
    }

    function open() {
      if (isOverlayOpen()) return;
      restoreTo = document.activeElement;
      app.classList.add('fdy-app--nav-open');
      sync();
      var first = focusables(sidebar)[0];
      if (first) {
        first.focus();
      } else {
        sidebar.setAttribute('tabindex', '-1');
        sidebar.focus();
      }
    }

    /* restoreFocus is false when the viewport closed it rather than the user — a resize must not
       yank focus out from under whatever the reader was doing. */
    function close(restoreFocus) {
      if (!isOverlayOpen()) return;
      app.classList.remove('fdy-app--nav-open');
      sync();
      if (restoreFocus === false) return;
      /* Back to the control that opened it. document.body is where a keyboard user gets stranded,
         so anything that is gone, detached or the body itself falls back to the toggle. */
      var target = (restoreTo && restoreTo !== document.body && document.contains(restoreTo))
        ? restoreTo : toggle;
      if (typeof target.focus === 'function') target.focus();
    }

    toggle.addEventListener('click', function () {
      if (mqWide.matches) {
        app.classList.toggle('fdy-app--nav-collapsed');
        sync();
      } else if (isOverlayOpen()) {
        close();
      } else {
        open();
      }
    });

    if (backdrop) backdrop.addEventListener('click', function () { close(); });

    /* Following a link inside an overlay nav means "take me there" — leaving the panel open over
       the page you just asked for is the one thing every hand-rolled copy in this repo disagreed on. */
    sidebar.addEventListener('click', function (e) {
      if (!isOverlayOpen()) return;
      if (e.target.closest && e.target.closest('.fdy-nav__item')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!isOverlayOpen()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      /* The trap. `inert` on the content stops Tab reaching the page, but without this the focus
         would walk out of the document into the browser's own chrome instead of cycling. */
      var items = focusables(sidebar);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    /* Crossing the breakpoint with the overlay open would otherwise leave --nav-open set and the
       content inert forever: the panel becomes a static column again, and the page it is covering
       can no longer be clicked or read. */
    mqWide.addEventListener('change', function () {
      if (mqWide.matches && isOverlayOpen()) close(false);
      else sync();
    });

    sync();

    /* The same handle the other enhancers expose (`_fdyCombo` and friends): a host that binds its
       own state needs to drive this without reaching for the class names the kit reserves. */
    app._fdyAppShell = {
      isVisible: navVisible,
      setVisible: function (visible) {
        if (visible === navVisible()) return;
        if (mqWide.matches) {
          app.classList.toggle('fdy-app--nav-collapsed', !visible);
          sync();
        } else if (visible) {
          open();
        } else {
          close();
        }
      },
    };
  }

  function initShells(context) {
    var ctx = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON
       the widget. */
    if (ctx.matches && ctx.matches('[data-fdy-app]')) initShell(ctx);
    Array.prototype.forEach.call(ctx.querySelectorAll('[data-fdy-app]'), initShell);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initShells(); });
  } else {
    initShells();
  }

  window.FreedayAppShell = {
    init: initShells,
    initAll: initShells,
    /* Both take the shell root. A missing or un-initialised root is a no-op rather than a throw:
       a host may race the enhancer on first render, and a crash there is worse than a late sync. */
    setVisible: function (root, visible) {
      if (root && root._fdyAppShell) root._fdyAppShell.setVisible(visible === true);
    },
    isVisible: function (root) {
      return !!(root && root._fdyAppShell && root._fdyAppShell.isVisible());
    },
  };
})();
