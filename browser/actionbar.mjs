/* Browser regression spec for `.fdy-actionbar` (pure CSS). Run via `npm run test:browser`.
 * A bar of actions pinned to the bottom of a phone screen: above the bottom nav when the shell
 * has one, at the viewport's edge otherwise, and never covering the last row of content. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const box = async (p, sel) => JSON.parse(await p.evalJS(
  `JSON.stringify(document.querySelector('${sel}').getBoundingClientRect())`));

const PHONE = [390, 800];
const DESKTOP = [1000, 800];

test('on a phone the bar sits directly above the bottom nav', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    const bar = await box(p, '#bar');
    const nav = await box(p, '#nav');
    assert.ok(Math.abs(nav.top - bar.bottom) <= 0.01,
      `the bar ends at ${bar.bottom}px and the nav starts at ${nav.top}px: the nav must be sized by --fdy-bottomnav-h, the value the bar rests on`);
  });
});

test('scrolled to the end, the last row is above the bar', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...PHONE);
    await p.evalJS('window.scrollTo(0, document.documentElement.scrollHeight)');
    await p.evalJS('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
    const row = await box(p, '#row40');
    const bar = await box(p, '#bar');
    assert.ok(row.bottom <= bar.top + 0.5, `the last row ends at ${row.bottom}px under the bar at ${bar.top}px`);
  });
});

test('on a desktop the bar sits at the viewport edge, and its buttons share the width', { skip }, async () => {
  await withPage(fixture('vanilla-actionbar.html'), async (p) => {
    await p.setViewport(...DESKTOP);
    const bar = await box(p, '#bar');
    assert.ok(Math.abs(bar.bottom - DESKTOP[1]) <= 0.5, `the bar ends at ${bar.bottom}px, the viewport at ${DESKTOP[1]}px`);
    const b1 = await box(p, '#b1');
    const b2 = await box(p, '#b2');
    assert.ok(Math.abs(b1.width - b2.width) <= 1, `buttons ${b1.width}px and ${b2.width}px should share the bar`);
  });
});
