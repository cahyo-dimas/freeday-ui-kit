import type { RefObject } from 'react';

export interface UseFreedayReturn {
  /** Manually re-run all Freeday enhancers over the scoped subtree. */
  rehydrate: () => void;
}

/**
 * Auto-initialise Freeday enhancers over a component's subtree on mount and
 * after every commit. Pass a ref to scope the work; omit it to scan the whole
 * document.
 */
export declare function useFreeday(rootRef?: RefObject<HTMLElement | null>): UseFreedayReturn;

/** `event.detail` shapes for the bubbling `fdy-*` CustomEvents. */
export interface FdyChangeDetail { value: string }
export interface FdyAutocompleteSelectDetail { value: string }
export interface FdyCascadeChangeDetail { value: string; path: string; labels: string[] }
export interface FdyDatepickerChangeDetail { value: string; date: Date | null }
export interface FdyTimeSelectDetail { value: string }
export interface FdyDatetimeChangeDetail { date: string; time: string; value: string }
export interface FdyMaskDetail { value: string; raw: string }
export interface FdyFormInvalidDetail { invalid: HTMLElement[] }
export interface FdyChipChangeDetail { value: string; pressed: boolean; selected: string[] }
export interface FdyChipRemoveDetail { value: string }
export interface FdyCflSelectDetail { row?: unknown; rows?: unknown[] }
export interface FdyTableChangeDetail { page: number; sort: string | null; query: string }
