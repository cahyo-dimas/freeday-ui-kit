import type { ComputedRef, InjectionKey } from 'vue';

/**
 * What `FdyDateRange layout="single"` hands the one `FdyDatepicker` it renders, so the range is drawn
 * by the same calendar as a single date rather than by a second copy of it.
 *
 * Internal, and deliberately not a prop: a range prop on `FdyDatepicker` would widen that
 * component's public type with a value shape decided by another prop, which is the defect that
 * retired `mode="month"`. Nothing outside `FdyDateRange` provides this, and `index.js` does not
 * export it.
 */
export interface FdyRangeFieldContext {
  /**
   * False under `layout="split"`, whose two pickers are single dates. `FdyDateRange` provides the
   * context either way, because `provide` runs once per instance; a picker reads this when it mounts,
   * and the two layouts sit in `v-if`/`v-else` branches, so a layout change mounts new pickers.
   */
  enabled: ComputedRef<boolean>;
  /** ISO `YYYY-MM-DD` ends of the committed range; either one empty means no range. */
  start: ComputedRef<string | null>;
  end: ComputedRef<string | null>;
  /** The trigger's accessible name, since there is no group around one button to carry it. */
  ariaLabel: ComputedRef<string | undefined>;
  /** Appended to an end day's accessible name. */
  rangeStartLabel: ComputedRef<string>;
  rangeEndLabel: ComputedRef<string>;
  /** A whole range was picked. */
  commit: (start: string, end: string) => void;
}

export const FDY_RANGE_FIELD: InjectionKey<FdyRangeFieldContext> = Symbol('fdy-range-field');
