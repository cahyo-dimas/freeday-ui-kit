/* Browser regression spec: while a stepper guard is deciding, no other move gets through.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Next from step 2 asks an async guard. A click on step 1's header while it decided went through,
 * because only Next and Back checked the lock (and render() had just re-enabled Back). When the guard
 * then said yes, Next read the NEW position and moved 1 -> 2: a move nobody asked the guard about,
 * while the 2 -> 3 it did approve was lost.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const NEXT = '[data-fdy-step-next]';

test('a step header clicked while the guard decides is ignored, and the approved move is the one made', { skip }, async () => {
  await withPage('file://' + join(HERE, 'fixtures', 'vanilla-stepper-pending.html'), async (p) => {
    await p.waitFor(`document.querySelector('#wiz').dataset.fdyStepperReady === '1' || typeof window.activeIndex === 'function'`);
    await p.clickCenter(NEXT);
    await p.waitFor('window.activeIndex() === 1');

    await p.evalJS(`window.mode = 'async', true`);
    await p.clickCenter(NEXT);
    await p.waitFor('typeof window.settle === "function"');
    await p.clickCenter('.fdy-step:first-child .fdy-step__btn');
    assert.equal(await p.evalJS('window.activeIndex()'), 1, 'the header click is refused while the guard decides');
    assert.equal(await p.evalJS(`document.querySelector('[data-fdy-step-prev]').disabled`), true, 'and Back stays locked');

    await p.evalJS('window.settle(true), true');
    assert.ok(await p.waitFor('window.activeIndex() === 2'), 'the approved 2 -> 3 is the move made');
    assert.deepEqual(await p.evalJS('window.asked'), ['0->1', '1->2']);
  });
});
