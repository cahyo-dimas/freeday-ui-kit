// Types for the load state (adapters/core/load-state.js), shared by useLoad in Vue and React.

/**
 * One data load. `previous` is what an earlier load returned, kept through a reload or a failure so a
 * screen can choose to show it; it is never mixed into `data`, which only a successful load sets.
 */
export type LoadState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly previous: T | null }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'error'; readonly error: Error; readonly previous: T | null };

export declare const IDLE: LoadState<never>;
export declare function dataOf<T>(state: LoadState<T>): T | null;
export declare function loadingFrom<T>(state: LoadState<T>): LoadState<T>;
export declare function readyWith<T>(data: T): LoadState<T>;
export declare function failedFrom<T>(state: LoadState<T>, error: Error): LoadState<T>;
