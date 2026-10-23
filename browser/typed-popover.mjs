/* Browser regression specs for the TYPED popover path, `adapters/vue/usePopover.ts` and
 * `adapters/react/usePopover.ts` (note 2026-10-23 §3). Run via `npm run test:browser`; NOT part of
 * the default `node --test` gate. Auto-skips without Chrome.
 *
 * Two faults, measured apart, both of them living in the copy of the positioning algorithm each
 * adapter keeps for itself.
 *
 * PART A is #079 a second time. 3.8.0 fixed the vanilla `place()`, which read the trigger's rect
 * before taking the panel out of the flow: a freshly shown panel is in the top layer while still
 * carrying `position:absolute` and `top:calc(100% + …)` from its component's stylesheet, because an
 * author rule outranks the popover UA style, and in the top layer that `100%` is the viewport's
 * height. The panel sits a viewport down the page, the document's overflow grows to match, and
 * where scrollbars take layout space the document gains one, `documentElement.clientWidth` drops by
 * its width and the page relays out that much narrower. The rect read in that instant belongs to a
 * layout the next three lines undo. Both adapters still read the rect first, so the fix never
 * reached the ten typed components that use them. The premise is measured here before the
 * misplacement is, because the typed path is a different stylesheet and an analogy is not evidence.
 *
 * PART B is the alignment the typed path never had. `place()` in the raw path takes
 * `align: 'start' | 'end'`; `usePopover` took no options at all, so every typed panel hung off its
 * trigger's LEFT edge and the viewport clamp caught whatever ran off the screen. `FdyTableFilter`
 * is the case that made it matter: its funnel lives in a column header, and in the rightmost
 * column (right-aligned, the usual amount column) a 200px panel cannot fit to the right of it, so
 * the clamp parked the panel 4px off the screen edge instead of under the funnel. Same symptom
 * class as #074.
 *
 * Every assertion is a measured COORDINATE, never a class or a declaration: the faults are
 * coordinates, and `.fdy-filter` is also a stylesheet rule, so an edge that lines up proves nothing
 * unless the panel is in the top layer and positioned by the adapter's inline values.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const GAP = 4; // usePopover's breathing room against trigger and viewport
const GUTTER = 24; // `.page`'s padding in the fixture, the distance the panel must keep

const COMBO = { panel: '.fdy-combo__listbox', trigger: '.fdy-combo__button' };
const LAST_FILTER = { panel: 'thead th:last-child .fdy-filter', trigger: 'thead th:last-child .fdy-table__filterbtn' };
const FIRST_FILTER = { panel: 'thead th:first-child .fdy-filter', trigger: 'thead th:first-child .fdy-table__filterbtn' };

const FRAMEWORKS = [
  ['Vue', 'vue-popover-align.html'],
  ['React', 'react-popover-align.html'],
];

before(async () => {
  if (skip === false) await buildEntries();
});

const arg = (value) => JSON.stringify(value);

async function ready(p) {
  assert.equal(
    await p.waitFor('document.readyState === "complete" && window.__box && document.querySelector(".fdy-combo__button") && document.querySelector("thead th:last-child .fdy-table__filterbtn")'),
    true,
    'the fixture never mounted its combo and its table',
  );
}

async function openAndMeasure(p, target, what) {
  await p.clickCenter(target.trigger);
  assert.equal(await p.waitFor(`window.__settled(${arg(target.panel)})`), true, `${what}: the panel never stopped animating`);
  const box = JSON.parse(await p.evalJS(`JSON.stringify(window.__box(${arg(target.panel)}, ${arg(target.trigger)}))`));
  assert.equal(box.popoverOpen, true,
    `${what}: the panel must be in the top layer, or this measures the stylesheet instead of the adapter`);
  assert.equal(box.position, 'fixed',
    `${what}: the panel must be positioned by the adapter's inline coordinates`);
  assert.notEqual(box.inlineLeft, '',
    `${what}: the adapter must have written a left coordinate, that is the value under test`);
  return box;
}

/* PART A ------------------------------------------------------------------------------------- */

for (const [name, file] of FRAMEWORKS) {
  test(`${name}: a typed dropdown lands on its trigger where scrollbars take layout space (#079)`, { skip }, async () => {
    await withPage(fixture(file), async (p) => {
      await ready(p);

      const cond = JSON.parse(await p.evalJS('JSON.stringify(window.__classicScrollbars())'));
      /* The condition, measured. Without this the spec would pass on an engine with overlay
         scrollbars while proving nothing, which is the state the typed path was already in. */
      assert.ok(cond.scrollbarWidth > 0,
        'this engine must give scrollbars layout width, or the condition under test is absent');
      /* And the fault has to be the TRANSIENT one. A page with a permanent scrollbar was always
         placed correctly: trigger and viewport agree at every instant, nothing stale to read. */
      assert.equal(cond.clientWidth, cond.innerWidth,
        'the page must have no scrollbar at rest, or the measurement below is not the reported fault');

      /* The premise of #079 in the TYPED path, as numbers rather than as an analogy with the raw
         one. Taken with the component still closed, so no watcher and no effect has run and the
         panel carries exactly what its stylesheet gives it. */
      const pre = JSON.parse(await p.evalJS(`JSON.stringify(window.__beforePlace(${arg(COMBO.panel)}, ${arg(COMBO.trigger)}))`));
      assert.equal(pre.inlineTop, '',
        'the probe must run before the adapter has written any coordinate, or it measures the fix');
      assert.equal(pre.position, 'absolute',
        'the typed panel must still be position:absolute when place() is entered, that is the premise');
      assert.ok(pre.panelTop >= pre.viewportHeight,
        `and its top:calc(100% + …) must resolve against the viewport, got top ${pre.panelTop} in a viewport of ${pre.viewportHeight}`);
      assert.ok(pre.scrollHeightShown > pre.scrollHeightAtRest,
        `the document must actually grow, got scrollHeight ${pre.scrollHeightShown} against ${pre.scrollHeightAtRest} at rest`);
      assert.equal(pre.clientWidthShown, pre.clientWidthAtRest - cond.scrollbarWidth,
        `and the viewport must narrow by the scrollbar, got ${pre.clientWidthShown} against ${pre.clientWidthAtRest} at rest`);
      /* The stale rect itself: this is the number place() reads, and it is wrong by a scrollbar. */
      assert.equal(Math.round(pre.triggerLeftAtRest - pre.triggerLeftShown), cond.scrollbarWidth,
        `the trigger must move by the scrollbar's width while the panel drags the document, got `
          + `${pre.triggerLeftShown} against ${pre.triggerLeftAtRest} at rest`);

      const box = await openAndMeasure(p, COMBO, 'combo');
      assert.ok(Math.abs(box.panel.left - box.trigger.left) <= 1,
        `the panel must land on its trigger's left edge with a ${cond.scrollbarWidth}px scrollbar in play, `
          + `got ${box.panel.left} against ${box.trigger.left}. a gap of about ${cond.scrollbarWidth}px means the `
          + 'trigger was measured while the panel was still dragging the document');
      /* The vertical axis comes off the same rect, so it drifts with it. */
      assert.ok(Math.abs(box.panel.top - (box.trigger.bottom + GAP)) <= 1,
        `and ${GAP}px below it, got top ${box.panel.top} against a trigger bottom of ${box.trigger.bottom}`);
    });
  });
}

test('the filter panel is already position:fixed, so #079 never reached it (note 2026-10-23 §3)', { skip }, async () => {
  /* The finding that kept Part A from being applied by analogy. `.fdy-filter` is `position:fixed`
     in table.css, unlike every other kit panel, so a freshly shown filter panel does not resolve a
     `top:calc(100% + …)` against the viewport and does not drag the document. The misplacement
     above cannot happen here, and this spec is what will say so if that stylesheet ever changes. */
  await withPage(fixture('vue-popover-align.html'), async (p) => {
    await ready(p);
    const cond = JSON.parse(await p.evalJS('JSON.stringify(window.__classicScrollbars())'));
    assert.ok(cond.scrollbarWidth > 0, 'this engine must give scrollbars layout width');

    const pre = JSON.parse(await p.evalJS(`JSON.stringify(window.__beforePlace(${arg(LAST_FILTER.panel)}, ${arg(LAST_FILTER.trigger)}))`));
    assert.equal(pre.position, 'fixed', 'the filter panel is fixed by its own stylesheet, not absolute');
    assert.equal(pre.scrollHeightShown, pre.scrollHeightAtRest,
      `so showing it must not grow the document, got scrollHeight ${pre.scrollHeightShown} against ${pre.scrollHeightAtRest}`);
    assert.equal(pre.clientWidthShown, pre.clientWidthAtRest,
      'and must not narrow the viewport');
    assert.equal(pre.triggerLeftShown, pre.triggerLeftAtRest,
      'and must not move the funnel it is measured against');
  });
});

/* PART B ------------------------------------------------------------------------------------- */

for (const [name, file] of FRAMEWORKS) {
  test(`${name}: a column filter in the rightmost column lines its right edge up with the funnel`, { skip }, async () => {
    await withPage(fixture(file), async (p) => {
      await ready(p);

      const box = await openAndMeasure(p, LAST_FILTER, 'last column filter');
      /* The fixture has to pose the question. A panel that fits to the right of its funnel would
         land on both edges at once and the two alignments would be indistinguishable. */
      assert.ok(box.trigger.left + box.panel.width > box.vw - GAP,
        `the fixture's panel must not fit to the right of the funnel, got a ${box.panel.width}px panel at `
          + `${box.trigger.left} in a viewport of ${box.vw}`);

      /* The claim, in one coordinate. Rounded to whole pixels by the adapter, so a pixel of slack
         is the sub-pixel trigger rect, not a misalignment. */
      assert.ok(Math.abs(box.panel.right - box.trigger.right) <= 1,
        `the panel's right edge must sit on the funnel's right edge, got ${box.panel.right} against ${box.trigger.right}`);

      /* And the symptom as it was reported, which the coordinate above does not state by itself:
         the page's gutter survives. Before the fix this was `vw - 4` whatever the gutter was. */
      assert.ok(box.vw - box.panel.right >= GUTTER - 1,
        `the panel must keep the page's gutter, got ${box.vw - box.panel.right}px to the viewport edge of ${GUTTER}px`);

      /* The control, same page and same code path: the combo still hangs off its trigger's LEFT
         edge. An alignment applied to every typed panel would pass the assertions above and
         silently move five other components. */
      const combo = await openAndMeasure(p, COMBO, 'combo');
      assert.ok(Math.abs(combo.panel.left - combo.trigger.left) <= 1,
        `a combo listbox must keep its left edge on its trigger's left edge, got ${combo.panel.left} against ${combo.trigger.left}`);
    });
  });

  test(`${name}: right-aligning never pushes a filter panel off the left edge`, { skip }, async () => {
    await withPage(fixture(file), async (p) => {
      await ready(p);
      /* A phone's width, with the funnel in the FIRST column: the funnel's right edge minus the
         panel's width is a negative left, so an alignment that clamps only one side trades the
         reported overflow for one on the opposite edge. */
      await p.setViewport(360, 640);

      const box = await openAndMeasure(p, FIRST_FILTER, 'first column filter');
      assert.ok(box.trigger.right - box.panel.width < 0,
        `the fixture must actually ask for a negative left, got ${box.trigger.right - box.panel.width}`);
      assert.ok(box.panel.left >= GAP - 1,
        `the panel must stay inside the left edge, got left ${box.panel.left}`);
      assert.ok(box.panel.right <= box.vw - GAP + 1,
        `and inside the right edge, got right ${box.panel.right} in a viewport of ${box.vw}`);
    });
  });
}
