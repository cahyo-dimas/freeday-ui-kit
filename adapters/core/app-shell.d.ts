// Types for the framework-agnostic app-shell behaviour (adapters/core/app-shell.js).
// Shared by FdyAppShell in the Vue, React and Blazor adapters.

/** The parts the shell's behaviour touches. Any of them may be absent from a partial shell. */
export interface FdyShellParts {
  sidebar: HTMLElement | null;
  content: HTMLElement | null;
  toggle: HTMLElement | null;
  backdrop: HTMLElement | null;
}

/**
 * What the DOM should reflect right now.
 * `navVisible` is the single idea the app owns: is the nav showing? `overlay` is whether the
 * viewport is currently below the nav breakpoint, where a visible nav covers the page.
 */
export interface FdyShellState {
  navVisible: boolean;
  overlay: boolean;
}

/** The media query the shell switches at, built from tokens/breakpoints.mjs (`nav`). */
export declare const NAV_QUERY: string;

export declare function shellParts(root: HTMLElement): FdyShellParts;
export declare function focusablesIn(el: HTMLElement): HTMLElement[];
export declare function applyShellState(root: HTMLElement, state: FdyShellState): void;
export declare function focusPanel(root: HTMLElement): Element | null;
export declare function restoreFocus(root: HTMLElement, previous: Element | null): void;
export declare function trapTab(root: HTMLElement, event: KeyboardEvent): boolean;
