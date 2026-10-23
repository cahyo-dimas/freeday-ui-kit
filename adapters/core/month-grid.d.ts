// Types for the framework-agnostic month and year grid logic (adapters/core/month-grid.js).
// Shared by FdyDatepicker and FdyMonthpicker in the Vue and React adapters.

/** A whole month as ISO `YYYY-MM`, e.g. `'2026-10'`. The format a month picker answers with. */
export type FdyMonth = string;

/** One cell of the twelve-cell month grid, ready to render. */
export interface FdyMonthCell {
  /** 0-11, the month's index in its year. */
  index: number;
  /** What the cell shows, a short month name in the active locale. */
  label: string;
  /** The cell's accessible name: the month and its year, spelled out in the active locale. */
  ariaLabel: string;
  selected: boolean;
  today: boolean;
  /** The whole month falls outside min/max, so it cannot be picked or navigated into. */
  disabled: boolean;
  /** Holds the grid's single `tabindex="0"`. */
  focusable: boolean;
}

/** One cell of the twelve-cell year grid. */
export interface FdyYearCell {
  year: number;
  selected: boolean;
  today: boolean;
  disabled: boolean;
  focusable: boolean;
}

/** The two Intl formatters a month grid renders through. */
export interface FdyMonthFormatters {
  /** Short month name, for the cell's text. */
  cell: Intl.DateTimeFormat;
  /** Month and year spelled out, for the cell's accessible name and the trigger's value. */
  name: Intl.DateTimeFormat;
}

export interface FdyMonthGridView {
  year: number;
  selected: Date | null;
  min: Date | null;
  max: Date | null;
  /** Which month index holds the roving tabindex. */
  focusMonth: number;
  formatters: FdyMonthFormatters;
  /** Overridable only so a test can pin "today"; defaults to now. */
  today?: Date;
}

export interface FdyYearGridView {
  pageStart: number;
  selected: Date | null;
  min: Date | null;
  max: Date | null;
  focusYear: number;
  today?: Date;
}

/**
 * What a key press in a grid means. `choose` is the one the two components answer differently:
 * `FdyMonthpicker` commits the month, `FdyDatepicker` walks down into its days.
 */
export type FdyGridAction = 'focus' | 'choose' | 'close' | 'none';

export interface FdyMonthKeyIntent {
  action: FdyGridAction;
  /** 0-11, already wrapped inside the year on screen. */
  index: number;
  /** Years to step the view by, which only PageUp and PageDown set. */
  yearDelta: number;
}

export interface FdyYearKeyIntent {
  action: FdyGridAction;
  year: number;
}

/** A year page holds twelve years, so the grid matches the month grid's shape. */
export declare const YEARS_PER_PAGE: number;

/** A Date as `YYYY-MM`. The day is dropped. */
export declare function toISOMonth(d: Date): FdyMonth;

/** Read `YYYY-MM` or `YYYY-MM-DD` as the first day of the month named; null when unparseable. */
export declare function parseISOMonth(s: string | null | undefined): Date | null;

/** The `lang` the page declares, then `en`. Never the browser's language, which is the whole point. */
export declare function pageLocale(): string;

export declare function startOfDay(d: Date): Date;
export declare function startOfMonth(d: Date): Date;
export declare function addMonths(d: Date, n: number): Date;

/** True only when the WHOLE month falls outside the bounds. */
export declare function monthDisabled(year: number, month: number, min: Date | null, max: Date | null): boolean;

/** True only when every month in the year falls outside the bounds. */
export declare function yearDisabled(year: number, min: Date | null, max: Date | null): boolean;

/** Where the aligned page holding this year starts (2016 for 2026). */
export declare function yearPageStart(year: number): number;

/** The year grid's title, naming the page it shows. */
export declare function yearRangeLabel(pageStart: number): string;

export declare function monthFormatters(locale: string): FdyMonthFormatters;

export declare function monthCells(view: FdyMonthGridView): FdyMonthCell[];

export declare function yearCells(view: FdyYearGridView): FdyYearCell[];

export declare function monthKeyIntent(key: string, focusMonth: number): FdyMonthKeyIntent;

export declare function yearKeyIntent(key: string, focusYear: number): FdyYearKeyIntent;
