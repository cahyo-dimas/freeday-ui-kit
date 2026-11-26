/* Freeday. Vue 3 adapter (thin). The enhancers stay the source of truth; this
 * composable just re-runs every registered window.Freeday*.initAll() over a
 * subtree after Vue renders it, so [data-fdy-*] markup rendered by Vue gets
 * enhanced (and re-enhanced after updates). Enhancers are idempotent, so the
 * repeated calls are safe. Requires `import 'freeday'` once at app entry to
 * register the enhancers.
 *
 * Usage:
 *   const root = ref(null);
 *   useFreeday(root);            // scopes init to this component's subtree
 *   // <div ref="root"> ...[data-fdy-*] markup... </div>
 *
 * The ref may also sit ON the widget itself, <div ref="root" data-fdy-menu>, which is what you
 * write when the component's root element IS the widget. initAll() matches its own root as
 * well as descendants, so both shapes work. (Before 1.23.0 only the wrapping shape did, and
 * the other failed silently: querySelectorAll never matches its root.)
 *
 * A ref that is still null once the component has mounted is a mistake, and an unusually quiet
 * one: the call falls back to the whole document, so everything works, only wider than asked, and
 * other code on the page can come to depend on that scan without knowing it. It warns once, at
 * mount. Pass no argument, useFreeday(), when the whole document is what you mean; and put the ref
 * on an element that is always rendered, not one behind v-if.
 *
 * DOM a CHILD component mounts later is hydrated too. Vue calls onUpdated on the component whose
 * render changed, so a form behind a v-if in a child never reached the parent's hook, and its
 * `data-fdy-validate` silently did nothing (CATATAN-FREEDAY §29). A MutationObserver on the subtree
 * closes that: any element added under it triggers one rehydrate.
 *
 * Events come straight through as native bubbling CustomEvents, bind them with
 * plain v-on (e.g. @fdy-cascade-change) and read event.detail. See index.d.ts
 * for the detail types.
 */
import { onBeforeUnmount, onMounted, onUpdated, nextTick } from 'vue';

// Discover Freeday enhancer namespaces once (all registered by the time an app
// mounts, since `import 'freeday'` runs first). Each exposes initAll(el?).
function freedayApis() {
  var apis = [];
  var names = Object.getOwnPropertyNames(window);
  for (var i = 0; i < names.length; i++) {
    var key = names[i];
    if (key.slice(0, 7) === 'Freeday') {
      var api = window[key];
      if (api && typeof api.initAll === 'function') apis.push(api);
    }
  }
  return apis;
}

var EMPTY_REF = 'Freeday: useFreeday(ref) got a ref that is still null after mount, so it hydrated the whole '
  + 'document instead of one subtree. Either ref="..." is missing from the template, or it sits on an element '
  + 'that is not rendered yet (v-if). Put the ref on an element that is always rendered, or call useFreeday() '
  + 'with no argument if the whole document is what you mean.';

/* True when a batch of mutation records added at least one element. Text edits and removals cannot
   bring a new enhancer hook into the tree, so they do not cost a scan. */
function addedElement(records) {
  for (var i = 0; i < records.length; i++) {
    var nodes = records[i].addedNodes;
    for (var j = 0; j < nodes.length; j++) if (nodes[j].nodeType === 1) return true;
  }
  return false;
}

export function useFreeday(rootRef) {
  var apis = null;
  var observer = null;
  function rehydrate() {
    if (!apis) apis = freedayApis();
    var el = rootRef && 'value' in rootRef ? (rootRef.value || undefined) : undefined;
    for (var i = 0; i < apis.length; i++) apis[i].initAll(el);
    /* Whatever the enhancers just built is in the observer's queue now. Dropping it here is what
       keeps one rehydrate from scheduling the next: initAll is synchronous, so every record it
       caused is already queued when it returns. */
    if (observer) observer.takeRecords();
  }
  onMounted(function () {
    if (rootRef && 'value' in rootRef && !rootRef.value) console.warn(EMPTY_REF);
    rehydrate();
    /* In the callback itself rather than a frame later: the callback is a microtask, so a child's
       widget is enhanced before the browser paints it raw. */
    var target = rootRef && 'value' in rootRef && rootRef.value ? rootRef.value : document.body;
    observer = new MutationObserver(function (records) {
      if (addedElement(records)) rehydrate();
    });
    observer.observe(target, { childList: true, subtree: true });
  });
  onUpdated(function () { nextTick(rehydrate); });
  onBeforeUnmount(function () {
    if (observer) observer.disconnect();
    observer = null;
  });
  return { rehydrate: rehydrate };
}
