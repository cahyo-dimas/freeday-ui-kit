/* Browser regression specs: FdyCfl never shows rows from two queries, or one query's rows under
 * another's search text. Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The fetch is released by the test (entries/cfl-async-fetch.js), so the order of responses is the
 * spec's, not the network's. Rows are named "<query>|<page>|<n>".
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

const SEARCH = '.fdy-cfl__search .fdy-input';
const MORE = '.fdy-cfl__results .fdy-btn--ghost';
const names = (p) => p.evalJS(`[...document.querySelectorAll('.fdy-cfl__row')].map((r) => r.textContent.trim())`);
const queriesShown = async (p) => [...new Set((await names(p)).map((n) => n.split('|')[0]))];

async function openWithFirstPage(p) {
  await p.waitFor('document.readyState === "complete" && document.querySelector(".fdy-input-group__btn")');
  await p.clickCenter('.fdy-input-group__btn');
  await p.waitFor('window.__calls.length === 1');
  await p.evalJS('window.__answer(0), true');
  await p.waitFor('document.querySelectorAll(".fdy-cfl__row").length === 3');
}

for (const stack of ['vue', 'react']) {
  test(`${stack}: "Load more" during a pending search appends the shown query's page, not the typed one`, { skip }, async () => {
    await withPage(fixture(`${stack}-cfl-async.html`), async (p) => {
      await openWithFirstPage(p);
      await p.clickCenter(SEARCH);
      await p.insertText('ab');
      /* Clicked in the same turn as the typing, so it is certainly inside the 250 ms debounce.
         clickCenter waits for animations first and sometimes outlasted the window, which made the
         order of the two requests, and so this spec, depend on the machine. */
      await p.evalJS(`document.querySelector('${MORE}').click(), true`);
      await p.waitFor('window.__calls.length === 2');
      assert.deepEqual(await p.evalJS('[window.__calls[1].query, window.__calls[1].page]'), ['', 1],
        'the next page is asked for the query the rows on screen belong to, not the one being typed');

      await p.waitFor('window.__calls.length === 3');
      assert.deepEqual(await p.evalJS('[window.__calls[2].query, window.__calls[2].page]'), ['ab', 0]);
      await p.evalJS('window.__answer(1), window.__answer(2), true');
      await p.waitFor(`[...document.querySelectorAll('.fdy-cfl__row')].every((r) => r.textContent.startsWith('ab|'))`);
      assert.deepEqual(await queriesShown(p), ['ab'], 'the typed search replaces them whole, with nothing of the old query mixed in');
    });
  });

  test(`${stack}: a failed new search does not leave the old query's rows under the new text`, { skip }, async () => {
    await withPage(fixture(`${stack}-cfl-async.html`), async (p) => {
      await openWithFirstPage(p);
      await p.clickCenter(SEARCH);
      await p.insertText('x');
      await p.waitFor('window.__calls.length === 2');
      await p.evalJS('window.__fail(1), true');
      await p.waitFor('document.querySelector(".fdy-cfl__results [role=alert]") !== null');
      assert.deepEqual(await names(p), [], 'rows for "" are not shown as if they matched "x"');

      await p.clickCenter('.fdy-cfl__results [role=alert] .fdy-btn');
      await p.waitFor('window.__calls.length === 3');
      assert.deepEqual(await p.evalJS('[window.__calls[2].query, window.__calls[2].page]'), ['x', 0],
        'and Try again repeats the search that failed');
    });
  });
}
