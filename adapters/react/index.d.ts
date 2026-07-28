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

// Re-exports of React components and hooks
export { usePopover } from './usePopover';
export { FdyCombo, type FdyComboProps, type FdyComboOption } from './components/FdyCombo';
export { FdyDatepicker, type FdyDatepickerProps } from './components/FdyDatepicker';
export { FdyDateRange, type FdyDateRangeProps, type DateRangeValue } from './components/FdyDateRange';
export { FdyAutocomplete, type FdyAutocompleteProps } from './components/FdyAutocomplete';
export { FdyCascade, type FdyCascadeProps, type CascadeNode } from './components/FdyCascade';
export { FdyCfl, type FdyCflProps, type CflColumn, type CflPage } from './components/FdyCfl';
export { FdyChart, type FdyChartProps, type FdyChartSeries } from './components/FdyChart';
export { FdyTable, type FdyTableProps } from './components/FdyTable';
export { FdyModal, type FdyModalProps } from './components/FdyModal';
export { FdyDrawer, type FdyDrawerProps } from './components/FdyDrawer';

/** Controlled data-table types (shared, framework-agnostic core). */
export type {
  FdyTableColumn,
  FdySortState,
  FdySortDir,
  FdyColumnType,
  FdyColumnAlign,
  FdyColumnFilterType,
  FdyColumnFilter,
  FdyFilterMap,
  FdyPageState,
} from '../core/table-model';
