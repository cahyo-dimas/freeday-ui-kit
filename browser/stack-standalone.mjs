/* Browser regression spec, the stacked button group (CATATAN-FREEDAY §18) and the standalone frame.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * Both are layout, so both are measured at phone size. The stack has to be one joined column with
 * the row's corner rules fully undone, which a structural check cannot see. The frame has to centre
 * a short panel and, more importantly, NOT centre one taller than the screen: centring would push
 * the first field of a sign-in form off the top edge on a phone with its keyboard up.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const json = async (p, expr) => JSON.parse(await p.evalJS(`JSON.stringify(${expr})`));

test('a stacked group is one joined, full-width column, rounded only at its two ends', { skip }, async () => {
  await withPage(fixture('vanilla-btn-stack.html'), async (p) => {
    await p.setViewport(375, 667);
    await p.waitFor('typeof window.measureGroup === "function"');
    const b = await json(p, 'window.measureGroup("three")');
    for (const [i, btn] of b.entries()) {
      assert.equal(btn.width, btn.groupWidth, `button ${i} spans the group (${btn.width} of ${btn.groupWidth})`);
      assert.equal(btn.left, 0, `button ${i} starts at the group's edge`);
      assert.ok(btn.textLeft <= btn.padLeft + btn.bw + 1, `button ${i}'s label starts at its padding, not centred (${btn.textLeft}px in)`);
    }
    assert.ok(Math.abs(b[1].top - (b[0].bottom - b[0].bw)) < 0.5, 'the second sits under the first, borders shared');
    assert.ok(Math.abs(b[2].top - (b[1].bottom - b[1].bw)) < 0.5, 'and the third under the second');
    assert.deepEqual(b.map((x) => x.corners), ['1100', '0000', '0011'],
      'corners [top-left, top-right, bottom-right, bottom-left]: top pair on the first, bottom pair on the last');
    assert.deepEqual((await json(p, 'window.measureGroup("one")')).map((x) => x.corners), ['1111'],
      'a group of one keeps all four');
  });
});

test('the standalone frame centres a short panel and keeps the gutter on a phone', { skip }, async () => {
  await withPage(fixture('vanilla-standalone.html'), async (p) => {
    await p.setViewport(375, 667);
    await p.waitFor('typeof window.measure === "function"');
    const m = await json(p, 'window.measure()');
    assert.ok(m.frameHeight >= m.vh, `the frame fills the screen (${m.frameHeight} of ${m.vh})`);
    assert.ok(Math.abs(m.top - m.bottom) <= 1, `centred vertically: ${m.top} above, ${m.bottom} below`);
    assert.equal(m.left, 16, 'the page gutter on the left');
    assert.equal(m.right, 16, 'and on the right');

    await p.setViewport(1280, 800);
    const wide = await json(p, 'window.measure()');
    assert.equal(wide.width, 416, 'on a wide screen the panel stops at 26rem');
    assert.ok(Math.abs(wide.left - wide.right) <= 1, 'centred horizontally');
  });
});

test('a panel taller than the screen starts at the top and the page scrolls', { skip }, async () => {
  await withPage(fixture('vanilla-standalone.html'), async (p) => {
    await p.setViewport(375, 667);
    await p.waitFor('typeof window.measure === "function"');
    await p.evalJS('window.makeTall()');
    const m = await json(p, 'window.measure()');
    assert.equal(m.top, 32, `the panel's top stays at the frame's padding, never above the screen (got ${m.top})`);
    assert.ok(m.scrollHeight > m.vh, 'and the page, not the panel, takes the overflow');
  });
});
