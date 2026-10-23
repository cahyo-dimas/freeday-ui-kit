/* Browser regression spec, a menu marked `.fdy-menu--end` is aligned to its trigger (note 2026-10-23 §2).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * Reported from an app's account menu: parked in the page gutter beside the avatar, it opened
 * 20px further right than the avatar itself and stopped 4px off the screen edge. The stylesheet
 * was never wrong. `.fdy-menu--end` is `left:auto;right:0`, and has been since the class shipped.
 * The enhancer lifts the panel into the top layer and positions it with inline `fixed`
 * coordinates instead, and that path only ever computed `left = trigger.left`, clamping the
 * result to the viewport. So the class held right up to the moment the menu opened.
 *
 * Only a real browser can tell this apart, for two reasons. The fault is a COORDINATE, so every
 * assertion here is a measured edge rather than a class or a declaration. And the CSS rule would
 * right-align the panel on its own: a right edge that lines up proves nothing unless the panel is
 * also in the top layer, positioned inline, which is what the fixture reports alongside the rects.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const GAP = 4; // freeday-popover.js, the breathing room it keeps against trigger and viewport
const GUTTER = 24; // .bar's padding in the fixture, the distance the fault was visible across

/* The panel animates in (translateY(-4px) → none). Vertical only, so it cannot move a left or a
 * right edge, but measuring a box that is still moving is how a spec starts failing once a
 * fortnight, so the reading waits for it to settle regardless. */
const settled = (wrapId) => `(function () {
  var p = document.getElementById(${JSON.stringify(wrapId)}).querySelector('.fdy-menu');
  var running = p.getAnimations ? p.getAnimations() : [];
  for (var i = 0; i < running.length; i++) if (running[i].playState === 'running') return false;
  return true;
})()`;

async function openAndMeasure(p, wrapId, triggerSel) {
  await p.clickCenter(triggerSel);
  assert.equal(await p.waitFor(settled(wrapId)), true, `${wrapId}: the panel never stopped animating`);
  const box = JSON.parse(await p.evalJS(`JSON.stringify(window.menuBox(${JSON.stringify(wrapId)}))`));
  assert.equal(box.popoverOpen, true,
    `${wrapId}: the panel must be in the top layer, or this measures the stylesheet instead of the enhancer`);
  assert.equal(box.position, 'fixed',
    `${wrapId}: the panel must be positioned by the enhancer's inline coordinates`);
  assert.notEqual(box.inlineLeft, '',
    `${wrapId}: the enhancer must have written a left coordinate, that is the value under test`);
  return box;
}

test('a .fdy-menu--end panel lines its right edge up with the trigger (note 2026-10-23 §2)', { skip }, async () => {
  await withPage(fixture('vanilla-menu-align.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayMenu && window.menuBox');

    const end = await openAndMeasure(p, 'wEnd', '#tEnd');
    /* The fixture has to pose the question: a panel no wider than its trigger would land on both
       edges at once and the two alignments would be indistinguishable. */
    assert.ok(end.panel.width > end.trigger.width + GUTTER,
      `the fixture's panel must be wider than the trigger plus its gutter, got ${end.panel.width} against ${end.trigger.width}`);

    /* The claim, in one coordinate. Rounded to whole pixels by the enhancer, so a pixel of slack
       is the sub-pixel trigger rect, not a misalignment. */
    assert.ok(Math.abs(end.panel.right - end.trigger.right) <= 1,
      `the panel's right edge must sit on the trigger's right edge, got ${end.panel.right} against ${end.trigger.right}`);

    /* And the symptom as it was reported, which the coordinate above does not state by itself:
       the gutter survives. Before the fix this was `vw - 4` whatever the gutter was. */
    assert.ok(end.vw - end.panel.right >= GUTTER - 1,
      `the panel must keep the page's gutter, got ${end.vw - end.panel.right}px to the viewport edge of ${GUTTER}px`);

    /* The control, in the same page and the same code path: a menu WITHOUT the modifier still
       hangs off its trigger's left edge. A fix that right-aligns every menu would pass the three
       assertions above and silently move every other menu in the kit. */
    const start = await openAndMeasure(p, 'wStart', '#tStart');
    assert.ok(Math.abs(start.panel.left - start.trigger.left) <= 1,
      `an unmodified menu must keep its left edge on the trigger's left edge, got ${start.panel.left} against ${start.trigger.left}`);
  });
});

test('right-aligning never pushes a menu off the left edge (note 2026-10-23 §2)', { skip }, async () => {
  await withPage(fixture('vanilla-menu-align.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayMenu && window.menuBox');
    /* A phone's width, with the trigger against the left edge: the trigger's right edge minus the
       panel's width is a NEGATIVE left, so an alignment that does not clamp trades the reported
       overflow for one on the opposite edge. */
    await p.setViewport(360, 640);

    const edge = await openAndMeasure(p, 'wEdge', '#tEdge');
    assert.ok(edge.trigger.right - edge.panel.width < 0,
      `the fixture must actually ask for a negative left, got ${edge.trigger.right - edge.panel.width}`);

    assert.ok(edge.panel.left >= GAP - 1,
      `the panel must stay inside the left edge, got left ${edge.panel.left}`);
    assert.ok(edge.panel.right <= edge.vw - GAP + 1,
      `and inside the right edge, got right ${edge.panel.right} in a viewport of ${edge.vw}`);
  });
});
