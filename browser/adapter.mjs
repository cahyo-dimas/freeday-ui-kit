/* Browser regression specs — Vue + React adapters, actually mounted and clicked.
 * Guards note #38 (v1.13.1): the option <li> isn't focusable, so without
 * mousedown/onMouseDown preventDefault a real click blurs the button, fires focusout,
 * and the list closes before the pick lands — mouse-select silently does nothing.
 * The vanilla equivalent is covered in vanilla.mjs; the adapters are a separate codebase
 * that carried the same bug independently, so they need their own guard.
 *
 * Run via `npm run test:browser`; NOT part of the default gate. Auto-skips without Chrome. */
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

async function assertMouseSelect(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    await p.waitFor(`document.querySelector('.fdy-combo__button')`);
    await p.clickCenter('.fdy-combo__button');
    const opened = await p.waitFor(`document.querySelector('.fdy-combo__button').getAttribute('aria-expanded') === 'true'`);
    assert.ok(opened, 'listbox opens on trigger click');
    // Second option is "Badge" — click it with a trusted gesture.
    await p.clickCenter('.fdy-combo__option[aria-selected="false"]');
    const changed = await p.waitFor(`window.__val === 'badge'`);
    assert.ok(changed, `mouse-select should update value to "badge", got "${await p.evalJS('window.__val')}"`);
  });
}

test('Vue FdyCombo: real mouse-select updates v-model', { skip }, async () => {
  await assertMouseSelect('vue-combo.html');
});

test('React FdyCombo: real mouse-select updates value', { skip }, async () => {
  await assertMouseSelect('react-combo.html');
});
