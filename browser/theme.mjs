/* Browser regression specs — theme scoping (pure CSS, no enhancer).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * `data-theme` is not root-scoped: put it on any ancestor and that subtree re-themes, because the
 * semantic tokens are inheriting custom properties. test/build.test.mjs asserts the SELECTOR shape;
 * this asserts the BEHAVIOUR that shape is for — a component inside an inverted panel picks the
 * inverted tokens up on its own, with no per-element re-colouring. `.fdy-title-page` is the probe
 * on purpose: it sets `color: var(--color-text)` explicitly, so it is exactly the element that
 * stayed near-black on near-black when a consumer inverted a panel by hand.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('data-theme re-themes a subtree, and a nested island wins back', { skip }, async () => {
  await withPage(fixture('theme-subtree.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');

    const read = (id, prop) => p.evalJS(
      `getComputedStyle(document.getElementById(${JSON.stringify(id)})).getPropertyValue(${JSON.stringify(prop)}).trim()`,
    );

    const appInk = await read('app-title', 'color');
    const panelInk = await read('panel-title', 'color');
    const islandInk = await read('island-title', 'color');

    assert.notEqual(
      panelInk,
      appInk,
      `a .fdy-title-page inside <section data-theme="dark"> must take the dark ink, got ${panelInk} `
        + 'in both — data-theme is scoped to :root again',
    );
    assert.equal(islandInk, appInk, 'a [data-theme="light"] island inside the dark panel goes back to light ink');

    // The surface token must reach a real component's own painted background, not just the text.
    const appCard = await read('app-card', 'background-color');
    const panelCard = await read('panel-card', 'background-color');
    assert.notEqual(panelCard, appCard, 'a .fdy-card inside the dark panel must paint the dark surface');

    // Setting the attribute on <html> must keep behaving exactly as before.
    await p.evalJS('document.documentElement.setAttribute("data-theme", "dark")');
    assert.equal(await read('app-title', 'color'), panelInk, 'data-theme on <html> still themes the whole app');
    assert.equal(await read('island-title', 'color'), appInk, 'the light island still wins inside a dark app');
  });
});
