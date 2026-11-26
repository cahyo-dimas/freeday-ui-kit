/* Browser regression spec: a parent that stores onProcess output in state does not loop.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Server-paged, with no `filters` prop. The table counted itself filter-controlled and read
 * `props.filters ?? {}`, a new object every render, so every memo after it recomputed, onProcess
 * got a new array on every commit, and a parent that put it in state rendered again, for ever.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  if (skip === false) await buildEntries();
});

for (const [name, file] of [['React', 'react-table-process.html'], ['Vue', 'vue-table-process.html']])
test(`${name} FdyTable: onProcess into parent state settles instead of re-rendering for ever`, { skip }, async () => {
  await withPage('file://' + join(HERE, 'fixtures', file), async (p) => {
    await p.waitFor(`document.querySelector('#cards') && document.querySelector('#cards').textContent === '3'`);
    const first = await p.evalJS('window.__processCalls');
    await sleep(500);
    const later = await p.evalJS('window.__processCalls');
    assert.equal(later, first, `still reporting after the page went quiet: ${first} then ${later} calls`);
    assert.ok(later <= 2, `one report per change, got ${later}`);
  });
});
