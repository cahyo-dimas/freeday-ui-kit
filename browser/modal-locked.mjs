/* Browser regression specs: a FdyModal's `open` and its <dialog> never disagree.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * With dismissible=false the wrapper prevents `cancel`. Chrome's close watcher only honours that once
 * per user activation: a second Escape with no click between closes the dialog anyway. The wrappers
 * never listened for `close`, so the app still held open=true over a closed dialog, and setting it
 * true again did nothing, since the value had not changed.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

before(async () => {
  if (skip === false) await buildEntries();
});

for (const stack of ['vue', 'react']) {
  test(`${stack}: two Escapes on a locked modal leave app state and the dialog agreeing`, { skip }, async () => {
    await withPage('file://' + join(HERE, 'fixtures', `${stack}-modal-locked.html`), async (p) => {
      await p.waitFor('typeof window.__show === "function"');
      await p.evalJS('window.__show(), true');
      await p.waitFor('document.querySelector("dialog").open === true');
      await p.pressKey('Escape');
      await p.pressKey('Escape');
      await new Promise((r) => setTimeout(r, 150));
      const state = await p.evalJS('[window.__appOpen, document.querySelector("dialog").open]');
      assert.equal(state[0], state[1], `app says open=${state[0]}, the dialog says open=${state[1]}`);
      assert.deepEqual(state, [true, true], 'and a modal that may not be dismissed is still open');
    });
  });
}
