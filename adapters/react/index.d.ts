import type { RefObject } from 'react';

export interface UseFreedayReturn {
  /** Manually re-run all Freeday enhancers over the scoped subtree. */
  rehydrate: () => void;
}

/**
 * Auto-initialise Freeday enhancers over a component's subtree on mount and
 * after every commit. Pass a ref to scope the work; omit it to scan the whole
 * document. A ref that is still null after the first commit also scans the
 * whole document, and warns once: bind it to an always-rendered element, or omit it.
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
/** `fdy-sort-change`, cancelable: `order` is every item's `data-key` in the new order. */
export interface FdySortChangeDetail { key: string; from: number; to: number; order: string[] }
export interface FdyCflSelectDetail { row?: unknown; rows?: unknown[] }
export interface FdyTableChangeDetail { page: number; sort: string | null; query: string }

// Re-exports of React components and hooks
export { usePopover, type FdyPopoverAlign } from './usePopover';
export { FdyCombo, type FdyComboProps, type FdyComboOption } from './components/FdyCombo';
export { FdyDatepicker, type FdyDatepickerProps, type FdyDatepickerMode } from './components/FdyDatepicker';
/** A picker that answers with a whole month, `YYYY-MM`. Replaces `FdyDatepicker`'s deprecated
 *  `mode="month"`, where one prop carried two formats and another prop chose between them. */
export { FdyMonthpicker, type FdyMonthpickerProps } from './components/FdyMonthpicker';
export type { FdyMonth } from '../core/month-grid';
export { FdyDateRange, type FdyDateRangeProps, type DateRangeValue } from './components/FdyDateRange';
export { FdyTimepicker, type FdyTimepickerProps } from './components/FdyTimepicker';
export { FdyAutocomplete, type FdyAutocompleteProps } from './components/FdyAutocomplete';
export { FdyCascade, type FdyCascadeProps, type CascadeNode } from './components/FdyCascade';
export { FdyCfl, type FdyCflProps, type FdyCflHandle, type CflColumn, type CflPage } from './components/FdyCfl';
/** Narrow `FdyCfl`'s `Row | Row[] | null` to the `Row | null` a single-select can produce; throws
 *  on the array only a `multiple` field emits. */
export { singleRow } from '../core/cfl-value';
export { FdyChart, type FdyChartProps, type FdyChartSeries } from './components/FdyChart';
export { FdyTable, type FdyTableProps, type FdyTableEmptyContext } from './components/FdyTable';
/** The table's own footer, standalone, for a responsive list whose table is hidden at some
 *  breakpoints and so cannot host it. */
export { FdyTableFooter, type FdyTableFooterProps } from './components/FdyTableFooter';
export { FdyModal, type FdyModalProps } from './components/FdyModal';
export { FdyDrawer, type FdyDrawerProps } from './components/FdyDrawer';
export { FdyAppShell, type FdyAppShellProps } from './components/FdyAppShell';

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
