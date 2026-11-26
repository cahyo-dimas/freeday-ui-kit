/* Freeday. useLoad for Vue 3: one data load as one state, with superseded requests cancelled.
 *
 *   const { state, load } = useLoad((signal) => fetchInvoices(month.value, signal));
 *   onMounted(load);
 *   watch(month, load);
 *
 *   <p v-if="state.status === 'loading'" …>        loading (state.previous: what was shown before)
 *   <div v-else-if="state.status === 'error'" …>   load error, never rendered as empty
 *   <ul v-else-if="state.status === 'ready'" …>    state.data
 *
 * `load()` aborts the request before it (the fetcher gets an AbortSignal) and ignores any answer
 * that arrives after a newer load started, so a quick change of filter can never leave the older
 * result on screen. It returns a promise that settles when this load does and never rejects: the
 * error is in `state`. Unmounting aborts whatever is in flight. The states are the ones
 * docs/screen-states.md lists for a data area; see adapters/core/load-state.js for why they are one
 * value.
 */
import { onBeforeUnmount, shallowRef } from 'vue';
import { IDLE, failedFrom, loadingFrom, readyWith } from '../core/load-state.js';

export function useLoad(fetcher) {
  var state = shallowRef(IDLE);
  var controller = null;
  var token = 0;

  function load() {
    if (controller) controller.abort();
    controller = new AbortController();
    var signal = controller.signal;
    var mine = ++token;
    state.value = loadingFrom(state.value);
    return Promise.resolve()
      .then(function () { return fetcher(signal); })
      .then(function (data) {
        if (mine === token) state.value = readyWith(data);
      }, function (err) {
        if (mine === token) state.value = failedFrom(state.value, err instanceof Error ? err : new Error(String(err)));
      });
  }

  onBeforeUnmount(function () {
    token += 1;
    if (controller) controller.abort();
  });

  return { state: state, load: load };
}
