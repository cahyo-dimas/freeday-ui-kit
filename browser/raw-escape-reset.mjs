/* Browser regression specs for two raw-path state leftovers. Run via `npm run test:browser`.
 *
 * - A column filter open in a table inside a modal: Escape closed the filter AND the modal, because
 *   the table's handler never said it had used the key, so the dialog's close watcher acted on it.
 * - A validated form's own <button type="reset">: the fields emptied and the red messages stayed,
 *   and the form still counted itself submitted. Only the JS api.reset() cleared them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('Escape in a table\'s column filter inside a modal closes the filter only', { skip }, async () => {
  await withPage(fixture('vanilla-filter-modal.html'), async (p) => {
    await p.waitFor(`document.getElementById('dlg').open && document.querySelector('.fdy-table__filterbtn')`);
    await p.clickCenter('.fdy-table__filterbtn');
    await p.waitFor(`(() => { const f = document.querySelector('.fdy-filter'); return f && !f.hidden; })()`);
    await p.pressKey('Escape');
    assert.ok(await p.waitFor(`(() => { const f = document.querySelector('.fdy-filter'); return !f || f.hidden; })()`),
      'the filter panel closes');
    assert.equal(await p.evalJS(`document.getElementById('dlg').open`), true, 'and the modal behind it stays open');
  });
});

test('a validated form\'s reset button clears its error messages', { skip }, async () => {
  await withPage(fixture('vanilla-form-reset.html'), async (p) => {
    await p.waitFor(`document.querySelector('#send')`);
    await p.clickCenter('#send');
    assert.ok(await p.waitFor(`document.querySelector('#name').getAttribute('aria-invalid') === 'true'`));
    await p.clickCenter('#reset');
    assert.ok(await p.waitFor(`!document.querySelector('#name').hasAttribute('aria-invalid')
      && [...document.querySelectorAll('[data-fdy-error]')].every((e) => e.hidden)`),
      'reset empties the fields and the messages about them');
  });
});
