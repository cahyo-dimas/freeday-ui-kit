import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cellText,
  columnSortType,
  compareBy,
  isFilterActive,
  filterRows,
  sortRows,
  paginate,
  distinctValues,
  pageWindow,
  pageIndexForSize,
} from '../adapters/core/table-model.js';

// Rows resembling an admin table: a text id, a numeric amount, an ISO date, an enum status.
const columns = [
  { key: 'code', label: 'Code' },
  { key: 'amount', label: 'Amount', filter: 'number' },
  { key: 'date', label: 'Date', filter: 'date' },
  { key: 'status', label: 'Status', filter: 'enum' },
];
const rows = [
  { code: 'INV-2', amount: 1500, date: '2026-03-05', status: 'open' },
  { code: 'INV-10', amount: 300, date: '2026-01-20', status: 'paid' },
  { code: 'INV-1', amount: 900, date: '2026-02-11', status: 'open' },
];

test('columnSortType: derived from filter, overridable', () => {
  assert.equal(columnSortType({ key: 'a', label: 'A', filter: 'number' }), 'number');
  assert.equal(columnSortType({ key: 'a', label: 'A', filter: 'date' }), 'date');
  assert.equal(columnSortType({ key: 'a', label: 'A', filter: 'enum' }), 'text');
  assert.equal(columnSortType({ key: 'a', label: 'A', filter: 'number', sortType: 'text' }), 'text');
});

test('compareBy: numeric, date, and natural text order', () => {
  assert.ok(compareBy('number', 300, 1500) < 0);
  assert.ok(compareBy('date', '2026-01-20', '2026-03-05') < 0);
  // natural sort: INV-2 before INV-10 (not lexicographic)
  assert.ok(compareBy('text', 'INV-2', 'INV-10') < 0);
});

test('sortRows: numeric ascending / descending, input not mutated', () => {
  const before = rows.slice();
  const asc = sortRows(rows, columns, { key: 'amount', dir: 'asc' });
  assert.deepEqual(asc.map((r) => r.amount), [300, 900, 1500]);
  const desc = sortRows(rows, columns, { key: 'amount', dir: 'desc' });
  assert.deepEqual(desc.map((r) => r.amount), [1500, 900, 300]);
  assert.deepEqual(rows, before, 'source array untouched');
});

test('sortRows: null sort and unknown key return a copy in original order', () => {
  assert.deepEqual(sortRows(rows, columns, null).map((r) => r.code), ['INV-2', 'INV-10', 'INV-1']);
  assert.deepEqual(
    sortRows(rows, columns, { key: 'nope', dir: 'asc' }).map((r) => r.code),
    ['INV-2', 'INV-10', 'INV-1'],
  );
});

test('filterRows: text contains (case-insensitive), empty text is a no-op', () => {
  const cols = [{ key: 'code', label: 'Code', filter: 'text' }];
  assert.equal(filterRows(rows, cols, { code: { type: 'text', text: 'inv-1' } }).length, 2);
  assert.equal(filterRows(rows, cols, { code: { type: 'text', text: '  ' } }).length, 3);
});

// A date column normally RENDERS a formatted date, so `value` returns one. The
// filter used to slice that string — "18 Mar 2024" -> "18 Mar 202" — and compare
// it as text against an ISO bound, so every row failed. The date SORT parsed the
// same string correctly, which is what made the broken filter look trustworthy.
test('filterRows: a date column whose value is FORMATTED still narrows', () => {
  const formatted = [
    { code: 'A', when: '2026-01-20' },
    { code: 'B', when: '2026-02-11' },
    { code: 'C', when: '2026-03-05' },
  ];
  const cols = [
    {
      key: 'when',
      label: 'When',
      filter: 'date',
      value: (row) =>
        new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          .format(new Date(`${row.when}T00:00:00`)),
    },
  ];
  assert.deepEqual(
    filterRows(formatted, cols, { when: { type: 'date', from: '2026-02-01', to: '2026-02-28' } })
      .map((r) => r.code),
    ['B'],
  );
  assert.deepEqual(
    filterRows(formatted, cols, { when: { type: 'date', from: '2026-02-11', to: null } })
      .map((r) => r.code),
    ['B', 'C'],
  );
});

// `toISOString` is UTC. East of Greenwich a Date at local midnight is the
// PREVIOUS day in UTC, so filtering from the day it represents dropped it.
test('filterRows: a Date cell is read as its LOCAL calendar day, not UTC', () => {
  const rows2 = [{ code: 'A', when: new Date(2026, 1, 11) }]; // 11 Feb 2026, local
  const cols = [{ key: 'when', label: 'When', filter: 'date' }];
  assert.deepEqual(
    filterRows(rows2, cols, { when: { type: 'date', from: '2026-02-11', to: '2026-02-11' } })
      .map((r) => r.code),
    ['A'],
  );
});

test('filterRows: an unparseable date cell is excluded rather than matching everything', () => {
  const rows2 = [{ code: 'A', when: 'not a date' }, { code: 'B', when: '2026-02-11' }];
  const cols = [{ key: 'when', label: 'When', filter: 'date' }];
  assert.deepEqual(
    filterRows(rows2, cols, { when: { type: 'date', from: '2026-01-01', to: null } })
      .map((r) => r.code),
    ['B'],
  );
});

test('filterRows: enum, number range, date range, and logical AND', () => {
  assert.deepEqual(
    filterRows(rows, columns, { status: { type: 'enum', values: ['open'] } }).map((r) => r.code),
    ['INV-2', 'INV-1'],
  );
  assert.deepEqual(
    filterRows(rows, columns, { amount: { type: 'number', min: 500, max: null } }).map((r) => r.amount),
    [1500, 900],
  );
  assert.deepEqual(
    filterRows(rows, columns, { date: { type: 'date', from: '2026-02-01', to: '2026-02-28' } }).map((r) => r.code),
    ['INV-1'],
  );
  // AND: open status AND amount >= 1000 -> only INV-2
  const both = filterRows(rows, columns, {
    status: { type: 'enum', values: ['open'] },
    amount: { type: 'number', min: 1000, max: null },
  });
  assert.deepEqual(both.map((r) => r.code), ['INV-2']);
});

test('isFilterActive: only narrowing filters count', () => {
  assert.equal(isFilterActive({ type: 'text', text: '' }), false);
  assert.equal(isFilterActive({ type: 'text', text: 'x' }), true);
  assert.equal(isFilterActive({ type: 'enum', values: [] }), false);
  assert.equal(isFilterActive({ type: 'number', min: null, max: null }), false);
  assert.equal(isFilterActive({ type: 'number', min: 0, max: null }), true);
  assert.equal(isFilterActive({ type: 'date', from: null, to: null }), false);
  assert.equal(isFilterActive(undefined), false);
});

test('paginate: 0-based slice; non-positive size returns all', () => {
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 0, 2), [1, 2]);
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 2, 2), [5]);
  assert.deepEqual(paginate([1, 2, 3], 0, 0), [1, 2, 3]);
});

test('distinctValues: unique, non-empty, naturally sorted', () => {
  assert.deepEqual(distinctValues(rows, { key: 'status', label: 'S' }), ['open', 'paid']);
});

test('cellText: null/undefined -> empty string, else trimmed', () => {
  assert.equal(cellText({ code: '  x ' }, { key: 'code', label: 'C' }), 'x');
  assert.equal(cellText({ code: null }, { key: 'code', label: 'C' }), '');
  assert.equal(cellText({}, { key: 'missing', label: 'M' }), '');
});

test('pageIndexForSize: the reader keeps the row they were looking at (#008)', () => {
  // Page 3 of twenty-row pages starts at row 40. At fifty a page, row 40 is on page 1 (index 0).
  assert.equal(pageIndexForSize(2, 20, 50), 0);
  // ...and going the other way it is on page 5 (index 4): 40 / 10.
  assert.equal(pageIndexForSize(2, 20, 10), 4);
  // The first page stays the first page whatever the size.
  assert.equal(pageIndexForSize(0, 20, 50), 0);
  assert.equal(pageIndexForSize(0, 50, 20), 0);
  // Same size in and out is a no-op, so a re-pick of the current value cannot move the reader.
  assert.equal(pageIndexForSize(3, 20, 20), 3);
  // Nonsense in: never a negative index, never a divide by zero.
  assert.equal(pageIndexForSize(-2, 20, 20), 0);
  assert.equal(pageIndexForSize(4, 20, 0), 0);
});

test('pageWindow: first/last always, current +/-1, ellipsis gaps', () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  assert.deepEqual(pageWindow(2, 5), [1, 2, 3, 'ellipsis', 5]);
});
