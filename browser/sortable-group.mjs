/* Browser regression spec, sortable groups: moving items between lists (spec
 * docs/superpowers/specs/2026-11-27-sortable-groups-design.md). Run via `npm run test:browser`;
 * NOT part of the default `node --test` gate. Auto-skips without Chrome.
 *
 * Drags are real Pointer Events and keys are real key events, both driven over CDP: the kit's
 * behaviour under pointer capture and button activation is exactly what synthetic events skip.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
before(async () => {
  if (skip === false) await buildEntries();
});

/* A point inside `sel`, centred across, at a fraction of its height: 0.2 reads "before", 0.8 "after". */
const at = async (p, sel, fy) => json(p, `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height * ${fy}) }; })()`);
/* Wide enough that the whole board is one row, so every list is as tall as the tallest. */
const board = async (p) => {
  await p.setViewport(1280, 800);
  await p.waitFor('document.readyState === "complete" && window.FreedaySortable');
};
const START = 'todo:abce doing:topd done: off:o full:f review:rtail solo:s';

test('a drag carries an item into another list, and the event names both lists', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    const from = await p.centerXY('#hA');
    const to = await at(p, '#doing > li[data-key="d"]', 0.8);
    let mid = '';
    await p.dragFromTo(from.x, from.y, to.x, to.y, async () => { mid = await p.evalJS(`window.marks('doing')`); });
    assert.equal(mid, 'top dv', 'mid-drag, the landing line sits after Delta in the other list');
    assert.equal(await p.evalJS('window.lanes()'), 'todo:bce doing:topda done: off:o full:f review:rtail solo:s');
    assert.deepEqual(await json(p, 'window.events'), [{
      on: 'doing', key: 'a', from: 0, to: 2, order: ['top', 'd', 'a'],
      fromList: 'todo', toList: 'doing', fromOrder: ['b', 'c', 'e'], cancelable: true,
    }], 'one event, on the destination, naming both lists');
    assert.equal(await p.evalJS('window.live()'), 'Alpha moved to Doing, position 3 of 3.');

    const b = await p.centerXY('#hB');
    const s = await p.centerXY('#solo > li');
    await p.dragFromTo(b.x, b.y, s.x, s.y);
    assert.equal(await p.evalJS('window.lanes()'), 'todo:bce doing:topda done: off:o full:f review:rtail solo:s',
      'a list outside the group is never a destination');
    assert.equal(await p.evalJS('window.events.length'), 1);
  });
});

test('an empty list, and the space under the last item, take the item at the end', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    assert.equal(await p.evalJS(`getComputedStyle(document.getElementById('done')).minHeight === getComputedStyle(document.getElementById('hA')).height`),
      true, 'an empty grouped list keeps a control-height target from the kit');

    const a = await p.centerXY('#hA');
    const done = await at(p, '#done', 0.5);
    let mark = '';
    await p.dragFromTo(a.x, a.y, done.x, done.y, async () => { mark = await p.evalJS(`window.listMark('done')`); });
    assert.equal(mark, 'into', 'an empty list is marked as a whole');
    assert.equal(await p.evalJS('window.lanes()'), 'todo:bce doing:topd done:a off:o full:f review:rtail solo:s');

    const b = await p.centerXY('#hB');
    const below = await at(p, '#doing', 0.95);
    let mid = '';
    await p.dragFromTo(b.x, b.y, below.x, below.y, async () => { mid = await p.evalJS(`window.marks('doing')`); });
    assert.equal(mid, 'top dv', 'below the last item, the line sits after it');
    assert.equal(await p.evalJS('window.lanes()'), 'todo:ce doing:topdb done:a off:o full:f review:rtail solo:s');
    assert.deepEqual(await json(p, 'window.events.map(e => [e.key, e.toList, e.to])'), [['a', 'done', 0], ['b', 'doing', 2]]);
  });
});

test('fixed items keep their end: nothing lands outside them, and they never leave', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    const a = await p.centerXY('#hA');
    const above = await at(p, '#doing > li[data-key="top"]', 0.2);
    let mid = '';
    await p.dragFromTo(a.x, a.y, above.x, above.y, async () => { mid = await p.evalJS(`window.marks('doing')`); });
    assert.equal(mid, 'top d', 'no line above the leading pinned row');

    const afterTail = await at(p, '#review > li[data-key="tail"]', 0.8);
    await p.dragFromTo(a.x, a.y, afterTail.x, afterTail.y);
    const under = await at(p, '#review', 0.95);
    await p.dragFromTo(a.x, a.y, under.x, under.y);
    const pinned = await p.centerXY('#hTop');
    const done = await at(p, '#done', 0.5);
    await p.dragFromTo(pinned.x, pinned.y, done.x, done.y);
    assert.equal(await p.evalJS('window.lanes()'), START, 'nothing landed below the trailing pinned row, and the pinned row stayed');
    assert.equal(await p.evalJS('window.events.length'), 0);

    const r = await at(p, '#review > li[data-key="r"]', 0.8);
    await p.dragFromTo(a.x, a.y, r.x, r.y);
    assert.equal(await p.evalJS('window.lanes()'), 'todo:bce doing:topd done: off:o full:f review:ratail solo:s',
      'the slot between the ends is open');
  });
});

test('a grouped list with no data-key is reported, and the lists after it still initialise', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    const result = await json(p, `(() => {
      const host = document.createElement('div');
      host.innerHTML = '<ul data-fdy-sortable="lost" id="nokey"></ul><ul data-fdy-sortable="lost" data-key="ok" id="haskey"></ul>';
      document.body.appendChild(host);
      const seen = [];
      /* Over file:// the kit script is cross-origin to the page, so the browser mutes an 'error'
         event to "Script error." and hides the error. Wrapping reportError, which the kit calls by
         name at report time, sees the real one. */
      const original = window.reportError;
      window.reportError = (err) => { seen.push(err.name + ': ' + err.message); };
      let threw = false;
      try { FreedaySortable.initAll(host); } catch (err) { threw = true; }
      window.reportError = original;
      return { seen, threw, ready: document.getElementById('haskey').dataset.fdySortableReady || null };
    })()`);
    assert.equal(result.threw, false, 'initAll does not unwind its caller');
    assert.equal(result.ready, '1', 'the list after the bad one was initialised');
    assert.equal(result.seen.length, 1);
    assert.match(result.seen[0], /^TypeError: .*"lost"/);
  });
});

test('a refused list says why while the item is held, takes nothing, and is asked once per gesture', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    const a = await p.centerXY('#hA');
    const full = await at(p, '#full > li', 0.8);
    let seen = null;
    await p.dragFromTo(a.x, a.y, full.x, full.y, async () => {
      seen = { mark: await p.evalJS(`window.listMark('full')`), lines: await p.evalJS(`window.marks('full')`), pill: await json(p, 'window.pill()'), live: await p.evalJS('window.live()') };
    });
    assert.deepEqual(seen, {
      mark: 'refused', lines: 'f',
      pill: { shown: true, text: 'Full is at its limit (1 of 1).', hits: false },
      live: 'Full is at its limit (1 of 1).',
    }, 'refused while held: marked, no landing line, the reason shown and spoken, and the pill never in the way of hit testing');
    assert.equal(await p.evalJS('window.lanes()'), START, 'released there, nothing moved');
    assert.equal((await json(p, 'window.pill()')).shown, false, 'and the pill is gone');

    const b = await p.centerXY('#hB');
    const review = await at(p, '#review > li[data-key="r"]', 0.2);
    let reason = '';
    await p.dragFromTo(b.x, b.y, review.x, review.y, async () => {
      /* More moves inside the refused list: the kit must not ask again within one gesture. */
      for (const dy of [2, 4, 6]) {
        await p.evalJS(`document.getElementById('hB').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: ${review.x}, clientY: ${review.y + dy} }))`);
      }
      reason = (await json(p, 'window.pill()')).text;
    });
    assert.equal(reason, 'Bravo has not been estimated.');
    assert.deepEqual(await json(p, `window.checks.filter(c => c.startsWith('review:'))`), ['review:b'], 'asked once for that list across the gesture');

    const c = await p.centerXY('#hC');
    await p.dragFromTo(c.x, c.y, review.x, review.y, async () => { reason = (await json(p, 'window.pill()')).text; });
    assert.equal(reason, 'Review does not take Charlie.', 'refuse() with no reason still refuses, in the kit’s words');

    const e = await p.centerXY('#hE');
    const done = await at(p, '#done', 0.5);
    await p.dragFromTo(e.x, e.y, done.x, done.y, async () => {
      await p.evalJS(`document.getElementById('done').setAttribute('data-fdy-sort-refuse', 'Closed for the day.')`);
    });
    assert.equal(await p.evalJS('window.lanes()'), START, 'a list refused mid-gesture is not dropped into');
    assert.equal(await p.evalJS('window.events.length'), 0);
  });
});
