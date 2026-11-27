/* Browser regression specs: the carousel's position and its autoplay. Run via `npm run test:browser`.
 *
 * - Two quick clicks on Next landed on slide 2, not 3: the scroll handler rounded the position of the
 *   smooth scroll still under way and wrote it over the index goTo had just set.
 * - Autoplay restarted on mouseleave while keyboard focus was still inside the carousel.
 * - With reduced motion, autoplay never starts on load, and the first mouseleave started it anyway.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + join(HERE, 'fixtures', 'vanilla-carousel.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ready = (p) => p.waitFor(`document.querySelectorAll('#c .fdy-carousel__dot').length === 4 && typeof window.current === 'function'`);

test('two quick clicks on Next move two slides', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    const at = await p.centerXY('#c .fdy-carousel__arrow--next');
    await p.clickAt(at.x, at.y);
    await p.clickAt(at.x, at.y); // well inside the smooth scroll the first click started
    await sleep(1200);
    assert.equal(await p.evalJS(`window.current('c')`), 2, 'the second click counts from where the first was going');
    const pos = await p.evalJS(`(() => { const v = document.querySelector('#c .fdy-carousel__viewport'); return Math.round(v.scrollLeft / v.clientWidth); })()`);
    assert.equal(pos, 2, 'and the viewport ends on that slide');
  });
});

test('autoplay stays paused after the pointer leaves while focus is still inside', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    await p.evalJS(`document.getElementById('a').focus(), true`);
    await p.hoverCenter('#a .fdy-carousel__viewport');
    await p.hoverCenter('#c .fdy-carousel__viewport');
    const before = await p.evalJS('window.__changes.a');
    await sleep(900);
    assert.equal(await p.evalJS('window.__changes.a'), before, 'a carousel someone is reading by keyboard does not move under them');
  });
});

test('with reduced motion, autoplay never starts, not even after a hover', { skip }, async () => {
  await withPage(URL, async (p) => {
    await p.setReducedMotion(true);
    await p.evalJS('window.stale = true; setTimeout(() => location.reload(), 0); true');
    await p.waitFor('!window.stale && document.readyState === "complete"');
    await ready(p);
    await p.hoverCenter('#a .fdy-carousel__viewport');
    await p.hoverCenter('#c .fdy-carousel__viewport');
    await sleep(900);
    assert.equal(await p.evalJS('window.__changes.a'), 0);
  });
});

/* The other half of the two specs above, without which they would pass for an autoplay that never
   runs at all: untouched, it advances. */
test('autoplay advances while nobody is on the carousel', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    assert.ok(await p.waitFor('window.__changes.a >= 2', { timeout: 3000 }), 'it moves on its own');
  });
});
