/* Browser regression specs: FdyTable's empty state is told whether its filters emptied it (#069).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * "No rows match these filters" wants a Clear button, "nothing here yet" a Create one. The table
 * owns its column filters, so it is the one that knows which; before, the slot was told nothing.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

before(async () => {
  if (skip === false) await buildEntries();
});

async function assertEmptyKnowsWhy(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    assert.ok(await p.waitFor(`!!document.getElementById('clear')`), 'a filter that matches nothing offers to clear it');
    await p.clickCenter('#clear');
    assert.ok(await p.waitFor(`document.querySelectorAll('tbody tr').length === 2 && !document.getElementById('clear')`),
      'clearing through the slot brings the rows back');
    await p.evalJS('window.__setRows([])');
    assert.ok(await p.waitFor(`!!document.getElementById('nothing')`), 'with no filter, empty means nothing yet');
  });
}

test('Vue FdyTable: the empty slot receives filtered + clearFilters', { skip }, async () => {
  await assertEmptyKnowsWhy('vue-table-empty.html');
});

test('React FdyTable: the empty render function receives filtered + clearFilters', { skip }, async () => {
  await assertEmptyKnowsWhy('react-table-empty.html');
});
