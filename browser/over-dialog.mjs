/* Browser regression spec, two faults reported off one modal screenshot (#027).
 * Run via `npm run test:browser`. Auto-skips without Chrome.
 *
 * Both are layout OUTCOMES that read as correct in the stylesheet. A toast with z-index 200 looks
 * like it is on top until the thing above it is in the top layer, where z-index does not apply. A
 * checkbox with `width: var(--control-box)` looks like a fixed size until it is a flex item next to
 * a label long enough to want the room.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('a toast raised from inside a modal is painted over it (#027)', { skip }, async () => {
  await withPage(fixture('vanilla-over-dialog.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.raiseToast');
    const r = JSON.parse(await p.evalJS('JSON.stringify(window.raiseToast())'));
    assert.ok(r.overlapsDialog, 'the fixture must actually put the toast over the dialog');
    assert.ok(r.regionOpen, 'the region must be in the top layer, not merely styled for it');

    /* Asserted in PIXELS. elementFromPoint is the instrument that looks right and answers the wrong
       question: a modal dialog makes the rest of the document inert, so a hit test outside it
       returns the dialog even where the toast is plainly painted on top. Measured here the dialog's
       pale surface is ~(255,255,255) and the toast's inverse surface ~(23,27,38), the two cannot
       be confused, which is why the fixture makes the dialog big enough to cover the corner. */
    /* Both the toast and the dialog fade in. Screenshot mid-animation and the pixel is a blend of
       the two, which reads as "half covered" whichever one is actually on top — a flake that would
       report the fix as broken and, worse, could report a regression as fine. */
    await p.waitFor(
      "getComputedStyle(document.querySelector('.fdy-toast')).opacity === '1'" +
        " && getComputedStyle(document.getElementById('dlg')).opacity === '1'",
    );
    const [x, y] = r.centre;
    const px = await p.pixelAt(x, y);
    const luminance = (px.r + px.g + px.b) / 3;
    assert.ok(
      luminance < 90,
      `the toast must be the thing painted at its own centre, got rgb(${px.r},${px.g},${px.b}) — ` +
        'a pale pixel there is the dialog covering it',
    );
  });
});

test('a checkbox keeps its size however long the label is (#027)', { skip }, async () => {
  await withPage(fixture('vanilla-over-dialog.html'), async (p) => {
    await p.waitFor('document.readyState === "complete" && window.overDialog');
    const { boxes, switches } = JSON.parse(await p.evalJS('JSON.stringify(window.overDialog())'));
    /* One-line label is the reference: whatever --control-box resolves to at this root font size.
       Measured 18 vs 14 before the fix, in the same group of five. */
    const want = boxes.c1.w;
    assert.ok(want > 0, 'the reference box must have a width to compare against');
    for (const [name, got] of Object.entries(boxes)) {
      assert.equal(got.w, want, `${name} must be ${want}px wide like every other box, got ${got.w}px`);
      /* Square, not merely equal to its siblings: a box that shrank in BOTH axes would pass a
         width-only check while still being the wrong control. */
      assert.equal(got.h, want, `${name} must stay square, got ${got.w}x${got.h}`);
    }

    /* The switch track is the fourth control that was shrinkable, and the only one that is not
       square, so it is measured against a switch of its own rather than against the boxes. */
    assert.deepEqual(switches.s2, switches.s1,
      `a switch beside a wrapping label must keep the track's size, got ${switches.s2.w}x${switches.s2.h} against ${switches.s1.w}x${switches.s1.h}`);
  });
});
