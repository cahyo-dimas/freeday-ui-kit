/* Browser regression specs: tabs give way to a picker in a narrow container (CATATAN-FREEDAY §31).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The viewport is a desktop's throughout. Only the CONTAINER differs, which is the point of a
 * container query: the same tabs in a 20rem drawer need the picker that a phone needs.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + join(HERE, 'fixtures', 'vanilla-tabs-picker.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

before(() => {});

const shown = (p, sel) => p.evalJS(`(() => { const el = document.querySelector('${sel}'); return !!el && getComputedStyle(el).display !== 'none'; })()`);

async function ready(p) {
  await p.setViewport(1280, 900);
  await p.waitFor(`document.querySelector('#narrow .fdy-tabs__picker .fdy-combo[data-fdy-combo-ready]')`);
}

test('a wide container keeps its tab list, a 20rem one shows the picker in its place', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    assert.equal(await shown(p, '#wide .fdy-tabs__list'), true, 'the list stays in a wide container');
    assert.equal(await shown(p, '#wide .fdy-tabs__picker'), false, 'and its picker is not painted');
    assert.equal(await shown(p, '#narrow .fdy-tabs__list'), false, 'a 20rem container drops the list');
    assert.equal(await shown(p, '#narrow .fdy-tabs__picker'), true, 'and shows the picker');
    assert.equal(await p.evalJS(`document.querySelector('#narrow .fdy-combo__value').textContent`), 'Profile',
      'the picker names the selected tab');
    assert.equal(await p.evalJS(`document.querySelector('#narrow .fdy-combo__button').getAttribute('aria-label')`),
      'Settings sections', 'and borrows the tablist\'s name');

    const geo = JSON.parse(await p.evalJS(`JSON.stringify((() => {
      const a = document.querySelector('#narrow .fdy-tabs__picker').getBoundingClientRect();
      const b = document.querySelector('#np-1').getBoundingClientRect();
      const box = document.querySelector('#narrow').getBoundingClientRect();
      return { pickerW: a.width, boxW: box.width, panelTop: b.top, pickerBottom: a.bottom, panelLeft: b.left, boxLeft: box.left };
    })())`));
    assert.ok(Math.abs(geo.pickerW - geo.boxW) < 1, `the picker spans the container: ${geo.pickerW} of ${geo.boxW}`);
    assert.ok(geo.panelTop >= geo.pickerBottom, 'the panel sits under the picker, not beside it');
    assert.ok(Math.abs(geo.panelLeft - geo.boxLeft) < 1, 'and starts at the container\'s edge');
  });
});

test('picking a section in the picker switches the panel, and a tab click moves the picker', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    await p.clickCenter('#narrow .fdy-combo__button');
    await p.waitFor(`!document.querySelector('#narrow .fdy-combo__listbox').hidden`);
    await p.clickCenter('#narrow .fdy-combo__option[data-value="n-3"]');
    assert.ok(await p.waitFor(`!document.querySelector('#np-3').hidden && document.querySelector('#np-1').hidden`),
      'the picked section\'s panel shows and the old one hides');
    assert.equal(await p.evalJS(`document.querySelector('#n-3').getAttribute('aria-selected')`), 'true',
      'the tab state follows, so the list is right again when the container widens');

    await p.clickCenter('#w-2');
    assert.ok(await p.waitFor(`document.querySelector('#wide .fdy-tabs__picker .fdy-combo').getAttribute('data-value') === 'w-2'`),
      'a tab click moves the picker too, so the narrow form never shows a stale section');
  });
});

test('the class alone never hides a list: with no picker in the tabs, the list stays', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    assert.equal(await shown(p, '#bare .fdy-tabs__list'), true);
  });
});
