/* Browser regression spec — three ways the kit crowded a real screen (#020).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * All three were reported from screenshots of one settlement form, and none is visible in the
 * stylesheet: each is a layout OUTCOME. A control that is width:100% reads as correct until an
 * auto-layout table gives it no width to be 100% of; a display type reads as correct until the
 * string in it is money; a margin-top reads as correct until something follows the block.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('a control in a table column stays usable (#020)', { skip }, async () => {
  await withPage(fixture('vanilla-crowding.html'), async (p) => {
    /* Wait for the GLOBAL, not just readyState: the page eval can otherwise land on a context where
       the fixture script has not run yet. */
    await p.waitFor('document.readyState === "complete" && window.crowding');
    const c = JSON.parse(await p.evalJS('JSON.stringify(window.crowding())'));
    /* Measured at 36px before the floor: a NOTE box too narrow to read what you typed into it. */
    assert.ok(c.noteWidth >= 112, `a NOTE input must keep the 7rem floor, got ${c.noteWidth}px`);
    assert.ok(c.settlingWidth >= 112, `a number input must keep it too, got ${c.settlingWidth}px`);
  });
});

test('money in a stat fits on one line, and wide layouts keep their type (#020)', { skip }, async () => {
  await withPage(fixture('vanilla-crowding.html'), async (p) => {
    /* Wait for the GLOBAL, not just readyState: the page eval can otherwise land on a context where
       the fixture script has not run yet. */
    await p.waitFor('document.readyState === "complete" && window.crowding');
    const c = JSON.parse(await p.evalJS('JSON.stringify(window.crowding())'));
    /* "IDR 300,000.00" needs 224px at --text-3xl; the grid's own track is 11rem. It wrapped
       BETWEEN the currency and the number, which is the worst place a number can break. */
    assert.equal(c.narrowLines, 1, `a stat value must not wrap in a narrow column, got ${c.narrowLines} lines`);
    /* The other half, and the reason this is a clamp and not a smaller token: a dashboard with room
       must keep exactly the display type it has today. */
    assert.equal(c.widePx, '31px', `a wide stat must keep --text-3xl, got ${c.widePx}`);
    assert.equal(c.wideLines, 1, 'and still be one line');
  });
});

test('a file list leaves room for whatever follows it (#020)', { skip }, async () => {
  await withPage(fixture('vanilla-crowding.html'), async (p) => {
    /* Wait for the GLOBAL, not just readyState: the page eval can otherwise land on a context where
       the fixture script has not run yet. */
    await p.waitFor('document.readyState === "complete" && window.crowding');
    const c = JSON.parse(await p.evalJS('JSON.stringify(window.crowding())'));
    /* Measured 0px: the list carried margin-top and nothing below it, so "Add files" sat flush
       against the last row. Asserted as a real gap, not as the presence of a declaration. */
    assert.ok(c.gapFileToButton >= 12,
      `"Add files" must not sit flush against the last file, got ${c.gapFileToButton}px`);
  });
});
