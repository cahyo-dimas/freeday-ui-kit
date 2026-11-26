// Freeday, the state of one data load, framework-agnostic (pure, zero dependencies).
//
// The states docs/screen-states.md names for a data area (loading, load error, ideal), as ONE value
// instead of a loading flag, an error string and the data held side by side. Three separate values
// let a screen be "loading" and "failed" at once, render its empty state beside its error, or show a
// form filled with defaults after the load that should have filled it failed. A union cannot.
//
// Data from an earlier load survives a reload and a failure only as `previous`, so showing stale data
// is always a choice a reader can see in the code, never an accident of what was left in a variable.
//
// Shared by useLoad in the Vue and React adapters. Each function returns a new state and never
// changes the one it is given.

/** Nothing asked for yet. */
export const IDLE = Object.freeze({ status: 'idle' });

/** The data a state still holds: the loaded data, or what was there before this load started. */
export function dataOf(state) {
  if (state.status === 'ready') return state.data;
  if (state.status === 'loading' || state.status === 'error') return state.previous;
  return null;
}

/** A load started; whatever was shown before is kept as `previous`. */
export function loadingFrom(state) {
  return Object.freeze({ status: 'loading', previous: dataOf(state) });
}

/** A load answered. */
export function readyWith(data) {
  return Object.freeze({ status: 'ready', data });
}

/** A load failed; the data from before it, if any, is kept as `previous`. */
export function failedFrom(state, error) {
  return Object.freeze({ status: 'error', error, previous: dataOf(state) });
}
