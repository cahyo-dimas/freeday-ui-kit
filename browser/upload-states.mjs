/* Browser regression spec — the upload row's rest state.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * A dropped file used to go straight to `uploading()` — before the `fdy-upload-add` event fired, so
 * a consumer could not pre-empt it — and there was no method to get back to rest. Every
 * consumer-driven integration therefore showed a transfer that had not started, with a progress bar
 * that never moved, for as long as the user took to fill in the rest of the form. That reads as a
 * hung upload and gets reported as a bug against a transfer nobody ever began.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('a dropped file rests until the consumer starts the transfer', { skip }, async () => {
  await withPage(fixture('vanilla-upload-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayUpload');

    // --- A: the default. Chosen, not sent: size only, and no progress bar to imply movement.
    await p.evalJS('window.dropOn("dzA", "report.txt", 1234)');
    const rest = JSON.parse(await p.evalJS('JSON.stringify(window.rowState("listA"))'));
    assert.equal(rest.progressbar, false, 'a file that has only been chosen must not show a progress bar');
    assert.doesNotMatch(rest.sub, /·/, `the rest state states the size and claims nothing else, got "${rest.sub}"`);

    // The consumer drives it from there — the states must actually chain.
    await p.evalJS('window.lastRow.uploading()');
    assert.equal(JSON.parse(await p.evalJS('JSON.stringify(window.rowState("listA"))')).progressbar, true,
      'row.uploading() must bring the progress bar back');
    await p.evalJS('window.lastRow.setProgress(50); window.lastRow.done();');
    const done = JSON.parse(await p.evalJS('JSON.stringify(window.rowState("listA"))'));
    assert.match(done.cls, /fdy-file--success/, 'row.done() marks success');
    assert.equal(done.progressbar, false, 'row.done() drops the bar');

    // --- B: the demo path is unchanged — the kit IS transferring, so it may say so.
    await p.evalJS('window.dropOn("dzB", "demo.txt", 2048)');
    assert.equal(JSON.parse(await p.evalJS('JSON.stringify(window.rowState("listB"))')).progressbar, true,
      'data-fdy-upload-simulate still shows a transfer immediately');
    await sleep(1500);
    assert.match(JSON.parse(await p.evalJS('JSON.stringify(window.rowState("listB"))')).cls, /fdy-file--success/,
      'the simulated transfer still completes');

    // --- C: bring your own row. No list, but the app must still learn a file arrived.
    await p.evalJS('window.dropOn("dzC", "own.txt", 99)');
    const events = JSON.parse(await p.evalJS('JSON.stringify(window.events)'));
    assert.equal(events.length, 3, `every drop dispatches fdy-upload-add, got ${JSON.stringify(events)}`);
    assert.equal(events[2].zone, 'dzC', 'a dropzone with no file list still announces the file');
    assert.equal(await p.evalJS('typeof window.lastRow.ready'), 'function', 'detail.row exposes ready()');
  });
});

test('removal fires on the dropzone, once, in both list layouts', { skip }, async () => {
  await withPage(fixture('vanilla-upload-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayUpload');
    await p.evalJS('window.watchZone("dzA"); window.watchZone("dzD");');

    /* A: the documented layout — the list is a SIBLING of the dropzone, so a row event could never
       bubble through the zone. This is the case that silently dropped every removal. */
    await p.evalJS('window.dropOn("dzA", "report.txt", 1234)');
    assert.equal(await p.evalJS('window.clickRemove("listA")'), 'clicked');
    let zoneHits = JSON.parse(await p.evalJS('JSON.stringify(window.removals.zone)'));
    assert.deepEqual(zoneHits, ['dzA'],
      `a listener on the dropzone must get exactly one removal, got ${JSON.stringify(zoneHits)}`);

    /* D: the list NESTED inside the dropzone. Dispatching on the row as well would double-fire here,
       because the row already bubbles through the zone. */
    await p.evalJS('window.dropOn("dzD", "nested.txt", 512)');
    assert.equal(await p.evalJS('window.clickRemove("listD")'), 'clicked');
    zoneHits = JSON.parse(await p.evalJS('JSON.stringify(window.removals.zone)'));
    assert.deepEqual(zoneHits, ['dzA', 'dzD'], 'still exactly one removal per click when the list is nested');

    // And a consumer delegating further up sees one per removal too — the pair stays symmetric.
    const docHits = JSON.parse(await p.evalJS('JSON.stringify(window.removals.doc)'));
    assert.deepEqual(docHits, ['dzA', 'dzD'],
      `delegation on an ancestor must not see duplicates, got ${JSON.stringify(docHits)}`);
  });
});
