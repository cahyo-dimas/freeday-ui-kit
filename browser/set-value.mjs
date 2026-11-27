/* Browser regression specs: each value-bearing enhancer takes its value (and the autocomplete its
 * options) from a host that renders once, silently. Run via `npm run test:browser`.
 *
 * Blazor wrappers hand their DOM to these enhancers and stop rendering, so this API is the only way
 * a value the host changes can reach the screen (#123). Silent means no change event: the binding
 * that set the value must not hear it back as if the user had picked it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + join(HERE, 'fixtures', 'vanilla-set-value.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const text = (p, sel) => p.evalJS(`document.querySelector(${JSON.stringify(sel)}).textContent.trim()`);
const attr = (p, sel, name) => p.evalJS(`document.querySelector(${JSON.stringify(sel)}).getAttribute(${JSON.stringify(name)})`);

async function ready(p) {
  await p.waitFor(`document.querySelector('#ac')?.dataset.fdyAcReady === '1' && document.querySelector('#two .fdy-datepicker__trigger')`);
}

test('date, month, time and cascade show a value their host pushes, and raise no event', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    await p.evalJS(`FreedayDatepicker.setValue(document.getElementById('dp'), '2026-12-24'),
      FreedayDatepicker.setValue(document.getElementById('mp'), '2026-12'),
      FreedayTimepicker.setValue(document.getElementById('tp'), '08:30'),
      FreedayCascade.setValue(document.getElementById('cc'), 'bdg'), true`);
    assert.equal(await attr(p, '#dp', 'data-value'), '2026-12-24');
    assert.equal(await text(p, '#dp .fdy-datepicker__value'), '24 Dec 2026');
    assert.equal(await attr(p, '#mp', 'data-value'), '2026-12');
    assert.equal(await attr(p, '#tp', 'data-value'), '08:30');
    assert.equal(await text(p, '#tp .fdy-timepicker__value'), '08:30');
    assert.equal(await attr(p, '#cc', 'data-value'), 'bdg');
    assert.match(await text(p, '#cc .fdy-cascade__value'), /West Java.*Bandung/);

    await p.evalJS(`FreedayDatepicker.setValue(document.getElementById('dp'), ''), true`);
    assert.equal(await attr(p, '#dp', 'data-value'), '', 'an empty value clears the field');
    assert.deepEqual(await p.evalJS('window.__events'), [], 'no change event for a value the host set');
  });
});

test('both range layouts show a pushed range, and the two-picker one relinks its end', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    await p.evalJS(`FreedayDatepicker.setValue(document.getElementById('one'), '2026-12-01/2026-12-31'),
      FreedayDatepicker.setRange(document.getElementById('two'), '2026-12-10', '2026-12-20'), true`);
    assert.equal(await attr(p, '#one', 'data-value'), '2026-12-01/2026-12-31');
    assert.match(await text(p, '#one .fdy-datepicker__value'), /01 Dec 2026 – 31 Dec 2026/);
    assert.equal(await attr(p, '#two [data-role="to"]', 'data-value'), '2026-12-20');

    await p.clickCenter('#two [data-role="to"] .fdy-datepicker__trigger');
    await p.waitFor(`document.querySelectorAll('#two [data-role="to"] .fdy-cal__day').length > 0`);
    const ninth = await p.evalJS(`[...document.querySelectorAll('#two [data-role="to"] .fdy-cal__day:not(.is-outside)')][8].disabled`);
    assert.equal(ninth, true, 'the end cannot be set before the pushed start');
    assert.deepEqual(await p.evalJS('window.__events'), []);
  });
});

test('the autocomplete takes pushed options and text, and sees options rendered later', { skip }, async () => {
  await withPage(URL, async (p) => {
    await ready(p);
    await p.evalJS(`FreedayAutocomplete.setOptions(document.getElementById('ac'), ['kg', 'litre']),
      FreedayAutocomplete.setValue(document.getElementById('ac'), 'kg'), true`);
    assert.equal(await p.evalJS(`document.querySelector('#ac input').value`), 'kg');
    assert.deepEqual(await p.evalJS(`[...document.querySelectorAll('#ac [role=option]')].map((o) => o.textContent)`), ['kg', 'litre']);

    // Rendered by the app after init, with no setOptions: typing must find it.
    await p.evalJS(`(() => { const li = document.createElement('li'); li.className = 'fdy-autocomplete__option';
      li.setAttribute('role', 'option'); li.textContent = 'dozen';
      document.getElementById('ac-list').insertBefore(li, document.querySelector('#ac .fdy-autocomplete__empty')); return true; })()`);
    await p.evalJS(`(() => { const i = document.querySelector('#ac input'); i.value = ''; return true; })()`);
    await p.clickCenter('#ac input');
    await p.insertText('doz');
    assert.ok(await p.waitFor(`[...document.querySelectorAll('#ac [role=option]')].filter((o) => !o.hidden).map((o) => o.textContent).join() === 'dozen'`),
      'an option added after init is filtered like the rest');
    assert.deepEqual(await p.evalJS('window.__events'), []);
  });
});
