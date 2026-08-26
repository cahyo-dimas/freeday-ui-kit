/* Browser regression spec: disabled / readonly / invalid on the seed-built pickers, and the
 * datepicker's label overrides (NEXT-UP #12).
 *
 * Why this exists at all: `datepicker.css` and `cascade.css` have always styled `:disabled`,
 * `[aria-readonly="true"]` and `[aria-invalid="true"]`, and the enhancers never set any of them.
 * Vue and React re-implement these controls natively, so they had the states and nobody noticed
 * the raw path did not — which meant no Blazor app could disable or lock a picker, since a Blazor
 * picker IS this enhancer.
 *
 * Clicks are real mouse gestures, not `.click()`: these controls open on pointer + focus, and a
 * synthetic click skips exactly the sequence a "does it refuse to open" assertion depends on.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const stateOf = (p, id) => p.evalJS(`JSON.stringify(window.stateOf(${JSON.stringify(id)}))`).then(JSON.parse);

test('a plain picker still opens, so the rest of this file means something', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayDatepicker && window.FreedayCascade');
    await p.clickCenter('#dpPlain button');
    assert.equal((await stateOf(p, 'dpPlain')).panelHidden, false, 'the control under test must open when nothing forbids it');
  });
});

test('a disabled datepicker is disabled and cannot be opened', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayDatepicker');
    const before = await stateOf(p, 'dpDisabled');
    assert.equal(before.disabled, true, 'data-disabled must reach the trigger element');
    await p.clickCenter('#dpDisabled button');
    assert.equal((await stateOf(p, 'dpDisabled')).panelHidden, true, 'a disabled trigger must not open the calendar');
  });
});

test('a readonly datepicker keeps its value and its focus, and still refuses to open', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayDatepicker');
    const s = await stateOf(p, 'dpReadonly');
    assert.equal(s.readonly, 'true', 'readonly is announced, not simulated with disabled');
    assert.equal(s.disabled, false, 'readonly must keep the control focusable — that is the whole difference from disabled');
    await p.clickCenter('#dpReadonly button');
    assert.equal((await stateOf(p, 'dpReadonly')).panelHidden, true, 'a readonly picker must not open');
  });
});

test('an invalid picker carries both hooks its stylesheet offers', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayDatepicker');
    const s = await stateOf(p, 'dpInvalid');
    assert.equal(s.invalid, 'true', 'aria-invalid is what assistive tech reads');
    assert.equal(s.errorClass, true, 'the root --error class is what the stylesheet paints');
  });
});

test('setState unlocks a picker a host rendered once', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayDatepicker');
    /* The Blazor path in one line: the seed is never re-rendered, so this call is the only way a
       later parameter change can reach the DOM. */
    await p.evalJS(`window.FreedayDatepicker.setState(document.getElementById('dpReadonly'), { readonly: false })`);
    assert.equal((await stateOf(p, 'dpReadonly')).readonly, null, 'setState must clear the attribute, not only the flag');
    await p.clickCenter('#dpReadonly button');
    assert.equal((await stateOf(p, 'dpReadonly')).panelHidden, false, 'an unlocked picker opens again');
  });
});

test('the datepicker nav labels are overridable per element', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayDatepicker');
    await p.clickCenter('#dpText button');
    const labels = JSON.parse(await p.evalJS(`JSON.stringify(window.navLabels('dpText'))`));
    assert.deepEqual(labels, ['Bulan sebelumnya', 'Bulan berikutnya'],
      'data-fdy-text-prev-month / -next-month must reach the arrows; before 2.1.1 these were literals no consumer could touch');
  });
});

test('a readonly cascade refuses to open too', { skip }, async () => {
  await withPage(fixture('vanilla-picker-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayCascade');
    await p.clickCenter('#csPlain button');
    assert.equal((await stateOf(p, 'csPlain')).panelHidden, false, 'the plain cascade opens');
    const s = await stateOf(p, 'csReadonly');
    assert.equal(s.readonly, 'true', 'data-readonly must reach the cascade trigger');
    await p.clickCenter('#csReadonly button');
    assert.equal((await stateOf(p, 'csReadonly')).panelHidden, true, 'a readonly cascade must not open');
  });
});
