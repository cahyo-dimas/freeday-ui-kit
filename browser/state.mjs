/* Browser regression specs, selected/pressed state and nav orientation (pure CSS).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate. Auto-skips
 * without Chrome.
 *
 * These guard CASCADE outcomes, which a string test cannot see. The bug that prompted the file:
 * a single shared `.fdy-btn[aria-pressed="true"]` rule blanked the ghost variant's background,
 * because `background:` with a gradient is a background-IMAGE and the shorthand resets
 * background-color to transparent, at equal specificity, whichever rule came last won. The CSS
 * read correctly in every file; only a real engine showed the ghost segment losing its fill.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

test('pressed toggles and nav orientation resolve as intended', { skip }, async () => {
  await withPage(fixture('state-nav-pressed.html'), async (p) => {
    await p.waitFor('document.readyState === "complete"');
    const css = (id, prop) => p.evalJS(
      `getComputedStyle(document.getElementById(${JSON.stringify(id)})).getPropertyValue(${JSON.stringify(prop)}).trim()`,
    );

    // --- Segmented control: the ghost pressed segment must carry a real fill, not a blank box.
    const segOn = await css('seg-on', 'background-color');
    const segOff = await css('seg-off', 'background-color');
    assert.notEqual(segOn, TRANSPARENT, 'a pressed ghost segment must keep a background-color, a '
      + 'gradient rule from another variant has blanked it (background shorthand resets the colour)');
    assert.notEqual(segOn, segOff, 'pressed and unpressed segments must be distinguishable');
    assert.equal(await css('seg-on', 'background-image'), 'none', 'the ghost pressed fill is a flat colour, not a gradient');

    // --- Solid toggle: sunken (inset) rather than merely primary-coloured.
    const solidOn = await css('solid-on', 'box-shadow');
    assert.match(solidOn, /inset/, `a pressed solid button must read as depressed, got ${solidOn}`);
    assert.doesNotMatch(await css('solid-off', 'box-shadow'), /inset 0px 2px 6px/, 'unpressed solid keeps its lifted shadow');

    // --- Horizontal nav: same links, laid out as a row, current page visibly marked.
    assert.equal(await p.evalJS('getComputedStyle(document.getElementById("nav")).flexDirection'), 'row');
    assert.notEqual(
      await css('nav-current', 'background-color'),
      await css('nav-idle', 'background-color'),
      'aria-current="page" must mark the current nav link',
    );
    // On a coloured bar both states stay on-colour; only the wash differs.
    const onColour = await css('pnav-idle', 'color');
    assert.equal(await css('pnav-current', 'color'), onColour, 'nav ink on --primary stays on-colour in both states');
    assert.notEqual(await css('pnav-current', 'background-color'), await css('pnav-idle', 'background-color'));

    /* --- Quiet destructive (#006 §2). The solid fill is a background-IMAGE (a gradient), so this is
       the same shape as the aria-pressed lesson: the CSS reads fine either way and only a real engine
       shows that `--ghost --danger` was rendering the solid treatment. */
    assert.notEqual(await css('danger-solid', 'background-image'), 'none',
      'the un-modified --danger button is the solid one');
    assert.equal(await css('danger-ghost', 'background-image'), 'none',
      '--ghost --danger must keep the ghost ground, a solid Delete beside Save is a second primary');
    assert.equal(await css('danger-text', 'background-image'), 'none', '--text --danger likewise');
    assert.notEqual(await css('danger-ghost', 'color'), await css('ghost-plain', 'color'),
      'and it must still read as destructive: the ink turns even though the ground does not');

    // --- Routed sub-navigation: plain links, aria-current, tab look.
    assert.notEqual(
      await css('rtab-current', 'border-bottom-color'),
      await css('rtab-idle', 'border-bottom-color'),
      '.fdy-tabs__tab must honour aria-current="page" so routed tabs can be real links',
    );
  });
});
