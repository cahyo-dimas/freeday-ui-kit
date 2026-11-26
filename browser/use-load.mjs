/* Browser regression specs: useLoad in Vue and React under answers that arrive out of order.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The fetcher is settled by the test (entries/load-fetch.js), so the order is the spec's choice.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const view = (p) => p.evalJS(`document.querySelector('#view').textContent`);

before(async () => {
  if (skip === false) await buildEntries();
});

for (const stack of ['vue', 'react']) {
  test(`${stack}: a newer filter wins whatever order the answers arrive in, and the older is aborted`, { skip }, async () => {
    await withPage('file://' + join(HERE, 'fixtures', `${stack}-use-load.html`), async (p) => {
      await p.waitFor('window.__loads && window.__loads.length === 1');
      await p.evalJS(`window.__setFilter('b'), true`);
      await p.waitFor('window.__loads.length === 2');
      assert.equal(await p.evalJS('window.__loads[0].signal.aborted'), true, 'the superseded request is aborted');

      await p.evalJS('window.__answer(1), true');
      await p.waitFor(`document.querySelector('#view').textContent === 'rows for b'`);
      await p.evalJS('window.__answer(0), true');
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(await view(p), 'rows for b', 'the late answer for "a" is discarded');
    });
  });

  test(`${stack}: a failed load is an error with the last good data as previous, never empty`, { skip }, async () => {
    await withPage('file://' + join(HERE, 'fixtures', `${stack}-use-load.html`), async (p) => {
      await p.waitFor('window.__loads && window.__loads.length === 1');
      await p.evalJS('window.__answer(0), true');
      await p.waitFor(`document.querySelector('#view').textContent === 'rows for a'`);
      await p.evalJS(`window.__setFilter('c'), true`);
      await p.waitFor('window.__loads.length === 2');
      assert.equal(await view(p), 'loading');
      await p.evalJS('window.__fail(1), true');
      await p.waitFor(`document.querySelector('#view').textContent.startsWith('error')`);
      assert.equal(await view(p), 'error, previous: rows for a');
    });
  });
}
