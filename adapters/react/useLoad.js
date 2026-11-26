/* Freeday. useLoad for React: one data load as one state, with superseded requests cancelled.
 *
 *   const { state, load } = useLoad((signal) => fetchInvoices(month, signal));
 *   useEffect(() => { void load(); }, [month, load]);
 *
 *   state.status === 'loading'  loading (state.previous: what was shown before)
 *   state.status === 'error'    load error, never rendered as empty
 *   state.status === 'ready'    state.data
 *
 * `load` is stable across renders and always calls the LATEST fetcher, so the fetcher may be an
 * inline arrow over current props. It aborts the request before it (the fetcher gets an
 * AbortSignal) and ignores any answer that arrives after a newer load started, so a quick change of
 * filter can never leave the older result on screen. It returns a promise that settles when this
 * load does and never rejects: the error is in `state`. Unmounting aborts whatever is in flight. See
 * adapters/core/load-state.js for why the states are one value.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IDLE, failedFrom, loadingFrom, readyWith } from '../core/load-state.js';

export function useLoad(fetcher) {
  var pair = useState(IDLE);
  var state = pair[0];
  var setState = pair[1];
  var fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  var tokenRef = useRef(0);
  var controllerRef = useRef(null);

  var load = useCallback(function () {
    if (controllerRef.current) controllerRef.current.abort();
    var controller = new AbortController();
    controllerRef.current = controller;
    var mine = ++tokenRef.current;
    setState(function (s) { return loadingFrom(s); });
    return Promise.resolve()
      .then(function () { return fetcherRef.current(controller.signal); })
      .then(function (data) {
        if (mine === tokenRef.current) setState(readyWith(data));
      }, function (err) {
        var error = err instanceof Error ? err : new Error(String(err));
        if (mine === tokenRef.current) setState(function (s) { return failedFrom(s, error); });
      });
  }, []);

  useEffect(function () {
    return function () {
      tokenRef.current += 1;
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  return { state: state, load: load };
}
