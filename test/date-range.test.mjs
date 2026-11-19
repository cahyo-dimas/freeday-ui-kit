import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeAfterPick, rangeDayState, shownEnds } from '../adapters/core/date-range.js';

const d = (day) => new Date(2026, 10, day);
const idle = (start, end) => ({ start, end, anchor: null, preview: null });

test('a first pick anchors, a later pick commits, an earlier one re-anchors', () => {
  assert.deepEqual(rangeAfterPick(null, d(5)), { kind: 'anchor', anchor: d(5) });
  assert.deepEqual(rangeAfterPick(d(5), d(12)), { kind: 'commit', start: d(5), end: d(12) });
  assert.deepEqual(rangeAfterPick(d(5), d(3)), { kind: 'anchor', anchor: d(3) },
    'a day before the start becomes the start, not the end of a swapped range');
  assert.deepEqual(rangeAfterPick(d(5), d(5)), { kind: 'commit', start: d(5), end: d(5) },
    'the same day twice is a one-day range');
});

test('the grid shows the committed range until a start is pending', () => {
  assert.deepEqual(shownEnds(idle(d(3), d(13))), { from: d(3), to: d(13), pending: false });
  assert.deepEqual(shownEnds({ start: d(3), end: d(13), anchor: d(20), preview: d(24) }),
    { from: d(20), to: d(24), pending: true });
  assert.deepEqual(shownEnds({ start: null, end: null, anchor: d(20), preview: d(18) }),
    { from: d(20), to: null, pending: true }, 'no band is drawn backwards from the start');
});

test('a committed range: filled ends, a band between, each end named', () => {
  const ends = shownEnds(idle(d(3), d(13)));
  assert.deepEqual(rangeDayState(d(3), ends),
    { filled: true, rangeStart: true, rangeEnd: false, inRange: false, role: 'start' });
  assert.deepEqual(rangeDayState(d(8), ends),
    { filled: false, rangeStart: false, rangeEnd: false, inRange: true, role: null });
  assert.deepEqual(rangeDayState(d(13), ends),
    { filled: true, rangeStart: false, rangeEnd: true, inRange: false, role: 'end' });
  assert.deepEqual(rangeDayState(d(14), ends),
    { filled: false, rangeStart: false, rangeEnd: false, inRange: false, role: null });
});

test('a previewed end is in the band but is not an answer yet', () => {
  const ends = shownEnds({ start: null, end: null, anchor: d(5), preview: d(17) });
  assert.deepEqual(rangeDayState(d(17), ends),
    { filled: false, rangeStart: false, rangeEnd: true, inRange: true, role: null });
  assert.equal(rangeDayState(d(5), ends).filled, true, 'the start just picked is filled');
});

test('a one-day range has no band and no squared ends', () => {
  const ends = shownEnds(idle(d(9), d(9)));
  assert.deepEqual(rangeDayState(d(9), ends),
    { filled: true, rangeStart: false, rangeEnd: false, inRange: false, role: 'start' });
});
