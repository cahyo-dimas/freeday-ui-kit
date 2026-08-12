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

/* Controlled client-side pageIndex (note 004 §1). The failure this guards: a table that accepts the
 * prop but keeps paginating off its own private index, so an EXTERNAL pager appears to do nothing —
 * exactly the shape a responsive screen needs (table above md, card list below, one shared pager).
 * Both directions are asserted: parent → table (rows change) and table → parent (event round-trip). */
async function assertControlledPageIndex(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    await p.waitFor(`document.querySelector('.fdy-datatable tbody tr')`);

    const codes = async () =>
      p.evalJS(`[...document.querySelectorAll('.fdy-datatable tbody tr td:first-child')].map(td => td.textContent.trim())`);

    assert.deepEqual(await codes(), ['C-1', 'C-2'], 'starts on the parent-held page 0');
    assert.deepEqual(await p.evalJS('window.__processed'), ['C-1', 'C-2'], 'process reports the same page');

    // Parent → table: the pager OUTSIDE the component must move the rows.
    await p.clickCenter('#ext-next');
    const moved = await p.waitFor(`document.querySelector('.fdy-datatable tbody tr td:first-child').textContent.trim() === 'C-3'`);
    assert.ok(moved, `external pager should drive the table, rows are ${JSON.stringify(await codes())}`);
    assert.deepEqual(await p.evalJS('window.__processed'), ['C-3', 'C-4'], 'process follows the controlled index');

    // Table → parent: the built-in pager must ASK rather than mutate a private index.
    await p.clickCenter('.fdy-table-footer button[aria-label="Next page"]');
    const asked = await p.waitFor(`window.__pageIndex === 2`);
    assert.ok(asked, 'internal pager click should emit up to the parent');
    const parentIndex = await p.evalJS('window.__pageIndex');
    const firstCode = await p.evalJS(`document.querySelector('.fdy-datatable tbody tr td:first-child').textContent.trim()`);
    assert.equal(firstCode, `C-${parentIndex * 2 + 1}`, 'rendered page must match the index the parent now holds');
  });
}

test('Vue FdyTable: controlled pageIndex round-trips with an external pager', { skip }, async () => {
  await assertControlledPageIndex('vue-table-pageindex.html');
});

test('React FdyTable: controlled pageIndex round-trips with an external pager', { skip }, async () => {
  await assertControlledPageIndex('react-table-pageindex.html');
});
