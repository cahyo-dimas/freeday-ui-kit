/* Browser regression spec, a chart's author label is the WHOLE text alternative (#047).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * COMPONENTS.md used to explain this with the ARIA spec: role="img" is Children Presentational, so
 * the rendered legend/values "are not exposed". Measured, that was false. Chrome keeps the whole
 * subtree live, and only the AT's habit of not descending into a named image saved the advice. The
 * renderer now hides those children itself, and this is what keeps the sentence true.
 *
 * The instrument has to be the AX TREE, not the DOM: aria-hidden leaves the markup untouched, so a
 * querySelector assert would pass before the fix and after it. Only the accessibility tree can tell
 * "the browser prunes this" apart from "the spec says it should".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const READY = `document.readyState === "complete"
  && !!document.querySelector('#donut .fdy-chart__legend')
  && !!document.querySelector('#bars .fdy-bars__val')
  && !!document.querySelector('#line .fdy-chart__legend')`;

/* Every text node the AX tree would actually hand a reader, chart node itself excluded. */
const exposedText = (nodes) =>
  nodes.filter((n) => !n.ignored && n.role === 'StaticText').map((n) => n.name);

for (const [id, label] of [
  ['donut', 'Documents by status: posted 1,284 (76%), pending 342 (20%), deleted 61 (4%)'],
  ['bars', 'Documents per month: Jan 12, Feb 30, Mar 18'],
  ['line', 'Monthly posting trend: Posted 62% → 75%, Draft 24% → 16%'],
]) {
  test(`#${id}: the label is the only text a reader gets (#047)`, { skip }, async () => {
    await withPage(fixture('vanilla-chart-a11y.html'), async (p) => {
      await p.waitFor(READY);
      const nodes = await p.axSubtree('#' + id);

      assert.deepEqual(exposedText(nodes), [],
        `the rendered subtree must expose no text of its own, got: ${JSON.stringify(exposedText(nodes))}`);
      assert.equal(await p.axName('#' + id), label, 'and the author label must survive as the name');
    });
  });
}

test('the legend is hidden, not removed — the chart still LOOKS the same (#047)', { skip }, async () => {
  await withPage(fixture('vanilla-chart-a11y.html'), async (p) => {
    await p.waitFor(READY);
    /* aria-hidden is the whole mechanism, so the proof it is not a deletion is that the nodes are
       still in the DOM and still painted. A legend dropped for a11y would be a visual regression. */
    const seen = await p.evalJS(`(function () {
      var legend = document.querySelector('#donut .fdy-chart__legend');
      var centre = document.querySelector('#donut .fdy-donut__center b');
      return JSON.stringify({
        items: legend.querySelectorAll('li').length,
        legendVisible: legend.getBoundingClientRect().height > 0,
        centreText: centre.textContent,
        centreVisible: centre.getBoundingClientRect().height > 0,
      });
    })()`);
    assert.deepEqual(JSON.parse(seen),
      { items: 3, legendVisible: true, centreText: '1687', centreVisible: true });
  });
});

test('a chart with NO label keeps its contents exposed (#047)', { skip }, async () => {
  await withPage(fixture('vanilla-chart-a11y.html'), async (p) => {
    await p.waitFor(READY);
    /* The deliberate escape hatch. Hiding the subtree of a chart that was never given a name would
       leave an image with no text at all — a worse outcome than the exposure it removes, and one the
       author cannot debug. The kit only prunes what an aria-label has already replaced. */
    const text = exposedText(await p.axSubtree('#nameless'));
    assert.ok(text.some((t) => t.includes('open')),
      `an unlabelled chart must keep its legend readable, got: ${JSON.stringify(text)}`);
  });
});
