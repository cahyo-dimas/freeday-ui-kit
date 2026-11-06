/* Browser regression specs: the controls a `data-fdy-validate` form could not require before #114.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * 3.12.0 (#096) let a form require the five button-triggered controls and left three out:
 *   - a choose-from-list, whose input is READONLY. A readonly input is barred from constraint
 *     validation, so the native `required` 3.12.0 pointed it at never refused anything. It takes
 *     the kit path instead: `data-fdy-required` on the group, which now mirrors its value.
 *   - an autocomplete, whose input is editable: the native `required` fits, and no prop passed it.
 *   - a date range, two pickers that each could be required, with no prop that reached them.
 * The range exposed a defect in the rule itself: two controls in one `.fdy-field` share one
 * message slot, and clearing the end that was filled erased the message the other still needed.
 * And `required` was read once: a render-once host (Blazor) could never change it afterwards.
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

before(async () => {
  if (skip === false) await buildEntries();
});

const until = async (p, condition, what) => {
  assert.ok(await p.waitFor(condition), `timed out waiting for ${what}: ${condition}`);
};
const attr = (p, sel, name) => p.evalJS(`document.querySelector(${JSON.stringify(sel)}).getAttribute(${JSON.stringify(name)})`);

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

const PAGE = 'vanilla-form-required-rest.html';

test('a required choose-from-list refuses until a row is picked, on the kit path', { skip }, async () => {
  await withPage(fixture(PAGE), async (p) => {
    await until(p, 'window.FreedayForm && document.getElementById("f-cfl").dataset.fdyFormReady === "1"', 'the form to init');
    /* The fixture ALSO puts a native `required` on the readonly input, the mechanism 3.12.0 named.
       It is inert, and asserting so is what keeps anyone from routing the field back to it. */
    assert.equal(await p.evalJS(`document.getElementById('cust-input').willValidate`), false,
      'a readonly input is barred from constraint validation');
    assert.equal(await attr(p, '#cust', 'data-value'), null, 'nothing picked, nothing mirrored');
    const border = () => p.evalJS(`getComputedStyle(document.getElementById('cust')).borderTopColor`);
    const calm = await border();

    await p.clickCenter('#cfl-kirim');
    await until(p, 'window.counts["f-cfl"].invalid === 1', 'the form to refuse');
    assert.equal((await json(p, 'window.counts["f-cfl"]')).focused, 'cust-open', 'focus goes to the open button');
    assert.equal(await attr(p, '#cust-open', 'aria-invalid'), 'true');
    assert.notEqual(await border(), calm, 'the group paints its error border, from the button inside it');
    assert.notEqual(await p.evalJS('window.shown("f-cfl")'), '', 'and says why');

    await p.clickCenter('#cust-open');
    await until(p, `document.getElementById('dlg-cust').open`, 'the dialog to open');
    await p.clickCenter('#row-1');
    await until(p, `document.getElementById('cust').getAttribute('data-value') === '7'`, 'the group to mirror the row');
    await until(p, `document.getElementById('cust-open').getAttribute('aria-invalid') === null`, 'the error to clear live');
    assert.equal(await p.evalJS('window.shown("f-cfl")'), '');
    await p.clickCenter('#cfl-kirim');
    await until(p, 'window.counts["f-cfl"].valid === 1', 'the form to accept');
  });
});

test('a range keeps its message while one end is still empty: the two ends share one slot', { skip }, async () => {
  await withPage(fixture(PAGE), async (p) => {
    await until(p, `document.querySelector('#range > :first-child .fdy-datepicker__trigger')`, 'the range to render');
    const FROM = '#range > :first-child';
    const TO = '#range > :last-child';
    await p.clickCenter('#range-kirim');
    await until(p, 'window.counts["f-range"].invalid === 1', 'the form to refuse');
    assert.deepEqual([await attr(p, `${FROM} .fdy-datepicker__trigger`, 'aria-invalid'), await attr(p, `${TO} .fdy-datepicker__trigger`, 'aria-invalid')],
      ['true', 'true'], 'both ends refused');

    await pickDay(p, FROM, 3);
    await until(p, `document.querySelector('${FROM} .fdy-datepicker__trigger').getAttribute('aria-invalid') === null`, 'the start to clear');
    assert.equal(await attr(p, `${TO} .fdy-datepicker__trigger`, 'aria-invalid'), 'true', 'the end is still empty');
    assert.notEqual(await p.evalJS('window.shown("f-range")'), '',
      'clearing the start must not erase the message the end still needs');

    await p.clickCenter('#range-kirim');
    await until(p, 'window.counts["f-range"].invalid === 2', 'the form to refuse again');
    assert.notEqual(await p.evalJS('window.shown("f-range")'), '',
      'and a submit, which clears the start AFTER painting it, keeps it too');

    await pickDay(p, TO, 5);
    await until(p, `document.querySelector('${TO} .fdy-datepicker__trigger').getAttribute('aria-invalid') === null`, 'the end to clear');
    assert.equal(await p.evalJS('window.shown("f-range")'), '', 'with nothing left invalid, the slot empties');
    await p.clickCenter('#range-kirim');
    await until(p, 'window.counts["f-range"].valid === 1', 'the form to accept');
  });
});

test('setState({ required }) changes a kit control and an autocomplete after init, both ways', { skip }, async () => {
  await withPage(fixture(PAGE), async (p) => {
    await until(p, `document.querySelector('#jam .fdy-timepicker__trigger') && document.getElementById('f-state').dataset.fdyFormReady === '1'`, 'the form to init');
    await p.clickCenter('#state-kirim');
    await until(p, 'window.counts["f-state"].valid === 1', 'nothing required yet, so it accepts');

    await p.evalJS(`FreedayTimepicker.setState(document.getElementById('jam'), { required: true });
      FreedayAutocomplete.setState(document.getElementById('satuan-root'), { required: true }); true`);
    assert.equal(await p.evalJS(`document.getElementById('satuan').required`), true, 'the autocomplete takes the NATIVE required');
    await p.clickCenter('#state-kirim');
    await until(p, 'window.counts["f-state"].invalid === 1', 'both now required, so it refuses');
    assert.equal(await p.evalJS(`window.counts['f-state'].focusedEl === document.querySelector('#jam .fdy-timepicker__trigger')`), true,
      'the first in DOM order is focused');
    assert.equal(await attr(p, '#satuan', 'aria-invalid'), 'true');

    /* Lifting the requirement with the error on screen clears it on the spot: a reader must not be
       left looking at a demand the form no longer makes. */
    await p.evalJS(`FreedayTimepicker.setState(document.getElementById('jam'), { required: false }); true`);
    await until(p, `document.querySelector('#jam .fdy-timepicker__trigger').getAttribute('aria-invalid') === null`, 'the lifted error to clear');
    await p.evalJS(`FreedayAutocomplete.setState(document.getElementById('satuan-root'), { required: false }); true`);
    await p.clickCenter('#state-kirim');
    await until(p, 'window.counts["f-state"].valid === 2', 'the form to accept again');
  });
});

test('every render-once control answers setState({ required }) on its root', { skip }, async () => {
  await withPage(fixture(PAGE), async (p) => {
    await until(p, `document.querySelector('#sw-cascade .fdy-cascade__trigger') && document.querySelector('#sw-month .fdy-datepicker__trigger')`, 'the sweep to init');
    const SWEEP = [['FreedayCombo', 'sw-combo'], ['FreedayDatepicker', 'sw-date'], ['FreedayDatepicker', 'sw-month'], ['FreedayCascade', 'sw-cascade']];
    for (const [api, id] of SWEEP) {
      const has = () => p.evalJS(`document.getElementById('${id}').hasAttribute('data-fdy-required')`);
      await p.evalJS(`${api}.setState(document.getElementById('${id}'), { required: true }); true`);
      assert.equal(await has(), true, `${api} #${id}: required on`);
      await p.evalJS(`${api}.setState(document.getElementById('${id}'), { disabled: false }); true`);
      assert.equal(await has(), true, `${api} #${id}: a call that does not mention it leaves it alone`);
      await p.evalJS(`${api}.setState(document.getElementById('${id}'), { required: false }); true`);
      assert.equal(await has(), false, `${api} #${id}: and off again`);
    }
  });
});

/* A render-once host pushes EVERY state on every parent re-render, changed or not. Rewriting an
   unchanged `invalid: false` used to erase the mark the form had painted, so the field stopped
   being red while its message stayed. Proven on a real refusal, then swept across the family. */
test('an unchanged setState push leaves the mark the form painted alone', { skip }, async () => {
  await withPage(fixture(PAGE), async (p) => {
    await until(p, `document.querySelector('#jam .fdy-timepicker__trigger') && document.querySelector('#sw-cascade .fdy-cascade__trigger')`, 'the page to init');
    const UNCHANGED = '{ disabled: false, readonly: false, invalid: false, required: true }';
    await p.evalJS(`FreedayTimepicker.setState(document.getElementById('jam'), { required: true });
      FreedayAutocomplete.setState(document.getElementById('satuan-root'), { required: true }); true`);
    await p.clickCenter('#state-kirim');
    await until(p, 'window.counts["f-state"].invalid === 1', 'the form to refuse');
    await p.evalJS(`FreedayTimepicker.setState(document.getElementById('jam'), ${UNCHANGED});
      FreedayAutocomplete.setState(document.getElementById('satuan-root'), ${UNCHANGED}); true`);
    assert.equal(await attr(p, '#jam .fdy-timepicker__trigger', 'aria-invalid'), 'true', 'timepicker: still red');
    assert.equal(await attr(p, '#satuan', 'aria-invalid'), 'true', 'autocomplete: still red');
    assert.notEqual(await p.evalJS('window.shown("f-state")'), '', 'and its message still has a field to belong to');

    const SWEEP = [['FreedayCombo', 'sw-combo', '.fdy-combo__button'], ['FreedayDatepicker', 'sw-date', '.fdy-datepicker__trigger'],
      ['FreedayDatepicker', 'sw-month', '.fdy-datepicker__trigger'], ['FreedayCascade', 'sw-cascade', '.fdy-cascade__trigger']];
    for (const [api, id, trig] of SWEEP) {
      const mark = () => attr(p, `#${id} ${trig}`, 'aria-invalid');
      await p.evalJS(`document.querySelector('#${id} ${trig}').setAttribute('aria-invalid', 'true'); true`);
      await p.evalJS(`${api}.setState(document.getElementById('${id}'), ${UNCHANGED}); true`);
      assert.equal(await mark(), 'true', `${api} #${id}: an unchanged push keeps the painted mark`);
      await p.evalJS(`${api}.setState(document.getElementById('${id}'), { invalid: true }); ${api}.setState(document.getElementById('${id}'), { invalid: false }); true`);
      assert.equal(await mark(), null, `${api} #${id}: a real change from the host still applies`);
    }
  });
});

/* The typed path: the props reach the DOM, and the mirrors move with the framework's state. */
for (const stack of ['vue', 'react']) {
  test(`${stack}: required on FdyAutocomplete, FdyCfl and FdyDateRange refuses, and filling them accepts`, { skip }, async () => {
    await withPage(fixture(`${stack}-form-required-rest.html`), async (p) => {
      await until(p, 'window.mounted === true', 'the app to mount');
      assert.equal(await p.evalJS(`document.getElementById('ac').required`), true, 'autocomplete: the native required, on its input');
      assert.equal(await p.evalJS(`document.querySelector('.fdy-input-group').hasAttribute('data-fdy-required')`), true, 'cfl: the kit path, on its group');
      assert.equal(await attr(p, '.fdy-input-group', 'data-value'), '', 'cfl: empty, and mirrored as empty');
      assert.equal(await p.evalJS(`document.querySelectorAll('.fdy-daterange .fdy-datepicker[data-fdy-required]').length`), 2, 'range: both ends');

      await p.clickCenter('#kirim');
      await until(p, 'window.counts.invalid === 1', 'the form to refuse');
      assert.equal(await p.evalJS('window.lastInvalid'), 4, 'four refusals: the autocomplete, the cfl, and both range ends');
      assert.equal(await p.evalJS('document.activeElement.id'), 'ac', 'the first in DOM order is focused');

      await p.evalJS('window.fill(); true');
      await until(p, `document.querySelector('.fdy-input-group').getAttribute('data-value') === 'C-1001'`, 'the cfl mirror to follow the state');
      await until(p, `document.querySelectorAll('[aria-invalid="true"]').length === 1`, 'the kit controls to clear live');
      /* The one left is the autocomplete, on the native path, which re-validates on blur. Blurred
         here and not by the click on Simpan: its message vanishing on that blur shifts the button
         up between press and release, and the click never lands. */
      await p.evalJS('document.activeElement.blur(); true');
      await until(p, `document.querySelectorAll('[aria-invalid="true"]').length === 0`, 'the autocomplete to clear on blur');
      await p.clickCenter('#kirim');
      await until(p, 'window.counts.valid === 1', 'the form to accept');

      await p.evalJS('window.setRequired(false); true');
      await until(p, `!document.querySelector('.fdy-input-group').hasAttribute('data-fdy-required') && !document.getElementById('ac').required`,
        'the props to be reactive, not read once');
    });
  });
}
