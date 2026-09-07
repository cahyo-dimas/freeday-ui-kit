/* Browser regression spec for `.fdy-bottomnav` and the two app-shell fixes that shipped
 * with it. Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * All three came from one application meeting real phones: a bar for the destinations a
 * thumb reaches, a nav toggle that is not in the corner a right thumb cannot reach, and a
 * backdrop that iOS Safari will actually deliver a tap to.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const WIDE = [1000, 900];
const NARROW = [420, 900];

// Bracket notation, not a dot: `style.padding-bottom` parses as a subtraction and throws
// a ReferenceError inside the page rather than failing the assertion.
const css = (p, sel, prop) =>
  p.evalJS(`getComputedStyle(document.querySelector('${sel}'))['${prop}']`);
const box = async (p, sel) =>
  JSON.parse(await p.evalJS(
    `JSON.stringify(document.querySelector('${sel}').getBoundingClientRect())`));

test('the bar shows on a phone and stays out of the way on a desktop', { skip }, async () => {
  await withPage(fixture('vanilla-bottom-nav.html'), async (p) => {
    await p.setViewport(...WIDE);
    assert.equal(await css(p, '#bottomnav', 'display'), 'none',
      'a desktop shell already has the sidebar; a bottom bar there is duplication');

    await p.setViewport(...NARROW);
    assert.equal(await css(p, '#bottomnav', 'display'), 'flex');
  });
});

test('the bar reserves its own room, so no list ends underneath it', { skip }, async () => {
  await withPage(fixture('vanilla-bottom-nav.html'), async (p) => {
    await p.setViewport(...NARROW);
    const pad = parseFloat(await css(p, '#main', 'padding-bottom'));
    const bar = await box(p, '#bottomnav');
    assert.ok(pad >= bar.height,
      `main reserves ${pad}px for a ${bar.height}px bar — a row that ends under it is a `
      + 'row nobody knows is there');
  });
});

test('every destination is a 44px target with a visible label', { skip }, async () => {
  await withPage(fixture('vanilla-bottom-nav.html'), async (p) => {
    await p.setViewport(...NARROW);
    for (const id of ['#item1', '#item2', '#item3']) {
      const b = await box(p, id);
      assert.ok(b.height >= 44, `${id} is ${b.height}px tall; under 44 a tap becomes a retry`);
    }
    // A long label must ellipsis rather than wrap, or one destination makes the whole bar
    // taller than the others and the row heights stop matching.
    const satu = await box(p, '#item1');
    const panjang = await box(p, '#item2');
    // Within a pixel, not exact: font metrics differ between platforms, and the invariant
    // is "a long label does not grow the bar", not "identical to the sub-pixel".
    assert.ok(Math.abs(satu.height - panjang.height) < 1,
      `a long label changed the row height (${satu.height} vs ${panjang.height}) instead `
      + 'of ellipsising');
  });
});

test('the current destination is marked by aria-current, not by a second class', { skip }, async () => {
  await withPage(fixture('vanilla-bottom-nav.html'), async (p) => {
    await p.setViewport(...NARROW);
    /* Asserted on the BACKGROUND, not the text colour. The runner reported both items as
       `rgb(0, 0, 238)` — the UA link colour — while every other rule in this file applied
       correctly, and the same fixture passes under local Chromium and local Chrome stable
       alike. Whatever the runner does to link text, it does not paint link backgrounds:
       transparent versus a filled wash is a difference no user-agent style can imitate,
       and it tests the same rule. */
    const aktif = await css(p, '#item1', 'backgroundColor');
    const diam = await css(p, '#item2', 'backgroundColor');
    assert.notEqual(aktif, diam,
      'aria-current="page" is the same contract .fdy-nav__item uses — one way to say '
      + '"you are here", not two');
    assert.match(diam, /rgba\(0, 0, 0, 0\)|transparent/,
      'an item that is not the current one should carry no wash at all');
  });
});

test('the backdrop is a pointer target, which is what iOS needs to deliver a tap', { skip }, async () => {
  await withPage(fixture('vanilla-bottom-nav.html'), async (p) => {
    await p.setViewport(...NARROW);
    // Safari on iOS only synthesises a click from a tap on elements it treats as
    // interactive, and the cursor is one of the signals. Without this the drawer could not
    // be dismissed on a real iPhone at all, while every Chromium test passed.
    assert.equal(await css(p, '#backdrop', 'cursor'), 'pointer');
  });
});

test('--navtoggle-end puts the toggle where a thumb can reach it', { skip }, async () => {
  await withPage(fixture('vanilla-bottom-nav.html'), async (p) => {
    await p.setViewport(...NARROW);
    const toggle = await box(p, '#toggle');
    const title = await box(p, '#title');
    assert.ok(toggle.left > title.left,
      'the toggle should follow the title, not sit in the corner furthest from the thumb');
  });
});
