/* Browser regression spec: a column filter panel on the DEGRADED path escapes the sticky header's
 * stacking context (note 2026-10-23 §5, part A). Run via `npm run test:browser`; NOT part of the
 * default `node --test` gate. Auto-skips without Chrome.
 *
 * Butir 3 moved the raw path's filter panel off `<body>` and into its own `<th>`, which fixed a
 * table inside a modal: `showModal()` makes everything outside the dialog's subtree inert, so a
 * panel on `<body>` painted a form that refused focus and every click. That fix is right and it has
 * its test. The bill it left unread is this one.
 *
 * `.fdy-table--sticky-head thead th` is `position:sticky; top:0; z-index:2`, and a positioned box
 * with a z-index is a STACKING CONTEXT. So `.fdy-filter`'s own `z-index:130` is no longer sorted
 * against the page, it is sorted INSIDE that 2, and every number from 3 up beats the whole cell
 * whatever the panel asks for. On the popover path none of that matters: the top layer is above the
 * z-index universe entirely. On the DEGRADED path there is no top layer, and the degraded path is
 * not an edge case: `freeday-popover.js` reads `showPopover` once at load, the Popover API arrived
 * in Chrome 114 / Safari 17 / Firefox 125, and the README promises Chrome 105 / Safari 15.4 /
 * Firefox 121. Chrome 105..113, Safari 15.4 and 16, and Firefox 121..124 are all inside what the
 * kit says it supports and all of them take this path.
 *
 * Two instruments, and the choice is deliberate. Paint order is read with `elementsFromPoint`,
 * which returns the hit-test stack topmost first: with the Popover API deleted nothing is in the
 * top layer, and the two tables under test are not inside a dialog, so there is no inert subtree to
 * make the hit test lie. That lie is the whole reason `over-dialog.mjs` and `overlay-stack.mjs`
 * reach for pixels, and it does not apply here. It also reports more than a pixel can: the stack by
 * name, so a red says what covered the panel. The modal test below, where the hit test WOULD lie
 * about everything outside the dialog, only ever asks about a point INSIDE it.
 *
 * And every premise is asserted, not assumed. A spec that measured the top layer by accident would
 * pass without touching the condition it was written for, which is how the first attempt at the
 * third test in `menu-align.mjs` passed while proving nothing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + join(HERE, 'fixtures', 'vanilla-filter-stack.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const GAP = 4; // freeday-popover.js, the room it keeps against trigger and viewport
const PHONE = [390, 740]; // a bottom bar only exists at <=720px, which is where the fault lives
const READY = `document.readyState === 'complete' && !!window.FreedayTable && !!window.__sweep`;

const funnel = (which) => `#tbl-${which} thead th[data-fdy-filter] .fdy-table__filterbtn`;

async function openFilter(p, which) {
  await p.clickCenter(funnel(which));
  assert.equal(await p.waitFor(`!!document.querySelector('#tbl-${which} .fdy-filter')`), true,
    `${which}: the funnel never opened a panel`);
  return JSON.parse(await p.evalJS(`JSON.stringify(window.__premise(${JSON.stringify(which)}))`));
}

/* The degraded path, asserted rather than arranged and hoped for. Without this the file could go
   green against the top layer, where the fault cannot exist, and report the cage as fixed. */
function assertDegraded(pre, which) {
  assert.equal(pre.supported, false,
    `${which}: FreedayPopover.supported must be false, or this spec measures the top layer instead of the degraded path`);
  assert.equal(pre.showPopoverType, 'undefined',
    `${which}: HTMLElement.prototype.showPopover must be gone before the enhancers load`);
  assert.equal(pre.popoverAttr, null,
    `${which}: the panel must not be a popover, got popover="${pre.popoverAttr}"`);
  assert.equal(pre.panelPosition, 'fixed', `${which}: .fdy-filter must still be the kit's one fixed panel`);
  assert.equal(pre.panelZIndex, '130', `${which}: the panel must still be asking for z-index 130`);
}

test('nothing the kit paints above 2 covers a degraded filter panel (note 2026-10-23 §5)', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.setViewport(...PHONE);

    const pre = await openFilter(p, 'sticky');
    assertDegraded(pre, 'sticky');
    /* The cage, measured on the live cell. It is the condition under test, so it has to be present:
       a table that had quietly stopped being sticky would pass everything below for free. */
    assert.equal(pre.hostIsStackingContext, true,
      `the funnel's header cell must be a stacking context, got position ${pre.hostPosition} / z-index ${pre.hostZIndex}`);

    /* Every overlay the kit itself paints above the cell's 2, swept in one pass, and judged only
     * where the two boxes really MEET. "Not covered" is free wherever nothing overlaps, so a
     * sweep that asserted on all six would mostly be asserting on empty space; the premise below
     * is what stops that, by naming the one candidate that overlaps at every viewport. */
    const sweep = JSON.parse(await p.evalJS(`JSON.stringify(window.__sweep('sticky'))`));
    const met = Object.entries(sweep).filter(([, v]) => v.covered !== null);

    /* The frozen header cell, `z-index:3`. It overlaps WHEREVER the panel is placed correctly: the
     * funnel is a 24px button inside a 49px header cell, so a panel hung GAP below the funnel still
     * has its top strip inside the header row, and the frozen cell is opaque and sticks across it.
     * Measured 108x9px on a phone and 129x9px at 1280. This is the one overlap no layout avoids,
     * which is why it is the premise rather than the bottom bar: the bar depends on the panel being
     * tall and the screen being short, and it was only the LARGE symptom (224x49px) because the
     * panel was also in the wrong place. */
    const frozen = sweep['th frozen, z-index 3'];
    assert.notEqual(frozen.covered, null,
      `the frozen header cell must overlap the panel for this to mean anything, got ${frozen.overlap}`);
    assert.ok(met.length >= 2,
      `at least two of the kit's own boxes must meet the panel, got ${met.length}: ${JSON.stringify(sweep)}`);

    for (const [who, v] of met) {
      assert.equal(v.covered, false,
        `${who} is painted over the panel across ${v.overlap}px of it, topmost at that point was `
        + `${v.topmost}. the panel asks for z-index 130 and the header cell it sits in asks for `
        + `${pre.hostZIndex}, so inside that cell the 130 buys nothing`);
    }
  });
});

test('the degraded panel lands on its funnel and inside the viewport (note 2026-10-23 §5)', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.setViewport(...PHONE);

    const pre = await openFilter(p, 'sticky');
    assertDegraded(pre, 'sticky');

    /* The other half of being out of the cell. A `position:fixed` box with auto offsets takes its
       STATIC position, the spot it would have occupied in flow, and inside a sticky cell in a
       scrolled scrollport that spot is nowhere in particular: measured 86px below the funnel it
       belongs to, with the panel's foot 12px from the bottom of the screen. So the panel cannot
       simply be re-parented, it has to be PLACED, and place() is the kit's one copy of that
       arithmetic. Both axes are read off the live trigger, never off a number written here. */
    const below = pre.panel.top - pre.trigger.bottom;
    const above = pre.trigger.top - pre.panel.bottom;
    assert.ok(Math.abs(below - GAP) <= 1 || Math.abs(above - GAP) <= 1,
      `the panel must sit ${GAP}px under its funnel (or ${GAP}px over it where it flips): panel `
      + `${JSON.stringify(pre.panel)} against funnel ${JSON.stringify(pre.trigger)}, which is ${below}px below / ${above}px above`);

    assert.ok(pre.panel.bottom <= pre.vh - GAP + 1,
      `and inside the bottom of a ${pre.vh}px viewport, got ${pre.panel.bottom}`);
    assert.ok(pre.panel.top >= GAP - 1, `and inside the top, got ${pre.panel.top}`);
    assert.ok(pre.panel.left >= GAP - 1 && pre.panel.right <= pre.vw - GAP + 1,
      `and inside both sides of a ${pre.vw}px viewport, got ${pre.panel.left}..${pre.panel.right}`);
  });
});

test('raising the number cannot work, being outside the cell can (note 2026-10-23 §5)', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.setViewport(...PHONE);

    /* The CAUSE on its own, without the enhancer in the room: one real `.fdy-filter` box pinned to
       one set of viewport coordinates over the bar, read twice, with nothing changed between the
       readings but its parent. Same class, same 130, same pixels.
       This is the spec that outlives the fix. It is why the answer was not "make it 200": a number
       raised inside a stacking context is sorted inside that context and never leaves it, so the
       only moves available are to not be in the context or for the context not to exist. The
       context has to exist, `z-index:2` is what keeps a sticky header above the `z-index:1` frozen
       body cells that scroll under it, so the panel is what has to move. */
    const { inside, outside } = JSON.parse(await p.evalJS('JSON.stringify(window.__cageProbe())'));

    assert.equal(inside.probeZIndex, '130', 'the probe must be a real .fdy-filter, asking for 130');
    assert.equal(inside.navZIndex, '50', 'and the bar must be the kit\'s own 50');
    assert.equal(inside.parentIsStackingContext, true,
      `the first parent must be a stacking context, got position ${inside.parentPosition} / z-index ${inside.parentZIndex}`);
    assert.equal(outside.parentIsStackingContext, false,
      `the second must not be one, got position ${outside.parentPosition} / z-index ${outside.parentZIndex}`);
    assert.deepEqual(outside.box, inside.box,
      'the two readings must be of the same box, or the parent is not the only thing that changed');

    assert.equal(inside.covered, true,
      `130 inside a 2 must lose to the bar's 50, that is the whole point: ${JSON.stringify(inside.stack)}`);
    assert.equal(outside.covered, false,
      `and the same 130 outside it must win: ${JSON.stringify(outside.stack)}`);
  });
});

test('a header cell without --sticky-head is no cage, which is where every typed table sits (note 2026-10-23 §5)', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.setViewport(...PHONE);

    /* Whether this is a regression butir 3 created or a fault `FdyTableFilter` has carried since it
     * shipped turns on one thing, and it is not the `<th>`: the typed panel has ALWAYS been a child
     * of its header cell. What cages it is `.fdy-table--sticky-head`, and no typed table can carry
     * that class. Neither adapter renders `--sticky` or `--sticky-head`, neither accepts a class on
     * the `<table>` (Vue builds a closed `:class` object, React joins two booleans into a string),
     * and `FdyTableFilter` is not exported from either index, so it cannot be dropped into
     * hand-written sticky markup either.
     *
     * So the state the typed path is in is this control table's: a `<th>` that is
     * `position:static; z-index:auto` and therefore no stacking context at all. Measured here on
     * the same page, through the same enhancer, so it is a reading rather than a source review. */
    const pre = await openFilter(p, 'plain');
    assertDegraded(pre, 'plain');

    assert.equal(pre.hostPosition, 'static',
      `a header cell without --sticky-head must stay static, got ${pre.hostPosition}`);
    assert.equal(pre.hostZIndex, 'auto',
      `and must ask for no z-index, got ${pre.hostZIndex}`);
    assert.equal(pre.hostIsStackingContext, false, 'so it creates no stacking context');

    const nav = JSON.parse(await p.evalJS(`JSON.stringify(window.__coverage('plain', '.fdy-bottomnav'))`));
    if (nav.overlaps) {
      assert.equal(nav.covered, false,
        `uncaged, the panel's 130 must beat the bar's 50: ${JSON.stringify(nav.stack)}`);
    }
  });
});

test('fixed gets the degraded panel past its scrollport but not out of the cell (note 2026-10-23 §5)', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.setViewport(...PHONE);

    const pre = await openFilter(p, 'sticky');
    assertDegraded(pre, 'sticky');

    /* `position:fixed` is the one declaration that could have made the cage moot, so it is measured
     * rather than reasoned about, and the two things it does are read apart.
     * CONTAINMENT: it resolves against the viewport, so `.fdy-table-scroll--frozen`'s `overflow:auto`
     * has nothing to clip and the panel is readable well past the bottom of its own scrollport. That
     * is what the declaration is for and it still works.
     * ORDER: a fixed box is still a descendant, so it is still sorted inside every stacking context
     * above it. Being out of flow is not being out of the cell, and the test above is what proves
     * the second half. */
    const clip = JSON.parse(await p.evalJS(`JSON.stringify(window.__clip('sticky'))`));
    assert.equal(clip.position, 'fixed', 'the panel must be the fixed one');
    assert.ok(clip.reachesPastPort > 20,
      `the panel must reach past the scrollport for this to mean anything, got ${clip.reachesPastPort}px past ${JSON.stringify(clip.port)}`);
    assert.equal(clip.visiblePastPort, true,
      `the panel must be the topmost thing at ${JSON.stringify(clip.probe)}, outside its scrollport: ${JSON.stringify(clip.stackPastPort)}`);
  });
});

/* Part B rides along in this file because this fixture already ships the markup under test: both
 * tables carry `.fdy-table__num` on the `Qty` header and on the `Qty` cells, written exactly as
 * COMPONENTS.md writes it, with no inline style anywhere. The claim being bound is the sentence
 * that replaced "Numeric cells get `.fdy-table__num` (right-aligned, tabular)", which was true of a
 * `<td>` and never of a `<th>`.
 *
 * `.fdy-table__num` is `(0,1,0)` and `.fdy-table th` is `(0,2,0)`, so on a header cell the data font
 * and the tabular figures arrive and `text-align:right` loses to the header rule's `text-align:left`.
 * Both rules were born in the same commit (fca1310, 2026-07-21), back to back in the same file, so
 * there is no commit, no CHANGELOG entry and no test anywhere that ever asked for a right-aligned
 * heading; and the one spec in the kit that NEEDS one writes `style="text-align:right"` into its own
 * fixture to get it (`browser/filter-wrap.mjs`, through `vanilla-filter-wrap.html`). Raising the
 * class's specificity would move every numeric header already shipped, in the kit's own docs and in
 * every consumer, so the docs were corrected instead and this is what holds them to it.
 */
test('.fdy-table__num aligns a body cell, and a header only with an inline style (note 2026-10-23 §5)', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    const n = JSON.parse(await p.evalJS('JSON.stringify(window.__numInk())'));

    /* The premises: the ink has somewhere to move, in both cells, or an inset proves nothing. */
    for (const [who, cell] of [['the header', n.th], ['the body cell', n.td], ['the inlined header', n.thWithInlineStyle]]) {
      assert.ok(cell.slack > 15,
        `${who} must be wider than its text for an alignment to be visible, slack is ${Math.round(cell.slack)}px`);
    }

    /* What the class DOES deliver to a header, both halves, so the correction cannot drift into
       "the class does nothing on a th". */
    assert.match(n.th.fontFamily, /mono/i, 'the class must still set a header in the data font');
    assert.equal(n.th.fontVariantNumeric, 'tabular-nums', 'and must still give it tabular figures');

    /* And what it does not: the heading stays on the left. */
    assert.equal(n.th.textAlign, 'left',
      `a <th> keeps the header rule's alignment, got ${n.th.textAlign}`);
    assert.ok(n.th.inset < n.th.slack / 2,
      `the header's ink must sit in the LEFT half of its slack, got ${Math.round(n.th.inset)}px into ${Math.round(n.th.slack)}px`);

    /* The same class on a <td>, where nothing outranks it. */
    assert.equal(n.td.textAlign, 'right', `a <td> takes the class's alignment, got ${n.td.textAlign}`);
    assert.ok(n.td.inset > n.td.slack / 2,
      `the body cell's ink must sit in the RIGHT half of its slack, got ${Math.round(n.td.inset)}px into ${Math.round(n.td.slack)}px`);

    /* The documented way to move the heading too, which is also what the typed FdyTable writes for
       a column with `align:'right'`: an inline value no ancestor rule can outrank. */
    assert.equal(n.thWithInlineStyle.textAlign, 'right',
      `an inline text-align must beat the header rule, got ${n.thWithInlineStyle.textAlign}`);
    assert.ok(n.thWithInlineStyle.inset > n.thWithInlineStyle.slack / 2,
      `and must move the ink to the right half, got ${Math.round(n.thWithInlineStyle.inset)}px into ${Math.round(n.thWithInlineStyle.slack)}px`);
  });
});

test('a degraded filter panel inside a modal can still be typed into (note 2026-10-23 §5)', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);

    /* Butir 3's fault, re-asked on the degraded path, because any change that moves the panel out of
     * the header cell has to answer it in the same breath. `showModal()` makes everything outside
     * the dialog's subtree inert, and inert content paints but refuses focus and clicks, so the
     * panel has to come to rest INSIDE the dialog wherever else it goes. The hit test is read at a
     * point inside the dialog, which is the one place it does not lie about an inert page. */
    await p.evalJS('window.__openModal()');
    await p.waitFor(`getComputedStyle(document.getElementById('dlg')).opacity === '1'`);

    const pre = await openFilter(p, 'modal');
    assertDegraded(pre, 'modal');

    const m = JSON.parse(await p.evalJS('JSON.stringify(window.__modalPanel())'));
    assert.equal(m.missing, false, 'the panel must exist');
    assert.equal(m.insideDialog, true,
      `the panel must stay inside the open dialog or it is inert, it came to rest in ${m.parent}`);
    assert.equal(m.focusedByEnhancer, true,
      `the enhancer must be able to focus the panel's first control, focus landed on ${m.activeElement}`);
    assert.equal(m.focusableByHand, true,
      `and focus() on the input must not be a no-op, focus landed on ${m.activeElement}`);
    assert.match(m.hitAtCentre, /fdy-/,
      `a click in the middle of the panel must reach the panel, it reached ${m.hitAtCentre}`);
  });
});
