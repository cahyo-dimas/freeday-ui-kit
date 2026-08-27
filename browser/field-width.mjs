/* Browser regression spec, a field's width and its control's (#050, #051).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * Both defects here are layout OUTCOMES, invisible in the stylesheet and invisible in the DOM: the
 * markup is right, the classes are right, and the box just stops early. test/css.test.mjs guards
 * the CSS shape; this guards what a reader sees.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const read = async (p) => {
  await p.waitFor('document.readyState === "complete" && window.widths');
  return JSON.parse(await p.evalJS('JSON.stringify(window.widths())'));
};

test('a control is as wide as the field it is in (#051)', { skip }, async () => {
  await withPage(fixture('vanilla-field-width.html'), async (p) => {
    const w = await read(p);

    /* The row that is supposed to span everything is the row the cap showed up on: 600px of label
       and help text over a 352px control, with no edge to explain why. */
    assert.ok(w.fullCombo.field > 352,
      `the fixture must widen the field past the 22rem cap or this proves nothing, got ${w.fullCombo.field}px`);
    assert.equal(w.fullCombo.control, w.fullCombo.field,
      `a --full field's combo must span it, got ${w.fullCombo.control}px in ${w.fullCombo.field}px`);
    assert.equal(w.fullGroup.control, w.fullGroup.field,
      `and its input group, got ${w.fullGroup.control}px in ${w.fullGroup.field}px`);
    /* .fdy-input never carried a cap, which is what made the two rows disagree in the first place;
       it is the reference the other two now match. */
    assert.equal(w.fullInput.control, w.fullInput.field, 'the plain input was always right');
  });
});

test('a stated field width is the gap the author wrote (#051 §2)', { skip }, async () => {
  await withPage(fixture('vanilla-field-width.html'), async (p) => {
    const w = await read(p);

    assert.equal(w.search.control, w.search.field,
      `a 26rem search field must hold a 26rem control, got ${w.search.control}px in ${w.search.field}px`);
    /* The reported symptom, and the only one a person could see: 12px of declared gap read as 76px,
       because 64px of it was dead space inside the field before it. */
    assert.equal(w.seenGap, w.declaredGap,
      `the visible gap must be the declared one, saw ${w.seenGap}px against ${w.declaredGap}px`);
  });
});

test('the controls the filterbar rule never named fill their field too (#051)', { skip }, async () => {
  await withPage(fixture('vanilla-field-width.html'), async (p) => {
    const w = await read(p);

    /* --w-2xl is 25rem, wider than the 22rem cap, and the old filterbar-scoped rule listed only the
       input group and the combo. So these two stopped 48px short inside the one container the kit
       believed it had already fixed. */
    assert.equal(w.barAuto.control, w.barAuto.field,
      `an autocomplete in a --w-2xl field must fill it, got ${w.barAuto.control}px in ${w.barAuto.field}px`);
    assert.equal(w.barCascade.control, w.barCascade.field,
      `and a cascade, got ${w.barCascade.control}px in ${w.barCascade.field}px`);
  });
});

test('a field nobody widened is still capped (#051)', { skip }, async () => {
  await withPage(fixture('vanilla-field-width.html'), async (p) => {
    const w = await read(p);

    /* The half that must NOT change: the cap is what keeps a lone combo off the full page width,
       and after this release the field is the only thing carrying it. 22rem at the default density. */
    assert.equal(w.lone.field, 352, `a standalone .fdy-field must stay 22rem, got ${w.lone.field}px`);
    assert.equal(w.lone.control, w.lone.field,
      'and its control matches it, which is what the cap already did before this release');
  });
});

test('.fdy-stats--inline hugs its numbers instead of collapsing (#050)', { skip }, async () => {
  await withPage(fixture('vanilla-field-width.html'), async (p) => {
    const w = await read(p);

    /* Measured at 40px before: three zero tracks and two gaps, with the labels painted on top of
       each other and the page overflowing sideways. */
    assert.ok(w.inlineTiles.every((t) => t > 0),
      `a size-contained tile contributes no width; --inline must not be a container, got ${w.inlineTiles.join('/')}`);
    assert.equal(w.inlineStrip, w.inlineTiles.reduce((a, b) => a + b, 0) + 40,
      `the strip must be exactly its tiles plus its two gaps, got ${w.inlineStrip}px for ${w.inlineTiles.join('/')}`);
    /* Non-zero is not the same as hugging. `.fdy-stats` states an explicit template, and `auto-fit`
       resolves it to ONE track that keeps the 11rem floor while the other two tiles fall into
       implicit columns, so the strip stays plausible (368px, sum-of-tiles still holds) with its
       first tile at 176px against 79px of content. Only a reference sized by construction sees it. */
    assert.deepEqual(w.inlineTiles, w.refTiles,
      `every tile must be its own content wide, got ${w.inlineTiles.join('/')} against ${w.refTiles.join('/')}`);
    /* Hugging, not spanning: that is the whole difference from the default band. */
    assert.ok(w.inlineStrip < w.inlineRow / 2,
      `--inline must hug beside the title, took ${w.inlineStrip}px of a ${w.inlineRow}px row`);
    /* The type a hugging strip should show: the flat display size, not a fluid one.
       This does NOT discriminate whether the clamp is scoped out of --inline, and saying so is the
       point: with no container `11cqw` resolves against the viewport, but `clamp()`'s upper bound is
       --text-3xl, so on any viewport past ~282px it lands on 31px either way. That the scoping is
       present is a CSS-shape fact, and test/css.test.mjs owns it. */
    assert.equal(w.inlineValuePx, '31px',
      `--inline keeps the flat --text-3xl, got ${w.inlineValuePx}`);
  });
});

test('the default stats band keeps the container it was given (#050)', { skip }, async () => {
  await withPage(fixture('vanilla-field-width.html'), async (p) => {
    const w = await read(p);

    assert.ok(w.bandTiles.every((t) => t > 100),
      `the default band must still span its row, got ${w.bandTiles.join('/')}`);
    /* #020's clamp, still doing its job: money in a 640px band shrinks rather than wrapping between
       the currency and the number. If --inline's opt-out ever widens, this is what it breaks. */
    assert.equal(w.bandValueLines, 1, `a stat value must not wrap, got ${w.bandValueLines} lines`);
    assert.ok(parseFloat(w.bandValuePx) < 31,
      `and it got there by shrinking, not by staying at --text-3xl, got ${w.bandValuePx}`);
  });
});
