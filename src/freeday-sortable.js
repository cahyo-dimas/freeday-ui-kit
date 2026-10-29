/* Freeday, sortable list enhancer (optional, zero-dependency).
 * Reorder the children of a list by dragging a handle, or by focusing it and pressing ↑ / ↓. The
 * keyboard path is not an extra: drag-only reordering locks out every keyboard and screen-reader
 * user from a settings screen, and that path is the part each app used to write for itself
 * (CATATAN-FREEDAY §15).
 *
 * Markup contract:
 *  <ul class="fdy-sortable" data-fdy-sortable>            (or a <tbody>, or a <div>)
 *    <li data-key="ketua" data-label="Ketua">
 *      <button class="fdy-sortable__handle" type="button">…icon…</button> Ketua
 *    </li>
 *    <li data-key="sistem" data-fdy-sort-fixed>…</li>     (never moves, and nothing passes it)
 *  </ul>
 * The items are the container's element children. `data-key` names each in the event; `data-label`
 * is what the handle's default aria-label and the announcement call it (the item text otherwise).
 * `data-disabled` on the container switches reordering off, e.g. while the list is filtered, and
 * the handles follow it through aria-disabled.
 *
 * Emits a bubbling, CANCELABLE "fdy-sort-change" on the container, detail {key, from, to, order},
 * `order` being every item's key in the new order. Not cancelled, the kit moves the element, which
 * is the whole job on a static page. A framework that renders the list from state cancels it and
 * reorders the state instead, because the DOM is the framework's and an element moved behind its
 * back leaves the two disagreeing about where each row is. Either way the kit announces the move
 * and, after a keyboard step, puts focus back on the moved item's handle (looked up by data-key,
 * since a framework re-render may have replaced the element).
 *
 * The drag shows where the item will land (is-drop-before / is-drop-after on the item it lands
 * against) and moves nothing until the pointer is released; Escape cancels it. Exposes
 * window.FreedaySortable.
 */
(function () {
  'use strict';

  var TEXT = {
    handle: 'Move {label}. Drag, or press the up and down arrow keys.',
    moved: '{label} moved to position {position} of {total}.'
  };
  /* Kebab-cased for the lookup, see the note in freeday-upload.js. */
  function textAttr(root, key) {
    if (!root || !root.getAttribute) return null;
    var kebab = root.getAttribute('data-fdy-text-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }));
    return kebab != null && kebab !== '' ? kebab : root.getAttribute('data-fdy-text-' + key);
  }
  function textOf(root, key, vars) {
    var custom = textAttr(root, key);
    var s = custom != null && custom !== '' ? custom : TEXT[key];
    for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  var HANDLE = '.fdy-sortable__handle';

  var live = null;
  function announce(message) {
    if (live === null) {
      live = document.createElement('div');
      live.className = 'fdy-visually-hidden';
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    /* The same sentence twice in a row is no change, and a live region announces changes. */
    live.textContent = live.textContent === message ? message + ' ' : message;
  }

  function items(root) {
    return Array.prototype.slice.call(root.children);
  }
  function keyOf(item, index) {
    var key = item.getAttribute('data-key');
    return key !== null ? key : String(index);
  }
  function labelOf(item) {
    var label = item.getAttribute('data-label');
    return label !== null ? label : (item.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function disabled(root) {
    return root.hasAttribute('data-disabled');
  }
  function itemOf(root, node) {
    for (var n = node; n && n !== root; n = n.parentElement) {
      if (n.parentElement === root) return n;
    }
    return null;
  }

  /* A move is allowed only if it shifts no fixed item, which is the same as saying the item does
     not start fixed and does not cross one on its way. */
  function allowed(list, from, to) {
    if (from === to || to < 0 || to >= list.length) return false;
    var lo = Math.min(from, to), hi = Math.max(from, to);
    for (var i = lo; i <= hi; i++) if (list[i].hasAttribute('data-fdy-sort-fixed')) return false;
    return true;
  }

  function syncHandles(root) {
    var off = disabled(root) ? 'true' : 'false';
    items(root).forEach(function (item) {
      var handle = item.querySelector(HANDLE);
      if (!handle) return;
      if (handle.getAttribute('aria-disabled') !== off) handle.setAttribute('aria-disabled', off);
      if (!handle.hasAttribute('aria-label')) handle.setAttribute('aria-label', textOf(root, 'handle', { label: labelOf(item) }));
    });
  }

  function commit(root, from, to, refocus) {
    var list = items(root);
    var item = list[from];
    var key = keyOf(item, from);
    var keys = list.map(keyOf);
    keys.splice(to, 0, keys.splice(from, 1)[0]);
    var ev = new CustomEvent('fdy-sort-change', {
      bubbles: true,
      cancelable: true,
      detail: { key: key, from: from, to: to, order: keys }
    });
    root.dispatchEvent(ev);
    if (!ev.defaultPrevented) root.insertBefore(item, to > from ? list[to].nextSibling : list[to]);
    announce(textOf(root, 'moved', { label: labelOf(item), position: String(to + 1), total: String(list.length) }));
    if (!refocus) return;
    /* After the app's own render, which a framework runs after this handler returns. Moving a focused
       element drops its focus, and a keyed re-render may have replaced the element outright. */
    setTimeout(function () {
      var now = items(root);
      var moved = item.parentElement === root ? item : now.filter(function (el, i) { return keyOf(el, i) === key; })[0];
      var handle = moved ? moved.querySelector(HANDLE) : null;
      if (handle && document.activeElement !== handle) handle.focus();
    }, 0);
  }

  function initSortable(root) {
    if (root.dataset.fdySortableReady === '1') return;
    if (root.closest('[data-fdy-ignore]')) return;
    root.dataset.fdySortableReady = '1';
    syncHandles(root);
    /* Rows a framework adds later get their aria-label, and data-disabled reaches every handle. */
    new MutationObserver(function () { syncHandles(root); })
      .observe(root, { childList: true, attributes: true, attributeFilter: ['data-disabled'] });

    root.addEventListener('keydown', function (e) {
      var handle = e.target.closest ? e.target.closest(HANDLE) : null;
      if (!handle || !root.contains(handle) || disabled(root)) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var list = items(root);
      var from = list.indexOf(itemOf(root, handle));
      var to = from + (e.key === 'ArrowUp' ? -1 : 1);
      if (from !== -1 && allowed(list, from, to)) commit(root, from, to, true);
    });

    var drag = null;

    function clearMarks() {
      items(root).forEach(function (el) { el.classList.remove('is-drop-before', 'is-drop-after'); });
    }
    function end(apply) {
      if (drag === null) return;
      var d = drag;
      drag = null;
      document.removeEventListener('keydown', onEscape, true);
      clearMarks();
      d.item.classList.remove('is-dragging');
      root.classList.remove('is-sorting');
      if (apply && d.started && d.to !== null) commit(root, d.from, d.to, false);
    }
    function onEscape(e) {
      if (e.key === 'Escape') { e.preventDefault(); end(false); }
    }

    root.addEventListener('pointerdown', function (e) {
      var handle = e.target.closest ? e.target.closest(HANDLE) : null;
      if (!handle || !root.contains(handle) || disabled(root) || e.button !== 0) return;
      var item = itemOf(root, handle);
      if (!item) return;
      e.preventDefault();
      handle.focus();
      handle.setPointerCapture(e.pointerId);
      drag = { item: item, from: items(root).indexOf(item), started: false, to: null };
      document.addEventListener('keydown', onEscape, true);
    });

    root.addEventListener('pointermove', function (e) {
      if (drag === null) return;
      /* No travel threshold: a press that never leaves its own row resolves to to === from, which
         allowed() refuses, so a click on the handle cannot reorder anything. */
      if (!drag.started) {
        drag.started = true;
        drag.item.classList.add('is-dragging');
        root.classList.add('is-sorting');
      }
      clearMarks();
      drag.to = null;
      var list = items(root);
      var over = itemOf(root, document.elementFromPoint(e.clientX, e.clientY));
      if (!over) return;
      var rect = over.getBoundingClientRect();
      var after = e.clientY > rect.top + rect.height / 2;
      var slot = list.indexOf(over) + (after ? 1 : 0);
      var to = slot > drag.from ? slot - 1 : slot;
      if (!allowed(list, drag.from, to)) return;
      drag.to = to;
      over.classList.add(after ? 'is-drop-after' : 'is-drop-before');
    });

    root.addEventListener('pointerup', function () { end(true); });
    root.addEventListener('pointercancel', function () { end(false); });
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-sortable]')) initSortable(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-sortable]'), initSortable);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedaySortable = { init: initSortable, initAll: initAll };
})();
