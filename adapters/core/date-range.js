// Freeday, the date range in one field, framework-agnostic (pure, zero dependencies).
//
// What `FdyDateRange layout="single"` decides on top of the ordinary day grid: which two ends the
// grid shows while a start waits for its end, what state each day cell is in, and what a pick means.
// Shared by the Vue and React `FdyDatepicker`, which draw the calendar for that layout, so the two
// read one copy of the rule.
//
// The vanilla enhancer (src/freeday-datepicker.js) holds its own copy, for the reason
// adapters/core/month-grid.js records: dist/freeday.js is an IIFE with no module system.
// browser/daterange-single.mjs holds all three to the same observable behaviour.
//
// Every Date here is a local midnight; callers normalise with startOfDay before passing one in.

function same(a, b) {
  return a !== null && b !== null && a.getTime() === b.getTime();
}

/**
 * The ends the grid shows. With no start pending, the committed range. With one pending, the start
 * and the day being previewed, and that day only when it does not precede the start: a day before it
 * becomes the new start on a click, so a band drawn backwards would promise something a click will
 * not do.
 */
export function shownEnds(range) {
  if (range.anchor !== null) {
    const to = range.preview !== null && range.preview.getTime() >= range.anchor.getTime() ? range.preview : null;
    return { from: range.anchor, to, pending: true };
  }
  return { from: range.start, to: range.end, pending: false };
}

/**
 * One day cell's range state. `filled` is an end that is an answer (a committed end, or the start
 * just picked); a previewed end is not one. `rangeStart`/`rangeEnd` shape the ends of a band of two
 * days or more, and `role` is what the cell's accessible name adds, so an end is not told by colour.
 */
export function rangeDayState(day, ends) {
  const isFrom = ends.from !== null && same(day, ends.from);
  const isTo = ends.to !== null && same(day, ends.to);
  const span = ends.from !== null && ends.to !== null && !same(ends.from, ends.to);
  const t = day.getTime();
  const between = span && t > ends.from.getTime() && t < ends.to.getTime();
  return {
    filled: isFrom || (isTo && !ends.pending),
    rangeStart: isFrom && span,
    rangeEnd: isTo && span,
    inRange: between || (span && isTo && ends.pending),
    role: isFrom ? 'start' : isTo && !ends.pending ? 'end' : null,
  };
}

/**
 * What picking `day` does. With no start pending, or a day before the pending one, it becomes the
 * start and the panel stays open. Otherwise the range is whole: same day included, a one-day range.
 * A pick before the start is not swapped into the end, which would leave the reader unsure which
 * end they just moved.
 */
export function rangeAfterPick(anchor, day) {
  if (anchor === null || day.getTime() < anchor.getTime()) return { kind: 'anchor', anchor: day };
  return { kind: 'commit', start: anchor, end: day };
}
