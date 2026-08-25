// Freeday, framework-agnostic table model (pure functions, zero dependencies).
//
// The sort / filter / paginate logic shared by adapters/vue/components/FdyTable.vue and
// adapters/react/components/FdyTable.tsx. Kept here, plain ESM with a .d.ts sidecar, so the
// two adapters can't drift and so the logic is unit-testable under `node --test`
// (test/table-model.test.mjs) without a framework runtime. Every function is pure: inputs are
// never mutated (rows are sliced before sorting), so it is safe to call on each render.
//
// Types live in table-model.d.ts. FdyTableColumn<T> = { key, label, sortable?, filter?, align?,
// mono?, sortType?, value? }. A column's cell value is `col.value(row)` when given, else row[key].

/** @param {unknown} v @returns {number} numeric value, tolerant of formatted strings ("Rp 1.000"); non-numeric -> 0 */
function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/** @param {unknown} v @returns {number} epoch ms; unparseable -> 0 */
function toTime(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? 0 : v.getTime();
  const t = Date.parse(String(v == null ? '' : v));
  return Number.isNaN(t) ? 0 : t;
}

/** Already an ISO calendar day, so it needs no parsing. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** @param {Date} d @returns {string} the LOCAL calendar day, never UTC's */
function localDay(d) {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
}

/**
 * @param {unknown} v @returns {string} ISO calendar day (yyyy-mm-dd), lexicographically comparable
 *
 * Two bugs lived here, both of which let a column SORT by date correctly and
 * FILTER by date wrongly, the worst pairing, because a working sort is what
 * persuades you the header understands dates.
 *
 * 1. It sliced instead of parsing, while `toTime` (which the date SORT uses)
 *    parses. A column whose `value` returns a formatted date, the normal way
 *    to render one, gave `"18 Mar 2024"`, sliced to `"18 Mar 202"`, and
 *    compared as text against `"2024-03-18"`: every row failed, silently.
 * 2. A `Date` went through `toISOString`, which is UTC. At UTC+7 a date picked
 *    as the 18th is `2024-03-17T17:00Z`, so filtering from the 18th dropped it.
 *    The calendar day a person means is their own, not Greenwich's.
 */
function dateOnly(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : localDay(v);
  const s = String(v == null ? '' : v);
  if (ISO_DAY.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  return Number.isNaN(t) ? '' : localDay(new Date(t));
}

/** Raw cell value for a column: the column accessor if present, else row[key]. */
export function cellValue(row, column) {
  return typeof column.value === 'function' ? column.value(row) : row[column.key];
}

/** Cell value as trimmed display text (null/undefined -> ''). */
export function cellText(row, column) {
  const v = cellValue(row, column);
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Effective comparator type for a column: explicit sortType, else derived from its filter type. */
export function columnSortType(column) {
  if (column.sortType) return column.sortType;
  if (column.filter === 'number') return 'number';
  if (column.filter === 'date') return 'date';
  return 'text';
}

/** Ascending comparison of two raw cell values under a comparator type. */
export function compareBy(type, a, b) {
  if (type === 'number') return toNumber(a) - toNumber(b);
  if (type === 'date') return toTime(a) - toTime(b);
  return String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/** True when a filter would actually narrow the rows (i.e. worth applying / showing as active). */
export function isFilterActive(filter) {
  if (!filter) return false;
  switch (filter.type) {
    case 'text':
      return filter.text.trim() !== '';
    case 'enum':
      return filter.values.length > 0;
    case 'number':
      return filter.min !== null || filter.max !== null;
    case 'date':
      return filter.from !== null || filter.to !== null;
    default:
      return false;
  }
}

function rowPassesFilter(row, column, filter) {
  switch (filter.type) {
    case 'text': {
      const needle = filter.text.trim().toLowerCase();
      return needle === '' || cellText(row, column).toLowerCase().includes(needle);
    }
    case 'enum':
      return filter.values.length === 0 || filter.values.includes(cellText(row, column));
    case 'number': {
      const v = toNumber(cellValue(row, column));
      if (filter.min !== null && v < filter.min) return false;
      if (filter.max !== null && v > filter.max) return false;
      return true;
    }
    case 'date': {
      const day = dateOnly(cellValue(row, column));
      if (filter.from !== null && day < filter.from) return false;
      if (filter.to !== null && day > filter.to) return false;
      return true;
    }
    default:
      return true;
  }
}

/** Rows passing every active column filter (logical AND). Input is never mutated. */
export function filterRows(rows, columns, filters) {
  const active = columns
    .map((col) => ({ col, filter: filters[col.key] }))
    .filter((e) => isFilterActive(e.filter));
  if (active.length === 0) return rows.slice();
  return rows.filter((row) => active.every((e) => rowPassesFilter(row, e.col, e.filter)));
}

/** Rows sorted by the given sort state. Stable-enough via a sliced copy; input is never mutated. */
export function sortRows(rows, columns, sort) {
  if (!sort) return rows.slice();
  const column = columns.find((c) => c.key === sort.key);
  if (!column) return rows.slice();
  const type = columnSortType(column);
  const factor = sort.dir === 'desc' ? -1 : 1;
  return rows
    .slice()
    .sort((a, b) => compareBy(type, cellValue(a, column), cellValue(b, column)) * factor);
}

/** Page slice (0-based page index). A non-positive size returns all rows. */
export function paginate(rows, pageIndex, pageSize) {
  if (!pageSize || pageSize <= 0) return rows.slice();
  const start = pageIndex * pageSize;
  return rows.slice(start, start + pageSize);
}

/** Distinct non-empty cell texts for a column, naturally sorted, the source for an enum filter. */
export function distinctValues(rows, column) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const v = cellText(row, column);
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * The page to land on when the page SIZE changes: whichever page still holds the first row you were
 * already looking at.
 *
 * The two obvious answers are both wrong. Jumping to page 1 throws away your place on a long list,
 * you asked to see more rows, not to start over. Keeping the same INDEX can land past the end: page
 * 5 of 5 at twenty rows is page 2 of 2 at fifty, and index 4 is nowhere. Anchoring on the first
 * visible row is the only one that always resolves, and it is what the reader expects: the row they
 * were looking at is still on screen.
 *
 * @param {number} pageIndex current 0-based page index
 * @param {number} oldSize rows per page now
 * @param {number} newSize rows per page wanted
 * @returns {number} 0-based page index that still contains the old first row
 */
export function pageIndexForSize(pageIndex, oldSize, newSize) {
  if (!newSize || newSize <= 0) return 0;
  const firstRow = Math.max(0, pageIndex) * Math.max(0, oldSize);
  return Math.floor(firstRow / newSize);
}

/**
 * Page-number window for a pager: first and last page always shown, current ±1, "ellipsis"
 * gaps between. `current` and the returned page numbers are 1-based.
 */
export function pageWindow(current, totalPages) {
  const out = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= current - 1 && p <= current + 1)) out.push(p);
    else if (out[out.length - 1] !== 'ellipsis') out.push('ellipsis');
  }
  return out;
}
