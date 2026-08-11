/* Browser regression specs — vanilla enhancers (dist/freeday.js).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate (lives outside
 * test/, not named *.test.mjs). Auto-skips when no Chrome binary is found. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('vanilla datetime: disabled reflects onto BOTH child triggers', { skip }, async () => {
  await withPage(fixture('vanilla-datetime.html'), async (p) => {
    const applied = await p.waitFor(
      `(() => { const tp = document.querySelector('#dt-disabled .fdy-timepicker__trigger'); return tp && tp.disabled; })()`,
    );
    const state = await p.evalJS(
      `(() => { const dp = document.querySelector('#dt-disabled .fdy-datepicker__trigger'),
        tp = document.querySelector('#dt-disabled .fdy-timepicker__trigger');
        return { dp: dp ? dp.disabled : null, tp: tp ? tp.disabled : null }; })()`,
    );
    assert.ok(applied, `both triggers should end up disabled, got ${JSON.stringify(state)}`);
    assert.equal(state.dp, true, 'date trigger disabled');
    // The regression guard: a microtask reached only the date child; setTimeout(0) reaches this one.
    assert.equal(state.tp, true, 'time trigger disabled');
  });
});

test('vanilla datetime: invalid reflects onto BOTH child triggers', { skip }, async () => {
  await withPage(fixture('vanilla-datetime.html'), async (p) => {
    const applied = await p.waitFor(
      `(() => { const tp = document.querySelector('#dt-invalid .fdy-timepicker__trigger');
        return tp && tp.getAttribute('aria-invalid') === 'true'; })()`,
    );
    const state = await p.evalJS(
      `(() => { const dp = document.querySelector('#dt-invalid .fdy-datepicker__trigger'),
        tp = document.querySelector('#dt-invalid .fdy-timepicker__trigger');
        return { dp: dp ? dp.getAttribute('aria-invalid') : null, tp: tp ? tp.getAttribute('aria-invalid') : null }; })()`,
    );
    assert.ok(applied, `both triggers should end up aria-invalid, got ${JSON.stringify(state)}`);
    assert.equal(state.dp, 'true', 'date trigger aria-invalid');
    assert.equal(state.tp, 'true', 'time trigger aria-invalid');
  });
});

test('vanilla combo: real mouse-select updates the value', { skip }, async () => {
  await withPage(fixture('vanilla-combo.html'), async (p) => {
    await p.waitFor(`document.querySelector('#cb .fdy-combo__button')`);
    await p.clickCenter('#cb .fdy-combo__button');
    const opened = await p.waitFor(
      `document.querySelector('#cb .fdy-combo__button').getAttribute('aria-expanded') === 'true'`,
    );
    assert.ok(opened, 'listbox opens on trigger click');
    // Trusted press → the option blurs the button → focusout fires; only the mousedown
    // preventDefault keeps the pick from being swallowed before click lands.
    await p.clickCenter('#cb .fdy-combo__option[data-value="badge"]');
    const changed = await p.waitFor(`window.__val === 'badge'`);
    assert.ok(changed, `mouse-select should set value to "badge", got "${await p.evalJS('window.__val')}"`);
  });
});

test('vanilla combo: programmatic setValue updates selection silently (no fdy-change)', { skip }, async () => {
  await withPage(fixture('vanilla-combo.html'), async (p) => {
    await p.waitFor(`document.getElementById('cb') && document.getElementById('cb')._fdyCombo`);
    // Host-driven set (used by the Blazor @bind-Value wrapper) must NOT echo an fdy-change.
    await p.evalJS(`window.FreedayCombo.setValue(document.getElementById('cb'), 'alert')`);
    const state = await p.evalJS(`(() => ({
      label: document.querySelector('#cb .fdy-combo__value').textContent.trim(),
      dataValue: document.getElementById('cb').getAttribute('data-value'),
      selected: document.querySelector('#cb .fdy-combo__option[data-value="alert"]').getAttribute('aria-selected'),
      changed: window.__val
    }))()`);
    assert.equal(state.label, 'Alert', 'value label reflects the set option');
    assert.equal(state.dataValue, 'alert', 'root data-value updated');
    assert.equal(state.selected, 'true', 'option marked aria-selected');
    assert.equal(state.changed, 'button', 'setValue is silent — fdy-change NOT fired, window.__val unchanged');
  });
});
