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

test('FreedaySortable.move runs the same contract, refuses with a reason, and focus waits for a late render', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    const refused = await p.evalJS(`FreedaySortable.move(document.querySelector('#todo > li[data-key="b"]'), document.getElementById('review'), 0)`);
    assert.equal(refused, false);
    assert.equal(await p.evalJS('window.live()'), 'Bravo has not been estimated.', 'the refusal is spoken');
    assert.equal(await p.evalJS('window.events.length'), 0);

    const bad = await p.evalJS(`(() => { try { FreedaySortable.move(document.body, document.getElementById('done'), 0); return 'no error'; } catch (e) { return e.name; } })()`);
    assert.equal(bad, 'TypeError', 'an item outside any sortable list is a programming error');

    const ok = await p.evalJS(`FreedaySortable.move(document.querySelector('#todo > li[data-key="a"]'), document.getElementById('done'), 0)`);
    assert.equal(ok, true);
    assert.equal(await p.evalJS('window.lanes()'), 'todo:bce doing:topd done:a off:o full:f review:rtail solo:s');
    await p.waitFor(`document.activeElement === document.getElementById('hA')`);

    await p.evalJS(`document.getElementById('moveSA').focus(); window.moved = FreedaySortable.move(document.querySelector('#slow1 > li[data-key="sa"]'), document.getElementById('slow2'), 0)`);
    assert.equal(await p.evalJS('window.moved'), true);
    assert.equal(await p.evalJS('document.activeElement.id'), 'moveSA', 'nothing to focus until the app renders');
    await p.waitFor(`document.activeElement && document.activeElement.id === 'hSA2'`);
  });
});

test('keyboard: lift, carry across lists, drop once, and focus stays on the handle', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    assert.equal(await p.axName('#hA'), 'Move Alpha. Drag, or press Space to lift it.');
    await p.evalJS(`document.getElementById('hA').focus()`);
    await p.pressEnter();
    assert.equal(await p.evalJS(`window.marks('todo')`), 'a~ b c e');
    assert.equal(await p.evalJS('window.live()'), 'Alpha lifted. To do, position 1 of 4. Arrow keys move it, Space drops it, Escape cancels.');

    await p.pressKey('ArrowRight');
    assert.equal(await p.evalJS('window.live()'), 'Doing, position 2 of 3.', 'the slot above the pinned row is skipped');
    assert.equal(await p.evalJS(`window.marks('doing')`), 'top d^');
    await p.pressKey('ArrowRight');
    assert.equal(await p.evalJS('window.live()'), 'Done, position 1 of 1.');
    assert.equal(await p.evalJS(`window.listMark('done')`), 'into');
    await p.pressKey('ArrowLeft');
    assert.equal(await p.evalJS('window.live()'), 'Doing, position 2 of 3.');
    await p.pressKey('ArrowDown');
    assert.equal(await p.evalJS('window.live()'), 'Doing, position 3 of 3.');
    assert.equal(await p.evalJS(`window.marks('doing')`), 'top dv');
    assert.equal(await p.evalJS('window.events.length'), 0, 'nothing is committed while carried');

    await p.pressEnter();
    assert.equal(await p.evalJS('window.lanes()'), 'todo:bce doing:topda done: off:o full:f review:rtail solo:s');
    assert.deepEqual(await json(p, 'window.events.map(e => [e.key, e.from, e.to, e.fromList, e.toList])'), [['a', 0, 2, 'todo', 'doing']],
      'exactly one change, for the list it was dropped in');
    assert.equal(await p.evalJS('window.live()'), 'Alpha moved to Doing, position 3 of 3.');
    await p.waitFor(`document.activeElement === document.getElementById('hA')`);
  });
});

test('keyboard: Escape and blur put the item back; a pointer click lifts nothing, an activation click does', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    await p.evalJS(`document.getElementById('hB').focus()`);
    await p.pressEnter();
    await p.pressKey('ArrowRight');
    await p.pressKey('Escape');
    assert.equal(await p.evalJS('window.live()'), 'Move cancelled. Bravo is back in To do, position 2.');
    assert.equal(await p.evalJS(`window.marks('todo') + ' | ' + window.marks('doing')`), 'a b c e | top d');

    await p.pressEnter();
    assert.equal(await p.evalJS(`window.marks('todo')`), 'a b~ c e');
    await p.evalJS(`document.getElementById('hC').focus()`);
    assert.equal(await p.evalJS(`window.marks('todo')`), 'a b c e', 'focus leaving the handle drops the lift');

    await p.evalJS(`document.getElementById('hC').click()`);
    assert.equal(await p.evalJS(`window.marks('todo')`), 'a b c~ e', 'a click with no pointer behind it (detail 0), as a screen reader sends, lifts');
    await p.pressKey('Escape');

    await p.clickCenter('#hE');
    assert.equal(await p.evalJS(`window.marks('todo')`), 'a b c e', 'a real pointer click without travel lifts nothing');
    assert.equal(await p.evalJS('window.events.length'), 0);
  });
});

test('keyboard: disabled lists are skipped, refused ones are landed on and say why, and right-to-left mirrors the arrows', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    await p.evalJS(`document.getElementById('hD').focus()`);
    await p.pressEnter();
    await p.pressKey('ArrowRight');
    assert.equal(await p.evalJS('window.live()'), 'Done, position 1 of 1.');
    await p.pressKey('ArrowRight');
    assert.equal(await p.evalJS('window.live()'), 'Full, position 1 of 2. Full is at its limit (1 of 1).', 'Off is disabled and skipped');
    assert.equal(await p.evalJS(`window.listMark('full')`), 'refused');
    await p.pressEnter();
    assert.equal(await p.evalJS('window.live()'), 'Full is at its limit (1 of 1).', 'dropping on a refused list repeats why');
    assert.equal(await p.evalJS(`window.marks('doing')`), 'top d~', 'and holds on to the item');
    await p.pressKey('Escape');
    assert.equal(await p.evalJS('window.events.length'), 0);

    await p.evalJS(`document.getElementById('board').dir = 'rtl'; document.getElementById('hB').focus()`);
    await p.pressEnter();
    await p.pressKey('ArrowLeft');
    assert.match(await p.evalJS('window.live()'), /^Doing, /, 'right to left, the left arrow goes to the next list');
    await p.pressKey('Escape');
  });
});

test('keyboard: a screen-reader activation takes focus for the handle', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    await p.evalJS(`document.activeElement.blur()`);
    await p.evalJS(`document.getElementById('hC').click()`);
    assert.equal(await p.evalJS(`window.marks('todo')`), 'a b c~ e');
    assert.equal(await p.evalJS('document.activeElement.id'), 'hC', 'the lift moves focus to its handle');
    await p.pressKey('Escape');
    assert.equal(await p.evalJS(`window.marks('todo')`), 'a b c e');
  });
});

test('keyboard: a list with no slot to arrive in refuses, marks nothing, and holds on', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    await p.evalJS(`document.getElementById('hSA').focus()`);
    await p.pressEnter();
    await p.pressKey('ArrowRight');
    await p.pressKey('ArrowRight');
    assert.equal(await p.evalJS('window.live()'), 'Pinned only, position 2 of 2. Pinned only does not take Sierra.');
    assert.equal(await p.evalJS(`window.listMark('slowpin')`), 'refused');
    assert.equal(await p.evalJS(`window.marks('slowpin')`), 'zp', 'no landing line');
    await p.pressEnter();
    assert.equal(await p.evalJS('window.live()'), 'Pinned only does not take Sierra.');
    assert.equal(await p.evalJS(`window.marks('slow1')`), 'sa~');
    await p.pressKey('Escape');
    assert.equal(await p.evalJS('window.events.length'), 0);
  });
});

test('a drag held at the edge of a scroll container scrolls it, and lands on what came into view', { skip }, async () => {
  await withPage(fixture('vanilla-sortable-group.html'), async (p) => {
    await board(p);
    const t0 = await p.centerXY('#hT0');
    const edge = await json(p, `(() => { const r = document.getElementById('scroller').getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.bottom - 4) }; })()`);
    await p.dragFromTo(t0.x, t0.y, edge.x, edge.y, async () => { await sleep(700); });
    const scrolled = await p.evalJS(`document.getElementById('scroller').scrollTop`);
    assert.ok(scrolled > 0, `the container scrolled while the pointer was held still (scrollTop ${scrolled})`);
    const order = (await p.evalJS('window.tallOrder()')).split(' ');
    assert.ok(order.indexOf('t0') >= 6, `T0 landed against a row that started out of view, got: ${order.join(' ')}`);
  });
});

test('Vue: a cancelled move between lists moves the row between two arrays, and focus follows it', { skip }, async () => {
  await withPage(fixture('vue-sortable-group.html'), async (p) => {
    await p.waitFor('typeof window.vueLanes === "function" && document.querySelector("#vdone[data-fdy-sortable-ready]")');
    await p.evalJS(`document.getElementById('va').focus()`);
    await p.pressEnter();
    await p.pressKey('ArrowRight');
    await p.pressEnter();
    assert.equal(await p.evalJS('window.vueLanes()'), 'todo:b done:ac', 'the app moved the row between its arrays');
    assert.equal(await p.evalJS(`Array.from(document.querySelectorAll('#vdone > li')).map(l => l.dataset.key).join('')`), 'ac',
      'and Vue rendered it; the kit moved nothing behind its back');
    await p.waitFor(`document.activeElement === document.getElementById('va')`);

    const b = await p.centerXY('#vb');
    const afterC = await at(p, '#vdone > li[data-key="c"]', 0.8);
    await p.dragFromTo(b.x, b.y, afterC.x, afterC.y);
    assert.equal(await p.evalJS('window.vueLanes()'), 'todo: done:acb', 'a drag reaches the state the same way');
  });
});

test('Blazor: sortOn cancels the move in the same turn and hands the detail to .NET', { skip }, async () => {
  await withPage(fixture('blazor-sortable.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && typeof window.token === "number"');
    await p.evalJS(`document.getElementById('hA').focus()`);
    await p.pressKey('ArrowDown');
    assert.equal(await p.evalJS('window.order()'), 'ab', 'the DOM is Blazor’s: the kit moved nothing');
    assert.deepEqual(await json(p, 'window.calls'), [{ method: 'OnSortChange', detail: {
      key: 'a', from: 0, to: 1, order: ['b', 'a'], fromList: null, toList: null, fromOrder: ['b', 'a'],
    } }]);

    await p.evalJS('FreedayBlazor.off(window.token)');
    await p.pressKey('ArrowDown');
    assert.equal(await p.evalJS('window.order()'), 'ba', 'after off(), nobody cancels, so the kit moves the row');
  });
});
