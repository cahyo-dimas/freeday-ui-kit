/* Browser regression specs: the date range in ONE field (`layout="single"`, `data-layout="single"`).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * One trigger, one calendar: the first day picked is the start and the panel stays open, the second
 * is the end and the range is committed whole. Every case runs against the vanilla enhancer and the
 * Vue and React adapters, which draw the same calendar from two implementations, with real mouse
 * and key events: the preview is a hover, and a synthetic event would not prove the pointer path.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

before(async () => {
  if (skip === false) await buildEntries();
});

const STACKS = [
  { name: 'vanilla', file: 'vanilla-daterange-single.html' },
  { name: 'Vue', file: 'vue-daterange-single.html' },
  { name: 'React', file: 'react-daterange-single.html' },
];

const ROOT = '.fdy-datepicker--range';
const TRIGGER = `${ROOT} .fdy-datepicker__trigger`;
const DAYS = `${ROOT} .fdy-cal__day:not(.is-outside):not([disabled])`;

/* Marks the nth selectable day of the month on show with `attr`, so a real gesture can aim at it. */
async function mark(p, n, attr) {
  await p.waitFor(`document.querySelectorAll('${DAYS}').length > ${n}`);
  await p.evalJS(`(() => {
    document.querySelectorAll('[${attr}]').forEach((e) => e.removeAttribute('${attr}'));
    [...document.querySelectorAll('${DAYS}')][${n}].setAttribute('${attr}', '');
  })()`);
}
async function clickDay(p, n) {
  await mark(p, n, 'data-pick');
  await p.clickCenter('[data-pick]');
}
const dayAt = (n) => `[...document.querySelectorAll('${DAYS}')][${n}]`;
const isOpen = (p) => p.evalJS(`document.querySelector('${TRIGGER}').getAttribute('aria-expanded') === 'true'`);
/* Vanilla reports `{ from, to }`, the adapters `{ start, end }`; the specs read one shape. */
const settled = (p) => p.evalJS(`window.__settled.map((s) => 'from' in s ? [s.from, s.to] : [s.start, s.end])`);
const dataValue = (p) => p.evalJS(`document.querySelector('${ROOT}').getAttribute('data-value')`);

async function openField(p) {
  await p.waitFor(`document.querySelector('${TRIGGER}')`);
  await p.clickCenter(TRIGGER);
  await p.waitFor(`document.querySelector('${TRIGGER}').getAttribute('aria-expanded') === 'true'`);
}

for (const stack of STACKS) {
  test(`${stack.name}: the first pick waits, the hover previews, the second pick commits the whole range`, { skip }, async () => {
    await withPage(fixture(stack.file), async (p) => {
      await openField(p);
      await clickDay(p, 4);
      assert.equal(await isOpen(p), true, 'the panel stays open for the end');
      assert.deepEqual(await settled(p), [], 'half a range is not settled');
      assert.equal(await p.evalJS('window.__changes ? window.__changes.length : 0'), 0, 'nor is it a change');
      assert.equal(await dataValue(p), '', 'nor does it reach the value a form reads');
      assert.equal(await p.evalJS(`${dayAt(4)}.classList.contains('is-selected')`), true, 'the start is drawn as picked');
      assert.match(await p.evalJS(`${dayAt(4)}.getAttribute('aria-label')`), /range start$/,
        'and named as the start, so it is not colour alone');

      await mark(p, 12, 'data-hover');
      await p.hoverCenter('[data-hover]');
      assert.ok(await p.waitFor(`${dayAt(8)}.classList.contains('in-range')`), 'the band reaches the hovered day');
      assert.deepEqual(
        await p.evalJS(`['in-range', 'is-range-end', 'is-selected'].map((c) => ${dayAt(12)}.classList.contains(c))`),
        [true, true, false], 'the previewed end is in the band but not filled: it is not an answer yet');
      assert.equal(await p.evalJS(`${dayAt(13)}.classList.contains('in-range')`), false, 'and the band stops there');

      await clickDay(p, 12);
      assert.ok(await p.waitFor('window.__settled.length === 1'), 'the second pick settles the range');
      const [[from, to]] = await settled(p);
      assert.match(from, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(from < to, `a whole range, in order, got ${from} – ${to}`);
      if (stack.name !== 'vanilla') {
        assert.equal(await p.evalJS('window.__changes.length'), 1, 'one change for the range, not one per end');
      }
      assert.equal(await isOpen(p), false, 'and the panel closes on it');
      assert.equal(await dataValue(p), `${from}/${to}`, 'the value a form reads is the interval');
      assert.match(await p.evalJS(`document.querySelector('${ROOT} .fdy-datepicker__value').textContent`), / – /,
        'the field shows both dates');
    });
  });

  test(`${stack.name}: Escape drops half a range and keeps the one already committed`, { skip }, async () => {
    await withPage(fixture(stack.file), async (p) => {
      await openField(p);
      await clickDay(p, 2);
      await clickDay(p, 6);
      await p.waitFor('window.__settled.length === 1');
      const committed = await dataValue(p);

      await openField(p);
      await clickDay(p, 15);
      await p.pressKey('Escape');
      await p.waitFor(`document.querySelector('${TRIGGER}').getAttribute('aria-expanded') === 'false'`);
      assert.equal(await dataValue(p), committed, 'the committed range survives');
      assert.equal(await p.evalJS('window.__settled.length'), 1, 'and nothing new was announced');

      await openField(p);
      assert.equal(await p.evalJS(`document.querySelectorAll('${ROOT} .fdy-cal__day.is-selected').length`), 2,
        'reopening shows the committed ends, not the abandoned start');
    });
  });

  test(`${stack.name}: a pick before the start becomes the start`, { skip }, async () => {
    await withPage(fixture(stack.file), async (p) => {
      await openField(p);
      await clickDay(p, 10);
      await clickDay(p, 3);
      assert.equal(await isOpen(p), true, 'still waiting for an end');
      assert.deepEqual(await settled(p), []);
      const start = await p.evalJS(`${dayAt(3)}.getAttribute('aria-label')`);
      assert.match(start, /range start$/, 'the earlier day is now the start');

      await clickDay(p, 6);
      await p.waitFor('window.__settled.length === 1');
      const [[from, to]] = await settled(p);
      assert.ok(from < to);
    });
  });

  test(`${stack.name}: the keyboard previews and commits a range`, { skip }, async () => {
    await withPage(fixture(stack.file), async (p) => {
      await openField(p);
      await p.waitFor(`document.activeElement && document.activeElement.classList.contains('fdy-cal__day')`);
      const first = await p.evalJS('document.activeElement.getAttribute("aria-label")');
      await p.pressKey('Enter');
      assert.equal(await isOpen(p), true);
      await p.pressKey('ArrowRight');
      await p.pressKey('ArrowRight');
      assert.ok(await p.waitFor(`document.activeElement.classList.contains('is-range-end')`),
        'the focused day is the previewed end');
      assert.equal(await p.evalJS(`document.querySelectorAll('${ROOT} .fdy-cal__day.in-range').length`), 2,
        'the day between and the previewed end form the band');
      await p.pressKey('Enter');
      await p.waitFor('window.__settled.length === 1');
      const [[from, to]] = await settled(p);
      const days = (Date.parse(to) - Date.parse(from)) / 86400000;
      assert.equal(days, 2, `two days apart, from ${first}`);
    });
  });
}

test('vanilla: a required range refuses the submit until it is whole', { skip }, async () => {
  await withPage(fixture('vanilla-daterange-single.html'), async (p) => {
    await p.waitFor(`document.querySelector('${TRIGGER}')`);
    await p.clickCenter('button[type="submit"]');
    assert.ok(await p.waitFor(`document.querySelector('${TRIGGER}').getAttribute('aria-invalid') === 'true'`),
      'the empty field is marked invalid');
    assert.equal(await p.evalJS('window.__submitted'), 0);

    await openField(p);
    await clickDay(p, 1);
    await p.pressKey('Escape');
    await p.clickCenter('button[type="submit"]');
    assert.equal(await p.evalJS('window.__submitted'), 0, 'half a range is still empty to the form');

    await openField(p);
    await clickDay(p, 1);
    await clickDay(p, 5);
    await p.waitFor('window.__settled.length === 1');
    await p.clickCenter('button[type="submit"]');
    assert.ok(await p.waitFor('window.__submitted === 1'), 'a whole range submits');
  });
});
