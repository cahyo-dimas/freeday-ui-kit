/* Browser regression spec: what a column filter panel inherits from the <th> it now lives in
 * (note 2026-10-23 §3, part three). Run via `npm run test:browser`; NOT part of the default
 * `node --test` gate. Auto-skips without Chrome.
 *
 * 3.9.0 moved the raw path's panel off <body> and into its own <th>, which is where the typed
 * `FdyTableFilter` had always rendered it. That fixed a filter inside a modal and it handed both
 * paths the header's typography: `.fdy-table th` is `white-space:nowrap`, 12px, uppercase,
 * tracked, semibold and muted, and `.fdy-table__num` adds right-aligned mono. The `.fdy-filter`
 * rule reset four of those from the start; the ones it did not reset reach a panel made of labels
 * and inputs, where none of them belong.
 *
 * Every assertion is measured on the RENDERED box, never on the stylesheet: `white-space` is the
 * one property whose presence in a rule proves nothing at all here, because `max-width:18rem`
 * clamps the panel to the same width whether the text can break or not. What a nowrap panel
 * actually does is push its text out of a list that then scrolls sideways, and keep every row one
 * line tall. So those are what is read.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + join(HERE, 'fixtures', 'vanilla-filter-wrap.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const READY = `document.readyState === 'complete' && !!window.FreedayTable
  && !!document.querySelector('thead th:last-child .fdy-table__filterbtn')`;

const ENUM_BTN = 'thead th:first-child .fdy-table__filterbtn';
const NUM_BTN = 'thead th:last-child .fdy-table__filterbtn';

async function open(p, trigger) {
  await p.waitFor(READY);
  await p.clickCenter(trigger);
  assert.equal(await p.waitFor('!!document.querySelector(".fdy-filter")'), true, 'the funnel never opened a panel');
}

test('an enum value longer than the panel wraps inside it', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await open(p, ENUM_BTN);
    const b = JSON.parse(await p.evalJS('JSON.stringify(window.__wrapBox())'));

    /* The premise, measured: the panel is sitting ON its own cap, so its content wanted at least
       that much width. A fixture whose values got shorter would fail here instead of passing the
       claims below for the wrong reason. */
    assert.equal(Math.round(b.maxWidth), Math.round(18 * b.rootPx), 'the panel should be capped at 18rem');
    assert.ok(b.panelWidth >= b.maxWidth - 1,
      `the fixture's values are too short to prove anything: the panel settled at ${Math.round(b.panelWidth)}px inside a ${Math.round(b.maxWidth)}px cap`);

    assert.ok(b.listScrollWidth <= b.listClientWidth + 1,
      `the value list carries ${Math.round(b.listScrollWidth - b.listClientWidth)}px of text that can only be reached by scrolling sideways`);
    assert.ok(b.rowHeight >= b.oneLineHeight * 1.5,
      `a value wider than the panel must take more than one line, this row is ${Math.round(b.rowHeight)}px against ${Math.round(b.oneLineHeight)}px for one line`);
  });
});

test('a filter panel in a numeric header is not right-aligned, mono or header-sized', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await open(p, NUM_BTN);

    /* The premise again: the header really does carry the alignment and the font the panel must
       refuse. `.fdy-table__num` on a <th> is documented markup, so this is the shipped case. */
    const th = JSON.parse(await p.evalJS(`JSON.stringify((function () {
      var cs = getComputedStyle(document.querySelector('thead th:last-child'));
      return { textAlign: cs.textAlign, fontFamily: cs.fontFamily, fontSize: cs.fontSize };
    })())`));
    assert.equal(th.textAlign, 'right', 'the numeric header should be right-aligned, or this proves nothing');
    assert.match(th.fontFamily, /mono/i, 'the numeric header should be set in the data font');

    const n = JSON.parse(await p.evalJS('JSON.stringify(window.__numBox())'));
    /* Measured against the SLACK, the room an alignment has to move the ink in, rather than against
       a pixel tolerance: half the slack is dead centre, so this one number separates left from
       centre from right whatever font the machine resolves, and it does not care that a Range rect
       rounds to whole pixels. */
    const slack = n.contentWidth - n.titleInkWidth;
    const inset = n.titleInkLeft - n.contentLeft;
    assert.ok(slack > 20, `the title must be narrower than the panel for this to mean anything, slack is ${Math.round(slack)}px`);
    assert.ok(inset < slack / 2,
      `the panel's title sits ${Math.round(inset)}px into ${Math.round(slack)}px of slack: the header's alignment reached it`);
    assert.equal(n.titleFont, n.bodyFont,
      'the panel title is prose and must be set in the body font, like the inputs under it');
    assert.equal(n.sepFontSize, n.inputFontSize,
      'the range separator carries no size of its own, so the panel must give it the body size rather than the header size');
  });
});
