/* Browser regression spec, a tab strip that runs down the page.
 * Reported as section 7 of improvement-notes/CATATAN-FREEDAY.md, cited below as (notes 7).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * Reported by an app whose settings screen wanted a list of sections on the left and the section on
 * the right. `.fdy-tabs` only ever ran sideways, and `freeday-tabs.js` only ever answered to ←/→,
 * so the app wrote its own tablist: `aria-orientation="vertical"` in the markup and a hand-rolled
 * ↑/↓/Home/End handler in the view. The handler is the part that matters. A vertical tablist's
 * keyboard is a fixed WAI-ARIA pattern, the kit already shipped its horizontal half, and an app
 * reimplementing it is an app that may get it subtly wrong with nobody to tell it.
 *
 * Two claims a source read cannot make, so they are measured here:
 *   1. the axis is read from the ATTRIBUTE, so a strip without it is untouched. That is the whole
 *      safety of this change: every `.fdy-tabs` already shipped answers to ←/→ and must keep doing
 *      exactly that, down to the 2px underline and the panel sitting below the strip.
 *   2. vertical is vertical in COORDINATES. A class that is present but reaches nothing looks
 *      identical to a class that works, in the DOM and in a snapshot of the stylesheet.
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
  /* The panel reveal animation is running at load, and it moves the box this spec measures. */
  await p.waitFor('document.getAnimations().every((a) => a.playState !== "running")');
};
const widget = async (p, id) => JSON.parse(await p.evalJS(`JSON.stringify(window.widget(${JSON.stringify(id)}))`));
const tone = async (p, token) => JSON.parse(await p.evalJS(`JSON.stringify(window.tone(${JSON.stringify(token)}))`));
const rgb = (css) => { const m = css.match(/\d+/g); return { r: Number(m[0]), g: Number(m[1]), b: Number(m[2]) }; };
const same = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b;

/** The one tab the widget hands the keyboard: there must be exactly one, and it must be selected. */
const assertRovingTabindex = (w, where) => {
  const stops = w.tabStops.filter((t) => t.tabIndex === 0);
  assert.deepEqual(stops.map((t) => t.id), w.selected,
    `${where}: the single tab stop must be the selected tab, got stops ${JSON.stringify(w.tabStops)} against selected ${JSON.stringify(w.selected)}`);
  for (const t of w.tabStops) {
    if (t.id !== w.selected[0]) {
      assert.equal(t.tabIndex, -1, `${where}: ${t.id} is not selected and still owns a tab stop (${t.tabIndex})`);
    }
  }
};

test('the keyboard axis is read from aria-orientation (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);
    assert.equal((await widget(p, 'vert')).ready, '1', 'the enhancer never initialised, nothing below tests anything');

    await p.clickCenter('#v-1');
    for (const expected of ['v-2', 'v-3', 'v-1']) {
      await p.pressKey('ArrowDown');
      const w = await widget(p, 'vert');
      assert.deepEqual(w.selected, [expected], `ArrowDown should land on ${expected}, the third press is the wrap`);
      assert.equal(w.focused, expected, `ArrowDown must take focus with it, not only the selection (at ${expected})`);
      assert.deepEqual(w.shownPanels, [expected.replace('v-', 'vp-')], `the panel must follow the tab (at ${expected})`);
      assertRovingTabindex(w, `vert after ArrowDown to ${expected}`);
    }

    await p.pressKey('ArrowUp');
    const up = await widget(p, 'vert');
    assert.deepEqual(up.selected, ['v-3'], 'ArrowUp from the first tab wraps to the last');
    assertRovingTabindex(up, 'vert after ArrowUp');
  });
});

test('a vertical tablist leaves the horizontal arrows to the page (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);
    await p.clickCenter('#v-1');
    /* APG maps one axis per tablist. The second axis is not generosity: ←/→ belongs to whatever
       else is on the page — a caret, a horizontal scroller — and a tablist that swallows it has
       taken a key it was never promised. */
    for (const key of ['ArrowRight', 'ArrowLeft']) {
      await p.pressKey(key);
      const w = await widget(p, 'vert');
      assert.deepEqual(w.selected, ['v-1'], `${key} must not move a vertical tablist`);
      assert.equal(w.focused, 'v-1', `${key} must not move focus in a vertical tablist`);
    }
  });
});

test('Home and End answer on either axis (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);

    await p.clickCenter('#v-1');
    await p.pressKey('End');
    assert.deepEqual((await widget(p, 'vert')).selected, ['v-3'], 'End goes to the last tab, vertical');
    await p.pressKey('Home');
    const vHome = await widget(p, 'vert');
    assert.deepEqual(vHome.selected, ['v-1'], 'Home goes to the first tab, vertical');
    assertRovingTabindex(vHome, 'vert after Home');

    await p.clickCenter('#h-1');
    await p.pressKey('End');
    assert.deepEqual((await widget(p, 'horiz')).selected, ['h-3'], 'End goes to the last tab, horizontal');
    await p.pressKey('Home');
    const hHome = await widget(p, 'horiz');
    assert.deepEqual(hHome.selected, ['h-1'], 'Home goes to the first tab, horizontal');
    assertRovingTabindex(hHome, 'horiz after Home');
  });
});

test('a strip with no aria-orientation is the strip that already shipped (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);
    const before = await widget(p, 'horiz');

    assert.equal(before.orientation, null,
      'nothing may write an orientation onto a plain strip: the attribute is the contract, and it must stay absent');
    assert.equal(before.listDirection, 'row', 'a plain strip lays its tabs out in a row');
    assert.equal(before.tabs[0].box.y, before.tabs[1].box.y, 'the tabs of a plain strip share a row');
    assert.ok(before.tabs[1].box.x > before.tabs[0].box.x,
      `a plain strip runs left to right, got x ${before.tabs[0].box.x} then ${before.tabs[1].box.x}`);
    assert.ok(before.panel.y >= before.list.bottom - 1,
      `a plain strip's panel sits BELOW it, got panel y ${before.panel.y} against list bottom ${before.list.bottom}`);
    assert.equal(before.tabs[0].borderBottomWidth, '2px',
      'the selected tab of a plain strip keeps the 2px underline it has had since the beginning');
    assert.equal(rgb(before.tabs[0].background).r + rgb(before.tabs[0].background).g, 0,
      `a plain strip marks selection with the underline and nothing else, got background ${before.tabs[0].background}`);

    await p.clickCenter('#h-1');
    await p.pressKey('ArrowRight');
    assert.deepEqual((await widget(p, 'horiz')).selected, ['h-2'], 'ArrowRight still moves a plain strip');
    await p.pressKey('ArrowDown');
    assert.deepEqual((await widget(p, 'horiz')).selected, ['h-2'],
      'ArrowDown must stay unmapped on a horizontal strip: a page that scrolls on it keeps scrolling');
  });
});

test('vertical is vertical in coordinates, not in class names (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);
    const w = await widget(p, 'vert');

    assert.equal(w.listDirection, 'column', 'the list stacks its tabs');
    assert.equal(w.tabs[0].box.x, w.tabs[1].box.x, 'stacked tabs share a left edge');
    assert.ok(w.tabs[1].box.y >= w.tabs[0].box.bottom,
      `the second tab sits under the first, got y ${w.tabs[1].box.y} against bottom ${w.tabs[0].box.bottom}`);

    /* The column is sized through the documented component token, not a width on the flex item:
       `flex:none` plus a width an app sets from outside is the shape that silently does nothing. */
    assert.equal(w.list.w, 192, `--fdy-tabs-list-w:12rem must size the column, got ${w.list.w}px`);

    assert.ok(w.panel.x >= w.list.right,
      `the panel must start where the list ends, got panel x ${w.panel.x} against list right ${w.list.right}`);
    assert.ok(Math.abs(w.panel.y - w.list.y) <= 2,
      `the panel's first line must align with the first tab, got panel y ${w.panel.y} against list y ${w.list.y}`);
    assert.ok(w.panel.w > 300,
      `the panel must take the rest of the row, got ${w.panel.w}px of a 760px widget`);

    /* A tab in a fixed column is not a tab in an unbounded row: centred text and nowrap are both
       wrong there, and both are inherited from the horizontal rules unless the variant says so. */
    assert.ok(['start', 'left'].includes(w.tabs[0].textAlign),
      `a tab in a column reads from its leading edge, got text-align ${w.tabs[0].textAlign}`);
  });
});

test('the vertical selected tab is a soft fill and no underline (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);
    const soft = await tone(p, '--color-primary-soft');
    const w = await widget(p, 'vert');

    assert.deepEqual(w.selected, ['v-1'], 'the fixture starts on the first tab');
    assert.ok(same(rgb(w.tabs[0].background), soft),
      `the selected tab wears --color-primary-soft, the ink the kit already spends on "you are here" in a vertical list; got ${w.tabs[0].background} against ${JSON.stringify(soft)}`);
    assert.equal(w.tabs[0].borderBottomWidth, '0px',
      'an underline under a tab in a column points at the tab below it, so the variant drops it');
    assert.equal(rgb(w.tabs[1].background).r + rgb(w.tabs[1].background).g, 0,
      `an unselected tab in a column is unpainted, got ${w.tabs[1].background}`);
  });
});

test('the class alone is enough: the orientation is written for it (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);
    /* A widget that looks vertical and answers to ←/→ is the silent half-adoption this avoids:
       the app writes one marker, and the ARIA a screen reader announces can never disagree with it. */
    const w = await widget(p, 'derived');
    assert.equal(w.orientation, 'vertical',
      'a .fdy-tabs--vertical whose tablist says nothing must be given the orientation it displays');

    await p.clickCenter('#d-1');
    await p.pressKey('ArrowDown');
    assert.deepEqual((await widget(p, 'derived')).selected, ['d-2'], 'and the keyboard follows what was written');
  });
});

test('an explicit aria-orientation outranks the class (notes 7)', { skip }, async () => {
  await withPage(fixture('vanilla-tabs-vertical.html'), async (p) => {
    await open(p);
    const w = await widget(p, 'forced');
    assert.equal(w.orientation, 'horizontal',
      'the attribute is what an assistive technology reads, so nothing may overwrite one an author wrote');

    await p.clickCenter('#f-1');
    await p.pressKey('ArrowDown');
    assert.deepEqual((await widget(p, 'forced')).selected, ['f-1'], 'ArrowDown is unmapped here, the attribute said horizontal');
    await p.pressKey('ArrowRight');
    assert.deepEqual((await widget(p, 'forced')).selected, ['f-2'], 'and ←/→ is the axis the attribute asked for');
  });
});
