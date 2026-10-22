/* Browser regression specs: a refused submit reveals the field it refused (note #059).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * `freeday-form.js` focused the first invalid control and stopped there. focus() on a control that
 * is not rendered (inside a closed <details>, an unselected tab, a step panel left behind) does
 * nothing at all: the field turns red where nobody can see it, and the Save button reads as dead.
 * Only a real engine shows that, because the call itself succeeds without error.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const READY = `document.readyState === 'complete' && !!document.querySelector('#wiz-ahead[data-fdy-stepper-ready="1"]')`;

const submit = (p, formId) => p.evalJS(`document.getElementById(${JSON.stringify(formId)}).requestSubmit()`);
const focusedId = (p) => p.evalJS('document.activeElement && document.activeElement.id');
const rendered = (p, id) => p.evalJS(`document.getElementById(${JSON.stringify(id)}).getClientRects().length > 0`);

test('a refused field inside a folded accordion opens the fold and takes focus', { skip }, async () => {
  await withPage(fixture('vanilla-form-reveal.html'), async (p) => {
    await p.waitFor(READY);
    await submit(p, 'f-acc');
    assert.equal(await p.evalJS(`document.getElementById('acc').open`), true, 'the <details> holding the field must open');
    assert.equal(await rendered(p, 'acc-in'), true, 'the field must be laid out');
    assert.equal(await focusedId(p), 'acc-in', 'and hold the focus');
  });
});

test('a refused field on an unselected tab selects that tab', { skip }, async () => {
  await withPage(fixture('vanilla-form-reveal.html'), async (p) => {
    await p.waitFor(READY);
    await submit(p, 'f-tab');
    assert.equal(await p.evalJS(`document.getElementById('t2').getAttribute('aria-selected')`), 'true',
      'the tab must be selected through the tabs enhancer, so its own state agrees with the panel');
    assert.equal(await p.evalJS(`document.getElementById('tp1').hidden`), true, 'the other panel hides again');
    assert.equal(await focusedId(p), 'tab-in');
  });
});

test('a fold inside an unselected tab: every hiding ancestor is undone', { skip }, async () => {
  await withPage(fixture('vanilla-form-reveal.html'), async (p) => {
    await p.waitFor(READY);
    await submit(p, 'f-nest');
    assert.equal(await p.evalJS(`document.getElementById('n2').getAttribute('aria-selected')`), 'true');
    assert.equal(await p.evalJS(`document.getElementById('nest-acc').open`), true);
    assert.equal(await focusedId(p), 'nest-in');
  });
});

test('a refused field on a step already passed goes back to that step', { skip }, async () => {
  await withPage(fixture('vanilla-form-reveal.html'), async (p) => {
    await p.waitFor(READY);
    assert.equal(await p.evalJS(`document.getElementById('sp1').hidden`), true, 'starts on the last step');
    await submit(p, 'f-step');
    assert.equal(await p.evalJS(`document.getElementById('sp1').hidden`), false, 'step one is shown again');
    assert.equal(await p.evalJS(`document.querySelector('#wiz-back .fdy-step').classList.contains('is-active')`), true,
      'through the stepper, so its header agrees with the panel');
    assert.equal(await focusedId(p), 'step-in');
  });
});

test('a refused field on a step not yet reached is NOT revealed: the step guard is never skipped', { skip }, async () => {
  await withPage(fixture('vanilla-form-reveal.html'), async (p) => {
    await p.waitFor(READY);
    await submit(p, 'f-ahead');
    assert.equal(await p.evalJS(`document.getElementById('ap2').hidden`), true, 'the wizard stays on step one');
    assert.equal(await p.evalJS('window.guardAsked'), 0, 'and no forward move was even requested');
    assert.equal(await p.evalJS(`document.getElementById('ahead-in').getAttribute('aria-invalid')`), 'true',
      'the field is still marked; the form still refuses');
  });
});
