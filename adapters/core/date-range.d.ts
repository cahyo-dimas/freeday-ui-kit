// Types for the single-field date range logic (adapters/core/date-range.js).
// Shared by the Vue and React FdyDatepicker when FdyDateRange draws its `layout="single"` calendar.

/** The committed range, plus a start picked in this opening and the day previewed after it. */
export interface FdyRangeState {
  start: Date | null;
  end: Date | null;
  /** A start picked and not yet answered by an end. */
  anchor: Date | null;
  /** The day under the pointer or the keyboard while `anchor` waits. */
  preview: Date | null;
}

export interface FdyShownEnds {
  from: Date | null;
  to: Date | null;
  /** True while a start waits for its end. */
  pending: boolean;
}

export interface FdyRangeDayState {
  /** An end that is an answer: drawn like a picked day and `aria-selected`. */
  filled: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
  /** What the day's accessible name adds. */
  role: 'start' | 'end' | null;
}

export type FdyRangePick =
  | { kind: 'anchor'; anchor: Date }
  | { kind: 'commit'; start: Date; end: Date };

export function shownEnds(range: FdyRangeState): FdyShownEnds;
export function rangeDayState(day: Date, ends: FdyShownEnds): FdyRangeDayState;
export function rangeAfterPick(anchor: Date | null, day: Date): FdyRangePick;
