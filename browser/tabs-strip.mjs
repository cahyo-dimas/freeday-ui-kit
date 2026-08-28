/* Browser regression spec, the tab strip's own geometry (#052).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * Reported by a user who could feel it and could not screenshot it: "this tab panel scrolls
 * vertically". It did — 1px — and no still image would ever have shown that. `overflow-x:auto` on
 * `.fdy-tabs__list` cannot ask for one axis alone (CSS Overflow §3: `visible` on the other axis
 * computes to `auto`), so the pixel the tab used to hang below the content box, via a
 * `margin-bottom:-1px` that existed to lift its underline onto the strip's line, became a real
 * scrollport.
 *
 * The second assertion is the one a source read cannot make. A scroll container clips descendants
 * to its padding box, so that same pixel — the bottom half of the active tab's 2px underline — was
 * clipped, and the strip's own border painted in its place. The underline shipped 1px thick for as
 * long as the negative margin existed, and only a pixel does tell them apart: the CSS says 2px, the
 * DOM says 2px, and the screen said 1.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const open = async (p) => {
  await p.waitFor('document.readyState === "complete" && window.ready === true');
  await p.setViewport(1000, 700);
};
const strip = async (p, id) => JSON.parse(await p.evalJS(`JSON.stringify(window.strip(${JSON.stringify(id)}))`));
const tone = async (p, token) => JSON.parse(await p.evalJS(`JSON.stringify(window.tone(${JSON.stringify(token)}))`));
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');

test('a tab strip has nothing to scroll vertically (#052)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-strip.html'), async (p) => {
    await open(p);

    for (const id of ['plain', 'narrow']) {
      const s = await strip(p, id);
      /* The condition is stated, not assumed: if the cross-axis rule ever stops applying, this
         spec should say so rather than pass for a reason it did not test. */
      assert.equal(s.overflowY, 'auto',
        `#${id}: overflow-y still computes to auto beside overflow-x:auto — that is the trap, and it is why the fix is geometric`);
      assert.equal(s.scrollH, s.clientH,
        `#${id}: the strip has ${s.scrollH - s.clientH}px of vertical overflow (client ${s.clientH}, scroll ${s.scrollH})`);
      assert.equal(s.stuckTop, 0,
        `#${id}: a scripted scroll moved the strip to scrollTop ${s.stuckTop} — a trackpad gesture over it is eaten before the page sees it`);
    }
  });
});

test('the active tab underline is the 2px it asks for, not the 1px the scrollport left (#052)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-strip.html'), async (p) => {
    await open(p);
    const primary = await tone(p, '--color-primary');
    const border = await tone(p, '--color-border');
    assert.notEqual(hex(primary), hex(border), 'the two tones must differ or this test cannot fail');

    const s = await strip(p, 'plain');
    const active = await p.centerXY('#t-1');
    const inactive = await p.centerXY('#t-3');
    const at = async (x, y) => hex(await p.pixelAt(x, y));

    // Both rows of the underline, under the selected tab. The lower one is what used to be clipped.
    assert.equal(await at(active.x, s.bottom - 1), hex(primary),
      'the strip\'s last pixel row under the active tab must be the underline, not the strip\'s own line');
    assert.equal(await at(active.x, s.bottom - 2), hex(primary),
      'and the row above it — the underline is 2px');
    assert.notEqual(await at(active.x, s.bottom - 3), hex(primary),
      'but only 2px: a third row of primary means the underline grew, which is a different bug');

    // The line itself survives everywhere else, which is the half a naive `overflow-y:hidden` loses.
    assert.equal(await at(inactive.x, s.bottom - 1), hex(border),
      'under an inactive tab the strip\'s own line must still paint');
  });
});

test('the strip still scrolls sideways, which is what overflow-x was for (#052)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-strip.html'), async (p) => {
    await open(p);

    const wide = await strip(p, 'plain');
    assert.equal(wide.scrollW, wide.clientW, 'the wide strip fits, so it has nothing to scroll either way');

    const narrow = await strip(p, 'narrow');
    assert.ok(narrow.scrollW > narrow.clientW,
      `the narrow fixture must overflow horizontally or it proves nothing, got ${narrow.scrollW} in ${narrow.clientW}`);
    assert.ok(narrow.stuckLeft > 0,
      'four tabs in 220px must still scroll sideways — removing the vertical scroll must not cost the horizontal one');
  });
});
