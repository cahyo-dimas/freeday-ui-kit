/* Browser regression spec, the CFL results at 420px (#053).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * Raised from a SAP B1 add-on panel: a 420px WebView2 surface where `FdyCfl` was the one pattern
 * that could not be adopted, because a three-column master-data table in a ~372px dialog either
 * squeezes every column below legibility or scrolls on both axes. The answer is a container query,
 * so this runs the real `FdyCfl.vue` at that viewport rather than a hand-built box: the query asks
 * about the DIALOG's width, and only a real dialog has one.
 *
 * The layout half of this could almost be read off the stylesheet. The a11y half cannot, and it is
 * the half that corrected a belief: the responsive-table folklore says `display:block` on a table
 * box drops its implicit role, so explicit `role="table"/"row"/"cell"` were added to all four
 * stacks — and then removed, because with the roles stripped at runtime Chrome's accessibility tree
 * still reports `table → row → cell` (Chromium 133; only `rowgroup` goes). Redundant ARIA is worse
 * than none by the kit's own rule, so what is asserted here is the OUTCOME, not the mechanism: a
 * stacked row must still be a row. An engine that ever does dissolve them fails this test, and the
 * roles come back then — with a measurement behind them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage, buildEntries } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

/* The panel that reported it: a 420px WebView2 window, which the modal's own
   `min(46rem, 100vw - var(--space-8))` clamps to ~356px of dialog. */
const NARROW = 420;
const WIDE = 1100;

const openDialog = async (p) => {
  await p.waitFor('document.readyState === "complete" && document.querySelector(".fdy-input-group__btn")');
  await p.evalJS('document.querySelector(".fdy-input-group__btn").click()');
  await p.waitFor('document.querySelector(".fdy-cfl__row") !== null');
};

/* Geometry of the first row, in the row's own coordinates: which cells share a line with which. */
const LAYOUT = `(function () {
  var row = document.querySelector('.fdy-cfl__row');
  var cells = Array.prototype.slice.call(row.cells);
  var data = cells.filter(function (c) { return !c.classList.contains('fdy-cfl__check'); });
  var thead = document.querySelector('.fdy-cfl__results thead');
  var results = document.querySelector('.fdy-cfl__results');
  var top = function (el) { return Math.round(el.getBoundingClientRect().top); };
  return JSON.stringify({
    theadDisplay: getComputedStyle(thead).display,
    resultsWidth: Math.round(results.getBoundingClientRect().width),
    cells: cells.length,
    titleTop: top(data[0]),
    detailTop: top(data[1]),
    rowHeight: Math.round(row.getBoundingClientRect().height),
    scrollsSideways: results.scrollWidth > results.clientWidth
  });
})()`;

test('at 420px the CFL rows stack: title on its own line, the rest underneath (#053)', { skip }, async () => {
  await buildEntries();
  await withPage(fixture('vue-cfl-multi.html'), async (p) => {
    await p.setViewport(NARROW, 760);
    await openDialog(p);
    const l = JSON.parse(await p.evalJS(LAYOUT));

    /* State the premise: if the fixture ever stops being narrow, the assertions below would pass
       against a table that simply had short columns. */
    assert.ok(l.resultsWidth < 480,
      `the fixture must put the dialog under the 30rem threshold or this proves nothing, got ${l.resultsWidth}px`);
    assert.equal(l.theadDisplay, 'none', 'the header row is dropped: it costs width and each row names itself');
    assert.ok(l.detailTop > l.titleTop,
      `the detail cell must sit BELOW the title, got title at ${l.titleTop} and detail at ${l.detailTop}`);
    assert.equal(l.scrollsSideways, false,
      'and nothing may scroll sideways — a dialog whose job is "search, look, click one" must not need two axes');
  });
});

test('the stacked rows keep their row and cell semantics (#053)', { skip }, async () => {
  await buildEntries();
  await withPage(fixture('vue-cfl-multi.html'), async (p) => {
    await p.setViewport(NARROW, 760);
    await openDialog(p);

    const nodes = (await p.axSubtree('.fdy-cfl__results table')).filter((n) => !n.ignored);
    const roles = nodes.map((n) => n.role);
    /* Outcome, not mechanism: this passes today because the engine keeps the implicit roles under a
       changed `display`, and it would equally pass if the markup carried them. What it does not
       allow is the stacked layout quietly costing the rows their semantics. */
    assert.ok(roles.includes('row'),
      `a stacked row must still be a row in the a11y tree, got roles ${JSON.stringify([...new Set(roles)])}`);
    assert.ok(roles.includes('cell'),
      `and its cells must still be cells, got roles ${JSON.stringify([...new Set(roles)])}`);
  });
});

test('the same component is still a table when it has the room (#053)', { skip }, async () => {
  await buildEntries();
  await withPage(fixture('vue-cfl-multi.html'), async (p) => {
    await p.setViewport(WIDE, 760);
    await openDialog(p);
    const l = JSON.parse(await p.evalJS(LAYOUT));

    assert.ok(l.resultsWidth > 480, `the wide case must clear the threshold, got ${l.resultsWidth}px`);
    assert.equal(l.theadDisplay, 'table-header-group', 'a wide dialog keeps its column headers');
    assert.equal(l.detailTop, l.titleTop,
      'and its cells share one line — the narrow layout must not leak into the width it was never for');
  });
});
