/* Browser regression specs: `.fdy-table--hover-actionable` (#064).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * :hover only exists under a real pointer, so the rows are hovered by moving the mouse onto them,
 * and the colours compared are the ones the engine computed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + join(HERE, 'fixtures', 'vanilla-table-hover.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const READY = `document.readyState === 'complete' && !!document.getElementById('away')`;

const bg = (p, id) => p.evalJS(`getComputedStyle(document.getElementById('${id}')).backgroundColor`);
/* The transition on the row's background has to finish before the colour is read. */
const settle = () => new Promise((r) => setTimeout(r, 300));

async function hovered(p, id) {
  await p.clickCenter('#' + id);
  await settle();
  const colour = await bg(p, id);
  await p.clickCenter('#away');
  await settle();
  return colour;
}

test('an inert row does not answer the pointer, and a striped one keeps its stripe', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    const restOdd = await bg(p, 'inert-odd');
    const restEven = await bg(p, 'inert-even');
    assert.notEqual(restOdd, restEven, 'the table is striped, or this proves nothing');
    assert.equal(await hovered(p, 'inert-odd'), restOdd);
    assert.equal(await hovered(p, 'inert-even'), restEven, 'hover must not wipe the stripe');
  });
});

test('an activatable row still takes the hover tint', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    assert.equal(await hovered(p, 'act'), await bg(p, 'probe-hover'));
  });
});

test('a frozen cell in an inert row stays opaque', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    await p.clickCenter('#frozen-row td:last-child');
    await settle();
    assert.equal(await bg(p, 'freeze-cell'), await bg(p, 'probe-surface'),
      'transparent would let the scrolled cells show through it');
  });
});

test('without the modifier, hover is unchanged', { skip }, async () => {
  await withPage(PAGE, async (p) => {
    await p.waitFor(READY);
    assert.equal(await hovered(p, 'plain-row'), await bg(p, 'probe-hover'));
  });
});
