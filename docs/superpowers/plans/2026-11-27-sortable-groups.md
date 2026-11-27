# Sortable Groups (3.28.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `data-fdy-sortable` move items between lists of one group (pointer, keyboard lift-then-drop, and a programmatic `move()`), veto a destination before the drop, scroll while a drag nears an edge, and give Blazor a synchronous cancel. Ship as Freeday 3.28.0.

**Architecture:** All behaviour stays in the one vanilla enhancer `src/freeday-sortable.js` (an ES5-style IIFE copied to `dist/` by `node tokens/build.mjs`). A "gesture" object `{item, source, group, verdicts}` is shared by the pointer path, the keyboard lift and `move()`, so legality (`legal`), refusal (`verdict`) and the commit (`commit`) are written once. The Blazor bridge gains one function, `sortOn`. Types live in the Vue and React `index.d.ts`.

**Tech Stack:** Vanilla JS (ES5 style, `var`, no modules), CSS with Freeday tokens, Node `node:test` + Chrome over CDP (`browser/harness.mjs`), Playwright WebKit (`webkit/`), Vue 3 via esbuild entries, .NET 8 xUnit/bUnit.

**Spec:** `docs/superpowers/specs/2026-11-27-sortable-groups-design.md`. Read it before Task 1.

## Global Constraints

- Kit repo root: `/Users/cahyo.d.kurnianto/Data/Project/User Interface Template & Kit/UI KIT`. Every path below is relative to it. The path has spaces: quote it in shell commands.
- Target version **3.28.0** (minor). New detail fields are `### Added` under the CHANGELOG type policy: no existing field changes type.
- An ungrouped list (`data-fdy-sortable` with no value) must behave exactly as in 3.27.0. The five tests in `browser/sortable.mjs` are the guard; only the first test's expected detail object changes (Task 1).
- CSS: tokens only. No hex, no `px` in `src/components/*.css`. Inline `style.left = n + 'px'` in JS is allowed (computed geometry).
- Enhancer code style: ES5 (`var`, `function`), `'use strict'`, no arrow functions, no `let`/`const`, every user-facing string in the `TEXT` table and read with `textOf()` (guarded by `test/docs.test.mjs` "the enhancers ship exactly these strings (#006)").
- Comments in English. Docs prose (CHANGELOG, HANDOFF, NEXT-UP) in Indonesian, passed through `/humanizer:humanizer`.
- `jq` is not installed; use `python3` for JSON in shell. macOS has no `timeout`.
- Keep the laptop awake during `npm run test:browser` (sleep hangs CDP).
- Never `npm publish`. Release by tag (Task 10).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Map

| File | Change | Responsibility |
|---|---|---|
| `src/freeday-sortable.js` | rewrite (T1), extend (T2–T5) | the whole behaviour |
| `src/components/sortable.css` | extend (T1, T2, T4) | grouped min-height, landing/refusal/lift states, refusal pill |
| `browser/fixtures/vanilla-sortable-group.html` | create (T1), extend (T3) | board of grouped lists, scroller, slow-render board |
| `browser/sortable-group.mjs` | create (T1), extend (T2–T7) | CDP spec for everything new |
| `browser/sortable.mjs` | edit one assertion (T1) | 3.27.0 regression guard |
| `browser/harness.mjs` | add `pressEnter` (T4), register entry (T6) | test driver |
| `browser/entries/vue-sortable-group.js`, `browser/fixtures/vue-sortable-group.html` | create (T6) | Vue consumer of a group |
| `browser/fixtures/blazor-sortable.html` | create (T7) | Blazor bridge stub |
| `adapters/blazor/freeday-blazor.js` | add `sortOn` (T7) | synchronous cancel for Blazor |
| `adapters/blazor/FdySortChangeDetail.cs`, `test/blazor/FdySortChangeDetailTests.cs` | create (T7) | typed detail for .NET |
| `webkit/sortable-group.spec.mjs` | create (T8) | WebKit drag + auto-scroll |
| `adapters/vue/index.d.ts`, `adapters/react/index.d.ts` | edit (T9) | detail types |
| `COMPONENTS.md` | rewrite sortable section (T9) | public contract |
| `test/docs.test.mjs` | edit TEXT table (T1) | string guard |
| `package.json` | add spec to `test:browser` (T1); version (T10) | |
| `CHANGELOG.md`, `HANDOFF.md`, `NEXT-UP.md`, version stamps | T10 | release |

---

### Task 1: Groups, cross-list pointer drag, landing rules, fixed "keeps its end"

**Files:**
- Rewrite: `src/freeday-sortable.js`
- Modify: `src/components/sortable.css` (append)
- Create: `browser/fixtures/vanilla-sortable-group.html`
- Create: `browser/sortable-group.mjs`
- Modify: `browser/sortable.mjs` (first test's `deepEqual`)
- Modify: `test/docs.test.mjs` (`'freeday-sortable.js'` entry of the TEXT table, ~line 617)
- Modify: `package.json` (`test:browser` list)

**Interfaces:**
- Produces (module-private functions in `freeday-sortable.js`, used by Tasks 2–5): `groupOf(list): string`, `listKey(list): string|null`, `listLabel(list): string`, `groupLists(group): Element[]`, `listAt(group, node): Element|null`, `gestureFor(item): {item, source, group, verdicts: Array<{list, reason}>}`, `fromOf(g): number`, `arrivalRange(dest): {lo, hi}`, `legal(g, dest, slot): boolean`, `landing(dest, slot): {el, cls}`, `clearMarks(g): void`, `pointAt(g, x, y): {list, slot, el, cls}|null`, `commit(g, dest, slot, refocus): void`, `focusMoved(dest, item, key): void`, `report(err): void`. Inside `initSortable`'s closure: `drag` (`{g, started, list, slot, x, y, raf, told}`), `track()`, `end(apply)`.
- "slot" always means an insertion index among the destination's current element children (0..length). For a move within one list, the final index is `slot > from ? slot - 1 : slot`.
- Fixture globals (used by every later task): `window.lanes(): string`, `window.marks(id): string`, `window.listMark(id): 'into'|'refused'|''`, `window.pill(): {shown, text, hits}`, `window.events: object[]`, `window.checks: string[]`, `window.live(): string`, `window.tallOrder(): string`.

- [ ] **Step 1: Write the fixture**

Create `browser/fixtures/vanilla-sortable-group.html`:

```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Freeday — sortable groups, raw path</title>
<link rel="stylesheet" href="../../dist/freeday.bundle.css">
<style>
  body { padding: 24px; }
  #scroller { width: 20rem; height: 10rem; overflow-y: auto; margin-bottom: 24px; }
  #board, #slowboard { display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch; margin-bottom: 24px; }
  #board > ul, #slowboard > ul { flex: 1 1 9rem; margin: 0; }
</style>
<script src="../../dist/freeday.js" defer></script>
</head>
<body>
  <!-- Group "tall": a list longer than its scroll container, for auto-scroll. -->
  <div id="scroller">
    <ul class="fdy-list fdy-sortable" id="tall" data-fdy-sortable="tall" data-key="tall" data-label="Tall">
      <li class="fdy-list__row" data-key="t0" data-label="T0"><button class="fdy-sortable__handle" type="button" id="hT0">≡</button> T0</li>
      <li class="fdy-list__row" data-key="t1" data-label="T1"><button class="fdy-sortable__handle" type="button">≡</button> T1</li>
      <li class="fdy-list__row" data-key="t2" data-label="T2"><button class="fdy-sortable__handle" type="button">≡</button> T2</li>
      <li class="fdy-list__row" data-key="t3" data-label="T3"><button class="fdy-sortable__handle" type="button">≡</button> T3</li>
      <li class="fdy-list__row" data-key="t4" data-label="T4"><button class="fdy-sortable__handle" type="button">≡</button> T4</li>
      <li class="fdy-list__row" data-key="t5" data-label="T5"><button class="fdy-sortable__handle" type="button">≡</button> T5</li>
      <li class="fdy-list__row" data-key="t6" data-label="T6"><button class="fdy-sortable__handle" type="button">≡</button> T6</li>
      <li class="fdy-list__row" data-key="t7" data-label="T7"><button class="fdy-sortable__handle" type="button">≡</button> T7</li>
      <li class="fdy-list__row" data-key="t8" data-label="T8"><button class="fdy-sortable__handle" type="button">≡</button> T8</li>
      <li class="fdy-list__row" data-key="t9" data-label="T9"><button class="fdy-sortable__handle" type="button">≡</button> T9</li>
      <li class="fdy-list__row" data-key="t10" data-label="T10"><button class="fdy-sortable__handle" type="button">≡</button> T10</li>
      <li class="fdy-list__row" data-key="t11" data-label="T11"><button class="fdy-sortable__handle" type="button">≡</button> T11</li>
    </ul>
  </div>

  <!-- Group "board". Document order is the order ←/→ walk. -->
  <div id="board">
    <ul class="fdy-list fdy-sortable" id="todo" data-fdy-sortable="board" data-key="todo" data-label="To do">
      <li class="fdy-list__row" data-key="a" data-label="Alpha"><button class="fdy-sortable__handle" type="button" id="hA">≡</button> Alpha</li>
      <li class="fdy-list__row" data-key="b" data-label="Bravo"><button class="fdy-sortable__handle" type="button" id="hB">≡</button> Bravo</li>
      <li class="fdy-list__row" data-key="c" data-label="Charlie"><button class="fdy-sortable__handle" type="button" id="hC">≡</button> Charlie</li>
      <li class="fdy-list__row" data-key="e" data-label="Echo"><button class="fdy-sortable__handle" type="button" id="hE">≡</button> Echo</li>
    </ul>
    <!-- A pinned first row: nothing lands above it, and it never leaves. -->
    <ul class="fdy-list fdy-sortable" id="doing" data-fdy-sortable="board" data-key="doing" data-label="Doing">
      <li class="fdy-list__row" data-key="top" data-label="Pinned" data-fdy-sort-fixed><button class="fdy-sortable__handle" type="button" id="hTop">≡</button> Pinned</li>
      <li class="fdy-list__row" data-key="d" data-label="Delta"><button class="fdy-sortable__handle" type="button" id="hD">≡</button> Delta</li>
    </ul>
    <ul class="fdy-list fdy-sortable" id="done" data-fdy-sortable="board" data-key="done" data-label="Done"></ul>
    <ul class="fdy-list fdy-sortable" id="off" data-fdy-sortable="board" data-key="off" data-label="Off" data-disabled>
      <li class="fdy-list__row" data-key="o" data-label="Oscar"><button class="fdy-sortable__handle" type="button" id="hO">≡</button> Oscar</li>
    </ul>
    <ul class="fdy-list fdy-sortable" id="full" data-fdy-sortable="board" data-key="full" data-label="Full" data-fdy-sort-refuse="Full is at its limit (1 of 1).">
      <li class="fdy-list__row" data-key="f" data-label="Foxtrot"><button class="fdy-sortable__handle" type="button" id="hF">≡</button> Foxtrot</li>
    </ul>
    <!-- A pinned last row; fdy-sort-check refuses Bravo (with a reason) and Charlie (without). -->
    <ul class="fdy-list fdy-sortable" id="review" data-fdy-sortable="board" data-key="review" data-label="Review">
      <li class="fdy-list__row" data-key="r" data-label="Romeo"><button class="fdy-sortable__handle" type="button" id="hR">≡</button> Romeo</li>
      <li class="fdy-list__row" data-key="tail" data-label="Archive" data-fdy-sort-fixed>Archive</li>
    </ul>
    <!-- Not in the group: never a destination. -->
    <ul class="fdy-list fdy-sortable" id="solo" data-fdy-sortable>
      <li class="fdy-list__row" data-key="s" data-label="Sierra"><button class="fdy-sortable__handle" type="button" id="hS">≡</button> Sierra</li>
    </ul>
  </div>
<script>
  var LANES = ['todo', 'doing', 'done', 'off', 'full', 'review', 'solo'];
  var keysOf = function (id) { return Array.from(document.getElementById(id).children).map(function (li) { return li.dataset.key; }).join(''); };
  window.lanes = function () { return LANES.map(function (id) { return id + ':' + keysOf(id); }).join(' '); };
  window.tallOrder = function () { return Array.from(document.getElementById('tall').children).map(function (li) { return li.dataset.key; }).join(' '); };
  /* Items of one list with their states: ^ line before, v line after, * dragging, ~ lifted. */
  window.marks = function (id) {
    return Array.from(document.getElementById(id).children).map(function (li) {
      var c = li.classList;
      return li.dataset.key + (c.contains('is-drop-before') ? '^' : '') + (c.contains('is-drop-after') ? 'v' : '')
        + (c.contains('is-dragging') ? '*' : '') + (c.contains('is-lifted') ? '~' : '');
    }).join(' ');
  };
  window.listMark = function (id) {
    var c = document.getElementById(id).classList;
    return c.contains('is-drop-into') ? 'into' : c.contains('is-drop-refused') ? 'refused' : '';
  };
  window.pill = function () {
    var el = document.querySelector('body > .fdy-sortable__refusal');
    if (!el || el.hidden) return { shown: false, text: '', hits: false };
    var r = el.getBoundingClientRect();
    return { shown: true, text: el.textContent, hits: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el };
  };
  window.live = function () { var r = document.querySelector('body > .fdy-visually-hidden[aria-live]'); return r ? r.textContent.trim() : ''; };
  window.events = [];
  window.checks = [];
  var board = document.getElementById('board');
  board.addEventListener('fdy-sort-change', function (e) {
    window.events.push(Object.assign({ on: e.target.id }, e.detail, { cancelable: e.cancelable }));
  });
  board.addEventListener('fdy-sort-check', function (e) {
    window.checks.push(e.detail.toList + ':' + e.detail.key);
    if (e.detail.toList === 'review' && e.detail.key === 'b') e.detail.refuse('Bravo has not been estimated.');
    if (e.detail.toList === 'review' && e.detail.key === 'c') e.detail.refuse('');
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Write the failing spec (Task 1 cases)**

Create `browser/sortable-group.mjs`:

```js
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
      const onError = (e) => { seen.push(e.error ? e.error.name + ': ' + e.error.message : String(e.message)); e.preventDefault(); };
      window.addEventListener('error', onError);
      let threw = false;
      try { FreedaySortable.initAll(host); } catch (err) { threw = true; }
      window.removeEventListener('error', onError);
      return { seen, threw, ready: document.getElementById('haskey').dataset.fdySortableReady || null };
    })()`);
    assert.equal(result.threw, false, 'initAll does not unwind its caller');
    assert.equal(result.ready, '1', 'the list after the bad one was initialised');
    assert.equal(result.seen.length, 1);
    assert.match(result.seen[0], /^TypeError: .*"lost"/);
  });
});
```

Add `browser/sortable-group.mjs` to the `test:browser` script in `package.json`, right after `browser/sortable.mjs` (same string, separated by a space).

- [ ] **Step 3: Run the spec, confirm red**

Run: `cd "/Users/cahyo.d.kurnianto/Data/Project/User Interface Template & Kit/UI KIT" && node tokens/build.mjs >/dev/null && node --test browser/sortable-group.mjs`
Expected: 4 failing tests (the drag lands nothing across lists; `minHeight` is `0px`; `initAll` throws nothing/reports nothing).

- [ ] **Step 4: Rewrite the enhancer**

Replace the whole of `src/freeday-sortable.js` with:

```js
/* Freeday, sortable list enhancer (optional, zero-dependency).
 * Reorder the children of a list by dragging a handle, or from the keyboard; and, for lists that
 * share a group, move items between them. The keyboard path is not an extra: drag-only reordering
 * locks out every keyboard and screen-reader user (CATATAN-FREEDAY §15).
 *
 * Markup contract:
 *  <ul class="fdy-sortable" data-fdy-sortable>            (or a <tbody>, or a <div>)
 *    <li data-key="ketua" data-label="Ketua">
 *      <button class="fdy-sortable__handle" type="button">…icon…</button> Ketua
 *    </li>
 *    <li data-key="sistem" data-fdy-sort-fixed>…</li>     (never moves, and nothing passes it)
 *  </ul>
 * The items are the container's element children. `data-key` names each in the event; `data-label`
 * is what the handle's default aria-label and the announcements call it (the item text otherwise).
 * `data-disabled` on the container switches it off, and the handles follow through aria-disabled.
 *
 * GROUPS. A value, `data-fdy-sortable="board"`, joins every list on the page with the same value:
 * items move between them. Each grouped list needs a `data-key` (its name in events) and is called
 * by `data-label` or `aria-label`. Across lists a fixed item keeps its END: it never leaves, and
 * nothing lands above the fixed run at a list's start or below the one at its end.
 * `data-fdy-sort-refuse="reason"` on a grouped list refuses every arriving item; a bubbling
 * `fdy-sort-check` {key, fromList, toList, refuse(reason)} asks the app per item, once per list per
 * gesture, before the drop. An empty value keeps today's single-list behaviour unchanged.
 *
 * Emits a bubbling, CANCELABLE "fdy-sort-change" on the DESTINATION list, detail {key, from, to,
 * order, fromList, toList, fromOrder}: `order` is the destination's keys after the move, `fromOrder`
 * the source's (the same array within one list). Not cancelled, the kit moves the element. A
 * framework that renders the list from state cancels it and moves its state instead. Either way the
 * kit announces the move and, after a keyboard step or move(), puts focus on the moved item's
 * handle, found by data-key in the destination once the app has rendered it.
 *
 * The drag shows where the item will land (is-drop-before / is-drop-after on an item, is-drop-into
 * on an empty list) and moves nothing until the pointer is released; Escape cancels it.
 * Exposes window.FreedaySortable { init, initAll }.
 */
(function () {
  'use strict';

  var TEXT = {
    handle: 'Move {label}. Drag, or press the up and down arrow keys.',
    handleGroup: 'Move {label}. Drag, or press Space to lift it.',
    lifted: '{label} lifted. {list}, position {position} of {total}. Arrow keys move it, Space drops it, Escape cancels.',
    over: '{list}, position {position} of {total}.',
    moved: '{label} moved to position {position} of {total}.',
    movedTo: '{label} moved to {list}, position {position} of {total}.',
    cancelled: 'Move cancelled. {label} is back in {list}, position {position}.',
    refused: '{list} does not take {label}.'
  };
  /* Kebab-cased for the lookup, see the note in freeday-upload.js. */
  function textAttr(root, key) {
    if (!root || !root.getAttribute) return null;
    var kebab = root.getAttribute('data-fdy-text-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }));
    return kebab != null && kebab !== '' ? kebab : root.getAttribute('data-fdy-text-' + key);
  }
  function textOf(root, key, vars) {
    var custom = textAttr(root, key);
    var s = custom != null && custom !== '' ? custom : TEXT[key];
    for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  var HANDLE = '.fdy-sortable__handle';
  var LIST = '[data-fdy-sortable]';
  var MARKS = ['is-drop-before', 'is-drop-after', 'is-drop-into', 'is-drop-refused'];

  var live = null;
  function announce(message) {
    if (live === null) {
      live = document.createElement('div');
      live.className = 'fdy-visually-hidden';
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    /* The same sentence twice in a row is no change, and a live region announces changes. */
    live.textContent = live.textContent === message ? message + ' ' : message;
  }

  function items(root) {
    return Array.prototype.slice.call(root.children);
  }
  function keyOf(item, index) {
    var key = item.getAttribute('data-key');
    return key !== null ? key : String(index);
  }
  function labelOf(item) {
    var label = item.getAttribute('data-label');
    return label !== null ? label : (item.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function disabled(root) {
    return root.hasAttribute('data-disabled');
  }
  function itemOf(root, node) {
    for (var n = node; n && n !== root; n = n.parentElement) {
      if (n.parentElement === root) return n;
    }
    return null;
  }

  /* ---- Lists and groups ---- */

  function groupOf(list) {
    return list.getAttribute('data-fdy-sortable') || '';
  }
  function listKey(list) {
    return list.getAttribute('data-key');
  }
  function listLabel(list) {
    return list.getAttribute('data-label') || list.getAttribute('aria-label') || listKey(list) || '';
  }
  /* Page-wide, in document order: the order ←/→ walk. */
  function groupLists(group) {
    return Array.prototype.slice.call(document.querySelectorAll('[data-fdy-sortable="' + CSS.escape(group) + '"]'));
  }
  /* The list of `group` that `node` is in, or null. */
  function listAt(group, node) {
    var list = node && node.closest ? node.closest(LIST) : null;
    return list !== null && groupOf(list) === group ? list : null;
  }

  /* ---- Where an item may land ---- */

  /* Within one list: a move is allowed only if it shifts no fixed item, which is the same as saying
     the item does not start fixed and does not cross one on its way. */
  function allowed(list, from, to) {
    if (from === to || to < 0 || to >= list.length) return false;
    var lo = Math.min(from, to), hi = Math.max(from, to);
    for (var i = lo; i <= hi; i++) if (list[i].hasAttribute('data-fdy-sort-fixed')) return false;
    return true;
  }
  function leadingFixed(list) {
    var n = 0;
    while (n < list.length && list[n].hasAttribute('data-fdy-sort-fixed')) n++;
    return n;
  }
  function trailingFixed(list) {
    var n = 0;
    while (n < list.length && list[list.length - 1 - n].hasAttribute('data-fdy-sort-fixed')) n++;
    return n;
  }
  /* The slots an item arriving from another list may take: after the fixed run at the start of the
     destination, before the one at its end. A fixed item in the middle blocks nothing. */
  function arrivalRange(dest) {
    var list = items(dest);
    return { lo: leadingFixed(list), hi: list.length - trailingFixed(list) };
  }

  /* One drag, lift or move() call: the item, where it came from, and the refusals heard so far. */
  function gestureFor(item) {
    var source = item.parentElement;
    return { item: item, source: source, group: groupOf(source), verdicts: [] };
  }
  function fromOf(g) {
    return items(g.source).indexOf(g.item);
  }

  /* Whether the item may land at insertion index `slot` of `dest`, against the DOM as it is NOW, so
     a list disabled or removed mid-gesture is not dropped into. Refusals are verdict()'s. */
  function legal(g, dest, slot) {
    if (!g.item.isConnected || g.item.parentElement !== g.source || !dest.isConnected) return false;
    if (disabled(g.source) || disabled(dest)) return false;
    if (dest === g.source) {
      var from = fromOf(g);
      return allowed(items(dest), from, slot > from ? slot - 1 : slot);
    }
    if (g.group === '' || groupOf(dest) !== g.group || g.item.hasAttribute('data-fdy-sort-fixed')) return false;
    var range = arrivalRange(dest);
    return slot >= range.lo && slot <= range.hi;
  }

  /* The element and class that show a landing at `slot`. */
  function landing(dest, slot) {
    var list = items(dest);
    if (list.length === 0) return { el: dest, cls: 'is-drop-into' };
    return slot < list.length ? { el: list[slot], cls: 'is-drop-before' } : { el: list[list.length - 1], cls: 'is-drop-after' };
  }

  function clearMarks(g) {
    var lists = g.group === '' ? [g.source] : groupLists(g.group);
    lists.forEach(function (list) {
      list.classList.remove.apply(list.classList, MARKS);
      items(list).forEach(function (el) { el.classList.remove.apply(el.classList, MARKS); });
    });
  }

  /* Where a pointer at (x, y) would land the item: over an item, before or after it by its midpoint;
     over a grouped list but no item, its end. An ungrouped list keeps 3.27.0's rule, items only. */
  function pointAt(g, x, y) {
    var hit = document.elementFromPoint(x, y);
    var dest = g.group === '' ? (hit && g.source.contains(hit) ? g.source : null) : listAt(g.group, hit);
    if (dest === null) return null;
    var list = items(dest);
    var over = itemOf(dest, hit);
    if (over !== null) {
      var rect = over.getBoundingClientRect();
      var after = y > rect.top + rect.height / 2;
      return { list: dest, slot: list.indexOf(over) + (after ? 1 : 0), el: over, cls: after ? 'is-drop-after' : 'is-drop-before' };
    }
    if (g.group === '') return null;
    var mark = landing(dest, list.length);
    return { list: dest, slot: list.length, el: mark.el, cls: mark.cls };
  }

  /* ---- The move ---- */

  function commit(g, dest, slot, refocus) {
    var source = g.source, item = g.item;
    var sourceItems = items(source);
    var from = sourceItems.indexOf(item);
    var key = keyOf(item, from);
    var same = dest === source;
    var to = same && slot > from ? slot - 1 : slot;
    var fromOrder = sourceItems.map(keyOf);
    fromOrder.splice(from, 1);
    var order = same ? fromOrder.slice() : items(dest).map(keyOf);
    order.splice(to, 0, key);
    if (same) fromOrder = order;
    var total = same ? sourceItems.length : items(dest).length + 1;
    var ev = new CustomEvent('fdy-sort-change', {
      bubbles: true,
      cancelable: true,
      detail: { key: key, from: from, to: to, order: order, fromList: listKey(source), toList: listKey(dest), fromOrder: fromOrder }
    });
    dest.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      if (same) source.insertBefore(item, to > from ? sourceItems[to].nextSibling : sourceItems[to]);
      else dest.insertBefore(item, items(dest)[to] || null);
    }
    announce(same
      ? textOf(source, 'moved', { label: labelOf(item), position: String(to + 1), total: String(total) })
      : textOf(source, 'movedTo', { label: labelOf(item), list: listLabel(dest), position: String(to + 1), total: String(total) }));
    if (refocus) focusMoved(dest, item, key);
  }

  /* After the app's own render, which a framework runs after this handler returns. Moving a focused
     element drops its focus, and a keyed re-render may have replaced the element outright. */
  function focusMoved(dest, item, key) {
    setTimeout(function () {
      var moved = item.parentElement === dest ? item : items(dest).filter(function (el, i) { return keyOf(el, i) === key; })[0];
      var handle = moved ? moved.querySelector(HANDLE) : null;
      if (handle && document.activeElement !== handle) handle.focus();
    }, 0);
  }

  function syncHandles(root) {
    var off = disabled(root) ? 'true' : 'false';
    var textKey = groupOf(root) === '' ? 'handle' : 'handleGroup';
    items(root).forEach(function (item) {
      var handle = item.querySelector(HANDLE);
      if (!handle) return;
      if (handle.getAttribute('aria-disabled') !== off) handle.setAttribute('aria-disabled', off);
      if (!handle.hasAttribute('aria-label')) handle.setAttribute('aria-label', textOf(root, textKey, { label: labelOf(item) }));
    });
  }

  function initSortable(root) {
    if (root.dataset.fdySortableReady === '1') return;
    if (root.closest('[data-fdy-ignore]')) return;
    if (groupOf(root) !== '' && listKey(root) === null) {
      throw new TypeError('Freeday sortable: a list in group "' + groupOf(root) + '" has no data-key, so a move into or out of it cannot say which list it was.');
    }
    root.dataset.fdySortableReady = '1';
    syncHandles(root);
    /* Rows a framework adds later get their aria-label, and data-disabled reaches every handle. */
    new MutationObserver(function () { syncHandles(root); })
      .observe(root, { childList: true, attributes: true, attributeFilter: ['data-disabled'] });

    root.addEventListener('keydown', function (e) {
      var handle = e.target.closest ? e.target.closest(HANDLE) : null;
      if (!handle || !root.contains(handle) || disabled(root)) return;
      if (groupOf(root) !== '') return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var list = items(root);
      var from = list.indexOf(itemOf(root, handle));
      var to = from + (e.key === 'ArrowUp' ? -1 : 1);
      if (from !== -1 && allowed(list, from, to)) commit(gestureFor(list[from]), root, to > from ? to + 1 : to, true);
    });

    var drag = null;

    function track() {
      var d = drag;
      clearMarks(d.g);
      d.list = null;
      d.slot = null;
      var at = pointAt(d.g, d.x, d.y);
      if (at === null || !legal(d.g, at.list, at.slot)) return;
      d.list = at.list;
      d.slot = at.slot;
      at.el.classList.add(at.cls);
    }
    function end(apply) {
      if (drag === null) return;
      var d = drag;
      drag = null;
      document.removeEventListener('keydown', onEscape, true);
      clearMarks(d.g);
      d.g.item.classList.remove('is-dragging');
      root.classList.remove('is-sorting');
      if (apply && d.started && d.list !== null && legal(d.g, d.list, d.slot)) commit(d.g, d.list, d.slot, false);
    }
    function onEscape(e) {
      if (e.key === 'Escape') { e.preventDefault(); end(false); }
    }

    root.addEventListener('pointerdown', function (e) {
      var handle = e.target.closest ? e.target.closest(HANDLE) : null;
      if (!handle || !root.contains(handle) || disabled(root) || e.button !== 0) return;
      var item = itemOf(root, handle);
      if (!item) return;
      e.preventDefault();
      handle.focus();
      handle.setPointerCapture(e.pointerId);
      drag = { g: gestureFor(item), started: false, list: null, slot: null, x: e.clientX, y: e.clientY, raf: 0, told: [] };
      document.addEventListener('keydown', onEscape, true);
    });

    /* The handle holds pointer capture, so every move reaches this list's listener wherever the
       pointer is, including over another list of the group. */
    root.addEventListener('pointermove', function (e) {
      if (drag === null) return;
      /* No travel threshold: a press that never leaves its own row resolves to to === from, which
         allowed() refuses, so a click on the handle cannot reorder anything. */
      if (!drag.started) {
        drag.started = true;
        drag.g.item.classList.add('is-dragging');
        root.classList.add('is-sorting');
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
      track();
    });

    root.addEventListener('pointerup', function () { end(true); });
    root.addEventListener('pointercancel', function () { end(false); });
  }

  /* An uncaught error that does not unwind the caller: useFreeday and FreedayBlazor.initAll run every
     enhancer in one loop, and a throw from this one would leave every enhancer after it unhydrated. */
  function report(err) {
    if (typeof window.reportError === 'function') window.reportError(err);
    else setTimeout(function () { throw err; }, 0);
  }

  function initAll(context) {
    var root = context || document;
    var lists = Array.prototype.slice.call(root.querySelectorAll(LIST));
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches(LIST)) lists.unshift(root);
    lists.forEach(function (list) {
      try { initSortable(list); } catch (err) { report(err); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedaySortable = { init: initSortable, initAll: initAll };
})();
```

Note the ungrouped arrow path now calls `commit(gestureFor(...), root, slot, true)`: for a step down, the slot is `to + 1` (insertion index after the next item), which `commit` turns back into final index `to`.

- [ ] **Step 5: Append the CSS**

Append to `src/components/sortable.css`:

```css
/* Groups. An empty grouped list is still a target, so it keeps one control's height. `:empty` would
 * not do: whitespace and a framework's comment nodes (Vue's <!--v-if-->) both defeat it. */
.fdy-sortable[data-fdy-sortable]:not([data-fdy-sortable=""]){min-height:var(--control-h);}
.fdy-sortable.is-drop-into{box-shadow:inset 0 0 0 var(--focus-ring-width) var(--color-primary);border-radius:var(--radius-md);}
```

- [ ] **Step 6: Update the 3.27.0 guard and the string table**

In `browser/sortable.mjs`, first test, replace:

```js
    assert.deepEqual(await json(p, 'window.events'), [{ key: 'a', from: 0, to: 2, order: ['b', 'c', 'a', 'd', 'z'], cancelable: true }]);
```

with:

```js
    assert.deepEqual(await json(p, 'window.events'), [{
      key: 'a', from: 0, to: 2, order: ['b', 'c', 'a', 'd', 'z'],
      fromList: null, toList: null, fromOrder: ['b', 'c', 'a', 'd', 'z'], cancelable: true,
    }], 'an ungrouped list names no lists, and its fromOrder is its order');
```

In `test/docs.test.mjs`, replace the `'freeday-sortable.js'` entry:

```js
    'freeday-sortable.js': {
      handle: 'Move {label}. Drag, or press the up and down arrow keys.',
      moved: '{label} moved to position {position} of {total}.',
    },
```

with:

```js
    'freeday-sortable.js': {
      handle: 'Move {label}. Drag, or press the up and down arrow keys.',
      handleGroup: 'Move {label}. Drag, or press Space to lift it.',
      lifted: '{label} lifted. {list}, position {position} of {total}. Arrow keys move it, Space drops it, Escape cancels.',
      over: '{list}, position {position} of {total}.',
      moved: '{label} moved to position {position} of {total}.',
      movedTo: '{label} moved to {list}, position {position} of {total}.',
      cancelled: 'Move cancelled. {label} is back in {list}, position {position}.',
      refused: '{list} does not take {label}.',
    },
```

- [ ] **Step 7: Run, confirm green**

Run: `node tokens/build.mjs >/dev/null && node --test browser/sortable-group.mjs browser/sortable.mjs && node --test test/docs.test.mjs`
Expected: all pass (4 + 5 browser tests, docs suite green).

- [ ] **Step 8: Commit**

```bash
git add src/freeday-sortable.js src/components/sortable.css dist browser/fixtures/vanilla-sortable-group.html browser/sortable-group.mjs browser/sortable.mjs test/docs.test.mjs package.json
git commit -m "feat(sortable): groups, moving items between lists by pointer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`dist` is committed in this repo: `node tokens/build.mjs` writes `dist/freeday-sortable.js`, `dist/freeday.js` and the CSS bundles. Check `git status` and add what it shows under `dist/`.)

---

### Task 2: Refusal before the drop (attribute, `fdy-sort-check`, pill)

**Files:**
- Modify: `src/freeday-sortable.js`
- Modify: `src/components/sortable.css` (append)
- Modify: `browser/sortable-group.mjs` (append test)

**Interfaces:**
- Consumes: `gestureFor`, `legal`, `clearMarks`, `pointAt`, `track`, `end`, `drag.told` from Task 1.
- Produces: `verdict(g, dest): string|null` (null = takes the item), `showPill(list, reason): void`, `hidePill(): void`. `clearMarks` now also hides the pill. Task 3 (`move`) and Task 4 (lift) call `verdict`.

- [ ] **Step 1: Write the failing test**

Append to `browser/sortable-group.mjs`:

```js
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
```

- [ ] **Step 2: Run, confirm red**

Run: `node --test browser/sortable-group.mjs`
Expected: the new test fails (`mark: ''`, the drag into Full goes through).

- [ ] **Step 3: Add refusal to the enhancer**

In `src/freeday-sortable.js`, insert after the `clearMarks` function (and replace `clearMarks` itself) this block:

```js
  function clearMarks(g) {
    var lists = g.group === '' ? [g.source] : groupLists(g.group);
    lists.forEach(function (list) {
      list.classList.remove.apply(list.classList, MARKS);
      items(list).forEach(function (el) { el.classList.remove.apply(el.classList, MARKS); });
    });
    hidePill();
  }

  /* ---- Refusal, before the drop ---- */

  function refusedText(g, dest) {
    return textOf(g.source, 'refused', { label: labelOf(g.item), list: listLabel(dest) });
  }
  /* The reason `dest` refuses the item, or null when it takes it. The attribute is read live every
     time, so a binding that changes mid-gesture is honoured; the app's fdy-sort-check is asked once
     per list per gesture. refuse() takes effect when called: an exception thrown inside a listener
     is swallowed by dispatchEvent, so a refuse() that threw on a bad reason would be a refusal the
     kit never saw. */
  function verdict(g, dest) {
    if (dest === g.source) return null;
    var attr = dest.getAttribute('data-fdy-sort-refuse');
    if (attr !== null) return attr !== '' ? attr : refusedText(g, dest);
    for (var i = 0; i < g.verdicts.length; i++) if (g.verdicts[i].list === dest) return g.verdicts[i].reason;
    var reason = null;
    dest.dispatchEvent(new CustomEvent('fdy-sort-check', {
      bubbles: true,
      cancelable: false,
      detail: {
        key: keyOf(g.item, fromOf(g)),
        fromList: listKey(g.source),
        toList: listKey(dest),
        refuse: function (why) { reason = typeof why === 'string' && why !== '' ? why : refusedText(g, dest); }
      }
    }));
    g.verdicts.push({ list: dest, reason: reason });
    return reason;
  }

  /* The reason, where a pointer user is looking. Spoken through the live region, so hidden from the
     accessibility tree here; and pointer-events:none in CSS, or elementFromPoint would find it. */
  var pill = null;
  function showPill(list, reason) {
    if (pill === null) {
      pill = document.createElement('div');
      pill.className = 'fdy-sortable__refusal';
      pill.setAttribute('aria-hidden', 'true');
      document.body.appendChild(pill);
    }
    pill.textContent = reason;
    pill.hidden = false;
    var rect = list.getBoundingClientRect();
    var left = Math.min(Math.max(rect.left, 0), Math.max(0, window.innerWidth - pill.offsetWidth));
    var top = Math.min(Math.max(rect.top, 0), Math.max(0, window.innerHeight - pill.offsetHeight));
    pill.style.left = left + 'px';
    pill.style.top = top + 'px';
  }
  function hidePill() {
    if (pill !== null) pill.hidden = true;
  }
```

In `initSortable`, replace `track` and the last line of `end`:

```js
    function track() {
      var d = drag;
      clearMarks(d.g);
      d.list = null;
      d.slot = null;
      var at = pointAt(d.g, d.x, d.y);
      if (at === null) return;
      var reason = verdict(d.g, at.list);
      if (reason !== null) {
        at.list.classList.add('is-drop-refused');
        showPill(at.list, reason);
        if (d.told.indexOf(at.list) === -1) {
          d.told.push(at.list);
          announce(reason);
        }
        return;
      }
      if (!legal(d.g, at.list, at.slot)) return;
      d.list = at.list;
      d.slot = at.slot;
      at.el.classList.add(at.cls);
    }
```

```js
      if (apply && d.started && d.list !== null && verdict(d.g, d.list) === null && legal(d.g, d.list, d.slot)) commit(d.g, d.list, d.slot, false);
```

Add to the header comment's GROUPS paragraph nothing new (it already describes refusal).

- [ ] **Step 4: Append the CSS**

```css
/* A list that refuses the held item: its content steps back, and no landing line is drawn. */
.fdy-sortable.is-drop-refused > *{opacity:.5;}
/* The refusal's reason, placed by the enhancer at the top of the list's visible part. The tooltip's
 * surface, so it reads as the same kind of thing; never a hit-test target. */
.fdy-sortable__refusal{position:fixed;z-index:150;max-width:16rem;padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);font-size:var(--text-xs);font-weight:var(--weight-medium);line-height:var(--leading-snug);color:var(--color-inverse-text);background:var(--color-inverse-surface);box-shadow:var(--shadow-2);pointer-events:none;}
```

- [ ] **Step 5: Run, confirm green**

Run: `node tokens/build.mjs >/dev/null && node --test browser/sortable-group.mjs browser/sortable.mjs`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/freeday-sortable.js src/components/sortable.css dist browser/sortable-group.mjs
git commit -m "feat(sortable): refuse a destination before the drop, with a reason

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Focus that waits for the render, and `FreedaySortable.move()`

**Files:**
- Modify: `src/freeday-sortable.js`
- Modify: `browser/fixtures/vanilla-sortable-group.html` (add the slow board)
- Modify: `browser/sortable-group.mjs` (append test)

**Interfaces:**
- Consumes: `gestureFor`, `fromOf`, `verdict`, `legal`, `commit` (Tasks 1–2).
- Produces: `focusMoved(dest, item, key)` with the same signature, now waiting; public `FreedaySortable.move(item: Element, toList: Element, index: number): boolean`.

- [ ] **Step 1: Add the slow board to the fixture**

In `browser/fixtures/vanilla-sortable-group.html`, insert after the closing `</div>` of `#board`:

```html
  <!-- Group "slow": the app cancels and renders 300ms later, as a Blazor app after an interop round trip. -->
  <div id="slowboard">
    <ul class="fdy-list fdy-sortable" id="slow1" data-fdy-sortable="slow" data-key="slow1" data-label="Slow one">
      <li class="fdy-list__row" data-key="sa" data-label="Sierra"><button class="fdy-sortable__handle" type="button" id="hSA">≡</button> Sierra</li>
    </ul>
    <ul class="fdy-list fdy-sortable" id="slow2" data-fdy-sortable="slow" data-key="slow2" data-label="Slow two"></ul>
    <button class="fdy-btn fdy-btn--ghost" type="button" id="moveSA">Move Sierra to Slow two</button>
  </div>
```

and append inside the `<script>`:

```js
  document.getElementById('slowboard').addEventListener('fdy-sort-change', function (e) {
    e.preventDefault();
    setTimeout(function () {
      document.querySelector('#slow1 > li[data-key="sa"]').remove();
      var li = document.createElement('li');
      li.className = 'fdy-list__row';
      li.dataset.key = 'sa';
      li.dataset.label = 'Sierra';
      li.innerHTML = '<button class="fdy-sortable__handle" type="button" id="hSA2">≡</button> Sierra';
      document.getElementById('slow2').appendChild(li);
    }, 300);
  });
```

- [ ] **Step 2: Write the failing test**

Append to `browser/sortable-group.mjs`:

```js
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
```

- [ ] **Step 3: Run, confirm red**

Run: `node --test browser/sortable-group.mjs`
Expected: the new test fails with `FreedaySortable.move is not a function`.

- [ ] **Step 4: Implement**

In `src/freeday-sortable.js`, add near the other constants:

```js
  var FOCUS_WAIT_MS = 2000;
```

Replace `focusMoved` with:

```js
  /* Focus the moved item's handle in `dest` once it is there. A framework renders when it renders:
     Vue and React before the next task, Blazor after an interop round trip. So: look now, look after
     the current task, and look on every change to `dest` for FOCUS_WAIT_MS. Only while focus is
     still where it was when the move was made, on the source handle, or lost to <body> (the focused
     element removed): a user who has moved on keeps their focus. If the item never arrives (the app
     reverted), nothing happens and focus stays on the source handle. */
  function focusMoved(dest, item, key) {
    var before = document.activeElement;
    var sourceHandle = item.querySelector(HANDLE);
    function attempt() {
      var now = document.activeElement;
      if (now !== null && now !== document.body && now !== before && now !== sourceHandle) return;
      var moved = item.parentElement === dest ? item : items(dest).filter(function (el, i) { return keyOf(el, i) === key; })[0];
      var handle = moved ? moved.querySelector(HANDLE) : null;
      if (handle && now !== handle) handle.focus();
    }
    attempt();
    setTimeout(attempt, 0);
    var watch = new MutationObserver(attempt);
    watch.observe(dest, { childList: true, subtree: true });
    setTimeout(function () { watch.disconnect(); }, FOCUS_WAIT_MS);
  }
```

Add, before `initSortable`:

```js
  /* The drag-free path (WCAG 2.5.7): an app's "Move to…" menu or "Move up" button. Same refusal,
     legality, event, announcement and focus as a drop. */
  function move(item, toList, index) {
    var source = item && item.parentElement;
    if (!source || !source.matches || !source.matches(LIST)) throw new TypeError('FreedaySortable.move: the item is not a child of a [data-fdy-sortable] list.');
    if (!toList || !toList.matches || !toList.matches(LIST)) throw new TypeError('FreedaySortable.move: toList is not a [data-fdy-sortable] list.');
    if (typeof index !== 'number' || Math.floor(index) !== index) throw new TypeError('FreedaySortable.move: index must be an integer, got ' + String(index) + '.');
    var g = gestureFor(item);
    var from = fromOf(g);
    var slot = toList === source && index > from ? index + 1 : index;
    var reason = verdict(g, toList);
    if (reason !== null) {
      announce(reason);
      return false;
    }
    if (!legal(g, toList, slot)) return false;
    commit(g, toList, slot, true);
    return true;
  }
```

Change the export line to:

```js
  window.FreedaySortable = { init: initSortable, initAll: initAll, move: move };
```

and add `move` to the header comment's last line: `Exposes window.FreedaySortable { init, initAll, move(item, toList, index) }.`

- [ ] **Step 5: Run, confirm green**

Run: `node tokens/build.mjs >/dev/null && node --test browser/sortable-group.mjs browser/sortable.mjs`
Expected: all pass, including the existing Vue focus test in `sortable.mjs`.

- [ ] **Step 6: Commit**

```bash
git add src/freeday-sortable.js dist browser/fixtures/vanilla-sortable-group.html browser/sortable-group.mjs
git commit -m "feat(sortable): move() without a drag, and focus that waits for a late render

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Keyboard lift-then-drop in a group

**Files:**
- Modify: `src/freeday-sortable.js`
- Modify: `src/components/sortable.css` (append)
- Modify: `browser/harness.mjs` (add `pressEnter`)
- Modify: `browser/sortable-group.mjs` (append three tests)

**Interfaces:**
- Consumes: `gestureFor`, `fromOf`, `legal`, `verdict`, `arrivalRange`, `landing`, `clearMarks`, `showPill`, `commit`, `groupLists`, `listLabel`.
- Produces: module state `lift` (`{g, handle, list, to, from, watch}` or null); `startLift(root, handle)`, `endLift()`, `cancelLift()`, `liftDrop()`, `liftKey(e, root, handle)`. Harness: `p.pressEnter()`.

- [ ] **Step 1: Add `pressEnter` to the harness**

In `browser/harness.mjs`, after the `pressKey` definition, add:

```js
    /* Enter as a keyboard types it: a keyDown WITH text, so the engine runs the button's activation
       behaviour (a click whose detail is 0). pressKey sends rawKeyDown without text, which a button
       ignores. */
    const pressEnter = async () => {
      const params = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
      await cmd('Input.dispatchKeyEvent', { type: 'keyDown', text: '\r', unmodifiedText: '\r', ...params });
      await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
      await sleep(40);
    };
```

and add `pressEnter` to the object passed to `fn({ ... })` (the line beginning `return await fn({ evalJS, waitFor, ...`), after `pressKey`.

- [ ] **Step 2: Write the failing tests**

Append to `browser/sortable-group.mjs`:

```js
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
```

- [ ] **Step 3: Run, confirm red**

Run: `node --test browser/sortable-group.mjs`
Expected: the three new tests fail at their first `marks` assertion: activating a grouped handle does nothing yet, so no item shows `~`. (The `axName` assertion already passes: Task 1 named grouped handles with `handleGroup`.)

- [ ] **Step 4: Implement the lift**

In `src/freeday-sortable.js`, add before `initSortable`:

```js
  /* ---- Keyboard in a group: lift, carry, drop ----
     One lift per page. Nothing in the DOM moves until the drop, so the handle keeps focus throughout,
     and the keys keep arriving at the source list's listener even while the mark is in another list.
     Lift and drop hang off the button's ACTIVATION (a click with detail 0), not a keydown: a screen
     reader in browse mode activates a button with a synthesized click and never sends the key. */

  var lift = null;

  function liftSlot() {
    var from = fromOf(lift.g);
    return lift.list === lift.g.source && lift.to > from ? lift.to + 1 : lift.to;
  }
  /* The final positions the item can take in `list`. */
  function liftRange(g, list) {
    return list === g.source ? { lo: 0, hi: items(list).length - 1 } : arrivalRange(list);
  }

  function startLift(root, handle) {
    var item = itemOf(root, handle);
    if (item === null || item.hasAttribute('data-fdy-sort-fixed')) return;
    var g = gestureFor(item);
    var from = fromOf(g);
    lift = { g: g, handle: handle, list: root, to: from, from: from, watch: new MutationObserver(liftWatch) };
    lift.watch.observe(document.body, { childList: true, subtree: true });
    handle.addEventListener('blur', liftBlur);
    item.classList.add('is-lifted');
    root.classList.add('is-sorting');
    announce(textOf(root, 'lifted', { label: labelOf(item), list: listLabel(root), position: String(from + 1), total: String(items(root).length) }));
  }
  function endLift() {
    var l = lift;
    lift = null;
    l.watch.disconnect();
    l.handle.removeEventListener('blur', liftBlur);
    clearMarks(l.g);
    l.g.item.classList.remove('is-lifted');
    l.g.source.classList.remove('is-sorting');
    return l;
  }
  function cancelLift() {
    var l = endLift();
    announce(textOf(l.g.source, 'cancelled', { label: labelOf(l.g.item), list: listLabel(l.g.source), position: String(l.from + 1) }));
  }
  function liftBlur() {
    if (lift !== null) cancelLift();
  }
  /* A realtime re-render that removes the item or the marked list ends the lift: no change may fire
     for an item that no longer exists. */
  function liftWatch() {
    if (lift !== null && (!lift.g.item.isConnected || !lift.list.isConnected)) cancelLift();
  }

  function showLift() {
    var g = lift.g, list = lift.list;
    clearMarks(g);
    var total = items(list).length + (list === g.source ? 0 : 1);
    var where = textOf(g.source, 'over', { list: listLabel(list), position: String(lift.to + 1), total: String(total) });
    var reason = verdict(g, list);
    if (reason !== null) {
      list.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      list.classList.add('is-drop-refused');
      showPill(list, reason);
      announce(where + ' ' + reason);
      return;
    }
    if (!(list === g.source && lift.to === fromOf(g))) {
      var mark = landing(list, liftSlot());
      mark.el.classList.add(mark.cls);
      mark.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    announce(where);
  }

  function liftStepWithin(dy) {
    var g = lift.g, list = lift.list;
    var range = liftRange(g, list);
    var to = lift.to + dy;
    if (to < range.lo || to > range.hi) return;
    var home = list === g.source && to === fromOf(g);
    var slot = list === g.source && to > fromOf(g) ? to + 1 : to;
    if (!home && !legal(g, list, slot)) return;
    lift.to = to;
    showLift();
  }
  function liftStepAcross(dx) {
    var g = lift.g;
    var lists = groupLists(g.group).filter(function (l) { return l === g.source || !disabled(l); });
    var i = lists.indexOf(lift.list) + dx;
    if (i < 0 || i >= lists.length) return;
    var next = lists[i];
    var range = liftRange(g, next);
    lift.list = next;
    lift.to = Math.max(range.lo, Math.min(range.hi, lift.to));
    /* Back home, a position across a fixed item is not one the item can take: return it to its own. */
    if (next === g.source && lift.to !== fromOf(g) && !legal(g, next, liftSlot())) lift.to = fromOf(g);
    showLift();
  }

  function liftDrop() {
    var g = lift.g, list = lift.list;
    var reason = verdict(g, list);
    if (reason !== null) {
      announce(reason);
      return;
    }
    if (list === g.source && lift.to === fromOf(g)) {
      cancelLift();
      return;
    }
    var slot = liftSlot();
    if (!legal(g, list, slot)) return;
    endLift();
    commit(g, list, slot, true);
  }

  function liftKey(e, root, handle) {
    if (lift === null || lift.handle !== handle) return;
    var rtl = getComputedStyle(root).direction === 'rtl';
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelLift();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      liftStepWithin(e.key === 'ArrowUp' ? -1 : 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      /* The arrow points where the mark goes: mirrored in a right-to-left board. */
      liftStepAcross((e.key === 'ArrowRight') !== rtl ? 1 : -1);
    }
  }
```

In `initSortable`, replace the keydown listener with:

```js
    root.addEventListener('keydown', function (e) {
      var handle = e.target.closest ? e.target.closest(HANDLE) : null;
      if (!handle || !root.contains(handle)) return;
      if (groupOf(root) !== '') {
        liftKey(e, root, handle);
        return;
      }
      if (disabled(root)) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var list = items(root);
      var from = list.indexOf(itemOf(root, handle));
      var to = from + (e.key === 'ArrowUp' ? -1 : 1);
      if (from !== -1 && allowed(list, from, to)) commit(gestureFor(list[from]), root, to > from ? to + 1 : to, true);
    });

    /* detail 0: Space, Enter, or a screen reader's synthesized click. A real pointer click (detail
       1+) is a press without travel, which moves nothing. */
    root.addEventListener('click', function (e) {
      var handle = e.target.closest ? e.target.closest(HANDLE) : null;
      if (!handle || !root.contains(handle) || groupOf(root) === '' || e.detail !== 0) return;
      e.preventDefault();
      if (lift !== null && lift.handle === handle) liftDrop();
      else if (lift === null && !disabled(root)) startLift(root, handle);
    });
```

In the `pointerdown` listener, right after the line `if (!item) return;`, add:

```js
      if (lift !== null) cancelLift();
```

- [ ] **Step 5: Append the CSS**

```css
.fdy-sortable > .is-lifted{opacity:.45;}
```

- [ ] **Step 6: Run, confirm green**

Run: `node tokens/build.mjs >/dev/null && node --test browser/sortable-group.mjs browser/sortable.mjs`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/freeday-sortable.js src/components/sortable.css dist browser/harness.mjs browser/sortable-group.mjs
git commit -m "feat(sortable): lift, carry and drop from the keyboard in a group

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Auto-scroll while a drag nears an edge

**Files:**
- Modify: `src/freeday-sortable.js`
- Modify: `browser/sortable-group.mjs` (append test)

**Interfaces:**
- Consumes: `drag` (`raf`, `x`, `y`), `track`, `end` in `initSortable`.
- Produces: `edgeSpeed(pos, start, end): number`, `canScroll(el, axis, v): boolean`, `scrollStep(x, y): boolean`; `autoScroll()` inside the closure.

- [ ] **Step 1: Write the failing test**

Append to `browser/sortable-group.mjs`:

```js
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
```

- [ ] **Step 2: Run, confirm red**

Run: `node --test browser/sortable-group.mjs`
Expected: the new test fails with `scrollTop 0`.

- [ ] **Step 3: Implement**

In `src/freeday-sortable.js`, add before `initSortable`:

```js
  /* ---- Auto-scroll during a pointer drag ---- */

  var EDGE_MAX_PX = 48;
  var EDGE_SHARE = 0.15;
  var SPEED_MAX_PX = 16;

  /* Pixels per frame toward the nearer edge: negative toward `start`, positive toward `end`, 0
     outside both bands. The band is the smaller of 48px and 15% of the container on that axis. */
  function edgeSpeed(pos, start, end) {
    var band = Math.min(EDGE_MAX_PX, (end - start) * EDGE_SHARE);
    if (band <= 0) return 0;
    if (pos < start + band) return -Math.ceil(SPEED_MAX_PX * Math.min(1, (start + band - pos) / band));
    if (pos > end - band) return Math.ceil(SPEED_MAX_PX * Math.min(1, (pos - (end - band)) / band));
    return 0;
  }
  /* Whether `el` can still scroll by `v` on `axis`. Right to left, scrollLeft runs from 0 down to
     minus the overflow. */
  function canScroll(el, axis, v) {
    if (axis === 'y') return v < 0 ? el.scrollTop > 0 : el.scrollTop < el.scrollHeight - el.clientHeight - 1;
    var max = el.scrollWidth - el.clientWidth;
    var rtl = getComputedStyle(el).direction === 'rtl';
    var lo = rtl ? -max : 0, hi = rtl ? 0 : max;
    return v < 0 ? el.scrollLeft > lo + 0.5 : el.scrollLeft < hi - 0.5;
  }
  /* One frame: per axis, the nearest scrollable ancestor of what is under the pointer that can still
     scroll toward the edge the pointer is near, else the page. Axes are independent, so a long
     column scrolls down while the wide board around it scrolls sideways. */
  function scrollStep(x, y) {
    var hit = document.elementFromPoint(x, y);
    var moved = false;
    ['x', 'y'].forEach(function (axis) {
      for (var n = hit; n !== null && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        var style = getComputedStyle(n);
        var overflow = axis === 'y' ? style.overflowY : style.overflowX;
        if (overflow !== 'auto' && overflow !== 'scroll') continue;
        var rect = n.getBoundingClientRect();
        var v = axis === 'y' ? edgeSpeed(y, rect.top, rect.bottom) : edgeSpeed(x, rect.left, rect.right);
        if (v !== 0 && canScroll(n, axis, v)) {
          n.scrollBy(axis === 'x' ? v : 0, axis === 'y' ? v : 0);
          moved = true;
          return;
        }
      }
      var page = document.scrollingElement;
      var w = axis === 'y' ? edgeSpeed(y, 0, window.innerHeight) : edgeSpeed(x, 0, window.innerWidth);
      if (w !== 0 && page !== null && canScroll(page, axis, w)) {
        window.scrollBy(axis === 'x' ? w : 0, axis === 'y' ? w : 0);
        moved = true;
      }
    });
    return moved;
  }
```

Inside `initSortable`, after `end`, add:

```js
    /* Keeps scrolling while the pointer is held still in a band, which sends no pointermove; the
       landing is recomputed after each step from the last pointer position. */
    function autoScroll() {
      var d = drag;
      if (d.raf !== 0) return;
      d.raf = requestAnimationFrame(function tick() {
        d.raf = 0;
        if (drag !== d) return;
        if (scrollStep(d.x, d.y)) {
          track();
          d.raf = requestAnimationFrame(tick);
        }
      });
    }
```

In `end`, after `drag = null;` add:

```js
      if (d.raf !== 0) cancelAnimationFrame(d.raf);
```

In the `pointermove` listener, after `track();` add:

```js
      autoScroll();
```

- [ ] **Step 4: Run, confirm green**

Run: `node tokens/build.mjs >/dev/null && node --test browser/sortable-group.mjs browser/sortable.mjs`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/freeday-sortable.js dist browser/sortable-group.mjs
git commit -m "feat(sortable): scroll while a drag is held near an edge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Vue consumer of a group

**Files:**
- Create: `browser/entries/vue-sortable-group.js`
- Create: `browser/fixtures/vue-sortable-group.html`
- Modify: `browser/harness.mjs` (`buildEntries` list)
- Modify: `browser/sortable-group.mjs` (append test)

**Interfaces:**
- Consumes: `p.pressEnter` (Task 4), the cross-list `fdy-sort-change` detail (Task 1), `focusMoved` (Task 3).
- Produces: `window.vueLanes(): string` in the fixture.

- [ ] **Step 1: Write the entry and fixture**

`browser/entries/vue-sortable-group.js`:

```js
// Two keyed Vue lists in one sortable group. The app cancels fdy-sort-change and moves the row
// between its own arrays from detail.fromList/fromOrder and detail.toList/order: the DOM is Vue's,
// and across two parents Vue replaces the element, so focus can only follow by data-key.
import { createApp, h, ref } from 'vue';
import { useFreeday } from '../../adapters/vue/index.js';

const LABELS = { todo: 'To do', done: 'Done' };
const lanes = ref({
  todo: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Bravo' }],
  done: [{ id: 'c', name: 'Charlie' }],
});
window.vueLanes = () => Object.keys(lanes.value).map((k) => k + ':' + lanes.value[k].map((r) => r.id).join('')).join(' ');

createApp({
  setup() {
    const root = ref(null);
    useFreeday(root);
    const onMove = (e) => {
      e.preventDefault();
      const d = e.detail;
      const byId = new Map([...lanes.value.todo, ...lanes.value.done].map((r) => [r.id, r]));
      lanes.value = { ...lanes.value, [d.fromList]: d.fromOrder.map((k) => byId.get(k)), [d.toList]: d.order.map((k) => byId.get(k)) };
    };
    return () => h('div', { ref: root, id: 'vboard', onFdySortChange: onMove }, Object.keys(lanes.value).map((lane) =>
      h('ul', { key: lane, id: 'v' + lane, class: 'fdy-list fdy-sortable', 'data-fdy-sortable': 'vboard', 'data-key': lane, 'data-label': LABELS[lane] },
        lanes.value[lane].map((r) => h('li', { key: r.id, class: 'fdy-list__row', 'data-key': r.id, 'data-label': r.name }, [
          h('button', { class: 'fdy-sortable__handle', type: 'button', id: 'v' + r.id }, '≡'), ' ' + r.name,
        ])))));
  },
}).mount('#app');
```

`browser/fixtures/vue-sortable-group.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>fixture: vue keyed lists in one sortable group, cancelling fdy-sort-change</title>
<link rel="stylesheet" href="../../dist/freeday.bundle.css">
<style>body { padding: 24px; } #vboard { display: flex; gap: 16px; } #vboard > ul { flex: 1 1 12rem; margin: 0; }</style>
<div id="app"></div>
<script src="../../dist/freeday.js"></script>
<script src="../.build/vue-sortable-group.js"></script>
```

In `browser/harness.mjs` `buildEntries`, add after `join(HERE, 'entries', 'vue-sortable.js'),`:

```js
      join(HERE, 'entries', 'vue-sortable-group.js'),
```

- [ ] **Step 2: Write the test**

Append to `browser/sortable-group.mjs`:

```js
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
```

- [ ] **Step 3: Run**

Run: `node --test browser/sortable-group.mjs`
Expected: PASS (Tasks 1–5 already implement it). To prove the test can fail, temporarily change `focusMoved`'s body to `return;` as its first line, run, see the `waitFor` time out, and revert. Do not commit the sabotage.

- [ ] **Step 4: Commit**

```bash
git add browser/entries/vue-sortable-group.js browser/fixtures/vue-sortable-group.html browser/harness.mjs browser/sortable-group.mjs
git commit -m "test(sortable): a Vue app moving rows between two lists of a group

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Blazor — `FreedayBlazor.sortOn` and a typed detail

**Files:**
- Modify: `adapters/blazor/freeday-blazor.js`
- Create: `adapters/blazor/FdySortChangeDetail.cs`
- Create: `test/blazor/FdySortChangeDetailTests.cs`
- Create: `browser/fixtures/blazor-sortable.html`
- Modify: `browser/sortable-group.mjs` (append test)

**Interfaces:**
- Produces: `FreedayBlazor.sortOn(element, dotNetRef, methodName): number` (token for `FreedayBlazor.off`); C# `Freeday.Blazor.FdySortChangeDetail` record.

- [ ] **Step 1: Write the fixture and failing test**

`browser/fixtures/blazor-sortable.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>fixture: the Blazor bridge cancels fdy-sort-change in the same turn</title>
<link rel="stylesheet" href="../../dist/freeday.bundle.css">
<style>body { padding: 24px; max-width: 28rem; }</style>
<ul class="fdy-list fdy-sortable" id="list" data-fdy-sortable>
  <li class="fdy-list__row" data-key="a" data-label="Alpha"><button class="fdy-sortable__handle" type="button" id="hA">≡</button> Alpha</li>
  <li class="fdy-list__row" data-key="b" data-label="Bravo"><button class="fdy-sortable__handle" type="button" id="hB">≡</button> Bravo</li>
</ul>
<script src="../../dist/freeday.js"></script>
<script src="../../adapters/blazor/freeday-blazor.js"></script>
<script>
  window.calls = [];
  /* A DotNetObjectReference stand-in: .NET would receive the same JSON. */
  var ref = { invokeMethodAsync: function (method, detail) { window.calls.push({ method: method, detail: detail }); return Promise.resolve(); } };
  window.token = FreedayBlazor.sortOn(document.getElementById('list'), ref, 'OnSortChange');
  window.order = function () { return Array.from(document.querySelectorAll('#list > li')).map(function (li) { return li.dataset.key; }).join(''); };
</script>
```

Append to `browser/sortable-group.mjs`:

```js
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
```

Run: `node --test browser/sortable-group.mjs`
Expected: the new test fails (`FreedayBlazor.sortOn is not a function`, so `window.token` is never a number and `waitFor` times out).

- [ ] **Step 2: Implement `sortOn`**

In `adapters/blazor/freeday-blazor.js`, after `dateRangeOn`, add:

```js
  // Subscribe to fdy-sort-change and CANCEL it in the same turn, then forward the detail. on() cannot
  // do this: .NET answers asynchronously, after the kit has already moved DOM that Blazor owns. The
  // [JSInvokable] method moves the item in the app's collection, Blazor renders it, and the kit puts
  // focus back on the moved handle by data-key. Returns a token for off().
  function sortOn(element, dotNetRef, methodName) {
    var handler = function (e) {
      e.preventDefault();
      dotNetRef.invokeMethodAsync(methodName, safeDetail(e.detail));
    };
    element.addEventListener('fdy-sort-change', handler);
    var token = ++seq;
    subs[token] = { el: element, type: 'fdy-sort-change', fn: handler };
    return token;
  }
```

and add `sortOn: sortOn,` to the `window.FreedayBlazor = { ... }` object (after `dateRangeOn: dateRangeOn,`). Also add a usage line to the file's header comment:

```
 *   var t = await JS.InvokeAsync<int>("FreedayBlazor.sortOn", listRef, dotNetRef, "OnSortChange");
```

Run: `node --test browser/sortable-group.mjs`
Expected: PASS.

- [ ] **Step 3: Typed detail for .NET, test first**

`test/blazor/FdySortChangeDetailTests.cs`:

```cs
using System.Text.Json;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// The JSON FreedayBlazor.sortOn sends is the enhancer's detail, camelCase. Blazor deserialises
/// [JSInvokable] arguments with the web defaults, so the record must bind under those.
/// </summary>
public class FdySortChangeDetailTests
{
    [Fact]
    public void Binds_the_detail_sortOn_forwards()
    {
        const string json = """
            {"key":"a","from":0,"to":2,"order":["top","d","a"],"fromList":"todo","toList":"doing","fromOrder":["b","c"]}
            """;
        var detail = JsonSerializer.Deserialize<FdySortChangeDetail>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal("a", detail.Key);
        Assert.Equal(2, detail.To);
        Assert.Equal(new[] { "top", "d", "a" }, detail.Order);
        Assert.Equal("todo", detail.FromList);
        Assert.Equal(new[] { "b", "c" }, detail.FromOrder);
    }

    [Fact]
    public void An_ungrouped_list_names_no_lists()
    {
        const string json = """{"key":"a","from":0,"to":1,"order":["b","a"],"fromList":null,"toList":null,"fromOrder":["b","a"]}""";
        var detail = JsonSerializer.Deserialize<FdySortChangeDetail>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Null(detail.FromList);
        Assert.Null(detail.ToList);
    }
}
```

Run: `npm run test:blazor`
Expected: build error, `FdySortChangeDetail` not found.

`adapters/blazor/FdySortChangeDetail.cs`:

```cs
namespace Freeday.Blazor;

/// <summary>
/// <c>event.detail</c> of <c>fdy-sort-change</c>, as <c>FreedayBlazor.sortOn</c> hands it to a
/// <c>[JSInvokable]</c> method. <see cref="Order"/> is the destination list's keys after the move;
/// <see cref="FromOrder"/> the source's (equal to <see cref="Order"/> within one list).
/// <see cref="FromList"/> and <see cref="ToList"/> are the lists' <c>data-key</c>, null on a list
/// without one.
/// </summary>
public sealed record FdySortChangeDetail(
    string Key,
    int From,
    int To,
    IReadOnlyList<string> Order,
    string? FromList,
    string? ToList,
    IReadOnlyList<string> FromOrder);
```

Run: `npm run test:blazor`
Expected: all pass (66 existing + 2 new).

- [ ] **Step 4: Commit**

```bash
git add adapters/blazor/freeday-blazor.js adapters/blazor/FdySortChangeDetail.cs test/blazor/FdySortChangeDetailTests.cs browser/fixtures/blazor-sortable.html browser/sortable-group.mjs
git commit -m "feat(blazor): sortOn cancels fdy-sort-change in the same turn

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: WebKit spec

**Files:**
- Create: `webkit/sortable-group.spec.mjs`

**Interfaces:**
- Consumes: `browser/fixtures/vanilla-sortable-group.html` (served by `webkit/serve.mjs` at `/browser/fixtures/...`), its `window.lanes()` / `window.tallOrder()`.

- [ ] **Step 1: Write the spec**

```js
/* Freeday. Sortable groups on WebKit: a pointer drag between lists, and auto-scroll.
 *
 * Pointer capture, elementFromPoint while a pointer is captured, and scrolling during a drag are
 * where engines have differed, and Safari on iPad is a real target for a kit app. The CDP suite
 * (browser/sortable-group.mjs) owns the depth; this proves the two paths that depend on the engine.
 * Runs only in CI's WebKit job (see webkit/engine.spec.mjs for why not on a mac14-arm64 laptop).
 */
import { test, expect } from '@playwright/test';

const BOARD = '/browser/fixtures/vanilla-sortable-group.html';

async function ready(page) {
  await page.goto(BOARD);
  await page.waitForFunction(() => document.readyState === 'complete' && window.FreedaySortable);
}
async function center(page, selector) {
  const box = await page.locator(selector).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('a drag carries an item into another list of the group', async ({ page }) => {
  await ready(page);
  await page.locator('#done').scrollIntoViewIfNeeded();
  const from = await center(page, '#hA');
  const to = await center(page, '#done');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.lanes())).toContain('done:a');
});

test('a drag held at the bottom edge of a scroll container scrolls it', async ({ page }) => {
  await ready(page);
  const from = await center(page, '#hT0');
  const box = await page.locator('#scroller').boundingBox();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4, { steps: 8 });
  await page.waitForTimeout(800);
  await page.mouse.up();
  expect(await page.evaluate(() => document.getElementById('scroller').scrollTop)).toBeGreaterThan(0);
  const order = (await page.evaluate(() => window.tallOrder())).split(' ');
  expect(order.indexOf('t0')).toBeGreaterThanOrEqual(6);
});
```

- [ ] **Step 2: Note the local limit and commit**

WebKit does not launch on this mac14-arm64 laptop (see `webkit/engine.spec.mjs`); the spec is first run by CI on the tag. Before tagging, push the branch commit to `main` only as part of Task 10 and watch the WebKit job; if it fails there, fix it and move the tag (allowed while the version is not on npm).

```bash
git add webkit/sortable-group.spec.mjs
git commit -m "test(webkit): a drag between lists, and auto-scroll

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Types and COMPONENTS.md

**Files:**
- Modify: `adapters/vue/index.d.ts:141-142`
- Modify: `adapters/react/index.d.ts:71-72`
- Modify: `COMPONENTS.md` (section "Sortable list — `data-fdy-sortable`", ~lines 2677-2714)

- [ ] **Step 1: Types**

In BOTH `adapters/vue/index.d.ts` and `adapters/react/index.d.ts`, replace:

```ts
/** `fdy-sort-change`, cancelable: `order` is every item's `data-key` in the new order. */
export interface FdySortChangeDetail { key: string; from: number; to: number; order: string[] }
```

with:

```ts
/** `fdy-sort-change`, cancelable, dispatched on the destination list. `order` is the destination's
 *  keys after the move; `fromOrder` the source's (the same array within one list). `fromList` /
 *  `toList` are the lists' `data-key`, null on a list without one. */
export interface FdySortChangeDetail {
  key: string;
  from: number;
  to: number;
  order: string[];
  fromList: string | null;
  toList: string | null;
  fromOrder: string[];
}
/** `fdy-sort-check`, dispatched on a list of the same group the first time a gesture reaches it.
 *  Call `refuse(reason)` to keep the item out; the reason is shown and announced. */
export interface FdySortCheckDetail {
  key: string;
  fromList: string;
  toList: string;
  refuse(reason: string): void;
}
```

Run: `npm run typecheck:react`
Expected: 0 errors.

- [ ] **Step 2: COMPONENTS.md**

Replace the whole section from `## Sortable list — \`data-fdy-sortable\`` up to (not including) `## Timeline — \`.fdy-timeline\`` with:

````markdown
## Sortable list — `data-fdy-sortable`
Reorder a list by dragging a handle or from the keyboard, and move items between lists that share a
group. Needs `freeday-sortable.js`. The kit draws the handle and the drag states; the list keeps
whatever look it already had (`.fdy-list`, a table body, plain rows).

- Container: `.fdy-sortable` + `data-fdy-sortable` on a `<ul>`/`<ol>`, a `<tbody>` or a `<div>`.
  Its element children are the items, so an empty-state message goes **outside** it.
- Item: `data-key` (the id the event reports, **required** when a framework renders the list),
  `data-label` (the name read out, the item's text otherwise), and `data-fdy-sort-fixed` for an item
  that never moves and that nothing can pass, such as a system row pinned to one end.
- Handle: `<button class="fdy-sortable__handle" type="button">` inside the item, icon inside. With no
  `aria-label` of your own it gets *Move {label}. Drag, or press the up and down arrow keys.* (in a
  group: *Move {label}. Drag, or press Space to lift it.*)
- `data-disabled` on the container switches it off, and the handles follow through `aria-disabled`.
  Set it while the list is searched or filtered, where a row's visible position is not its stored one.
- States, set by the enhancer: `is-sorting` on the container, `is-dragging` / `is-lifted` on the
  item, `is-drop-before` / `is-drop-after` on the item it will land against, `is-drop-into` on an
  empty list, `is-drop-refused` on a list that will not take it. Nothing moves until the drop, and
  Escape cancels.
- Event: `fdy-sort-change` on the **destination** list, bubbling, **cancelable**, `detail {key, from,
  to, order, fromList, toList, fromOrder}` (`FdySortChangeDetail`). Left alone, the kit moves the
  element. Under Vue, React or Blazor, cancel it and move your state, because the DOM is the
  framework's. Either way the kit announces the move, and after a keyboard step or `move()` it puts
  focus on the moved item's handle, found by `data-key` once your render has put it there (it waits
  up to 2 seconds, and never takes focus from a user who has moved on).
- While a pointer drag is held near the edge of a scroll container or the window, that container
  scrolls.

**Groups.** Give lists the same value, `data-fdy-sortable="board"`, and items move between them. The
group is page-wide; two boards on one page need two names.

- Each grouped list needs `data-key` (its name in events; without it the list is not initialised and
  a TypeError is reported) and is called by `data-label` or `aria-label`.
- Keyboard: Space or Enter on a handle **lifts** the item; ↑/↓ move the landing mark, ←/→ go to the
  previous/next list of the group (mirrored right to left; disabled lists are skipped); Space or Enter
  **drops** it, firing one event; Escape, or focus leaving the handle, puts it back. Ungrouped lists
  keep ↑/↓ moving one step at once.
- Fixed items keep their end across lists: they never leave, and nothing lands above the fixed run at
  a list's start or below the one at its end.
- Refusing a destination, before the drop: `data-fdy-sort-refuse="Done is full (5 of 5)."` on a list
  refuses every arriving item (any stack; bind it to your state). For per-item rules, listen for
  `fdy-sort-check` (`FdySortCheckDetail {key, fromList, toList, refuse(reason)}`), dispatched once per
  list per gesture, and call `refuse()`; it must answer synchronously, so it is not available to
  Blazor. A refused list shows the reason in a `.fdy-sortable__refusal` pill and announces it.
- `FreedaySortable.move(item, toList, index)` is the drag-free path (WCAG 2.5.7): build your "Move
  to…" menu or "Move up" buttons on it. It returns `false` when the move is refused or not allowed.

Strings: `data-fdy-text-handle`, `-handle-group`, `-lifted`, `-over`, `-moved`, `-moved-to`,
`-cancelled`, `-refused` on the container (read from the item's source list).

```vue
<div ref="root" @fdy-sort-change.prevent="(e) => moveCard(e.detail)">
  <ul v-for="col in columns" :key="col.id" class="fdy-list fdy-sortable"
      data-fdy-sortable="board" :data-key="col.id" :data-label="col.name"
      :data-fdy-sort-refuse="col.cards.length >= col.limit ? `${col.name} is full.` : undefined">
    <li v-for="c in col.cards" :key="c.id" class="fdy-list__row" :data-key="c.id" :data-label="c.title">
      <button class="fdy-sortable__handle" type="button"><IconGrip class="fdy-icon" aria-hidden="true" /></button>
      {{ c.title }}
    </li>
  </ul>
</div>
<!-- moveCard({fromList, fromOrder, toList, order}) rebuilds both columns from the key arrays.
     useFreeday(root) in <script setup>: the ref holds every list, so a column added later is hydrated. -->
```

Blazor: hydrate with `FreedayBlazor.initAll`, then subscribe with
`FreedayBlazor.sortOn(listRef, dotNetRef, "OnSortChange")`, which cancels the event in the same turn
and hands `FdySortChangeDetail` to your `[JSInvokable]` method. `FreedayBlazor.on` cannot do this:
.NET answers after the kit has already moved the element.
````

- [ ] **Step 3: Run the doc and unit gates**

Run: `node tokens/build.mjs >/dev/null && node --test`
Expected: all pass. `test/docs.test.mjs` "COMPONENTS.md: every fdy- class it names exists in the kit" accepts `.fdy-sortable__refusal` because Task 2 defined it in `src/components/sortable.css`.

- [ ] **Step 4: Commit**

```bash
git add adapters/vue/index.d.ts adapters/react/index.d.ts COMPONENTS.md
git commit -m "docs(sortable): groups, refusal, move(), and the Blazor path

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Release 3.28.0

Follow `NEXT-UP.md` §9 exactly. Summary of the commands:

- [ ] **Step 1: Full local gates**

```bash
cd "/Users/cahyo.d.kurnianto/Data/Project/User Interface Template & Kit/UI KIT"
node tokens/build.mjs && node --test
npm run typecheck:react
npm run test:blazor
npm run test:browser
```

Expected: every suite green. Keep the laptop awake. Record the counts (unit, bUnit, browser) for the CHANGELOG.

- [ ] **Step 2: Version stamps**

```bash
npm version 3.28.0 --no-git-tag-version
git grep -n '3\.27\.0' -- . ':!CHANGELOG.md'
```

Update every hit the runbook names (`README.md`, `README.id.md`, `docs/index.html`, `docs/getting-started.md`; `package.json`/`package-lock.json` are done by `npm version`). Re-run `node --test test/docs.test.mjs`.

- [ ] **Step 3: Writing**

- `CHANGELOG.md`: a `## [3.28.0] - <date>` entry in Indonesian with `### Added` (grup sortable, `data-fdy-sort-refuse`, `fdy-sort-check`, `FreedaySortable.move`, gulir otomatis, angkat-lalu-jatuhkan, `FreedayBlazor.sortOn`, `FdySortChangeDetail`), `### Changed` (fokus sesudah langkah papan ketik kini menunggu render; detail `fdy-sort-change` mendapat tiga field, aditif menurut kebijakan tipe), and `### Catatan` (fitur 0 dari permintaan owner 2026-11-20; uji baru dan bukti merahnya; WebKit pertama untuk sortable).
- `HANDOFF.md`: one paragraph for 3.28.0.
- `NEXT-UP.md`: §5 row 0 marked "terkirim 3.28.0"; §1 next = fitur 1 (kanban), brainstorm first; the old "Not in the kit" line is gone from COMPONENTS.md, so nothing in §2/§7 should still cite it (`grep -n "between lists" NEXT-UP.md`).
- Pass all three through `/humanizer:humanizer`.

- [ ] **Step 4: Commit, tag, push, watch**

```bash
git add -A
git commit -m "chore(release): 3.28.0, sortable groups

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag -a v3.28.0 -m "3.28.0: sortable groups, the shared move contract"
git push origin main --follow-tags
gh run list --limit 3
gh run watch <publish-run-id> --exit-status
npm view @cahyo-dimas/freeday version --prefer-online
```

Expected: CI test, WebKit and publish green; npm serves 3.28.0 within 1–3 minutes. A red tag whose version is not yet on npm may be moved (`git tag -fa`, `git push -f origin v3.28.0`) after fixing.
````
