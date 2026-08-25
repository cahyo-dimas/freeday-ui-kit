/* Browser regression spec, a card whose whole surface is one button's hit area.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips without
 * Chrome.
 *
 * The pattern is a pseudo-element overlay on the primary control. It cannot be hand-rolled on a
 * `.fdy-btn`, because the button nudges itself with a transform on :hover/:active and a transformed
 * element becomes the containing block for its own absolutely positioned descendants, so the
 * overlay re-anchors from the card to the button's own box mid-gesture, mousedown and mouseup land
 * on different elements, and the browser fires `click` on their common ancestor. The button never
 * gets one, and the card looks exactly as clickable as before.
 *
 * That is only reachable with a REAL press: a synthetic .click() never enters :active, so it passes
 * against the broken CSS.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('the stretched target receives clicks from anywhere on the card', { skip }, async () => {
  await withPage(fixture('vanilla-card-stretch.html'), async (p) => {
    await p.waitFor('typeof window.hitAt === "function"');

    // The overlay really covers the card: a point over the title hit-tests to the button.
    assert.equal(await p.evalJS('window.hitAt("#title")'), 'open',
      'the title area must hit-test to the stretched button, not to the text');

    await p.clickCenter('#title');
    let clicks = JSON.parse(await p.evalJS('JSON.stringify(window.clicks)'));
    assert.ok(clicks.includes('open'),
      `a real press on the card body must reach the button, got ${JSON.stringify(clicks)}`);
    assert.ok(clicks.includes('target:open'),
      `the click must be dispatched ON the button, not on a common ancestor, got ${JSON.stringify(clicks)}`);

    // Same again on the description: the whole surface, not just one element.
    await p.evalJS('window.reset()');
    await p.clickCenter('#desc');
    clicks = JSON.parse(await p.evalJS('JSON.stringify(window.clicks)'));
    assert.ok(clicks.includes('open'), `the description area is part of the hit area too, got ${JSON.stringify(clicks)}`);
  });
});

test('the escape hatch keeps its own click', { skip }, async () => {
  await withPage(fixture('vanilla-card-stretch.html'), async (p) => {
    await p.waitFor('typeof window.hitAt === "function"');

    assert.equal(await p.evalJS('window.hitAt("#details")'), 'details',
      'the secondary button must sit above the overlay');

    await p.clickCenter('#details');
    let clicks = JSON.parse(await p.evalJS('JSON.stringify(window.clicks)'));
    assert.ok(clicks.includes('details'), `the secondary action must fire, got ${JSON.stringify(clicks)}`);
    assert.ok(!clicks.includes('open'),
      `and the primary must NOT, a card that opens while you press "Details" is the same silent bug, got ${JSON.stringify(clicks)}`);

    /* A link in the card BODY, not in the flex footer. z-index applies to flex items without a
       position, so the footer button would pass even with the position default missing, this is the
       case that actually needs it. */
    await p.evalJS('window.reset()');
    assert.equal(await p.evalJS('window.hitAt("#policy")'), 'policy', 'a link in the body must sit above the overlay');
    await p.clickCenter('#policy');
    clicks = JSON.parse(await p.evalJS('JSON.stringify(window.clicks)'));
    assert.ok(clicks.includes('policy') && !clicks.includes('open'),
      `an inline link keeps its own click, got ${JSON.stringify(clicks)}`);
  });
});

test('the kit does not outweigh a control the app positions itself', { skip }, async () => {
  await withPage(fixture('vanilla-card-stretch.html'), async (p) => {
    await p.waitFor('typeof window.hitAt === "function"');

    /* Raising the escape hatches needs `position`, but as a DEFAULT, never as an override. At normal
       specificity the kit beat the app's own single-class rule and dragged an absolutely positioned
       corner dismiss back into the flow: still clickable, in the wrong place. Hence :where(). */
    const box = JSON.parse(await p.evalJS('JSON.stringify(window.boxOf("dismiss"))'));
    assert.equal(box.position, 'absolute', "the app's own positioning must win, the kit only supplies a default");
    assert.equal(box.zIndex, '1', 'and it still has to be raised above the overlay');
    assert.ok(box.fromRight < 16, `it must stay pinned to the corner, sits ${box.fromRight}px from the right edge`);

    await p.evalJS('window.reset()');
    await p.clickCenter('#dismiss');
    const clicks = JSON.parse(await p.evalJS('JSON.stringify(window.clicks)'));
    assert.ok(clicks.includes('dismiss') && !clicks.includes('open'),
      `a pinned control keeps its own click, got ${JSON.stringify(clicks)}`);
  });
});

test('a list row anchors its own stretched target (#008 §1)', { skip }, async () => {
  await withPage(fixture('vanilla-card-stretch.html'), async (p) => {
    await p.waitFor('typeof window.hitAt === "function"');

    /* Row ONE is the assert that matters. With the overlay resolving against .fdy-list instead of the
       row, BOTH rows hit-test to the LAST row's target, so a test that only checked row two passes
       against the bug. (It did, when I first measured it.) */
    assert.equal(await p.evalJS('window.hitAt("#r1")'), 'open1', 'row one must belong to row one');
    assert.equal(await p.evalJS('window.hitAt("#r2")'), 'open2', 'row two must belong to row two');

    await p.evalJS('window.reset()');
    await p.clickCenter('#r1');
    let clicks = JSON.parse(await p.evalJS('JSON.stringify(window.clicks)'));
    assert.ok(clicks.includes('open1') && !clicks.includes('open2'),
      `pressing row one must open row one, got ${JSON.stringify(clicks)}`);

    // The escape hatch is raised inside a row too, the raise rule now lists both hosts.
    await p.evalJS('window.reset()');
    await p.clickCenter('#det1');
    clicks = JSON.parse(await p.evalJS('JSON.stringify(window.clicks)'));
    assert.ok(clicks.includes('det1') && !clicks.includes('open1'),
      `a row's escape hatch keeps its own click, got ${JSON.stringify(clicks)}`);
  });
});
