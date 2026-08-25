/* Browser regression spec, the typed CFL can pick more than one row (#019).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * The enhancer has offered `data-fdy-cfl-multiple` since it shipped; all three typed wrappers were
 * single-valued at the type level, so an app that started on the enhancer and later adopted the
 * wrapper silently lost a capability. The settlement screen that reported it gathers six or eight
 * approved claims onto one document, and was doing six open→search→click cycles instead of one.
 *
 * Driven by REAL CLICKS, not by calling the component's methods: a typecheck cannot tell you
 * whether a mode ever renders, and the tick/commit split is exactly the kind of thing that
 * type-checks while committing the wrong thing. Both adapters run the same script, so a divergence
 * between them fails here rather than in an app.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage, buildEntries } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

for (const stack of ['vue', 'react']) {
  test(`${stack}: FdyCfl multiple ticks rows and commits them together (#019)`, { skip }, async () => {
    await buildEntries();
    await withPage(fixture(`${stack}-cfl-multi.html`), async (p) => {
      await p.waitFor('document.readyState === "complete" && document.querySelector(".fdy-input-group__btn")');

      await p.evalJS('document.querySelector(".fdy-input-group__btn").click()');
      await p.waitFor('document.querySelectorAll(".fdy-cfl__row").length === 3');

      /* The tick has to be the KIT's checkbox, not the browser's (#022).
       *
       * All three adapters shipped `.fdy-check` on this bare input. That class
       * styles a wrapping <label> and its `input` DESCENDANT, on the input
       * itself it applies inline-flex and a cursor and nothing else, so the box
       * rendered as the raw UA control in the middle of a styled dialog.
       * `.fdy-checkbox` is the class for a bare input in a table, and the tell
       * is `appearance:none`: the kit paints its own box, the browser's does not.
       * Every behavioural assertion below passed while it was wrong, which is
       * why this one measures the rendering. */
      assert.equal(
        await p.evalJS('getComputedStyle(document.querySelector(".fdy-cfl__check input")).appearance'),
        'none',
        `${stack}: the row tick must be the kit's checkbox — .fdy-checkbox, not .fdy-check`);

      /* A click must TICK, not commit, the dialog stays open and the caller's value is untouched. */
      await p.evalJS('document.querySelectorAll(".fdy-cfl__row")[0].click()');
      await p.evalJS('document.querySelectorAll(".fdy-cfl__row")[2].click()');
      assert.equal(await p.evalJS('JSON.stringify(window.__val)'), 'null',
        `${stack}: ticking a row must not commit anything — that is the single-select behaviour`);
      assert.equal(await p.evalJS('document.querySelector("dialog.fdy-modal--cfl").open'), true,
        `${stack}: the dialog must stay open while picking`);

      const ticked = await p.evalJS('document.querySelectorAll(\'.fdy-cfl__row[aria-selected="true"]\').length');
      assert.equal(Number(ticked), 2, `${stack}: two rows ticked must be announced as selected`);
      assert.match(await p.evalJS('document.querySelector(".fdy-cfl__count").textContent'), /2 selected/,
        `${stack}: the footer must count the ticks`);

      /* Untick, the same click that ticked it. */
      await p.evalJS('document.querySelectorAll(".fdy-cfl__row")[2].click()');
      assert.equal(Number(await p.evalJS('document.querySelectorAll(\'.fdy-cfl__row[aria-selected="true"]\').length')), 1,
        `${stack}: clicking a ticked row again must untick it`);
      await p.evalJS('document.querySelectorAll(".fdy-cfl__row")[2].click()');

      /* Confirm is the only thing that commits, and it hands back an ARRAY. */
      await p.evalJS('[...document.querySelectorAll(".fdy-cfl__actions .fdy-btn")].find(b => /Confirm/.test(b.textContent)).click()');
      assert.equal(await p.evalJS('JSON.stringify(window.__val)'), '["EX-1","EX-3"]',
        `${stack}: Confirm must commit every ticked row, in order`);
      assert.equal(await p.evalJS('document.querySelector("dialog.fdy-modal--cfl").open'), false,
        `${stack}: Confirm closes the dialog`);

      /* The field states how many, because display() names one row and naming one of two would lie. */
      assert.match(await p.evalJS('document.querySelector(".fdy-input-group .fdy-input").value'), /2 selected/,
        `${stack}: the field must state the count, not one of the rows`);
    });
  });

  test(`${stack}: closing without Confirm discards the ticks (#019)`, { skip }, async () => {
    await buildEntries();
    await withPage(fixture(`${stack}-cfl-multi.html`), async (p) => {
      await p.waitFor('document.readyState === "complete" && document.querySelector(".fdy-input-group__btn")');
      await p.evalJS('document.querySelector(".fdy-input-group__btn").click()');
      await p.waitFor('document.querySelectorAll(".fdy-cfl__row").length === 3');
      await p.evalJS('document.querySelectorAll(".fdy-cfl__row")[1].click()');

      await p.evalJS('[...document.querySelectorAll(".fdy-cfl__actions .fdy-btn")].find(b => /Close/.test(b.textContent)).click()');
      assert.equal(await p.evalJS('JSON.stringify(window.__val)'), 'null',
        `${stack}: Cancel must leave the caller's value exactly as it was`);

      /* And re-opening must not remember the discarded ticks. */
      await p.evalJS('document.querySelector(".fdy-input-group__btn").click()');
      await p.waitFor('document.querySelectorAll(".fdy-cfl__row").length === 3');
      assert.equal(Number(await p.evalJS('document.querySelectorAll(\'.fdy-cfl__row[aria-selected="true"]\').length')), 0,
        `${stack}: re-opening seeds the ticks from the committed value, not from the discarded ones`);
    });
  });
}
