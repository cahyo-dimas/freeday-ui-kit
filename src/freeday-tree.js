/* Freeday — tree checkbox cascade (optional, zero-dependency).
 * Turns a [data-fdy-tree] checkbox tree into a selectable one: checking a branch checks
 * every descendant; a partially-selected branch shows the native :indeterminate state.
 * Rows are native <input class="fdy-checkbox">, labelled via aria-label — Space toggles.
 * Selection never toggles the <details> (the checkbox stops click propagation).
 *
 * Markup contract:
 *  <ul class="fdy-tree fdy-tree--checkbox" data-fdy-tree>
 *    <li>
 *      <details class="fdy-tree__branch">
 *        <summary>…chevron… <input class="fdy-checkbox fdy-tree__check" type="checkbox" aria-label="…"> …icon… Label</summary>
 *        <ul> …child <li>s (branches or .fdy-tree__leaf leaves)… </ul>
 *      </details>
 *    </li>
 *    <li class="fdy-tree__leaf"><input class="fdy-checkbox fdy-tree__check" type="checkbox" aria-label="…"> …icon… Label</li>
 *  </ul>
 */
(function () {
  'use strict';

  // The <li>s directly under a branch's own child list (skip text nodes).
  function childItems(li) {
    var ul = li.querySelector(':scope > details > ul');
    if (!ul) return [];
    return Array.prototype.filter.call(ul.children, function (n) { return n.tagName === 'LI'; });
  }

  // The checkbox belonging to a row's own <li> — branch summary or leaf, never a child's.
  function ownBox(li) {
    return li.querySelector(':scope > details > summary input[type="checkbox"]')
      || li.querySelector(':scope > input[type="checkbox"]');
  }

  function setSubtree(li, checked) {
    childItems(li).forEach(function (child) {
      var box = ownBox(child);
      if (box) { box.checked = checked; box.indeterminate = false; }
      setSubtree(child, checked);
    });
  }

  // Recompute one branch's box from the state of its direct children.
  function recompute(li) {
    var box = ownBox(li);
    var kids = childItems(li).map(ownBox).filter(Boolean);
    if (!box || !kids.length) return;
    var allOn = kids.every(function (b) { return b.checked && !b.indeterminate; });
    var anyOn = kids.some(function (b) { return b.checked || b.indeterminate; });
    box.checked = allOn;
    box.indeterminate = anyOn && !allOn;
  }

  function refreshAncestors(li) {
    var parent = li.parentElement ? li.parentElement.closest('li') : null;
    while (parent) {
      recompute(parent);
      parent = parent.parentElement ? parent.parentElement.closest('li') : null;
    }
  }

  // Post-order pass so pre-checked leaves resolve their branches on load.
  function initState(li) {
    childItems(li).forEach(initState);
    recompute(li);
  }

  function initTree(tree) {
    if (tree.dataset.fdyTreeReady === '1') return;
    tree.dataset.fdyTreeReady = '1';
    Array.prototype.forEach.call(tree.querySelectorAll('input[type="checkbox"]'), function (box) {
      // A branch checkbox lives inside <summary>; keep its click from toggling the branch.
      box.addEventListener('click', function (e) { e.stopPropagation(); });
      box.addEventListener('change', function () {
        var li = box.closest('li');
        setSubtree(li, box.checked);
        box.indeterminate = false;
        refreshAncestors(li);
      });
    });
    Array.prototype.filter.call(tree.children, function (n) { return n.tagName === 'LI'; }).forEach(initState);
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-tree]')) initTree(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-tree]'), initTree);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayTree = { init: initTree, initAll: initAll };
})();
