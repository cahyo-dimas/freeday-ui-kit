/* Freeday — React adapter (thin). The enhancers stay the source of truth; this
 * hook re-runs every registered window.Freeday*.initAll() over a subtree after
 * React commits, so [data-fdy-*] markup rendered by React gets enhanced (and
 * re-enhanced after updates). Enhancers are idempotent, so the repeated calls
 * are safe. Requires `import 'freeday'` once at app entry to register them.
 *
 * Usage:
 *   const root = useRef(null);
 *   useFreeday(root);            // scopes init to this component's subtree
 *   // <div ref={root}> ...[data-fdy-*] markup... </div>
 *
 * The ref may also sit ON the widget itself — <div ref={root} data-fdy-menu>, which is what you
 * write when the component's root element IS the widget. initAll() matches its own root as
 * well as descendants, so both shapes work. (Before 1.23.0 only the wrapping shape did, and
 * the other failed silently: querySelectorAll never matches its root.)
 *
 * Events are native bubbling CustomEvents — add listeners on the root (they
 * bubble) and read event.detail. See index.d.ts for the detail types.
 */
import { useEffect, useCallback } from 'react';

// Discover Freeday enhancer namespaces once (all registered by the time an app
// mounts, since `import 'freeday'` runs first). Each exposes initAll(el?).
var _apis = null;
function freedayApis() {
  if (_apis) return _apis;
  _apis = [];
  var names = Object.getOwnPropertyNames(window);
  for (var i = 0; i < names.length; i++) {
    var key = names[i];
    if (key.slice(0, 7) === 'Freeday') {
      var api = window[key];
      if (api && typeof api.initAll === 'function') _apis.push(api);
    }
  }
  return _apis;
}

export function useFreeday(rootRef) {
  var rehydrate = useCallback(function () {
    var el = rootRef && rootRef.current ? rootRef.current : undefined;
    var apis = freedayApis();
    for (var i = 0; i < apis.length; i++) apis[i].initAll(el);
  }, [rootRef]);
  // No dependency array: runs after every commit (mount + updates), mirroring
  // the Vue adapter's onMounted + onUpdated.
  useEffect(rehydrate);
  return { rehydrate: rehydrate };
}
