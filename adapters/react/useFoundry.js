/* Foundry — React adapter (thin). The enhancers stay the source of truth; this
 * hook re-runs every registered window.Foundry*.initAll() over a subtree after
 * React commits, so [data-fdy-*] markup rendered by React gets enhanced (and
 * re-enhanced after updates). Enhancers are idempotent, so the repeated calls
 * are safe. Requires `import 'foundry'` once at app entry to register them.
 *
 * Usage:
 *   const root = useRef(null);
 *   useFoundry(root);            // scopes init to this component's subtree
 *   // <div ref={root}> ...[data-fdy-*] markup... </div>
 *
 * Events are native bubbling CustomEvents — add listeners on the root (they
 * bubble) and read event.detail. See index.d.ts for the detail types.
 */
import { useEffect, useCallback } from 'react';

// Discover Foundry enhancer namespaces once (all registered by the time an app
// mounts, since `import 'foundry'` runs first). Each exposes initAll(el?).
var _apis = null;
function foundryApis() {
  if (_apis) return _apis;
  _apis = [];
  var names = Object.getOwnPropertyNames(window);
  for (var i = 0; i < names.length; i++) {
    var key = names[i];
    if (key.slice(0, 7) === 'Foundry') {
      var api = window[key];
      if (api && typeof api.initAll === 'function') _apis.push(api);
    }
  }
  return _apis;
}

export function useFoundry(rootRef) {
  var rehydrate = useCallback(function () {
    var el = rootRef && rootRef.current ? rootRef.current : undefined;
    var apis = foundryApis();
    for (var i = 0; i < apis.length; i++) apis[i].initAll(el);
  }, [rootRef]);
  // No dependency array: runs after every commit (mount + updates), mirroring
  // the Vue adapter's onMounted + onUpdated.
  useEffect(rehydrate);
  return { rehydrate: rehydrate };
}
