import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDLE, dataOf, failedFrom, loadingFrom, readyWith } from '../adapters/core/load-state.js';

test('a first load has nothing to keep, and its answer becomes the data', () => {
  const loading = loadingFrom(IDLE);
  assert.deepEqual(loading, { status: 'loading', previous: null });
  assert.deepEqual(readyWith([1, 2]), { status: 'ready', data: [1, 2] });
});

test('a reload keeps what was shown as previous, never as data', () => {
  const reloading = loadingFrom(readyWith(['a']));
  assert.deepEqual(reloading, { status: 'loading', previous: ['a'] });
  assert.equal('data' in reloading, false, 'stale rows are reachable only by name');
});

test('a failure keeps what was there before it, through any number of retries', () => {
  const err = new Error('offline');
  const failed = failedFrom(loadingFrom(readyWith(['a'])), err);
  assert.deepEqual(failed, { status: 'error', error: err, previous: ['a'] });
  assert.deepEqual(dataOf(loadingFrom(failed)), ['a'], 'a retry still knows the last good data');
  assert.equal(dataOf(failedFrom(loadingFrom(IDLE), err)), null, 'a first load that fails has none');
});

test('states are frozen, so a screen cannot patch one into a contradiction', () => {
  assert.throws(() => { 'use strict'; readyWith([]).status = 'error'; }, TypeError);
});
