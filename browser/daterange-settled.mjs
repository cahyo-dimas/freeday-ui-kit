/* Browser regression specs: a date range reports when it is WHOLE (#063).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Every range emitted per end: a list bound to it reloaded with the start alone, then again a
 * second later with the end. `settled` fires only when both ends are chosen or both are empty.
 * Days are picked with real clicks, because that is the route that produced the half range.
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

const START = '.fdy-daterange > :first-child';
const END = '.fdy-daterange > :last-child';

/* Opens a picker and clicks its nth selectable day of the month on show. */
async function pickDay(p, picker, n) {
  await p.clickCenter(`${picker} .fdy-datepicker__trigger`);
  await p.waitFor(`document.querySelectorAll('${picker} .fdy-cal__day:not(.is-outside):not([disabled])').length > ${n}`);
  await p.evalJS(`(() => {
    document.querySelectorAll('[data-pick]').forEach((e) => e.removeAttribute('data-pick'));
    [...document.querySelectorAll('${picker} .fdy-cal__day:not(.is-outside):not([disabled])')][${n}].setAttribute('data-pick', '');
  })()`);
  await p.clickCenter('[data-pick]');
}

async function assertSettlesOnWholeRange(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    await p.waitFor(`document.querySelector('${START} .fdy-datepicker__trigger')`);
    await pickDay(p, START, 4);
    assert.ok(await p.waitFor('window.__changes.length === 1'), 'picking the start is a change');
    assert.deepEqual(await p.evalJS('window.__settled'), [], 'but half a range is not settled');

    await pickDay(p, END, 2);
    assert.ok(await p.waitFor('window.__settled.length === 1'), 'the end completes it');
    const settled = await p.evalJS('window.__settled[0]');
    const [from, to] = 'from' in settled ? [settled.from, settled.to] : [settled.start, settled.end];
    assert.match(from, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(to, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(from <= to, `a settled range is ordered, got ${from} – ${to}`);
  });
}

test('Vue FdyDateRange: settled fires on the whole range, not on the first pick', { skip }, async () => {
  await assertSettlesOnWholeRange('vue-daterange.html');
});

test('React FdyDateRange: onSettled fires on the whole range, not on the first pick', { skip }, async () => {
  await assertSettlesOnWholeRange('react-daterange.html');
});

test('vanilla daterange: fdy-daterange-settled fires on the whole range, not on the first pick', { skip }, async () => {
  await assertSettlesOnWholeRange('vanilla-daterange.html');
});

test('vanilla daterange: a start that overtakes the end clears it, says so, and is not settled', { skip }, async () => {
  await withPage(fixture('vanilla-daterange.html'), async (p) => {
    await p.waitFor(`document.querySelector('${START} .fdy-datepicker__trigger')`);
    await pickDay(p, START, 2);
    await pickDay(p, END, 4);
    await p.waitFor('window.__settled.length === 1');

    await pickDay(p, START, 10);
    assert.ok(await p.waitFor(`window.__changes.includes('to:')`),
      'the cleared end is announced, so a binding that only hears picks (Blazor) lets go of it');
    assert.equal(await p.evalJS(`document.querySelector('[data-role="to"]')._fdyDp.getValue()`), '');
    assert.equal(await p.evalJS('window.__settled.length'), 1, 'a start with no end is half a range again');
  });
});
