/* Browser regression spec, the sortable list (CATATAN-FREEDAY §15).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * A drag is Pointer Events under a held button, and a keyboard step is a real key on a focused
 * handle; neither is proven by dispatching synthetic events, so both are driven over CDP. The Vue
 * half is the shape every framework consumer needs: the event cancelled, the state reordered, and
 * focus landing back on the moved row's handle after Vue replaced its position in the DOM.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const json = async (p, expr) => JSON.parse(await p.evalJS(`JSON.stringify(${expr})`));
before(async () => {
  if (skip === false) await buildEntries();
});

/* The lower quarter of a row: a point that reads as "after this row". */
const lowerOf = async (p, sel) => json(p, `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height * 0.8) }; })()`);

test('a mouse drag shows where the row lands, moves nothing until release, then moves it', { skip }, async () => {
  await withPage(fixture('vanilla-sortable.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedaySortable');
    const from = await p.centerXY('#hA');
    const to = await lowerOf(p, '#list > li[data-key="c"]');
    let midDrag = '';
    let midOrder = '';
    await p.dragFromTo(from.x, from.y, to.x, to.y, async () => {
      midDrag = await p.evalJS('window.marks()');
      midOrder = await p.evalJS('window.order()');
    });
    assert.equal(midDrag, 'a* b cv d z', 'mid-drag: the dragged row is marked, and the landing line sits after Charlie');
    assert.equal(midOrder, 'abcdz', 'nothing moves while the button is held');
    assert.equal(await p.evalJS('window.order()'), 'bcadz', 'released, the kit moved the row (nobody cancelled)');
    assert.equal(await p.evalJS('window.marks()'), 'b c a d z', 'and cleared every drag state');
    assert.deepEqual(await json(p, 'window.events'), [{ key: 'a', from: 0, to: 2, order: ['b', 'c', 'a', 'd', 'z'], cancelable: true }]);
    assert.equal(await p.evalJS('window.live()'), 'Alpha moved to position 3 of 5.');
  });
});

test('Escape cancels a drag, a press without travel is a click, and a fixed row cannot be passed', { skip }, async () => {
  await withPage(fixture('vanilla-sortable.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedaySortable');
    const a = await p.centerXY('#hA');
    const c = await lowerOf(p, '#list > li[data-key="c"]');
    await p.dragFromTo(a.x, a.y, c.x, c.y, async () => { await p.pressKey('Escape'); });
    assert.equal(await p.evalJS('window.order()'), 'abcdz', 'Escape mid-drag leaves the order alone');

    await p.clickCenter('#hB');
    assert.equal(await p.evalJS('window.events.length'), 0, 'a click on the handle is not a reorder');

    const z = await lowerOf(p, '#list > li[data-key="z"]');
    const d = await p.centerXY('#hD');
    await p.dragFromTo(d.x, d.y, z.x, z.y);
    assert.equal(await p.evalJS('window.order()'), 'abcdz', 'nothing lands past the pinned row');
    assert.equal(await p.evalJS('window.events.length'), 0);
  });
});

test('arrow keys move a row one step, keep focus on its handle, and respect fixed and disabled', { skip }, async () => {
  await withPage(fixture('vanilla-sortable.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedaySortable');
    assert.equal(await p.axName('#hB'), 'Move Bravo. Drag, or press the up and down arrow keys.',
      'a handle with no aria-label of its own is named for its row');

    await p.evalJS(`document.getElementById('hB').focus()`);
    await p.pressKey('ArrowUp');
    assert.equal(await p.evalJS('window.order()'), 'bacdz');
    await p.waitFor(`document.activeElement === document.getElementById('hB')`);
    assert.equal(await p.evalJS('window.live()'), 'Bravo moved to position 1 of 5.');

    await p.pressKey('ArrowUp');
    assert.equal(await p.evalJS('window.order()'), 'bacdz', 'the first row has nowhere further up to go');

    await p.evalJS(`document.getElementById('hD').focus()`);
    await p.pressKey('ArrowDown');
    assert.equal(await p.evalJS('window.order()'), 'bacdz', 'Delta cannot step past the pinned row');

    await p.evalJS(`document.getElementById('list').setAttribute('data-disabled', '')`);
    await p.waitFor(`document.getElementById('hD').getAttribute('aria-disabled') === 'true'`);
    await p.pressKey('ArrowUp');
    assert.equal(await p.evalJS('window.order()'), 'bacdz', 'a disabled list ignores the keys');
    const d = await p.centerXY('#hD');
    const a = await lowerOf(p, '#list > li[data-key="a"]');
    await p.dragFromTo(d.x, d.y, a.x, a.y - 20);
    assert.equal(await p.evalJS('window.order()'), 'bacdz', 'and the pointer');
  });
});

test('a cancelled fdy-sort-change leaves the DOM exactly as it was', { skip }, async () => {
  await withPage(fixture('vanilla-sortable.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedaySortable');
    await p.evalJS(`document.getElementById('hX').focus()`);
    await p.pressKey('ArrowDown');
    assert.deepEqual(await json(p, 'window.refused'), ['yx'], 'the app heard the proposed order');
    assert.equal(await p.evalJS(`Array.from(document.querySelectorAll('#refused > li')).map(l => l.dataset.key).join('')`), 'xy',
      'and having cancelled it, the kit must not have moved anything');
  });
});

test('Vue: a cancelled change reorders state, and focus follows the row by data-key', { skip }, async () => {
  await withPage(fixture('vue-sortable.html'), async (p) => {
    await p.waitFor('typeof window.vueOrder === "function" && document.querySelector("#vlist[data-fdy-sortable-ready]")');

    await p.evalJS(`document.getElementById('va').focus()`);
    await p.pressKey('ArrowDown');
    assert.equal(await p.evalJS('window.vueOrder()'), 'bac', 'the app reordered its state from detail.order');
    assert.equal(await p.evalJS(`Array.from(document.querySelectorAll('#vlist > li')).map(l => l.dataset.key).join('')`), 'bac',
      'and Vue rendered it; the kit moved nothing behind its back');
    await p.waitFor(`document.activeElement === document.getElementById('va')`);

    const c = await p.centerXY('#vc');
    const top = await json(p, `(() => { const r = document.querySelector('#vlist > li').getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height * 0.2) }; })()`);
    await p.dragFromTo(c.x, c.y, top.x, top.y);
    assert.equal(await p.evalJS('window.vueOrder()'), 'cba', 'a drag reaches the state the same way');
  });
});
