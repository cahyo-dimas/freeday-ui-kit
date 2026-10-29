/* Browser regression spec, the app owns removal, and markup no initAll reached says so.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * Both halves are silent failures from one consumer app (CATATAN-FREEDAY §9 and §10), and neither
 * shows in the DOM structure: a chip that is gone after the user pressed Cancel, and a form whose
 * save button does nothing. The first was caught only by an e2e test of the app's confirm flow,
 * the second only by two red e2e tests, so both are driven here with a real mouse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const json = async (p, expr) => JSON.parse(await p.evalJS(`JSON.stringify(${expr})`));

test('a cancelled fdy-chip-remove / fdy-upload-remove leaves the element where it is', { skip }, async () => {
  await withPage(fixture('vanilla-app-owned.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayChip && window.FreedayUpload');

    await p.clickCenter('#rmA');
    assert.equal(await p.evalJS(`Boolean(document.querySelector('#chipsA .fdy-chip'))`), true,
      'the app called preventDefault(), so the chip must survive until the app removes it');
    await p.clickCenter('#rmB');
    assert.equal(await p.evalJS(`Boolean(document.querySelector('#chipsB .fdy-chip'))`), false,
      'with nobody cancelling, the kit still removes the chip, as before');

    await p.evalJS('window.dropOn("dz", "kept.txt", 10)');
    await p.clickCenter('#dz-list .fdy-file__remove');
    assert.equal(await p.evalJS(`document.querySelectorAll('#dz-list .fdy-file').length`), 1,
      'a cancelled fdy-upload-remove keeps the row');

    assert.deepEqual(await json(p, 'window.events'), [
      { kind: 'chip', value: 'ani', cancelable: true },
      { kind: 'chip', value: 'budi', cancelable: true },
      { kind: 'upload', name: 'kept.txt', cancelable: true },
    ]);
  });
});

test('touching a hook no initAll reached warns once, naming it; a hydrated one stays quiet', { skip }, async () => {
  await withPage(fixture('vanilla-app-owned.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayForm && window.FreedayUnhydrated');
    await p.evalJS('window.mountForms()');

    await p.clickCenter('#hydratedIn');
    await p.clickCenter('#hydratedBtn');
    assert.deepEqual(await json(p, 'window.warnings'), [], 'a hydrated form must not warn');

    await p.clickCenter('#orphanIn');
    await p.clickCenter('#orphanBtn');
    const warnings = await json(p, 'window.warnings');
    assert.equal(warnings.length, 1, `one warning per element, not per event: ${JSON.stringify(warnings)}`);
    assert.equal(warnings[0].id, 'orphan', 'the element itself is handed to console.warn, so devtools links it');
    assert.match(warnings[0].msg, /\[data-fdy-validate\]/, 'the message names the hook');
    assert.match(warnings[0].msg, /useFreeday\(\)/, 'and says where the fix goes');
  });
});

test('raw CFL and breakpoint markup is hydrated by a stack helper, which finds enhancers by initAll', { skip }, async () => {
  await withPage(fixture('vanilla-app-owned.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayBlazor && window.FreedayCfl');
    await p.evalJS('window.mountViaStackHelper()');

    assert.equal(await p.evalJS(`document.getElementById('cflField').dataset.fdyCflBound || ''`), '1',
      'FreedayBlazor.initAll (and useFreeday, same rule) must reach FreedayCfl');
    await p.clickCenter('#cflBtn');
    assert.equal(await p.evalJS(`document.getElementById('dlg-late').open`), true,
      'and the field must actually open its dialog, being marked is not enough');
    assert.equal(await p.evalJS(`document.getElementById('bpLabel').textContent`),
      await p.evalJS('window.FreedayBreakpoint.get()'),
      'a breakpoint label mounted after load is filled now, not at the next resize');
  });
});
