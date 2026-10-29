/* Browser regression spec, the app owns removal, and markup no initAll reached says so.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * Both halves are silent failures from one consumer app (CATATAN-FREEDAY §9 and §10), and neither
 * shows in the DOM structure: a chip that is gone after the user pressed Cancel, and a form whose
 * save button does nothing. The first was caught only by an e2e test of the app's confirm flow,
 * the second only by two red e2e tests, so both are driven here with a real mouse.
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

/* CATATAN-FREEDAY §14 measured a page-wide useFreeday() at 9 min 6 s for ten e2e tests against
 * 19.1 s for a modal-only scope, and narrowed the scope for that reason. On the same matrix shape
 * the scan itself costs about a millisecond (1.1 ms per rehydrate, 2.1 ms per reactive update,
 * measured when this was written), so the thresholds here are generous on purpose: they catch a
 * scan that went quadratic, not a slow runner.
 *
 * The page-wide scope is also what exposed the typed FdyDrawer. It renders `.fdy-drawer` and owns
 * its dismissal, so the drawer enhancer claiming it added a second backdrop handler that closed it
 * past `dismissible=false` and left `open` true. data-fdy-ignore is how it, and an app, say "not
 * yours". FdyChart renders a hook too, and has always claimed its own ready flag; it stays here as
 * the check that the claim still holds. */
test('a page-wide useFreeday costs milliseconds, and leaves typed and ignored markup alone', { skip }, async () => {
  await withPage(fixture('vue-page-scan.html'), async (p) => {
    await p.waitFor('typeof window.measure === "function" && document.getElementById("chart")');

    const m = JSON.parse(await p.evalJS('window.measure(30).then(JSON.stringify)'));
    assert.equal(m.buttons, 305, 'the matrix (304) plus the ignored chip must all be rendered');
    assert.ok(m.perRehydrate < 25, `one page-wide rehydrate took ${m.perRehydrate.toFixed(1)} ms`);
    assert.ok(m.perUpdate < 50, `one reactive update with the page-wide scan took ${m.perUpdate.toFixed(1)} ms`);

    assert.equal(await p.evalJS(`document.querySelectorAll('#chart .fdy-bars__col').length`), 3,
      'the typed FdyChart claims its own ready flag, so the page-wide scan must not render it twice');
    await p.evalJS('window.FreedayChip.initAll(document)');
    assert.equal(await p.evalJS(`document.getElementById('ignoredRm').dataset.fdyChipRmReady || ''`), '',
      'an explicit initAll over the document still skips a data-fdy-ignore subtree');
    await p.clickCenter('#ignoredRm');
    assert.equal(await p.evalJS(`Boolean(document.querySelector('#ignored .fdy-chip'))`), true,
      'the ignored chip is untouched by the kit');

    await p.evalJS('window.openDrawer()');
    await p.waitFor('document.getElementById("drawer").open');
    assert.equal(await p.evalJS(`document.getElementById('drawer').dataset.fdyDrawerReady || ''`), '',
      'the typed FdyDrawer owns its dismissal; the enhancer must not claim it');
    await p.clickCenter('#drawer p');
    const box = await json(p, `document.querySelector('#drawer').getBoundingClientRect()`);
    const vw = await p.evalJS('innerWidth');
    assert.ok(box.right < vw - 40, 'the fixture needs backdrop to the right of the drawer to click on');
    await p.clickAt(Math.round(vw - 20), Math.round(box.top + box.height / 2));
    assert.equal(await p.evalJS(`document.getElementById('drawer').open`), true,
      'a backdrop click must not close a drawer whose dismissible is false');
    assert.equal(await p.evalJS('window.__drawerClosed'), 0, 'and the app hears no close either');

    assert.deepEqual(await json(p, 'window.warnings'), [],
      'nothing here is a mistake: typed components and ignored subtrees must not warn');
  });
});
