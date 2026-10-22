/* Browser regression specs: Freeday.confirm() (#060), data-fdy-search (#061), data-fdy-copy (#062).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * All three are about what a REAL gesture does: Escape only closes a native <dialog> when it is a
 * trusted key with its virtual-key code, a backdrop click only lands on the <dialog> element when
 * it is aimed at coordinates outside the box, and a clear button is only useful if what it clears
 * also reaches the framework binding through a native `input`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const PAGE = fixture('vanilla-confirm-search-copy.html');
const READY = `document.readyState === 'complete' && !!(window.Freeday && Freeday.confirm)
  && document.getElementById('search').dataset.fdySearchReady === '1'`;
const DIALOG = 'dialog[data-fdy-confirm]';
const open = (p) => p.waitFor(`!!document.querySelector('${DIALOG}[open]')`);
const gone = (p) => p.waitFor(`!document.querySelector('${DIALOG}')`);

test('confirm: accept answers true, reject answers false, and the dialog leaves the DOM', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.clickCenter('#ask');
    assert.ok(await open(p), 'the confirm opens as a modal dialog');
    assert.equal(await p.evalJS(`document.activeElement.hasAttribute('data-fdy-confirm-reject')`), true,
      'focus starts on the reject button, so a stray Enter never confirms');
    assert.equal(await p.evalJS(`document.querySelector('[data-fdy-confirm-accept]').textContent`), 'Delete order');
    await p.clickCenter('[data-fdy-confirm-accept]');
    assert.ok(await gone(p), 'the dialog is removed once answered');
    assert.equal(await p.evalJS(`document.activeElement.id`), 'ask', 'focus returns to the opener');

    await p.clickCenter('#ask');
    await open(p);
    await p.clickCenter('[data-fdy-confirm-reject]');
    await gone(p);
    assert.deepEqual(await p.evalJS('window.answers'), [true, false], 'one answer per dialog, never two');
  });
});

test('confirm: Escape and a backdrop click both answer false', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.clickCenter('#ask');
    await open(p);
    await p.pressKey('Escape');
    assert.ok(await gone(p), 'Escape closes it');

    await p.clickCenter('#ask');
    await open(p);
    await p.clickCenter('#outside');
    assert.ok(await gone(p), 'a click outside the box closes it');
    assert.deepEqual(await p.evalJS('window.answers'), [false, false]);
  });
});

test('confirm: danger tone, findings as a list, and text is never parsed as markup', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.clickCenter('#ask-danger');
    await open(p);
    assert.equal(await p.evalJS(`document.querySelector('[data-fdy-confirm-accept]').classList.contains('fdy-btn--danger')`), true);
    assert.deepEqual(await p.evalJS(`[...document.querySelectorAll('${DIALOG} li')].map((li) => li.textContent)`),
      ['Phone is empty', 'Email is invalid']);
    assert.equal(await p.evalJS(`document.querySelector('${DIALOG} b')`), null, 'the message is text, not HTML');
    assert.equal(await p.evalJS(`document.querySelector('[data-fdy-confirm-accept]').textContent`), 'Confirm',
      'the default label when the caller names none');
    assert.equal(await p.evalJS(`document.querySelector('${DIALOG}').getAttribute('aria-labelledby') === document.querySelector('${DIALOG} h2').id`), true);
  });
});

test('search: waits for the pause, Enter searches at once, terms are trimmed', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    assert.equal(await p.evalJS(`document.getElementById('search-clear').hidden`), true, 'no clear button on an empty box');
    await p.evalJS(`(() => { const i = document.getElementById('search-in'); i.value = '  abc '; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    assert.equal(await p.evalJS(`document.getElementById('search-clear').hidden`), false, 'the clear button appears with text');
    assert.deepEqual(await p.evalJS('window.searches'), [], 'nothing is sent while the reader may still be typing');
    assert.ok(await p.waitFor(`window.searches.length === 1`), 'the pause sends it');
    assert.deepEqual(await p.evalJS('window.searches'), ['abc']);

    await p.evalJS(`document.getElementById('search-in').focus()`);
    await p.pressKey('Enter');
    assert.deepEqual(await p.evalJS('window.searches'), ['abc', 'abc'], 'Enter sends without waiting');
  });
});

test('search: clear empties the box, reaches the binding, and searches for everything at once', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.evalJS(`(() => { const i = document.getElementById('search-in'); i.value = 'abc'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const inputsBefore = await p.evalJS('window.inputs');
    await p.clickCenter('#search-clear');
    assert.equal(await p.evalJS(`document.getElementById('search-in').value`), '');
    assert.equal(await p.evalJS('window.inputs'), inputsBefore + 1, 'a native input event, so v-model / onChange / @bind follow');
    assert.deepEqual(await p.evalJS('window.searches'), [''], 'the empty term goes out at once, and the pending "abc" never does');
    await new Promise((r) => setTimeout(r, 450));
    assert.deepEqual(await p.evalJS('window.searches'), [''], 'still only the one search after the pause would have fired');
    assert.equal(await p.evalJS(`document.activeElement.id`), 'search-in', 'focus goes back to the box');
    assert.equal(await p.evalJS(`document.getElementById('search-clear').hidden`), true);
  });
});

test('copy: writes the attribute value and says so', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.evalJS(`Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: (v) => { window.clipped = v; return Promise.resolve(); } } })`);
    await p.clickCenter('#copy');
    assert.ok(await p.waitFor('window.copies.length === 1'));
    assert.equal(await p.evalJS('window.clipped'), 'INV-2026-00042');
    assert.deepEqual(await p.evalJS('window.copies[0]'), { value: 'INV-2026-00042', ok: true });
    assert.equal(await p.evalJS(`document.querySelector('.fdy-toast--success .fdy-toast__text').textContent`), 'Copied.');

    await p.clickCenter('#copy-empty');
    assert.equal(await p.evalJS('window.copies.length'), 1, 'an empty value copies nothing and reports nothing');
  });
});

test('copy: without a Clipboard API the reader is told, not left guessing', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.evalJS(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })`);
    await p.clickCenter('#copy');
    assert.ok(await p.waitFor('window.copies.length === 1'));
    assert.deepEqual(await p.evalJS('window.copies[0]'), { value: 'INV-2026-00042', ok: false });
    assert.equal(await p.evalJS(`document.querySelector('.fdy-toast--danger .fdy-toast__text').textContent`),
      'Could not copy. Select the text and copy it manually.');
  });
});
