/* Foundry — cascade select enhancer (optional, zero-dependency).
 * Turns a [data-fdy-cascade] wrapper into a hierarchical drill-down picker. The
 * data model is a hidden nested <ul> inside the wrapper: a <li> with a child <ul>
 * is a branch (drills in), a <li> without is a leaf (selects). Each <li> carries
 * its value in data-value; its own text (before any nested <ul>) is the label.
 *
 * The popover shows one level at a time (a listbox); a branch drills in, the back
 * control ascends, a leaf selects and stores the full path as the value.
 * Attributes: data-label, data-placeholder, data-value (pre-select a leaf value),
 * data-separator (path separator in the display, default " / ").
 *
 * Keyboard: trigger opens on click / Enter / Space / ArrowDown. In the list:
 * Up/Down move, Home/End jump, ArrowRight/Enter/Space drill into a branch or
 * select a leaf, ArrowLeft/Backspace go up a level, Esc closes (focus returns to
 * the trigger). Emits a bubbling "fdy-cascade-change" (detail {value, path, labels}).
 */
(function () {
  'use strict';

  var seq = 0;
  var BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';

  // Own text of an <li>, excluding any nested <ul>.
  function ownLabel(li) {
    var s = '';
    Array.prototype.forEach.call(li.childNodes, function (n) {
      if (n.nodeType === 3) s += n.textContent;
      else if (n.nodeType === 1 && n.tagName !== 'UL') s += n.textContent;
    });
    return s.trim();
  }
  function parse(ul) {
    var nodes = [];
    Array.prototype.forEach.call(ul.children, function (li) {
      if (li.tagName !== 'LI') return;
      var childUl = li.querySelector(':scope > ul');
      nodes.push({
        label: ownLabel(li),
        value: li.getAttribute('data-value') || ownLabel(li),
        children: childUl ? parse(childUl) : null
      });
    });
    return nodes;
  }
  // Depth-first search for the stack of labels leading to a leaf value.
  function pathTo(nodes, value, trail) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var here = trail.concat([n]);
      if (!n.children && n.value === value) return here;
      if (n.children) { var found = pathTo(n.children, value, here); if (found) return found; }
    }
    return null;
  }

  function initCascade(wrap) {
    if (wrap.dataset.fdyCascadeReady === '1') return;
    wrap.dataset.fdyCascadeReady = '1';
    wrap.classList.add('fdy-cascade');

    var sourceUl = wrap.querySelector('ul');
    var root = sourceUl ? parse(sourceUl) : [];
    if (sourceUl) sourceUl.remove();

    var label = wrap.getAttribute('data-label') || 'Pilih';
    var placeholder = wrap.getAttribute('data-placeholder') || 'Pilih…';
    var sep = wrap.getAttribute('data-separator') || ' / ';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fdy-cascade__trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', label);
    var valueSpan = document.createElement('span');
    valueSpan.className = 'fdy-cascade__value';
    trigger.appendChild(valueSpan);

    var panel = document.createElement('div');
    panel.className = 'fdy-cascade__panel';
    panel.hidden = true;
    var head = document.createElement('div');
    head.className = 'fdy-cascade__head';
    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'fdy-cascade__back';
    back.setAttribute('aria-label', 'Kembali satu tingkat');
    back.innerHTML = BACK;
    back.hidden = true;
    var crumb = document.createElement('span');
    crumb.className = 'fdy-cascade__crumb';
    crumb.setAttribute('aria-live', 'polite');
    head.appendChild(back);
    head.appendChild(crumb);
    var list = document.createElement('ul');
    seq += 1;
    list.className = 'fdy-cascade__list';
    list.id = 'fdy-cascade-list-' + seq;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', label);
    list.tabIndex = -1;
    panel.appendChild(head);
    panel.appendChild(list);

    wrap.appendChild(trigger);
    wrap.appendChild(panel);

    var stack = [];        // branch nodes drilled through (context)
    var current = root;    // nodes at the visible level
    var opts = [];         // rendered <li> elements
    var active = -1;
    var selectedValue = wrap.getAttribute('data-value') || '';

    function render() {
      list.innerHTML = '';
      opts = [];
      back.hidden = stack.length === 0;
      crumb.textContent = stack.length ? stack.map(function (n) { return n.label; }).join(sep) : label;
      current.forEach(function (node, i) {
        var li = document.createElement('li');
        seq += 1; li.id = 'fdy-cascade-opt-' + seq;
        li.className = 'fdy-cascade__opt';
        li.setAttribute('role', 'option');
        li.setAttribute('data-index', String(i));
        var isBranch = !!node.children;
        li.setAttribute('aria-selected', (!isBranch && node.value === selectedValue) ? 'true' : 'false');
        if (isBranch) li.setAttribute('aria-label', node.label + ', submenu');
        var lbl = document.createElement('span');
        lbl.className = 'fdy-cascade__opt-label';
        lbl.textContent = node.label;
        li.appendChild(lbl);
        if (isBranch) {
          var arrow = document.createElement('span');
          arrow.className = 'fdy-cascade__opt-arrow';
          arrow.setAttribute('aria-hidden', 'true');
          li.appendChild(arrow);
        }
        list.appendChild(li);
        opts.push(li);
      });
      setActive(0);
    }
    function setActive(i) {
      if (active >= 0 && opts[active]) opts[active].classList.remove('is-active');
      active = Math.max(-1, Math.min(opts.length - 1, i));
      if (active >= 0) {
        opts[active].classList.add('is-active');
        list.setAttribute('aria-activedescendant', opts[active].id);
        opts[active].scrollIntoView({ block: 'nearest' });
      } else {
        list.removeAttribute('aria-activedescendant');
      }
    }
    function drill(i) {
      var node = current[i];
      if (!node || !node.children) return;
      stack.push(node);
      current = node.children;
      render();
    }
    function ascend() {
      if (!stack.length) return;
      stack.pop();
      current = stack.length ? stack[stack.length - 1].children : root;
      render();
    }
    function activate(i) {
      var node = current[i];
      if (!node) return;
      if (node.children) { drill(i); return; }
      selectedValue = node.value;
      var labels = stack.map(function (n) { return n.label; }).concat([node.label]);
      valueSpan.textContent = labels.join(sep);
      valueSpan.classList.remove('fdy-cascade__value--placeholder');
      wrap.dispatchEvent(new CustomEvent('fdy-cascade-change', { bubbles: true, detail: { value: node.value, path: labels.join(sep), labels: labels } }));
      close(true);
    }

    function open() {
      if (!panel.hidden) return;
      // Re-open at the selected leaf's level for quick re-selection.
      var trail = selectedValue ? pathTo(root, selectedValue, []) : null;
      if (trail && trail.length > 1) { stack = trail.slice(0, -1); current = stack[stack.length - 1].children; }
      else { stack = []; current = root; }
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('is-open');
      render();
      list.focus();
      document.addEventListener('click', onDoc, true);
    }
    function close(returnFocus) {
      if (panel.hidden) return;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.classList.remove('is-open');
      document.removeEventListener('click', onDoc, true);
      if (returnFocus === true) trigger.focus();
    }
    function onDoc(e) { if (!wrap.contains(e.target)) close(false); }

    trigger.addEventListener('click', function () { panel.hidden ? open() : close(true); });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    back.addEventListener('click', function () { ascend(); list.focus(); });
    list.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setActive(active + 1); break;
        case 'ArrowUp': e.preventDefault(); setActive(active - 1); break;
        case 'Home': e.preventDefault(); setActive(0); break;
        case 'End': e.preventDefault(); setActive(opts.length - 1); break;
        case 'ArrowRight': case 'Enter': case ' ': e.preventDefault(); if (active >= 0) activate(active); break;
        case 'ArrowLeft': case 'Backspace': e.preventDefault(); ascend(); break;
        case 'Escape': e.preventDefault(); close(true); break;
        case 'Tab': close(false); break;
        default: break;
      }
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest('[role="option"]');
      if (li) activate(opts.indexOf(li));
    });

    // Initial display: pre-selected leaf shows its full path, else placeholder.
    var initTrail = selectedValue ? pathTo(root, selectedValue, []) : null;
    if (initTrail) {
      valueSpan.textContent = initTrail.map(function (n) { return n.label; }).join(sep);
    } else {
      valueSpan.textContent = placeholder;
      valueSpan.classList.add('fdy-cascade__value--placeholder');
    }

    var api = {
      wrap: wrap,
      getValue: function () { return selectedValue; },
      clear: function () { selectedValue = ''; valueSpan.textContent = placeholder; valueSpan.classList.add('fdy-cascade__value--placeholder'); }
    };
    wrap._fdyCascade = api;
    return api;
  }

  function initAll(context) {
    Array.prototype.forEach.call((context || document).querySelectorAll('[data-fdy-cascade]'), initCascade);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FoundryCascade = { init: initCascade, initAll: initAll };
})();
