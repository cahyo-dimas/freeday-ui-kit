/* Browser regression spec, useFreeday(ref) with a ref that never got bound (CATATAN-FREEDAY §17).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * A ref left off the template is still null at mount, and the adapter falls back to the whole
 * document. Nothing breaks, which is the problem: the scan is wider than its author asked for, and
 * other markup on the page starts working only because of it, until the day someone binds the ref.
 * The adapter cannot tell that apart from a ref that is merely late, so it does not change what it
 * scans; it says so, once, at mount. Held for Vue and React alike.
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
const ready = (p, id) => p.evalJS(`document.getElementById('${id}').dataset.fdyChipRmReady || ''`);

for (const stack of ['vue', 'react']) {
  test(`${stack}: a ref never bound warns once at mount; a bound ref and no argument stay quiet`, { skip }, async () => {
    await withPage(fixture(`${stack}-empty-ref.html`), async (p) => {
      await p.waitFor('document.readyState === "complete" && typeof window.mountCase === "function"');

      await p.evalJS('window.mountCase("bound")');
      await p.waitFor(`document.getElementById('rmBound')`);
      assert.deepEqual(await json(p, 'window.warnings'), [], 'a bound ref must not warn');
      assert.equal(await ready(p, 'rmBound'), '1');

      await p.evalJS('window.mountCase("whole")');
      await p.waitFor(`document.getElementById('rmWhole')`);
      assert.deepEqual(await json(p, 'window.warnings'), [], 'useFreeday() asks for the document openly, and must not warn');

      await p.evalJS('window.mountCase("forgotten")');
      await p.waitFor(`document.getElementById('rmForgotten')`);
      const warnings = await json(p, 'window.warnings');
      assert.equal(warnings.length, 1, `exactly one warning for the unbound ref: ${JSON.stringify(warnings)}`);
      assert.match(warnings[0], /still null/, 'it says what is wrong');
      assert.match(warnings[0], /useFreeday\(\) with no argument/, 'and names the explicit form');
      assert.equal(await ready(p, 'rmForgotten'), '1',
        'what it scans is unchanged: an app that leans on the fallback today keeps working');

      await p.evalJS('window.bump()');
      await p.evalJS('window.bump()');
      await p.waitFor(`document.getElementById('rmForgotten').parentElement.textContent.indexOf('Ani 0') === -1`);
      assert.equal((await json(p, 'window.warnings')).length, 1, 'updates do not repeat it');
    });
  });
}
