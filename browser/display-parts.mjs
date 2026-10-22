/* Browser regression specs: facts grid (#066), card head (#070), switch state hint (#068) and the
 * compact state (#069). Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Layout and accessible-description outcomes, which only an engine computes: how many columns a
 * grid sized by its own width ends up with, whether a long token wraps, and which hint a screen
 * reader is actually given.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + join(HERE, 'fixtures', 'vanilla-display-parts.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

/* An element the fixture renders LAST: readyState alone can be 'complete' on the about:blank the
   page starts from. */
const READY = `document.readyState === 'complete' && !!document.getElementById('sw-hint')`;
const columns = (id) => `new Set([...document.querySelectorAll('#${id} > div')].map((d) => Math.round(d.getBoundingClientRect().left))).size`;
const overflows = (id) => `(() => { const e = document.getElementById('${id}'); return e.scrollWidth > e.clientWidth + 1; })()`;

test('facts grid: columns follow the list\'s own width, and a long token wraps', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    assert.equal(await p.evalJS(columns('facts-wide')), 3, 'a 900px list holds three columns, never four');
    assert.equal(await p.evalJS(columns('facts-rail')), 1, 'a 240px rail stays one column with no modifier');
    assert.equal(await p.evalJS(overflows('email-wide')), false, 'an email wraps inside its column');
    assert.equal(await p.evalJS(overflows('email-rail')), false, 'and inside a rail');
    assert.equal(await p.evalJS(`(() => {
      const dt = document.querySelector('#facts-wide dt').getBoundingClientRect();
      const dd = document.querySelector('#facts-wide dd').getBoundingClientRect();
      return dd.top >= dt.bottom; })()`), true, 'the caption sits above its value');
  });
});

test('card head: the title truncates, the action keeps its place on the row', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    const r = JSON.parse(await p.evalJS(`JSON.stringify((() => {
      const card = document.getElementById('card').getBoundingClientRect();
      const title = document.getElementById('card-title');
      const action = document.getElementById('card-action').getBoundingClientRect();
      return { truncated: title.scrollWidth > title.clientWidth, actionRight: action.right, cardRight: card.right,
               sameRow: Math.abs(action.top - title.getBoundingClientRect().top) < 16 }; })())`));
    assert.equal(r.truncated, true, 'a long title is cut, not wrapped under the action');
    assert.ok(r.actionRight <= r.cardRight, 'the action stays inside the card');
    assert.equal(r.sameRow, true, 'and on the title\'s row');
    assert.equal(await p.evalJS(`getComputedStyle(document.querySelector('.fdy-avatar--square')).borderRadius
      === getComputedStyle(document.documentElement).getPropertyValue('--radius-md').trim()`), true,
      'the mark is a rounded square, not a person\'s circle');
  });
});

test('switch hint: the reader is told what the CURRENT state means, and only that', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    assert.equal(await p.axDescription('#sw'), 'Changes apply at once, nobody reviews them.');
    await p.clickCenter('#sw');
    assert.equal(await p.evalJS(`document.getElementById('sw').checked`), true);
    assert.equal(await p.axDescription('#sw'), 'Each change waits for a supervisor.',
      'the description follows the switch, and the hidden line is not read with it');
  });
});

test('compact state: one line, icon beside the text', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    assert.equal(await p.evalJS(`getComputedStyle(document.getElementById('compact')).flexDirection`), 'row');
    assert.ok(await p.evalJS(`document.getElementById('compact').getBoundingClientRect().height`) < 40,
      'small enough for a widget, not a page-sized block');
  });
});
