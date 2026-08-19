/* Browser regression spec — an input group is the same height as the controls beside it (#018).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * This CANNOT be asserted from the stylesheet, which is why it reached three releases: the CSS
 * reads as correct arithmetic. `.fdy-input-group` declares a 1.5px border and its inner input
 * subtracts 3px, so the border box should land on --control-h. At devicePixelRatio 1 the engine
 * resolves each 1.5px border to 1px, the compensation over-subtracts, and the group renders 1px
 * short of every control beside it. At dpr 2 the halves survive and it is correct — so it is
 * invisible on the retina display it was authored on and visible on every 1x monitor.
 *
 * Only a real layout can catch that. Measured, not read.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('an input group is exactly as tall as the controls beside it (#018)', { skip }, async () => {
  await withPage(fixture('vanilla-control-heights.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    const h = JSON.parse(await p.evalJS('JSON.stringify(window.heights())'));

    assert.equal(h.boxSizing, 'border-box', 'the group must be border-box for its height to mean the border box');
    assert.equal(h.group, h.btn,
      `an input group and a button must agree (dpr ${h.dpr}, border ${h.borderTop}): group ${h.group}px vs button ${h.btn}px`);
    assert.equal(h.group, h.plain, `an input group and a bare input must agree: ${h.group}px vs ${h.plain}px`);
    assert.equal(h.group, h.combo, `an input group and a combo must agree: ${h.group}px vs ${h.combo}px`);

    /* Compact is where a compensation written against one --control-h silently stops matching. */
    assert.equal(h.compactGroup, h.compactBtn,
      `under data-density="compact" too: group ${h.compactGroup}px vs button ${h.compactBtn}px`);
  });
});
