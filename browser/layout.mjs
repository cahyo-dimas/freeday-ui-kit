/* Browser regression specs, layout containment (pure CSS, no enhancer).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * Guards the escape described in base.css: `.fdy-visually-hidden` is position:absolute, so with no
 * positioned ancestor its containing block is the document, and `overflow` on the scroller clips
 * nothing. Ten hidden labels in one wide table then drag the page sideways, invisible in the DOM,
 * unaffected by `overflow-x:hidden` anywhere, and only measurable in a real layout engine. That is
 * why this lives here and not in test/ (test/css.test.mjs guards the CSS shape; this guards the
 * actual behaviour).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('hidden labels in a wide table do not scroll the page', { skip }, async () => {
  await withPage(fixture('layout-visually-hidden.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && document.querySelectorAll(".fdy-visually-hidden").length === 10');

    const escape = await p.evalJS('window.pageEscape()');
    assert.equal(
      escape,
      0,
      `the page must not scroll horizontally, escaped by ${escape}px — a .fdy-visually-hidden span `
        + 'reached the initial containing block, so some clipping container lost its `position`',
    );

    // The containment must not have been bought by breaking the scroller: it still scrolls.
    const range = await p.evalJS('window.scrollerRange()');
    assert.ok(range > 100, `.fdy-table-scroll must still scroll internally, got ${range}px`);
  });
});
