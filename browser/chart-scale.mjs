/* Browser regression spec, chart-xy axis text and dots hold their size at any width (#042).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * This CANNOT be asserted from the source, which is why it shipped: `font-size:9px` and `r="2.2"`
 * read as correct sizes. They were user units in a fixed 320x180 viewBox stretched by CSS, so the
 * rendered size was 9 * plotWidth/320, right at a 320px plot and nowhere else. On a 1400px plot
 * the smallest text in the chart rendered ~39px, larger than every heading on the page.
 *
 * The stroke was already immune (`vector-effect:non-scaling-stroke`), which is exactly why a
 * source read cannot catch this: one of the four things in the plot was protected and the other
 * three were not. Only a real layout can tell them apart. Measured, not read.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('chart-xy axis labels and dots are the same size at every container width (#042)', { skip }, async () => {
  await withPage(fixture('vanilla-chart-scale.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.waitFor('!!document.querySelector("#w2232 .fdy-chart-xy__xlabel")');
    const m = JSON.parse(await p.evalJS('JSON.stringify(window.chartScale())'));
    const sizes = [m.w350, m.w696, m.w1400, m.w2232];

    /* The mechanism: one user unit is one CSS pixel, so a declared size is a rendered size. */
    for (const s of sizes) {
      assert.equal(s.viewBoxW, s.plotW,
        `the viewBox must be sized to the plot: viewBox ${s.viewBoxW} vs plot ${s.plotW}px`);
      assert.ok(Math.abs(s.scale - 1) < 0.01, `scale must be 1, got ${s.scale} at plot ${s.plotW}px`);
    }

    /* The symptom: an axis label rendered 13px at 350px and 81px at 2232px. Now invariant. */
    const boxes = sizes.map((s) => s.labelBox);
    const spread = Math.max(...boxes) - Math.min(...boxes);
    assert.ok(spread <= 1,
      `axis label size must not track container width: ${boxes.map((b, i) => `${sizes[i].plotW}px->${b}px`).join(', ')}`);

    /* Dots became blobs by the same multiplier: 4.8px across at 350px, 30.7px at 2232px. */
    const dots = sizes.map((s) => s.dotW);
    assert.ok(Math.max(...dots) - Math.min(...dots) <= 1,
      `dot size must not track container width: ${dots.map((d, i) => `${sizes[i].plotW}px->${d}px`).join(', ')}`);

    /* Absolute sanity: the chart's most secondary text must stay under body text, not over it. */
    const body = parseFloat(m.bodyFontSize);
    for (const s of sizes) {
      assert.ok(s.labelBox < body,
        `an axis label (${s.labelBox}px at plot ${s.plotW}px) must render smaller than body text (${body}px)`);
    }

    /* The y-gutter is derived from the widest formatted tick, so a currency axis is not clipped. */
    assert.ok(m.money.tickText.startsWith('$'), `expected a currency tick, got ${m.money.tickText}`);
    assert.ok(m.money.tickLeft >= 0,
      `a currency tick must sit inside the chart, not off its left edge (left ${m.money.tickLeft}px)`);
  });
});

test('chart-xy repaints at the new size when its container resizes (#042)', { skip }, async () => {
  await withPage(fixture('vanilla-chart-scale.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    await p.waitFor('!!document.querySelector("#w350 .fdy-chart-xy__xlabel")');
    const before = JSON.parse(await p.evalJS('JSON.stringify(window.chartScale().w350)'));

    /* A measured viewBox is only correct until the box changes, hence the ResizeObserver. A
       sidebar collapsing moves a plot by ~300px at a fixed viewport, so this is the common case,
       not an edge case. */
    await p.evalJS('window.widen()');
    await p.waitFor('document.querySelector("#w350 svg").viewBox.baseVal.width > 1000');
    const after = JSON.parse(await p.evalJS('JSON.stringify(window.chartScale().w350)'));

    assert.equal(after.viewBoxW, after.plotW,
      `after a resize the viewBox must track the new plot: ${after.viewBoxW} vs ${after.plotW}px`);
    assert.ok(Math.abs(after.labelBox - before.labelBox) <= 1,
      `label size must survive the resize: ${before.labelBox}px -> ${after.labelBox}px`);
  });
});
