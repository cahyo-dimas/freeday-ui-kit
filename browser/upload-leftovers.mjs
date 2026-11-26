/* Browser regression specs: an upload row and a drop zone never show two states at once.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Drag events are dispatched, not driven through CDP: what is under test is which state is painted,
 * not pointer or focus semantics (see browser/README.md). Reuses vanilla-upload-states.html.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + join(HERE, 'fixtures', 'vanilla-upload-states.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('progress reported after done() turns the row back to uploading', { skip }, async () => {
  await withPage(URL, async (p) => {
    await p.waitFor(`document.querySelector('#dzA')?.dataset.fdyUploadReady === '1' || typeof window.dropOn === 'function'`);
    await p.evalJS(`window.dropOn('dzA', 'a.txt', 10), true`);
    await p.waitFor('window.lastRow !== null');
    await p.evalJS('window.lastRow.done(), window.lastRow.setProgress(40), true');
    const row = JSON.parse(await p.evalJS(`JSON.stringify((() => { const r = document.querySelector('#listA .fdy-file');
      return { success: r.classList.contains('fdy-file--success'), bar: !!r.querySelector('.fdy-progress') }; })())`));
    assert.deepEqual(row, { success: false, bar: true }, 'a row with a moving bar does not also say it is done');
  });
});

test('the drop highlight goes when a drag leaves the zone through a child', { skip }, async () => {
  await withPage(URL, async (p) => {
    await p.waitFor(`typeof window.dropOn === 'function' && document.querySelector('#listD')`);
    await p.evalJS(`(() => {
      const zone = document.getElementById('dzD');
      const child = document.getElementById('listD');
      zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
      child.dispatchEvent(new DragEvent('dragleave', { bubbles: true, relatedTarget: document.body }));
      return true;
    })()`);
    assert.equal(await p.evalJS(`document.getElementById('dzD').classList.contains('is-dragover')`), false);
  });
});
