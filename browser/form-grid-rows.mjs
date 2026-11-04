/* Browser regression spec, what becomes a column in .fdy-form-grid (CATATAN-FREEDAY §22).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * The grid is `repeat(auto-fit, minmax(14rem, 1fr))`, so any child it does not place becomes a track
 * of its own. Before this a heading, a help line, an app's own row and a card footer each stood as a
 * narrow column beside the fields, which nothing in the classes or the DOM shows. So this measures
 * each box's share of the grid width, the thing a reader actually sees.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = 'file://' + join(HERE, 'fixtures', 'vanilla-form-grid-rows.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('fields share a row; everything that is not a field spans it', { skip }, async () => {
  await withPage(fixture, async (p) => {
    await p.waitFor('document.readyState === "complete" && window.boxes');
    const b = JSON.parse(await p.evalJS('JSON.stringify(window.boxes())'));

    assert.equal(b.f1.top, b.f2.top, `two fields still pair up on one row: ${JSON.stringify(b)}`);
    assert.ok(b.f1.share < 50, `a field is one column, got ${b.f1.share}%`);
    for (const id of ['heading', 'help', 'approw', 'footer', 'full']) {
      assert.ok(b[id].share >= 99, `${id} spans the grid, got ${b[id].share}% of ${b.grid}px`);
    }
    assert.ok(b.cell.share < 50, `a cell wrapped in .fdy-field stays a column, got ${b.cell.share}%`);
  });
});
