/* Browser regression spec, the `hidden` attribute on kit classes.
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips without
 * Chrome.
 *
 * The browser hides [hidden] with a user-agent `display:none`, and ANY author `display` beats it.
 * So `<button class="fdy-btn" hidden>` rendered: the attribute an app reaches for first silently did
 * nothing on every kit class that sets a display. This puts every class the bundle names on an
 * element with `hidden`, in a real engine, and requires all of them to be gone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = 'file://' + join(HERE, 'fixtures', 'vanilla-hidden.html');
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const css = readFileSync(join(HERE, '..', 'dist', 'freeday.bundle.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const classes = [...new Set(css.match(/\.fdy-[a-z0-9_-]+/g).map((c) => c.slice(1)))].sort();
/* Selectors made only of class compounds joined by descendant or child combinators, in rules that
   set a display other than none. These outrank a lone [hidden] by specificity or by coming later,
   which a one-class element never shows. */
const chains = [...new Set([...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /(^|;)\s*display\s*:\s*(?!none)/.test(body))
  .flatMap(([, selectors]) => selectors.split(','))
  .map((s) => s.trim())
  .filter((s) => /^(\.[\w-]+)+(\s*>\s*|\s+)(\.[\w-]+)+([\s>]+(\.[\w-]+)+)*$/.test(s)))]
  .map((s) => s.split(/\s*>\s*|\s+/).map((part) => part.split('.').filter(Boolean).join(' ')));

test('hidden hides every kit class, whatever display the class sets', { skip }, async () => {
  assert.ok(classes.length > 300, `parsed only ${classes.length} classes; the matcher no longer fits the bundle`);
  await withPage(fixture, async (p) => {
    await p.waitFor('typeof window.shownDespiteHidden === "function"');
    for (const value of ['', 'hidden']) {
      const shown = JSON.parse(await p.evalJS(`JSON.stringify(window.shownDespiteHidden(${JSON.stringify(classes)}, ${JSON.stringify(value)}))`));
      assert.deepEqual(shown, [], `hidden="${value}" left ${shown.length} of ${classes.length} classes rendered:\n${shown.join('\n')}`);
    }
  });
});

test('hidden also beats the class chains that set display in context', { skip }, async () => {
  assert.ok(chains.length >= 3, `parsed only ${chains.length} chains; the matcher no longer fits the bundle`);
  await withPage(fixture, async (p) => {
    await p.waitFor('typeof window.chainsShownDespiteHidden === "function"');
    const shown = JSON.parse(await p.evalJS(`JSON.stringify(window.chainsShownDespiteHidden(${JSON.stringify(chains)}))`));
    assert.deepEqual(shown, [], `${shown.length} of ${chains.length} chains rendered despite hidden:\n${shown.join('\n')}`);
  });
});

test('hidden="until-found" keeps its own behaviour: findable, not display:none', { skip }, async () => {
  await withPage(fixture, async (p) => {
    await p.waitFor('typeof window.untilFound === "function"');
    const s = JSON.parse(await p.evalJS('JSON.stringify(window.untilFound())'));
    assert.notEqual(s.display, 'none', 'display:none would take it out of find-in-page, the reason the value exists');
    assert.equal(s.contentVisibility, 'hidden');
  });
});
