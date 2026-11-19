import { createContext } from 'react';

/**
 * What `FdyDateRange layout="single"` hands the one `FdyDatepicker` it renders, so the range is drawn
 * by the same calendar as a single date rather than by a second copy of it.
 *
 * Internal, and deliberately not a prop: a range prop on `FdyDatepicker` would widen that
 * component's public type with a value shape decided by another prop, which is the defect that
 * retired `mode="month"`. Only `FdyDateRange` provides it, around the single-field picker alone, and
 * `index.js` does not export it.
 */
export interface FdyRangeFieldContext {
  /** ISO `YYYY-MM-DD` ends of the committed range; either one empty means no range. */
  start: string | null;
  end: string | null;
  /** The trigger's accessible name, since there is no group around one button to carry it. */
  ariaLabel: string | undefined;
  /** Appended to an end day's accessible name. */
  rangeStartLabel: string;
  rangeEndLabel: string;
  /** A whole range was picked. */
  commit: (start: string, end: string) => void;
}

export const FdyRangeField = createContext<FdyRangeFieldContext | null>(null);
