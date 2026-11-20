/* Browser regression spec: what data-primary and data-neutral do below <html> (pure CSS).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The semantic tokens are declared on :root, and an inheriting custom property inherits its
 * RESOLVED value, so re-pointing an alias ramp lower in the tree changes nothing a component reads.
 * The axis takes effect on a nested element only when that element also carries data-theme, whose
 * selectors re-declare the semantics there. Until 3.21.0 the docs said a palette worked on any
 * wrapper; this pins what is true so the claim cannot drift back. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('an axis on a nested element needs data-theme beside it', { skip }, async () => {
  await withPage(fixture('axis-nesting.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    const read = (id, prop) => p.evalJS(
      `getComputedStyle(document.getElementById(${JSON.stringify(id)})).getPropertyValue(${JSON.stringify(prop)}).trim()`,
    );

    const rootPrimary = await read('root-probe', '--color-primary');
    assert.equal(await read('primary-bare', '--color-primary'), rootPrimary,
      'a bare nested data-primary does not re-brand; if this now differs, update USAGE.md §5b and COMPONENTS.md');
    assert.notEqual(await read('primary-themed', '--color-primary'), rootPrimary,
      'data-primary with data-theme on the same element re-brands that region');

    const rootSurface = await read('root-probe', '--color-surface-2');
    assert.equal(await read('neutral-bare', '--color-surface-2'), rootSurface,
      'a bare nested data-neutral does not re-tint');
    assert.notEqual(await read('neutral-themed', '--color-surface-2'), rootSurface,
      'data-neutral with data-theme on the same element re-tints that region');

    await p.evalJS('document.documentElement.setAttribute("data-neutral", "stone")');
    assert.notEqual(await read('root-probe', '--color-surface-2'), rootSurface,
      'data-neutral on <html> re-tints the whole app');
  });
});
