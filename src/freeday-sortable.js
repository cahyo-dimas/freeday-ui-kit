/* Freeday, sortable list enhancer (optional, zero-dependency).
 * Reorder the children of a list by dragging a handle, or from the keyboard; and, for lists that
 * share a group, move items between them. The keyboard path is not an extra: drag-only reordering
 * locks out every keyboard and screen-reader user (CATATAN-FREEDAY §15).
 *
 * Markup contract:
 *  <ul class="fdy-sortable" data-fdy-sortable>            (or a <tbody>, or a <div>)
 *    <li data-key="ketua" data-label="Ketua">
 *      <button class="fdy-sortable__handle" type="button">…icon…</button> Ketua
 *    </li>
 *    <li data-key="sistem" data-fdy-sort-fixed>…</li>     (never moves, and nothing passes it)
 *  </ul>
 * The items are the container's element children. `data-key` names each in the event; `data-label`
 * is what the handle's default aria-label and the announcements call it (the item text otherwise).
 * `data-disabled` on the container switches it off, and the handles follow through aria-disabled.
 *
 * GROUPS. A value, `data-fdy-sortable="board"`, joins every list on the page with the same value:
 * items move between them. Each grouped list needs a `data-key` (its name in events) and is called
 * by `data-label` or `aria-label`. Across lists a fixed item keeps its END: it never leaves, and
 * nothing lands above the fixed run at a list's start or below the one at its end.
 * `data-fdy-sort-refuse="reason"` on a grouped list refuses every arriving item; a bubbling
 * `fdy-sort-check` {key, fromList, toList, refuse(reason)} asks the app per item, once per list per
 * gesture, before the drop. An empty value keeps today's single-list behaviour unchanged.
 *
 * Emits a bubbling, CANCELABLE "fdy-sort-change" on the DESTINATION list, detail {key, from, to,
 * order, fromList, toList, fromOrder}: `order` is the destination's keys after the move, `fromOrder`
 * the source's (the same array within one list). Not cancelled, the kit moves the element. A
 * framework that renders the list from state cancels it and moves its state instead. Either way the
 * kit announces the move and, after a keyboard step or move(), puts focus on the moved item's
 * handle, found by data-key in the destination once the app has rendered it.
 *
 * The drag shows where the item will land (is-drop-before / is-drop-after on an item, is-drop-into
 * on an empty list) and moves nothing until the pointer is released; Escape cancels it.
 * Exposes window.FreedaySortable { init, initAll }.
 */
(function () {
  'use strict';

  var TEXT = {
    handle: 'Move {label}. Drag, or press the up and down arrow keys.',
    handleGroup: 'Move {label}. Drag, or press Space to lift it.',
    lifted: '{label} lifted. {list}, position {position} of {total}. Arrow keys move it, Space drops it, Escape cancels.',
    over: '{list}, position {position} of {total}.',
    moved: '{label} moved to position {position} of {total}.',
    movedTo: '{label} moved to {list}, position {position} of {total}.',
    cancelled: 'Move cancelled. {label} is back in {list}, position {position}.',
    refused: '{list} does not take {label}.'
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
  var LIST = '[data-fdy-sortable]';
  var MARKS = ['is-drop-before', 'is-drop-after', 'is-drop-into', 'is-drop-refused'];

  var live = null;
  function announce(message) {
    if (live === null) {
      live = document.createElement('div');
      live.className = 'fdy-visually-hidden';
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    /* The same sentence twice in a row is no change, and a live region announces changes. */
    live.textContent = live.textContent === message ? message + '\u00a0' : message;
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

  /* ---- Lists and groups ---- */

  function groupOf(list) {
    return list.getAttribute('data-fdy-sortable') || '';
  }
  function listKey(list) {
    return list.getAttribute('data-key');
  }
  function listLabel(list) {
    return list.getAttribute('data-label') || list.getAttribute('aria-label') || listKey(list) || '';
  }
  /* Page-wide, in document order: the order ←/→ walk. */
  function groupLists(group) {
    return Array.prototype.slice.call(document.querySelectorAll('[data-fdy-sortable="' + CSS.escape(group) + '"]'));
  }
  /* The list of `group` that `node` is in, or null. */
  function listAt(group, node) {
    var list = node && node.closest ? node.closest(LIST) : null;
    return list !== null && groupOf(list) === group ? list : null;
  }

  /* ---- Where an item may land ---- */

  /* Within one list: a move is allowed only if it shifts no fixed item, which is the same as saying
     the item does not start fixed and does not cross one on its way. */
  function allowed(list, from, to) {
    if (from === to || to < 0 || to >= list.length) return false;
    var lo = Math.min(from, to), hi = Math.max(from, to);
    for (var i = lo; i <= hi; i++) if (list[i].hasAttribute('data-fdy-sort-fixed')) return false;
    return true;
  }
  function leadingFixed(list) {
    var n = 0;
    while (n < list.length && list[n].hasAttribute('data-fdy-sort-fixed')) n++;
    return n;
  }
  function trailingFixed(list) {
    var n = 0;
    while (n < list.length && list[list.length - 1 - n].hasAttribute('data-fdy-sort-fixed')) n++;
    return n;
  }
  /* The slots an item arriving from another list may take: after the fixed run at the start of the
     destination, before the one at its end. A fixed item in the middle blocks nothing. */
  function arrivalRange(dest) {
    var list = items(dest);
    return { lo: leadingFixed(list), hi: list.length - trailingFixed(list) };
  }

  /* One drag, lift or move() call: the item, where it came from, and the refusals heard so far. */
  function gestureFor(item) {
    var source = item.parentElement;
    return { item: item, source: source, group: groupOf(source), verdicts: [] };
  }
  function fromOf(g) {
    return items(g.source).indexOf(g.item);
  }

  /* Whether the item may land at insertion index `slot` of `dest`, against the DOM as it is NOW, so
     a list disabled or removed mid-gesture is not dropped into. Refusals are verdict()'s. */
  function legal(g, dest, slot) {
    if (!g.item.isConnected || g.item.parentElement !== g.source || !dest.isConnected) return false;
    if (disabled(g.source) || disabled(dest)) return false;
    if (dest === g.source) {
      var from = fromOf(g);
      return allowed(items(dest), from, slot > from ? slot - 1 : slot);
    }
    if (g.group === '' || groupOf(dest) !== g.group || g.item.hasAttribute('data-fdy-sort-fixed')) return false;
    var range = arrivalRange(dest);
    return slot >= range.lo && slot <= range.hi;
  }

  /* The element and class that show a landing at `slot`. */
  function landing(dest, slot) {
    var list = items(dest);
    if (list.length === 0) return { el: dest, cls: 'is-drop-into' };
    return slot < list.length ? { el: list[slot], cls: 'is-drop-before' } : { el: list[list.length - 1], cls: 'is-drop-after' };
  }

  function clearMarks(g) {
    var lists = g.group === '' ? [g.source] : groupLists(g.group);
    lists.forEach(function (list) {
      list.classList.remove.apply(list.classList, MARKS);
      items(list).forEach(function (el) { el.classList.remove.apply(el.classList, MARKS); });
    });
    hidePill();
  }

  /* ---- Refusal, before the drop ---- */

  function refusedText(g, dest) {
    return textOf(g.source, 'refused', { label: labelOf(g.item), list: listLabel(dest) });
  }
  /* The reason `dest` refuses the item, or null when it takes it. The attribute is read live every
     time, so a binding that changes mid-gesture is honoured; the app's fdy-sort-check is asked once
     per list per gesture. refuse() takes effect when called: an exception thrown inside a listener
     is swallowed by dispatchEvent, so a refuse() that threw on a bad reason would be a refusal the
     kit never saw. */
  function verdict(g, dest) {
    if (dest === g.source) return null;
    var attr = dest.getAttribute('data-fdy-sort-refuse');
    if (attr !== null) return attr !== '' ? attr : refusedText(g, dest);
    for (var i = 0; i < g.verdicts.length; i++) if (g.verdicts[i].list === dest) return g.verdicts[i].reason;
    var reason = null;
    dest.dispatchEvent(new CustomEvent('fdy-sort-check', {
      bubbles: true,
      cancelable: false,
      detail: {
        key: keyOf(g.item, fromOf(g)),
        fromList: listKey(g.source),
        toList: listKey(dest),
        refuse: function (why) { reason = typeof why === 'string' && why !== '' ? why : refusedText(g, dest); }
      }
    }));
    g.verdicts.push({ list: dest, reason: reason });
    return reason;
  }

  /* The reason, where a pointer user is looking. Spoken through the live region, so hidden from the
     accessibility tree here; and pointer-events:none in CSS, or elementFromPoint would find it. */
  var pill = null;
  function showPill(list, reason) {
    if (pill === null) {
      pill = document.createElement('div');
      pill.className = 'fdy-sortable__refusal';
      pill.setAttribute('aria-hidden', 'true');
      document.body.appendChild(pill);
    }
    pill.textContent = reason;
    pill.hidden = false;
    var rect = list.getBoundingClientRect();
    var left = Math.min(Math.max(rect.left, 0), Math.max(0, window.innerWidth - pill.offsetWidth));
    var top = Math.min(Math.max(rect.top, 0), Math.max(0, window.innerHeight - pill.offsetHeight));
    pill.style.left = left + 'px';
    pill.style.top = top + 'px';
  }
  function hidePill() {
    if (pill !== null) pill.hidden = true;
  }

  /* Where a pointer at (x, y) would land the item: over an item, before or after it by its midpoint;
     over a grouped list but no item, its end. An ungrouped list keeps 3.27.0's rule, items only. */
  function pointAt(g, x, y) {
    var hit = document.elementFromPoint(x, y);
    var dest = g.group === '' ? (hit && g.source.contains(hit) ? g.source : null) : listAt(g.group, hit);
    if (dest === null) return null;
    var list = items(dest);
    var over = itemOf(dest, hit);
    if (over !== null) {
      var rect = over.getBoundingClientRect();
      var after = y > rect.top + rect.height / 2;
      return { list: dest, slot: list.indexOf(over) + (after ? 1 : 0), el: over, cls: after ? 'is-drop-after' : 'is-drop-before' };
    }
    if (g.group === '') return null;
    var mark = landing(dest, list.length);
    return { list: dest, slot: list.length, el: mark.el, cls: mark.cls };
  }

  /* ---- The move ---- */

  function commit(g, dest, slot, refocus) {
    var source = g.source, item = g.item;
    var sourceItems = items(source);
    var from = sourceItems.indexOf(item);
    var key = keyOf(item, from);
    var same = dest === source;
    var to = same && slot > from ? slot - 1 : slot;
    var fromOrder = sourceItems.map(keyOf);
    fromOrder.splice(from, 1);
    var order = same ? fromOrder.slice() : items(dest).map(keyOf);
    order.splice(to, 0, key);
    if (same) fromOrder = order;
    var total = same ? sourceItems.length : items(dest).length + 1;
    var ev = new CustomEvent('fdy-sort-change', {
      bubbles: true,
      cancelable: true,
      detail: { key: key, from: from, to: to, order: order, fromList: listKey(source), toList: listKey(dest), fromOrder: fromOrder }
    });
    dest.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      if (same) source.insertBefore(item, to > from ? sourceItems[to].nextSibling : sourceItems[to]);
      else dest.insertBefore(item, items(dest)[to] || null);
    }
    announce(same
      ? textOf(source, 'moved', { label: labelOf(item), position: String(to + 1), total: String(total) })
      : textOf(source, 'movedTo', { label: labelOf(item), list: listLabel(dest), position: String(to + 1), total: String(total) }));
    if (refocus) focusMoved(dest, item, key);
  }

  /* After the app's own render, which a framework runs after this handler returns. Moving a focused
     element drops its focus, and a keyed re-render may have replaced the element outright. */
  function focusMoved(dest, item, key) {
    setTimeout(function () {
      var moved = item.parentElement === dest ? item : items(dest).filter(function (el, i) { return keyOf(el, i) === key; })[0];
      var handle = moved ? moved.querySelector(HANDLE) : null;
      if (handle && document.activeElement !== handle) handle.focus();
    }, 0);
  }

  function syncHandles(root) {
    var off = disabled(root) ? 'true' : 'false';
    var textKey = groupOf(root) === '' ? 'handle' : 'handleGroup';
    items(root).forEach(function (item) {
      var handle = item.querySelector(HANDLE);
      if (!handle) return;
      if (handle.getAttribute('aria-disabled') !== off) handle.setAttribute('aria-disabled', off);
      if (!handle.hasAttribute('aria-label')) handle.setAttribute('aria-label', textOf(root, textKey, { label: labelOf(item) }));
    });
  }

  function initSortable(root) {
    if (root.dataset.fdySortableReady === '1') return;
    if (root.closest('[data-fdy-ignore]')) return;
    if (groupOf(root) !== '' && listKey(root) === null) {
      throw new TypeError('Freeday sortable: a list in group "' + groupOf(root) + '" has no data-key, so a move into or out of it cannot say which list it was.');
    }
    root.dataset.fdySortableReady = '1';
    syncHandles(root);
    /* Rows a framework adds later get their aria-label, and data-disabled reaches every handle. */
    new MutationObserver(function () { syncHandles(root); })
      .observe(root, { childList: true, attributes: true, attributeFilter: ['data-disabled'] });

    root.addEventListener('keydown', function (e) {
      var handle = e.target.closest ? e.target.closest(HANDLE) : null;
      if (!handle || !root.contains(handle) || disabled(root)) return;
      if (groupOf(root) !== '') return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var list = items(root);
      var from = list.indexOf(itemOf(root, handle));
      var to = from + (e.key === 'ArrowUp' ? -1 : 1);
      if (from !== -1 && allowed(list, from, to)) commit(gestureFor(list[from]), root, to > from ? to + 1 : to, true);
    });

    var drag = null;

    function track() {
      var d = drag;
      clearMarks(d.g);
      d.list = null;
      d.slot = null;
      var at = pointAt(d.g, d.x, d.y);
      if (at === null) return;
      var reason = verdict(d.g, at.list);
      if (reason !== null) {
        at.list.classList.add('is-drop-refused');
        showPill(at.list, reason);
        if (d.told.indexOf(at.list) === -1) {
          d.told.push(at.list);
          announce(reason);
        }
        return;
      }
      if (!legal(d.g, at.list, at.slot)) return;
      d.list = at.list;
      d.slot = at.slot;
      at.el.classList.add(at.cls);
    }
    function end(apply) {
      if (drag === null) return;
      var d = drag;
      drag = null;
      document.removeEventListener('keydown', onEscape, true);
      clearMarks(d.g);
      d.g.item.classList.remove('is-dragging');
      root.classList.remove('is-sorting');
      if (apply && d.started && d.list !== null && verdict(d.g, d.list) === null && legal(d.g, d.list, d.slot)) commit(d.g, d.list, d.slot, false);
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
      drag = { g: gestureFor(item), started: false, list: null, slot: null, x: e.clientX, y: e.clientY, raf: 0, told: [] };
      document.addEventListener('keydown', onEscape, true);
    });

    /* The handle holds pointer capture, so every move reaches this list's listener wherever the
       pointer is, including over another list of the group. */
    root.addEventListener('pointermove', function (e) {
      if (drag === null) return;
      /* No travel threshold: a press that never leaves its own row resolves to to === from, which
         allowed() refuses, so a click on the handle cannot reorder anything. */
      if (!drag.started) {
        drag.started = true;
        drag.g.item.classList.add('is-dragging');
        root.classList.add('is-sorting');
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
      track();
    });

    root.addEventListener('pointerup', function () { end(true); });
    root.addEventListener('pointercancel', function () { end(false); });
  }

  /* An uncaught error that does not unwind the caller: useFreeday and FreedayBlazor.initAll run every
     enhancer in one loop, and a throw from this one would leave every enhancer after it unhydrated. */
  function report(err) {
    if (typeof window.reportError === 'function') window.reportError(err);
    else setTimeout(function () { throw err; }, 0);
  }

  function initAll(context) {
    var root = context || document;
    var lists = Array.prototype.slice.call(root.querySelectorAll(LIST));
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches(LIST)) lists.unshift(root);
    lists.forEach(function (list) {
      try { initSortable(list); } catch (err) { report(err); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedaySortable = { init: initSortable, initAll: initAll };
})();
