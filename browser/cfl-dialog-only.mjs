/* Browser regression spec, the typed CFL opens from a trigger that is not its own field (#054).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * The enhancer has had `[data-fdy-cfl-open]` — "opens the dialog with no bound field" — since it
 * shipped. The three typed wrappers were a field PLUS a dialog, with `openDialog` closed over
 * inside: no ref, no prop, no way in. A 420px add-on panel that wanted this picker behind a 12px
 * chip (two per document line) could not spend a 22rem readonly input per trigger, so it kept a
 * 420-line hand-rolled dialog instead. The raw path could do what the typed path could not.
 *
 * Driven by a REAL CLICK on the app's own trigger, because the two failures this mode can have are
 * both invisible to a typecheck: a field that still renders, and a host box that silently becomes a
 * flex item in whatever laid the trigger out. The fixture is a flex row with an 8px gap, and the
 * component sits BETWEEN the two chips, so a host with a box measures as 16px of gap.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage, buildEntries } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const GAP = 'const a = document.querySelector("#chip").getBoundingClientRect();'
  + 'const b = document.querySelector("#chip-locked").getBoundingClientRect();'
  + 'Math.round(b.left - a.right)';

for (const stack of ['vue', 'react']) {
  test(`${stack}: dialogOnly renders no field, and the caller's own trigger opens it (#054)`, { skip }, async () => {
    await buildEntries();
    await withPage(fixture(`${stack}-cfl-dialog-only.html`), async (p) => {
      await p.waitFor('document.readyState === "complete" && document.querySelector("#chip")');

      /* Outside the dialog: the dialog's OWN search box is an .fdy-input-group too, which is what a
         naive count catches instead of the field. */
      const fields = '[...document.querySelectorAll(".fdy-input-group")].filter(el => !el.closest("dialog")).length';
      assert.equal(Number(await p.evalJS(fields)), 0,
        `${stack}: dialogOnly must render NO field, that is the whole reason the mode exists`);
      assert.equal(Number(await p.evalJS('document.querySelectorAll("dialog.fdy-modal--cfl").length')), 2,
        `${stack}: the dialog itself must still be rendered`);
      assert.equal(await p.evalJS('getComputedStyle(document.querySelector(".fdy-cfl__host")).display'), 'contents',
        `${stack}: the host must generate no box`);
      assert.equal(Number(await p.evalJS(GAP)), 8,
        `${stack}: the host sits between the two chips; a box would double the gap the fixture asks for`);

      /* The app's own trigger, clicked for real. */
      await p.evalJS('document.querySelector("#chip").click()');
      await p.waitFor('document.querySelectorAll(".fdy-cfl__row").length === 2');
      assert.equal(await p.evalJS('document.querySelector("dialog.fdy-modal--cfl").open'), true,
        `${stack}: open() must show the dialog`);

      await p.evalJS('document.querySelectorAll(".fdy-cfl__row")[1].click()');
      assert.equal(await p.evalJS('JSON.stringify(window.__val)'), '"CC-2"',
        `${stack}: a click still commits the row, the picker is the same component`);
      assert.equal(await p.evalJS('document.querySelector("dialog.fdy-modal--cfl").open'), false,
        `${stack}: committing closes it`);
    });
  });

  test(`${stack}: a programmatic open still obeys disabled (#054)`, { skip }, async () => {
    await buildEntries();
    await withPage(fixture(`${stack}-cfl-dialog-only.html`), async (p) => {
      await p.waitFor('document.readyState === "complete" && document.querySelector("#chip-locked")');

      /* With no field there is no disabled button to stop the click, so the guard has to live in
         `open()` itself. Without it, `disabled` would mean "greyed out" on one path and nothing at
         all on the other. */
      await p.evalJS('document.querySelector("#chip-locked").click()');
      assert.equal(Number(await p.evalJS('[...document.querySelectorAll("dialog.fdy-modal--cfl")].filter(d => d.open).length')), 0,
        `${stack}: open() on a disabled picker must do nothing`);
    });
  });
}
