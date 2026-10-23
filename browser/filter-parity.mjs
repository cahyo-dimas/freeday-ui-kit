/* Browser regression spec, the column filter panel behaves the same on the raw and the typed path
 * (note 2026-10-23 §3, part two). Run via `npm run test:browser`; NOT part of the default
 * `node --test` gate. Auto-skips without Chrome.
 *
 * 3.9.0 gave the typed path an `align` and `FdyTableFilter` asked for `'end'`, which fixed the
 * funnel panel in a rightmost column and split the two paths apart: `src/freeday-table.js` carried
 * a FOURTH copy of the positioning arithmetic, one that nothing else in the kit used. It parked the
 * panel on `<body>`, kept an 8px margin where the kit's gap is 4, measured against
 * `window.innerWidth` (which counts a classic scrollbar the layout no longer has), aligned the left
 * edges only, and never reached the top layer. So the same component in the same column opened
 * differently depending on which path rendered it, which is the one thing the kit promises it does
 * not do.
 *
 * Every assertion is a measured COORDINATE or a measured WIDTH, never a class or a declaration:
 * `.fdy-filter` is a stylesheet rule as well as a panel, so an edge that lines up proves nothing
 * unless the panel is also in the top layer and positioned by inline values.
 *
 * The modal spec at the bottom is the part no coordinate can state. `showModal()` makes everything
 * outside the dialog's subtree inert, so the panel's home decided whether a filter in a table
 * inside a modal could be typed into at all, and on the raw path it could not.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const GAP = 4; // freeday-popover.js, the breathing room it keeps against trigger and viewport
const GUTTER = 24; // `.page`'s padding in the fixtures, the distance the panel must keep

/* `.fdy-filter` asks for `min-width:14rem`, in px at the page's own root font size. Read off the
   page rather than written here, so the number cannot drift away from the stylesheet. */
const MIN_WIDTH = '(14 * parseFloat(getComputedStyle(document.documentElement).fontSize))';

/* The raw panel is matched wherever it lives, not where it ought to live: a selector pinned to the
   <th> would have failed with "no element" before the fix instead of with the coordinates that say
   what was wrong. */
const RAW = {
  file: 'vanilla-filter-align.html',
  panel: '.fdy-filter',
  last: 'thead th:last-child .fdy-table__filterbtn',
  first: 'thead th:first-child .fdy-table__filterbtn',
};
const TYPED_LAST = { panel: 'thead th:last-child .fdy-filter', trigger: 'thead th:last-child .fdy-table__filterbtn' };
const COMBO = { panel: '.fdy-combo__listbox', trigger: '.fdy-combo__button' };
const TYPED = [
  ['Vue', 'vue-popover-align.html'],
  ['React', 'react-popover-align.html'],
];

before(async () => {
  if (skip === false) await buildEntries();
});

const arg = (value) => JSON.stringify(value);

async function rawReady(p) {
  assert.equal(
    await p.waitFor('document.readyState === "complete" && window.FreedayTable && window.__box && document.querySelector("thead th:last-child .fdy-table__filterbtn")'),
    true,
    'the fixture never enhanced its table',
  );
}

async function typedReady(p) {
  assert.equal(
    await p.waitFor('document.readyState === "complete" && window.__box && document.querySelector(".fdy-combo__button") && document.querySelector("thead th:last-child .fdy-table__filterbtn")'),
    true,
    'the fixture never mounted its combo and its table',
  );
}

async function openAndMeasure(p, panelSel, triggerSel, what) {
  await p.clickCenter(triggerSel);
  assert.equal(await p.waitFor(`window.__settled(${arg(panelSel)})`), true, `${what}: the panel never stopped animating`);
  const box = JSON.parse(await p.evalJS(`JSON.stringify(window.__box(${arg(panelSel)}, ${arg(triggerSel)}))`));
  /* Carried into every message below, because these three say WHICH code path produced the box and
     a bare `false !== true` would send the next reader looking for the wrong fault. */
  const where = `panel [${Math.round(box.panel.left)} … ${Math.round(box.panel.right)}] against trigger `
    + `[${Math.round(box.trigger.left)} … ${Math.round(box.trigger.right)}] in a viewport of ${box.vw}`;
  assert.equal(box.popoverOpen, true,
    `${what}: the panel must be in the top layer, or this measures the stylesheet instead of the positioning (${where})`);
  assert.equal(box.position, 'fixed',
    `${what}: the panel must be positioned by inline coordinates (${where})`);
  assert.notEqual(box.inlineLeft, '',
    `${what}: a left coordinate must have been written, that is the value under test (${where})`);
  return box;
}

/* The five numbers that say where a filter panel landed relative to its own funnel. Relative, so
   two different pages can be held against each other: the question is not where the panel is but
   how it sits on the trigger it belongs to. Rounded, and that is safe in both directions, the
   helper rounds the coordinate it writes while the funnel's own rect is sub-pixel, so the
   difference always falls inside half a pixel of the intended value. */
const shapeOf = (box) => ({
  rightEdgeOffFunnel: Math.round(box.panel.right - box.trigger.right),
  gapBelowFunnel: Math.round(box.panel.top - box.trigger.bottom),
  width: Math.round(box.panel.width),
  inTopLayer: box.popoverOpen,
  positioning: box.position,
});

test('a raw column filter in the rightmost column lines its right edge up with its funnel', { skip }, async () => {
  await withPage(fixture(RAW.file), async (p) => {
    await rawReady(p);

    const box = await openAndMeasure(p, RAW.panel, RAW.last, 'last column filter');
    /* The fixture has to pose the question. A panel that fits to the right of its funnel would
       land on both edges at once and the two alignments would be indistinguishable. */
    assert.ok(box.trigger.left + box.panel.width > box.vw - GAP,
      `the fixture's panel must not fit to the right of the funnel, got a ${box.panel.width}px panel at `
        + `${box.trigger.left} in a viewport of ${box.vw}`);

    assert.ok(Math.abs(box.panel.right - box.trigger.right) <= 1,
      `the panel's right edge must sit on the funnel's right edge, got ${box.panel.right} against ${box.trigger.right}`);
    /* The symptom as an app sees it, which the coordinate above does not state by itself: the
       page's gutter survives. The copy this replaces clamped to the viewport at 8px, and before
       that the panel simply ran past the funnel by its own width. */
    assert.ok(box.vw - box.panel.right >= GUTTER - 1,
      `the panel must keep the page's gutter, got ${box.vw - box.panel.right}px to the viewport edge of ${GUTTER}px`);
    assert.ok(Math.abs(box.panel.top - (box.trigger.bottom + GAP)) <= 1,
      `and sit ${GAP}px below the funnel, got top ${box.panel.top} against a funnel bottom of ${box.trigger.bottom}`);

    /* The clipping ancestors the top layer exists for. True before this change too, by appending
       the panel to <body>; the assertion is here because the escape route changed and something
       has to say the new one works. A rect cannot answer it, `overflow:hidden` clips the paint and
       leaves the box where it was, so this is a hit test. */
    const clip = JSON.parse(await p.evalJS('JSON.stringify(window.__clip())'));
    assert.ok(clip.pastCardBottom > 0,
      `the fixture's panel must hang out of its card to be worth asking about, got ${clip.pastCardBottom}px`);
    assert.equal(clip.hitBelowCardIsPanel, true,
      `the panel must still be hit-testable ${clip.pastCardBottom}px past the card's bottom edge, got ${clip.hitBelowCard}`);
  });
});

test('right-aligning never pushes a raw filter panel off the left edge', { skip }, async () => {
  await withPage(fixture(RAW.file), async (p) => {
    await rawReady(p);
    /* A phone's width, with the funnel in the FIRST column: the funnel's right edge minus the
       panel's width is a negative left, so an alignment that clamps one side only trades the
       reported overflow for one on the opposite edge. */
    await p.setViewport(360, 640);

    const box = await openAndMeasure(p, RAW.panel, RAW.first, 'first column filter');
    assert.ok(box.trigger.right - box.panel.width < 0,
      `the fixture must actually ask for a negative left, got ${box.trigger.right - box.panel.width}`);
    assert.ok(box.panel.left >= GAP - 1,
      `the panel must stay inside the left edge, got left ${box.panel.left}`);
    assert.ok(box.panel.right <= box.vw - GAP + 1,
      `and inside the right edge, got right ${box.panel.right} in a viewport of ${box.vw}`);
  });
});

test('the raw and the typed path put a filter panel in the same place, to the pixel', { skip }, async () => {
  /* The reason this file exists. Two paths rendering one component is the kit's premise, and the
     alignment that shipped for the typed path in this very release is what pulled them apart. The
     comparison is between MEASUREMENTS of three live pages, not between a page and a number
     somebody typed, apart from the gap and the stylesheet's min-width, which both paths read from
     the same two places. */
  const measured = {};

  await withPage(fixture(RAW.file), async (p) => {
    await rawReady(p);
    const box = await openAndMeasure(p, RAW.panel, RAW.last, 'raw last column filter');
    measured.raw = shapeOf(box);
    measured.minWidth = Math.round(Number(await p.evalJS(MIN_WIDTH)));
  });

  for (const [name, file] of TYPED) {
    await withPage(fixture(file), async (p) => {
      await typedReady(p);
      const box = await openAndMeasure(p, TYPED_LAST.panel, TYPED_LAST.trigger, `${name} last column filter`);
      measured[name] = shapeOf(box);
    });
  }

  const want = {
    rightEdgeOffFunnel: 0,
    gapBelowFunnel: GAP,
    width: measured.minWidth,
    inTopLayer: true,
    positioning: 'fixed',
  };
  assert.deepEqual(measured.raw, want, 'the raw path must land the panel on its funnel');
  assert.deepEqual(measured.Vue, want, 'and the Vue path must land it in the same place');
  assert.deepEqual(measured.React, want, 'and so must the React path');
});

test('a filter panel keeps the min-width its stylesheet asks for, on every path', { skip }, async () => {
  /* `.fdy-filter` asks for 14rem because a 24px funnel is no guide to how wide a filter form needs
     to be. The typed adapters floored every panel to its trigger's width, and for a funnel that is
     an inline `min-width:24px` which outranks the stylesheet: the panel shrank to whatever its
     content wanted, 206px, and an enum column with short labels would have gone narrower still. */
  const widths = {};

  await withPage(fixture(RAW.file), async (p) => {
    await rawReady(p);
    const box = await openAndMeasure(p, RAW.panel, RAW.last, 'raw last column filter');
    widths.raw = { panel: Math.round(box.panel.width), funnel: Math.round(box.trigger.width) };
    widths.minWidth = Math.round(Number(await p.evalJS(MIN_WIDTH)));
  });

  for (const [name, file] of TYPED) {
    await withPage(fixture(file), async (p) => {
      await typedReady(p);
      const box = await openAndMeasure(p, TYPED_LAST.panel, TYPED_LAST.trigger, `${name} last column filter`);
      widths[name] = { panel: Math.round(box.panel.width), funnel: Math.round(box.trigger.width) };

      /* The control, and it is not a formality: `matchWidth` is the reason the four input-shaped
         panels are not viewport-wide. `.fdy-combo__listbox` is `min-width:100%`, and in the top
         layer that 100% is the VIEWPORT, so dropping the trigger floor everywhere would open a
         1000px listbox under a 220px control. This says the floor is still written where it
         belongs. */
      const combo = await openAndMeasure(p, COMBO.panel, COMBO.trigger, `${name} combo`);
      assert.ok(Math.abs(combo.panel.width - combo.trigger.width) <= 1,
        `${name}: a combo listbox must still be floored to its trigger's width, got ${combo.panel.width} `
          + `against ${combo.trigger.width}`);
    });
  }

  for (const path of ['raw', 'Vue', 'React']) {
    assert.ok(widths[path].funnel < widths.minWidth,
      `${path}: the funnel must be narrower than the panel's min-width for this to mean anything, `
        + `got ${widths[path].funnel} against ${widths.minWidth}`);
    assert.ok(widths[path].panel >= widths.minWidth - 1,
      `${path}: the panel must be at least the ${widths.minWidth}px its stylesheet asks for, got `
        + `${widths[path].panel}. a narrower one is the funnel's width written inline over the rule`);
  }
});

test('the raw filter panel is position:fixed before it is placed, so #079 cannot reach it', { skip }, async () => {
  /* #079 is the fault 3.8.0 fixed in the vanilla `place()` and 3.9.0 in both adapters: a freshly
     shown panel is in the top layer while still carrying `position:absolute` and
     `top:calc(100% + …)` from its stylesheet, so it sits a viewport down the page, the document's
     overflow grows, a classic scrollbar appears for the duration and the trigger moves 15px left
     under the rect being read. The typed filter panel escaped it because `.fdy-filter` is
     `position:fixed` in table.css, the one kit panel that is. The raw panel is the same class in a
     different parent, and a different parent is a different stylesheet question, so it is measured
     here rather than concluded from the typed answer. */
  await withPage(fixture(RAW.file), async (p) => {
    await rawReady(p);

    const cond = JSON.parse(await p.evalJS('JSON.stringify(window.__classicScrollbars())'));
    assert.ok(cond.scrollbarWidth > 0,
      'this engine must give scrollbars layout width, or the condition under test is absent');
    assert.equal(cond.clientWidth, cond.innerWidth,
      'the page must have no scrollbar at rest, or the measurement below is not the fault #079 was');

    const box = await openAndMeasure(p, RAW.panel, RAW.last, 'last column filter');

    const pre = JSON.parse(await p.evalJS('JSON.stringify(window.__beforePlaceClone())'));
    assert.equal(pre.position, 'fixed',
      'the raw filter panel must be fixed by its own stylesheet, not absolute');
    assert.ok(pre.panelTop < pre.viewportHeight,
      `so it must not resolve a top against the viewport's height, got top ${pre.panelTop} in a viewport of ${pre.viewportHeight}`);
    assert.equal(pre.scrollHeightShown, pre.scrollHeightAtRest,
      `showing it must not grow the document, got scrollHeight ${pre.scrollHeightShown} against ${pre.scrollHeightAtRest} at rest`);
    assert.equal(pre.clientWidthShown, pre.clientWidthAtRest,
      `and must not narrow the viewport, got ${pre.clientWidthShown} against ${pre.clientWidthAtRest} at rest`);
    assert.equal(pre.triggerLeftShown, pre.triggerLeftAtRest,
      `and must not move the funnel it is measured against, got ${pre.triggerLeftShown} against ${pre.triggerLeftAtRest} at rest`);

    /* And the outcome under the same condition, because the premise above is an explanation and
       this is the thing an app sees. */
    assert.ok(Math.abs(box.panel.right - box.trigger.right) <= 1,
      `the panel must land on the funnel's right edge with a ${cond.scrollbarWidth}px scrollbar in play, `
        + `got ${box.panel.right} against ${box.trigger.right}`);
  });
});

test('a raw filter panel inside a modal dialog can be focused and typed into', { skip }, async () => {
  /* The part of "where the panel lives" that no coordinate can state. `showModal()` makes
     everything outside the dialog's subtree inert, and a panel appended to <body> is outside it,
     so a filter in a table inside a modal painted a form that swallowed every click and refused
     focus, including the enhancer's own focus() call on the first control. The typed path never
     had this because its panel is rendered inside the <th>. */
  await withPage(fixture('vanilla-filter-modal.html'), async (p) => {
    assert.equal(
      await p.waitFor('document.readyState === "complete" && window.FreedayTable && window.__panelFocus && document.getElementById("dlg").open'),
      true,
      'the fixture never opened its modal over an enhanced table',
    );

    await p.clickCenter('thead th:first-child .fdy-table__filterbtn');
    assert.equal(await p.waitFor('document.querySelector(".fdy-filter") !== null'), true,
      'the funnel never opened a panel');

    const f = JSON.parse(await p.evalJS('JSON.stringify(window.__panelFocus())'));
    assert.equal(f.missing, false, 'the panel must exist to be asked about');
    assert.equal(f.topLayer, true, 'the panel must be in the top layer');
    assert.equal(f.insideDialog, true,
      'the panel must live inside the open dialog, which is what keeps it out of the inert document');
    assert.equal(f.focusedByEnhancer, true,
      `the enhancer's own focus() must have landed in the panel, instead focus sat on ${f.activeElement}`);
    assert.equal(f.focusableByHand, true,
      `and the panel's input must take focus when asked, instead focus sat on ${f.activeElement}. `
        + 'an inert subtree accepts focus() and does nothing with it, which is how a filter inside a modal '
        + 'became a form nobody could fill in');
  });
});
