/* Freeday — Vue 3 adapter (thin). The enhancers stay the source of truth; this
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
 * Events come straight through as native bubbling CustomEvents — bind them with
 * plain v-on (e.g. @fdy-cascade-change) and read event.detail. See index.d.ts
 * for the detail types.
 */
import { onMounted, onUpdated, nextTick } from 'vue';

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

export function useFreeday(rootRef) {
  var apis = null;
  function rehydrate() {
    if (!apis) apis = freedayApis();
    var el = rootRef && 'value' in rootRef ? (rootRef.value || undefined) : undefined;
    for (var i = 0; i < apis.length; i++) apis[i].initAll(el);
  }
  onMounted(rehydrate);
  onUpdated(function () { nextTick(rehydrate); });
  return { rehydrate: rehydrate };
}
