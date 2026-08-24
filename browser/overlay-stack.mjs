/* Browser regression spec — a modal opened over an open drawer stacks correctly (#046).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * The kit already behaved correctly here; what was missing was anyone having proved it, so
 * COMPONENTS.md could not state it. This spec is what makes the new "Stacking two overlays"
 * paragraph a contract rather than a second claim nobody checked (see #041 for what that costs).
 *
 * Two instruments matter. Paint order is asserted in PIXELS: a modal dialog makes the rest of the
 * document inert, so elementFromPoint outside it returns the dialog whatever is really on top —
 * the trap the Modal entry itself warns about. And the overlays are opened with TRUSTED clicks,
 * because Chrome groups the close watchers of dialogs opened without user activation: open both
 * with `el.click()` and a single Escape closes both, which would make an "Escape closes the
 * topmost first" assertion fail for a reason that has nothing to do with the kit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

/* The drawer SLIDES in on transform and never animates opacity, so waiting on opacity returns
   immediately and the click lands wherever the panel happens to be mid-flight. */
const DRAWER_SETTLED = `document.getElementById('dw').getBoundingClientRect().left === 0`;
const MODAL_SETTLED = `getComputedStyle(document.getElementById('md')).opacity === '1'`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function openBoth(p) {
  await p.clickCenter('#open-drawer');
  await p.waitFor(DRAWER_SETTLED);
  await p.clickCenter('#ask-confirm');
  await p.waitFor(MODAL_SETTLED);
}

test('a modal opened from inside an open drawer paints above it (#046)', { skip }, async () => {
  await withPage(fixture('vanilla-overlay-stack.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && !!window.state');
    await openBoth(p);

    const s = JSON.parse(await p.evalJS('JSON.stringify(window.state())'));
    assert.deepEqual(s.open, ['dw', 'md'], 'both overlays must be open at once');

    const ov = JSON.parse(await p.evalJS('JSON.stringify(window.overlap())'));
    assert.ok(ov.overlaps, `the fixture must actually overlap the two: drawer ${ov.drawer} vs modal ${ov.modal}`);

    /* The drawer's body is #0a0c19 and the modal's surface is near-white: where they overlap, the
       pixel names the winner outright. Neither carries a z-index — the top layer decides. */
    const px = await p.pixelAt(...ov.centre);
    const luminance = (px.r + px.g + px.b) / 3;
    assert.ok(luminance > 200,
      `the modal must be painted over the drawer at ${ov.centre}: expected its light surface, got rgb(${px.r},${px.g},${px.b})`);
  });
});

test('Escape closes the topmost overlay first, leaving the drawer open (#046)', { skip }, async () => {
  await withPage(fixture('vanilla-overlay-stack.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && !!window.state');
    await openBoth(p);

    await p.pressKey('Escape');
    await pause(400);
    const first = JSON.parse(await p.evalJS('JSON.stringify(window.state())'));
    assert.equal(first.modalOpen, false, 'Escape must close the modal');
    assert.equal(first.drawerOpen, true, 'Escape must NOT take the drawer with it — cancel returns to the drawer');

    await p.pressKey('Escape');
    await pause(400);
    const second = JSON.parse(await p.evalJS('JSON.stringify(window.state())'));
    assert.equal(second.drawerOpen, false, 'a second Escape must then close the drawer');
  });
});

test('closing the drawer under an open modal leaves the modal up (#046)', { skip }, async () => {
  await withPage(fixture('vanilla-overlay-stack.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && !!window.state');
    await openBoth(p);

    /* Out-of-order teardown is the case a consumer hits by accident — an app that closes the
       drawer as part of confirming, while the confirm is still up. */
    const after = JSON.parse(await p.evalJS('JSON.stringify(window.closeDrawerOutOfOrder())'));
    assert.deepEqual(after.open, ['md'], 'the modal must survive its opener closing underneath it');

    await pause(400);
    const centre = JSON.parse(await p.evalJS(`(function(){var r=document.getElementById('md').getBoundingClientRect();
      return JSON.stringify([Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]);})()`));
    const px = await p.pixelAt(...centre);
    assert.ok((px.r + px.g + px.b) / 3 > 200,
      `the surviving modal must still be painted, got rgb(${px.r},${px.g},${px.b})`);

    await p.pressKey('Escape');
    await pause(400);
    const closed = JSON.parse(await p.evalJS('JSON.stringify(window.state())'));
    assert.equal(closed.modalOpen, false, 'and must still be dismissible afterwards');
  });
});
