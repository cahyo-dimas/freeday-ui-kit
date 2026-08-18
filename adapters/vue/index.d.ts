import type { Ref } from 'vue';

export interface UseFreedayReturn {
  /** Manually re-run all Freeday enhancers over the scoped subtree. */
  rehydrate: () => void;
}

/**
 * Auto-initialise Freeday enhancers over a component's subtree on mount and
 * after every update. Pass a template ref to scope the work; omit it to scan
 * the whole document.
 */
export declare function useFreeday(rootRef?: Ref<HTMLElement | null>): UseFreedayReturn;

/**
 * Anchor a dropdown panel to its trigger in the top layer, so it escapes any ancestor overflow clip
 * — `.fdy-card` is `overflow:hidden`, so a panel positioned inside one is otherwise cut at the card's
 * edge. The panel element must carry `popover="manual"`. This is the plumbing every kit dropdown
 * uses; it is exported so a control the kit does not ship can behave like one that it does, instead
 * of each app re-implementing it from the description.
 */
export declare function usePopover(
  panelRef: Ref<HTMLElement | null>,
  triggerRef: Ref<HTMLElement | null>,
  open: Ref<boolean>,
): void;

export { default as FdyCombo } from './components/FdyCombo.vue';
export { default as FdyDatepicker } from './components/FdyDatepicker.vue';
export { default as FdyDateRange } from './components/FdyDateRange.vue';
export type { DateRangeValue } from './components/FdyDateRange.vue';
export { default as FdyAutocomplete } from './components/FdyAutocomplete.vue';
export { default as FdyCascade } from './components/FdyCascade.vue';
export type { CascadeNode } from './components/FdyCascade.vue';
export { default as FdyCfl } from './components/FdyCfl.vue';
export { default as FdyChart } from './components/FdyChart.vue';
export { default as FdyTable } from './components/FdyTable.vue';
/** The table's own footer, standalone — for a responsive list whose table is hidden at some
 *  breakpoints and so cannot host it. */
export { default as FdyTableFooter } from './components/FdyTableFooter.vue';
export { default as FdyModal } from './components/FdyModal.vue';
export { default as FdyDrawer } from './components/FdyDrawer.vue';

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

/** One data series for the cartesian chart types (line / area / multi-series & stacked bar). */
export interface FdyChartSeries {
  label: string;
  values: number[];
  role?: string;
}

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
