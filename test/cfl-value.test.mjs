import { test } from 'node:test';
import assert from 'node:assert/strict';
import { singleRow } from '../adapters/core/cfl-value.js';

/* #045. `FdyCfl`'s model widened twice in releases that were additive from the kit's side
 * (1.29.0 `clearable`, 1.42.0 `multiple`) and a compile failure from the consumer's, so every
 * single-select screen now narrows a union its own props make impossible. This is that narrowing,
 * owned by the package that knows the invariant instead of rewritten per app. */

test('singleRow returns the row a single-select CFL emits', () => {
  const row = { code: 'C-01', name: 'Acme' };
  assert.equal(singleRow(row), row);
});

test('singleRow maps an empty selection to null', () => {
  assert.equal(singleRow(null), null);
  assert.equal(singleRow(undefined), null);
});

test('singleRow throws on an array instead of picking a row out of it', () => {
  /* Returning `value[0]` would compile, run, and hide the day somebody adds `multiple` to the
     field: the screen would keep working while silently dropping every row but the first. */
  assert.throws(
    () => singleRow([{ code: 'C-01' }, { code: 'C-02' }]),
    { name: 'TypeError', message: /array of 2 row\(s\)/ },
  );
});
