/* Browser regression specs: useFreeday hydrates DOM a CHILD component mounts later (CATATAN-FREEDAY §29).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The parent calls useFreeday(root); the child renders a data-fdy-validate form behind its own state.
 * Vue's onUpdated and React's effect both belong to the component that re-rendered, which is the
 * child, so before the observer the form was never enhanced and an empty required field submitted.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  if (skip === false) await buildEntries();
});

for (const stack of ['vue', 'react']) {
  test(`${stack}: a form a child mounts later is validated, and the observer settles`, { skip }, async () => {
    await withPage(fixture(`${stack}-child-hydration.html`), async (p) => {
      await p.waitFor(`document.querySelector('#show')`);
      await p.clickCenter('#show');
      await p.waitFor(`document.querySelector('#send')`);
      await p.clickCenter('#send');
      assert.ok(await p.waitFor(`document.querySelector('#name').getAttribute('aria-invalid') === 'true'`),
        'the empty required field is refused, so the child\'s form was hydrated');

      const settled = await p.evalJS('window.__scans');
      await sleep(400);
      assert.equal(await p.evalJS('window.__scans'), settled,
        'no scan after the page went quiet: a rehydrate never schedules the next one');
    });
  });
}
