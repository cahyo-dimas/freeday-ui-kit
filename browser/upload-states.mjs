/* Browser regression spec — the upload row's rest state.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * A dropped file used to go straight to `uploading()`, before the `fdy-upload-add` event fired, so
 * a consumer could not pre-empt it, and there was no method to get back to rest. Every
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

/* A request can outlive its transfer: the bytes land in a second, the server then spends a minute
 * reading the document. The row's only long-running state was named after the transfer, so it kept
 * saying "Mengunggah…", and a determinate bar parked at 100% is the most convincing "hung" signal a
 * UI can give. waiting() is that state; the asserts below are about what the ENGINE renders, because
 * both plausible ways to get this wrong (modifier on the bar instead of the track, or leaving an
 * inline width behind) produce a full, frozen bar that no source reading reveals. */
test('waiting() reports no percentage, and the bar comes back measured', { skip }, async () => {
  await withPage(fixture('vanilla-upload-states.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.FreedayUpload');
    const state = async () => JSON.parse(await p.evalJS('JSON.stringify(window.rowState("listA"))'));
    const settle = () => sleep(300);   // --dur-base is 180ms; measure the bar after it stops moving
    /* Under reduced motion the kit's indeterminate treatment is deliberately a dimmed FULL bar
       (progress.css), no animation to carry the meaning, so opacity does. The width assert below
       only applies where the animation runs; the state's other signals hold either way. */
    const animates = (await p.evalJS('String(!matchMedia("(prefers-reduced-motion: reduce)").matches)')) === 'true';

    await p.evalJS('window.dropOn("dzA", "scan.pdf", 640000)');
    await p.evalJS('window.lastRow.uploading(); window.lastRow.setProgress(100);');
    await settle();
    const sent = await state();
    assert.equal(sent.valuenow, '100', 'the transfer itself still reports a percentage');
    assert.equal(sent.indeterminate, false, 'a measured transfer is not indeterminate');

    await p.evalJS('window.lastRow.waiting()');
    await settle();
    const wait = await state();
    assert.match(wait.sub, /Waiting for the server…/, `waiting() falls back to the kit's label, got "${wait.sub}"`);
    assert.equal(wait.indeterminate, true, 'the modifier belongs on .fdy-progress, the element role="progressbar" is on');
    assert.equal(wait.valuenow, null, 'an indeterminate progressbar must not carry aria-valuenow');
    if (animates) assert.ok(wait.barPct > 20 && wait.barPct < 60,
      `the bar must stop claiming a percentage — expected the modifier's own width, got ${wait.barPct}%`);

    await p.evalJS('window.lastRow.waiting("Membaca PDF…")');
    assert.match((await state()).sub, /Membaca PDF…/, 'the label is the consumer\'s');

    // Retry: leaving the indeterminate width behind would paint a FULL bar at 0%.
    await p.evalJS('window.lastRow.uploading()');
    await settle();
    const again = await state();
    assert.equal(again.indeterminate, false, 'uploading() returns the bar to determinate');
    assert.ok(again.barPct < 10, `a restarted transfer shows an empty bar, got ${again.barPct}%`);

    await p.evalJS('window.lastRow.done()');
    const done = await state();
    assert.equal(done.progressbar, false, 'done() drops the bar, taking the modifier with it');
    assert.match(done.cls, /fdy-file--success/, 'and marks success');
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
