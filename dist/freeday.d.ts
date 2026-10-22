// Type surface for the root side-effect import `@cahyo-dimas/freeday`, which loads every
// enhancer and registers the `window.Freeday` global. Authored from src/freeday-toast.js and
// src/freeday-confirm.js. Keep it in sync with those files. (The per-component window.Freeday<Name> enhancer namespaces are
// intentionally not typed here; no consumer reconstructs those.)

export interface FreedayToastOptions {
  /** Accent + ARIA role. Omitted = neutral. 'danger' uses role="alert"; the rest role="status". */
  variant?: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
  message?: string;
  /** Milliseconds before auto-dismiss. Default 4000; 0 = sticky. */
  timeout?: number;
  /** Stable id: a new toast with the same key replaces the existing one in place instead of
   *  stacking a duplicate (e.g. a burst of identical failures shows one, refreshed). */
  key?: string;
}

export interface FreedayConfirmOptions {
  title?: string;
  message?: string;
  /** Findings shown as a list under the message. */
  details?: string[];
  /** Accept label. Default 'Confirm'; name the action instead ('Delete order'). */
  acceptText?: string;
  /** Reject label. Default 'Cancel'. */
  rejectText?: string;
  /** The accept button's variant. Default 'primary'. */
  tone?: 'primary' | 'danger';
}

export interface FreedayGlobal {
  /** Show a transient toast in a live region (created on first use). Returns the toast element. */
  toast(opts?: FreedayToastOptions): HTMLElement;
  /** Dismiss a toast early: pass the element returned by toast(), or a key string. */
  dismiss(target: HTMLElement | string): void;
  /** Ask a yes/no question in a modal. true on accept; false on reject, Escape or a backdrop click. */
  confirm(opts?: FreedayConfirmOptions): Promise<boolean>;
}

declare global {
  interface Window {
    Freeday?: FreedayGlobal;
  }
}
