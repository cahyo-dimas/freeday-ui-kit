/* Browser regression specs: `data-fdy-validate` requiring a KIT control, not just a native one.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The hole this closes. The enhancer wires *native* Constraint Validation: `isCandidate` wants
 * `willValidate` and rejects `type === 'button'`, and a kit control's trigger IS a button. So
 * `form.elements` never offered one, `required` on one meant nothing, and a form could not demand
 * that a combo, datepicker, monthpicker, timepicker or cascade be filled. Found by auditing
 * keamanan-cluster: four `<input type="time">` stayed native in a shift form purely because
 * swapping them to `FdyTimepicker` would have silently dropped the required check (#096).
 *
 * `FdyAutocomplete` and `FdyCfl` are deliberately not part of this: they render a real `<input>`,
 * so the native `required` is what fits them. No prop exposes it yet — a separate gap, recorded in
 * NEXT-UP.md, not half-closed here.
 *
 * Asserted in a browser because every claim is about what the DOM did: whether a submit was
 * refused, which field was focused, and whether a MutationObserver fired. None of it can be read
 * off the source.
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

const until = async (p, condition, what) => {
  assert.ok(await p.waitFor(condition), `timed out waiting for ${what}, condition never became true: ${condition}`);
};

const TRIGGER = '#jam .fdy-timepicker__trigger';
const ERROR = '#jam';
/* The message the enhancer writes, read from the field the control sits in. */
const errorText = (p, fieldSel) =>
  p.evalJS(`(() => { const e = document.querySelector('${fieldSel}').querySelector('[data-fdy-error]');
    return e && !e.hidden ? e.textContent.trim() : ''; })()`);

test('an empty required kit control refuses the submit', { skip }, async () => {
  await withPage(fixture('vanilla-form-kit-required.html'), async (p) => {
    await until(p, `document.querySelector(${JSON.stringify(TRIGGER)}) !== null`, 'the enhancer to build the trigger');
    await p.clickCenter('#kirim');
    await until(p, 'window.__invalid === 1', 'the form to refuse');
    assert.equal(await p.evalJS('window.__valid'), 0, 'fdy-form-valid must not fire while a required kit control is empty');
    /* aria-invalid lands on the TRIGGER, which is the thing a reader is on, not on the root div. */
    assert.equal(await p.evalJS(`document.querySelector(${JSON.stringify(TRIGGER)}).getAttribute('aria-invalid')`), 'true');
    /* The per-control message, so `data-fdy-msg-required` is read from the root. */
    assert.equal(await errorText(p, '#form .fdy-field:first-of-type'), 'Jam mulai wajib diisi.');
  });
});

test('the refused kit control is the one focused, by DOM order', { skip }, async () => {
  await withPage(fixture('vanilla-form-kit-required.html'), async (p) => {
    await until(p, `document.querySelector(${JSON.stringify(TRIGGER)}) !== null`, 'the enhancer to build the trigger');
    await p.clickCenter('#kirim');
    await until(p, 'window.__invalid === 1', 'the form to refuse');
    /* The kit control is first in the document and the native input second. Collecting natives
       before kit roots would focus the input and leave the reader past the first red field. */
    assert.equal(await p.evalJS('window.__firstFocused'), 'fdy-timepicker__trigger');
  });
});

test('filling the kit control clears its error without a second submit', { skip }, async () => {
  await withPage(fixture('vanilla-form-kit-required.html'), async (p) => {
    await until(p, `document.querySelector(${JSON.stringify(TRIGGER)}) !== null`, 'the enhancer to build the trigger');
    await p.clickCenter('#kirim');
    await until(p, 'window.__invalid === 1', 'the form to refuse');
    /* Assert the error is SHOWING before picking. Without this line the test passes even with the
       whole rule removed, because "the error cleared" is vacuously true when there was none --
       the exact shape of dead guard that cost this repo a release on 2026-10-26. */
    assert.equal(await errorText(p, '#form .fdy-field:first-of-type'), 'Jam mulai wajib diisi.',
      'the error must be on screen before the pick, or this test proves nothing');
    await p.clickCenter(TRIGGER);
    await until(p, `document.querySelector(${JSON.stringify(TRIGGER)}).getAttribute('aria-expanded') === 'true'`, 'the panel to open');
    await p.clickCenter('#jam .fdy-timepicker__opt:nth-child(2)');
    /* The value reaches the ROOT, which is the whole contract: one attribute instead of five
       event names. */
    await until(p, `document.getElementById('jam').getAttribute('data-value') === '06:30'`, 'the value to reach the root');
    /* And the MutationObserver re-validates with no further submit. */
    await until(p, `document.querySelector(${JSON.stringify(TRIGGER)}).getAttribute('aria-invalid') === null`, 'the error to clear');
    assert.equal(await errorText(p, '#form .fdy-field:first-of-type'), '');
  });
});

test('once both fields are filled the form reports valid', { skip }, async () => {
  await withPage(fixture('vanilla-form-kit-required.html'), async (p) => {
    await until(p, `document.querySelector(${JSON.stringify(TRIGGER)}) !== null`, 'the enhancer to build the trigger');
    await p.clickCenter(TRIGGER);
    await until(p, `document.querySelector(${JSON.stringify(TRIGGER)}).getAttribute('aria-expanded') === 'true'`, 'the panel to open');
    await p.clickCenter('#jam .fdy-timepicker__opt:nth-child(1)');
    await until(p, `document.getElementById('jam').getAttribute('data-value') === '06:00'`, 'the time to be picked');
    await p.evalJS(`(() => { const i = document.getElementById('nama'); i.value = 'Pagi';
      i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await p.clickCenter('#kirim');
    await until(p, 'window.__valid === 1', 'the form to accept');
    assert.equal(await p.evalJS('window.__invalid'), 0, 'nothing should have been refused');
  });
});

/* The typed path. The vanilla specs above prove the enhancer's rule; these prove the wrappers
   actually opt in -- that `required` reaches the root as `data-fdy-required`, and that the
   reactive `data-value` mirror moves so the MutationObserver re-validates. A wrapper that
   rendered neither would leave every Vue and React form in exactly the hole this closes. */
for (const stack of ['vue', 'react']) {
  const TRIG = '.fdy-timepicker__trigger';

  test(`${stack}: the required prop reaches the root and refuses the submit`, { skip }, async () => {
    await withPage(fixture(`${stack}-form-required.html`), async (p) => {
      await until(p, `document.querySelector(${JSON.stringify(TRIG)}) !== null`, 'the picker to render');
      assert.equal(await p.evalJS(`document.querySelector('.fdy-timepicker').hasAttribute('data-fdy-required')`), true);
      /* Empty means the attribute is present and blank, not missing: a control that never mirrored
         its value would look permanently empty and refuse forever. */
      assert.equal(await p.evalJS(`document.querySelector('.fdy-timepicker').getAttribute('data-value')`), '');
      await p.clickCenter('#kirim');
      await until(p, 'window.__invalid === 1', 'the form to refuse');
      assert.equal(await p.evalJS('window.__valid'), 0);
      assert.equal(await p.evalJS(`document.querySelector(${JSON.stringify(TRIG)}).getAttribute('aria-invalid')`), 'true');
      /* The two stacks are SUPPOSED to differ here, and that is the point of asserting it.
         Vue forwards an unknown attribute to a single-root component's root, so the per-control
         `data-fdy-msg-required` lands where the enhancer reads it and wins. React forwards
         nothing it does not render, so the same attribute never reaches the DOM and the
         form-level `data-fdy-text-required` is what is left. An app that needs per-field wording
         in React has to put it on the form, and this is where that is written down. */
      assert.equal(
        await p.evalJS(`(() => { const e = document.querySelector('.fdy-field [data-fdy-error]');
          return e && !e.hidden ? e.textContent.trim() : ''; })()`),
        stack === 'vue' ? 'Jam mulai wajib diisi.' : 'Wajib diisi.',
      );
    });
  });

  test(`${stack}: picking a time moves the mirror and the form then accepts`, { skip }, async () => {
    await withPage(fixture(`${stack}-form-required.html`), async (p) => {
      await until(p, `document.querySelector(${JSON.stringify(TRIG)}) !== null`, 'the picker to render');
      await p.clickCenter('#kirim');
      await until(p, 'window.__invalid === 1', 'the form to refuse');
      await p.clickCenter(TRIG);
      await until(p, `document.querySelector(${JSON.stringify(TRIG)}).getAttribute('aria-expanded') === 'true'`, 'the panel to open');
      await p.clickCenter('.fdy-timepicker__opt:nth-child(2)');
      /* The binding round-trips through the framework, so this also proves the mirror is reactive
         and not a value captured once at first render. */
      await until(p, `document.querySelector('.fdy-timepicker').getAttribute('data-value') === '06:30'`, 'the mirror to move');
      await until(p, `document.querySelector(${JSON.stringify(TRIG)}).getAttribute('aria-invalid') === null`, 'the error to clear');
      await p.clickCenter('#kirim');
      await until(p, 'window.__valid === 1', 'the form to accept');
    });
  });
}
