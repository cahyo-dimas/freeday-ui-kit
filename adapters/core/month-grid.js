// Freeday, month and year grid logic, framework-agnostic (pure, zero dependencies).
//
// The twelve-cell month grid and the twelve-cell year grid behind it: which cell is selected, which
// is out of bounds, how a year page is numbered, and what a key press means. Shared by
// `FdyDatepicker` (where both grids are navigation on the way to a day) and `FdyMonthpicker` (where
// the month grid is the answer), in Vue and in React, so four components read one copy.
//
// It is here rather than in each component because of what this release cost. The panel-position
// logic existed in four copies; #079 was found in one, fixed in one, and shipped broken in the
// other three, and three items of 3.9.0 went on cleaning that up. `FdyMonthpicker` needs the month
// grid, which would have made the fifth copy of it, so the rule moved out first.
//
// The vanilla enhancer (src/freeday-datepicker.js) deliberately does NOT import this, for the
// reason adapters/core/app-shell.js records: dist/freeday.js is a plain IIFE concatenation with no
// module system. That leaves two implementations, and browser/month-mode.mjs and
// browser/monthpicker.mjs hold both to the same observable behaviour.
//
// Everything here is a pure function over its arguments. State, refs, focus scheduling and markup
// stay with the caller, because those are the parts Vue and React genuinely do differently.

/** A year page holds twelve years, so the grid is the same shape as the month grid above it. */
export const YEARS_PER_PAGE = 12;

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** A Date as the `YYYY-MM` a month picker reports. The day is dropped, which is the point. */
export function toISOMonth(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/**
 * Read `YYYY-MM` or `YYYY-MM-DD` as the first day of the month named.
 *
 * Both shapes on purpose, and the dropped day is why: a bound of `2026-03` lands on March 1st,
 * which `monthDisabled` then compares a whole month against correctly at either end, so an app can
 * pass the strings it already stores. A full date still works for a form that keeps one format
 * across all of its bounds.
 *
 * @param {string | null | undefined} s
 * @returns {Date | null} null for an empty, short or unparseable value
 */
export function parseISOMonth(s) {
  if (s === null || s === undefined || s === '') return null;
  const parts = s.split('-');
  if (parts.length < 2) return null;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, parts.length > 2 ? Number(parts[2]) : 1);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The language the page declares, which is what COMPONENTS.md has always promised and what the
 * vanilla enhancer has always done.
 *
 * Handing `undefined` to Intl instead falls back to the BROWSER's language, so an Indonesian reader
 * saw Indonesian month names inside a kit that is English on every other path, and an Indonesian
 * page read by an English browser got English ones. That second case is the symptom the month
 * picker was asked for, so the fallback has to be the page.
 */
export function pageLocale() {
  if (typeof document === 'undefined') return 'en';
  // `||`, not `??`: an empty `lang=""` is not null and Intl throws RangeError on it.
  return document.documentElement.getAttribute('lang') || 'en';
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/**
 * Is this whole month outside the bounds?
 *
 * Only when the WHOLE month is, which is why it reads the bounds directly instead of asking whether
 * both ends of the month are disabled days: a range that sits INSIDE one month disables both of its
 * ends while the middle stays perfectly selectable.
 *
 * @param {number} year
 * @param {number} month 0-11
 * @param {Date | null} min
 * @param {Date | null} max
 */
export function monthDisabled(year, month, min, max) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  if (min !== null && startOfDay(last).getTime() < startOfDay(min).getTime()) return true;
  if (max !== null && startOfDay(first).getTime() > startOfDay(max).getTime()) return true;
  return false;
}

/** Unreachable only when EVERY month in the year is, the same rule one level up. */
export function yearDisabled(year, min, max) {
  if (min !== null && startOfDay(new Date(year, 11, 31)).getTime() < startOfDay(min).getTime()) return true;
  if (max !== null && startOfDay(new Date(year, 0, 1)).getTime() > startOfDay(max).getTime()) return true;
  return false;
}

/**
 * Where the page holding this year starts: 2016 for 2026, so pages tile as 2016-2027, 2028-2039.
 * Anchoring the page on the year in view would make the arrows land on overlapping windows, and the
 * same year would sit somewhere different every step.
 */
export function yearPageStart(year) {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
}

/** The year grid's title, naming the page it shows. */
export function yearRangeLabel(pageStart) {
  return `${pageStart} – ${pageStart + YEARS_PER_PAGE - 1}`;
}

/**
 * The two Intl formatters a month grid needs: `cell` writes what a reader sees in the cell, `name`
 * writes its accessible name and the value in the trigger. Built once per locale by the caller,
 * because both frameworks memoize and `new Intl.DateTimeFormat` is not cheap.
 */
export function monthFormatters(locale) {
  return {
    cell: new Intl.DateTimeFormat(locale, { month: 'short' }),
    name: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
  };
}

/**
 * The twelve cells of one year's month grid.
 *
 * @param {{ year: number, selected: Date | null, min: Date | null, max: Date | null,
 *           focusMonth: number, formatters: { cell: Intl.DateTimeFormat, name: Intl.DateTimeFormat },
 *           today?: Date }} view
 */
export function monthCells(view) {
  const today = view.today ?? new Date();
  return Array.from({ length: 12 }, (_unused, index) => {
    const cellDate = new Date(view.year, index, 1);
    return {
      index,
      label: view.formatters.cell.format(cellDate),
      ariaLabel: view.formatters.name.format(cellDate),
      selected: view.selected !== null && view.selected.getFullYear() === view.year && view.selected.getMonth() === index,
      today: today.getFullYear() === view.year && today.getMonth() === index,
      disabled: monthDisabled(view.year, index, view.min, view.max),
      focusable: index === view.focusMonth,
    };
  });
}

/**
 * The twelve cells of one year page.
 *
 * @param {{ pageStart: number, selected: Date | null, min: Date | null, max: Date | null,
 *           focusYear: number, today?: Date }} view
 */
export function yearCells(view) {
  const thisYear = (view.today ?? new Date()).getFullYear();
  return Array.from({ length: YEARS_PER_PAGE }, (_unused, index) => {
    const year = view.pageStart + index;
    return {
      year,
      selected: view.selected !== null && view.selected.getFullYear() === year,
      today: thisYear === year,
      disabled: yearDisabled(year, view.min, view.max),
      focusable: year === view.focusYear,
    };
  });
}

/**
 * What a key press in the month grid means, with the wrap already applied.
 *
 * `choose` is deliberately not called `select`: whether choosing a month commits a value or walks
 * down into its days is the one thing the two components disagree about, and that decision belongs
 * to them. `none` means the key was not ours, so the caller leaves the event alone.
 *
 * Arrows move one or three months and WRAP inside the year on screen, which is why `index` can come
 * back on the far side without `yearDelta` moving. PageUp and PageDown are the keys that change the
 * year, holding the month still (WAI-ARIA APG).
 *
 * @param {string} key a KeyboardEvent.key
 * @param {number} focusMonth 0-11
 * @returns {{ action: 'focus' | 'choose' | 'close' | 'none', index: number, yearDelta: number }}
 */
export function monthKeyIntent(key, focusMonth) {
  const focus = (raw, yearDelta) => ({ action: 'focus', index: (raw + 12) % 12, yearDelta });
  switch (key) {
    case 'ArrowLeft': return focus(focusMonth - 1, 0);
    case 'ArrowRight': return focus(focusMonth + 1, 0);
    case 'ArrowUp': return focus(focusMonth - 3, 0);
    case 'ArrowDown': return focus(focusMonth + 3, 0);
    case 'Home': return focus(0, 0);
    case 'End': return focus(11, 0);
    case 'PageUp': return focus(focusMonth, -1);
    case 'PageDown': return focus(focusMonth, 1);
    case 'Enter':
    case ' ': return { action: 'choose', index: focusMonth, yearDelta: 0 };
    case 'Escape': return { action: 'close', index: focusMonth, yearDelta: 0 };
    default: return { action: 'none', index: focusMonth, yearDelta: 0 };
  }
}

/**
 * What a key press in the year grid means. `choose` here is always navigation, in both components:
 * a year is never an answer, so nothing is committed from this grid.
 *
 * @param {string} key a KeyboardEvent.key
 * @param {number} focusYear
 * @returns {{ action: 'focus' | 'choose' | 'close' | 'none', year: number }}
 */
export function yearKeyIntent(key, focusYear) {
  const focus = (year) => ({ action: 'focus', year });
  switch (key) {
    case 'ArrowLeft': return focus(focusYear - 1);
    case 'ArrowRight': return focus(focusYear + 1);
    case 'ArrowUp': return focus(focusYear - 3);
    case 'ArrowDown': return focus(focusYear + 3);
    case 'Home': return focus(yearPageStart(focusYear));
    case 'End': return focus(yearPageStart(focusYear) + YEARS_PER_PAGE - 1);
    case 'PageUp': return focus(focusYear - YEARS_PER_PAGE);
    case 'PageDown': return focus(focusYear + YEARS_PER_PAGE);
    case 'Enter':
    case ' ': return { action: 'choose', year: focusYear };
    case 'Escape': return { action: 'close', year: focusYear };
    default: return { action: 'none', year: focusYear };
  }
}
