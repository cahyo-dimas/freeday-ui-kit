/* Browser regression spec, the number field's step buttons.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips without
 * Chrome.
 *
 * `.fdy-input` hides the user agent's spin buttons (unthemeable OS widgets), so [data-fdy-number]
 * owes the user the affordance back, and a button that stays enabled while doing nothing is worse
 * than no button at all. Everything here is driven with real input: a disabled button swallowing a
 * synthetic .click() proves nothing, and tab order only moves for a trusted key.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const UP = '#grpA [data-fdy-number-step="1"]';
const DOWN = '#grpA [data-fdy-number-step="-1"]';

test('stepping is native, bounded, and announced', { skip }, async () => {
  await withPage(fixture('vanilla-number.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayNumber');
    const state = async (id) => JSON.parse(await p.evalJS(`JSON.stringify(window.state("${id}"))`));

    assert.equal((await state('grpA')).ready, true, 'the enhancer claims the group');
    assert.equal((await state('grpA')).down, false, 'value 1 with min 0 — down is available');

    await p.clickCenter(UP);
    assert.equal((await state('grpA')).value, '2', 'a real click steps the input');

    // Frameworks bind to the input, not to a kit event, so the platform's own events must fire.
    const events = JSON.parse(await p.evalJS('JSON.stringify(window.events)'));
    assert.deepEqual(events.map((e) => e.type), ['input', 'change'],
      `stepping must dispatch native input + change, got ${JSON.stringify(events)}`);
    assert.equal(events[0].id, 'numA', 'the events come from the input, which is the source of truth');

    // Walk to the max: the button must stop claiming it can go further.
    await p.clickCenter(UP);
    assert.equal((await state('grpA')).value, '3');
    let s = await state('grpA');
    assert.equal(s.up, true, 'at max, the up button is disabled');
    assert.equal(s.down, false, 'and the other direction stays available');

    await p.clickCenter(UP);
    assert.equal((await state('grpA')).value, '3', 'clicking a disabled button changes nothing');

    await p.clickCenter(DOWN);
    s = await state('grpA');
    assert.equal(s.value, '2', 'stepping down works');
    assert.equal(s.up, false, 'leaving the bound re-enables the up button');

    await p.clickCenter(DOWN);
    await p.clickCenter(DOWN);
    s = await state('grpA');
    assert.equal(s.value, '0', 'clamped at min');
    assert.equal(s.down, true, 'at min, the down button is disabled');
  });
});

test('read-only and stepless fields are inert, not broken', { skip }, async () => {
  await withPage(fixture('vanilla-number.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayNumber');
    const state = async (id) => JSON.parse(await p.evalJS(`JSON.stringify(window.state("${id}"))`));

    /* readonly is not disabled (#39): the value stays full-contrast, focusable and copyable, but
       stepping it is editing it, so the buttons must say so. */
    let b = await state('grpB');
    assert.equal(b.up && b.down, true, 'a read-only field cannot be stepped');
    await p.clickCenter('#grpB [data-fdy-number-step="1"]');
    assert.equal((await state('grpB')).value, '5', 'and clicking really does nothing');

    /* step="any" has no defined increment, stepUp() throws InvalidStateError on such a field, so
       the buttons must be disabled rather than fail on click. */
    const c = await state('grpC');
    assert.equal(c.up && c.down, true, 'step="any" cannot be stepped');
    await p.clickCenter('#grpC [data-fdy-number-step="1"]');
    assert.deepEqual(JSON.parse(await p.evalJS('JSON.stringify(window.pageErrors)')), [],
      'and nothing throws');
    assert.equal((await state('grpC')).value, '1.5');
  });
});

test('the step buttons are not tab stops', { skip }, async () => {
  await withPage(fixture('vanilla-number.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayNumber');

    /* The input is already focusable and ArrowUp/ArrowDown already step it, so two extra stops per
       field would cost every keyboard user something and buy nothing. Measured, not asserted from
       the attribute: only a trusted Tab moves focus. */
    await p.evalJS('document.getElementById("numA").focus()');
    await p.pressKey('Tab');
    const next = await p.evalJS('document.activeElement.id');
    assert.equal(next, 'numB',
      `Tab must skip the step buttons and land on the next field, landed on "${next}"`);
  });
});
