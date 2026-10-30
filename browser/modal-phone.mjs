/* Browser regression spec, the modal body on a phone (CATATAN-FREEDAY §16).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * On an iPhone 7 every FdyModal showed its header and footer and a body one line tall, scrolled to
 * the bottom, with the form invisible. The cause was `flex:1` on the body: a 0% basis against a
 * dialog that has only a max-height, which older WebKit resolved to 0. Chrome reads the same CSS
 * correctly, so a Chrome layout check alone would have passed against the defect. Two checks here:
 * the layout at iPhone 7 size, and the computed basis, which is engine-independent; a 0px basis
 * reproduces the iPhone in Chrome to the pixel, which is what proves the layout check can fail.
 * webkit/modal-phone.spec.mjs runs the same layout on WebKit in CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const measure = async (p, id) => JSON.parse(await p.evalJS(`JSON.stringify(window.measureModal(${JSON.stringify(id)}))`));

test('a short modal body shows all of its content at iPhone 7 size', { skip }, async () => {
  await withPage(fixture('vanilla-modal-phone.html'), async (p) => {
    await p.setViewport(375, 667);
    await p.waitFor('typeof window.measureModal === "function"');
    const m = await measure(p, 'short');
    assert.equal(m.basis, 'auto', `the body's basis must not be a length or percentage an engine can read as 0, got ${m.basis}`);
    assert.ok(m.bodyClient + 1 >= m.bodyScroll,
      `the body must be as tall as its content: ${m.bodyClient}px shown of ${m.bodyScroll}px (the iPhone showed 40)`);
    assert.ok(m.dialogBottom <= m.viewport, 'and the dialog fits the screen');
  });
});

test('a long modal stops at its max-height, keeps its footer on screen, and scrolls the body', { skip }, async () => {
  await withPage(fixture('vanilla-modal-phone.html'), async (p) => {
    await p.setViewport(375, 667);
    await p.waitFor('typeof window.measureModal === "function"');
    const m = await measure(p, 'long');
    assert.ok(m.footerBottom <= m.viewport, `the footer must be on screen: bottom ${m.footerBottom} of ${m.viewport}`);
    assert.ok(m.bodyScroll > m.bodyClient, 'the body scrolls instead of growing past the screen');
    assert.ok(m.bodyClient > 200, `and keeps a usable height, got ${m.bodyClient}px`);
  });
});
