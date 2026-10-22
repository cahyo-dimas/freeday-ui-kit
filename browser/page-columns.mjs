/* Browser regression specs: document columns with side rails (#065).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Grid tracks chosen by :has() over which rails are present, the stacking order below md, and the
 * sticky, self-scrolling rails above it. All of it is layout an engine computes, at a given width.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + join(HERE, 'fixtures', 'vanilla-page-columns.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const READY = `document.readyState === 'complete' && !!document.getElementById('aside')`;

const box = (p, id) => p.evalJS(`JSON.stringify(document.getElementById('${id}').getBoundingClientRect())`).then(JSON.parse);
const drop = (p, id) => p.evalJS(`document.getElementById('${id}').remove()`);

test('three rails at lg: 3 / 6 / 3, in DOM order', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.setViewport(1400, 900);
    await p.waitFor(READY);
    const [lead, main, aside] = [await box(p, 'lead'), await box(p, 'main'), await box(p, 'aside')];
    assert.ok(lead.left < main.left && main.left < aside.left, 'lead, main, aside left to right');
    assert.ok(Math.abs(lead.width - aside.width) < 4, 'the rails are the same width');
    assert.ok(main.width > lead.width * 1.8 && main.width < lead.width * 2.4, `main is about twice a rail, got ${main.width} vs ${lead.width}`);
  });
});

test('one rail at md: 8 / 4 for an aside, 3 / 9 for a lead', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.setViewport(1100, 900);
    await p.waitFor(READY);
    await drop(p, 'lead');
    const [main, aside] = [await box(p, 'main'), await box(p, 'aside')];
    // A rail's box starts --space-1 early: padding taken back by margin, room for a focus ring.
    assert.ok(main.left < aside.left && Math.abs(main.top - aside.top) <= 5, 'aside beside main');
    assert.ok(main.width > aside.width * 1.7, `main takes two thirds, got ${main.width} vs ${aside.width}`);
  });
  await withPage(PAGE, async (p) => {
    await p.setViewport(1100, 900);
    await p.waitFor(READY);
    await drop(p, 'aside');
    const [lead, main] = [await box(p, 'lead'), await box(p, 'main')];
    assert.ok(lead.left < main.left, 'lead before main');
    assert.ok(main.width > lead.width * 2.5, `main takes three quarters, got ${main.width} vs ${lead.width}`);
  });
});

test('both rails between md and lg share the left column, under each other, not under main', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.setViewport(1100, 900);
    await p.waitFor(READY);
    const [lead, main, aside] = [await box(p, 'lead'), await box(p, 'main'), await box(p, 'aside')];
    assert.ok(Math.abs(lead.left - aside.left) < 2 && aside.top > lead.top, 'the aside sits under the lead');
    assert.ok(aside.top < main.bottom - 1000, 'right under it, not after the end of a 3000px main column');
    assert.equal(await p.evalJS(`getComputedStyle(document.getElementById('aside')).position`), 'static',
      'two sticky rails in one column would slide over each other');
  });
});

test('stacked below md, the summary rail comes first', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.setViewport(700, 900);
    await p.waitFor(READY);
    const [lead, main, aside] = [await box(p, 'lead'), await box(p, 'main'), await box(p, 'aside')];
    assert.ok(Math.abs(main.left - aside.left) < 2, 'one column');
    assert.ok(aside.top < lead.top && lead.top < main.top, 'summary, then identity, then the sections');
  });
});

test('at lg a rail stays in view as the page scrolls, and a tall rail scrolls itself', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.setViewport(1400, 900);
    await p.waitFor(READY);
    await p.evalJS('window.scrollTo(0, 1500)');
    await p.waitFor('window.scrollY >= 1400');
    const aside = await box(p, 'aside');
    assert.ok(aside.top >= 0 && aside.top < 40, `the summary rail is still at the top of the screen, got ${aside.top}`);
    assert.ok(aside.bottom <= 900, 'and ends inside the screen instead of hanging off it');
    assert.equal(await p.evalJS(`(() => { const a = document.getElementById('aside'); return a.scrollHeight > a.clientHeight; })()`), true,
      'its overflow scrolls inside the rail');
  });
});
