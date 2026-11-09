/* Browser regression specs: an autocomplete opens its whole list, and carries what an <input> carries.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Both came from moving three `<input list>` fields to `FdyAutocomplete` (CATATAN-FREEDAY §25, #115).
 *   - The list filtered by whatever the field held, so a field with a default opened a one-item
 *     list that read as broken. A value already there is not a query; only typing narrows it.
 *   - Undeclared attributes fell on the wrapper <div> (Vue) or vanished (React, Blazor), so
 *     `maxlength` and a per-control `data-fdy-msg-required` silently did nothing.
 * Blazor renders the raw markup and hands it to the enhancer, so the vanilla run covers its list.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const json = async (p, expr) => JSON.parse(await p.evalJS(`JSON.stringify(${expr})`));
const ALL = ['buah', 'galon', 'pcs'];

before(async () => {
  if (skip === false) await buildEntries();
});

const until = async (p, condition, what) => {
  assert.ok(await p.waitFor(condition), `timed out waiting for ${what}: ${condition}`);
};
const shown = (p) => json(p, 'window.shownOptions()');
const clearField = (p) => p.evalJS(`document.getElementById('ac').select(); true`);

for (const [name, page, ready] of [
  ['raw path', 'vanilla-autocomplete-open.html', 'typeof window.shownOptions === "function"'],
  ['vue', 'vue-autocomplete-attrs.html', 'window.mounted === true'],
  ['react', 'react-autocomplete-attrs.html', 'window.mounted === true'],
]) {
  test(`${name}: a field holding a value opens the whole list, and only typing narrows it`, { skip }, async () => {
    await withPage(fixture(page), async (p) => {
      await until(p, ready, 'the page to be ready');
      await p.clickCenter('#ac');
      await until(p, 'window.isOpen()', 'the list to open');
      assert.deepEqual(await shown(p), ALL, 'the value "buah" is already there, and is not a query');

      await clearField(p);
      await p.insertText('ga');
      await until(p, 'window.shownOptions().length === 1', 'typing to narrow the list');
      assert.deepEqual(await shown(p), ['galon']);

      await p.pressKey('Escape');
      await until(p, '!window.isOpen()', 'the list to close');
      await p.pressKey('ArrowDown');
      await until(p, 'window.isOpen()', 'the arrow key to reopen it');
      assert.deepEqual(await shown(p), ALL, 'closing forgets the typing, so the arrow keys open it whole too');

      await clearField(p);
      await p.insertText('zzz');
      await until(p, 'window.emptyShown()', 'the empty state for a query that matches nothing');
      assert.deepEqual(await shown(p), []);
      await p.pressKey('Escape');
      await until(p, '!window.isOpen()', 'the list to close');
      await p.pressKey('ArrowDown');
      await until(p, 'window.isOpen()', 'the list to reopen');
      assert.equal(await p.evalJS('window.emptyShown()'), false, 'and takes its empty state with it');
      assert.deepEqual(await shown(p), ALL);
    });
  });
}

for (const stack of ['vue', 'react']) {
  test(`${stack}: undeclared attributes land on the input, class and style on the root`, { skip }, async () => {
    await withPage(fixture(`${stack}-autocomplete-attrs.html`), async (p) => {
      await until(p, 'window.mounted === true', 'the app to mount');
      const input = await json(p, `(() => { const e = document.getElementById('ac'); return {
        maxlength: e.getAttribute('maxlength'), inputmode: e.getAttribute('inputmode'), name: e.getAttribute('name'),
        msg: e.getAttribute('data-fdy-msg-required'), type: e.getAttribute('type'), role: e.getAttribute('role'),
        cls: e.className, style: e.getAttribute('style') }; })()`);
      assert.deepEqual([input.maxlength, input.inputmode, input.name, input.msg], ['20', 'text', 'satuan', 'Satuan wajib diisi.']);
      assert.deepEqual([input.type, input.role], ['text', 'combobox'], 'what the combobox contract depends on cannot be overridden');
      assert.equal(input.cls, 'fdy-input', 'class is not forwarded to the input');
      assert.equal(input.style, null, 'nor is style');

      const root = await json(p, `(() => { const e = document.querySelector('.fdy-autocomplete'); return {
        sizer: e.classList.contains('sizer'), width: e.style.width, msg: e.hasAttribute('data-fdy-msg-required') }; })()`);
      assert.deepEqual([root.sizer, root.width, root.msg], [true, '200px', false]);

      await p.clickCenter('#ac');
      await until(p, 'window.isOpen()', 'its own focus handling to survive an app listener');
      await p.evalJS(`document.getElementById('ac').blur(); true`);
      await until(p, 'window.blurs === 1', 'a listener the app passed to reach the input');
    });
  });

  test(`${stack}: a per-control message on the autocomplete now reaches the form`, { skip }, async () => {
    await withPage(fixture(`${stack}-autocomplete-attrs.html`), async (p) => {
      await until(p, 'window.mounted === true', 'the app to mount');
      await p.evalJS(`window.setValue(''); true`);
      await until(p, `document.getElementById('ac').value === ''`, 'the field to empty');
      await p.clickCenter('#kirim');
      await until(p, `document.getElementById('ac').getAttribute('aria-invalid') === 'true'`, 'the form to refuse');
      assert.equal(await p.evalJS(`document.querySelector('.fdy-field [data-fdy-error]').textContent.trim()`), 'Satuan wajib diisi.');
    });
  });
}
