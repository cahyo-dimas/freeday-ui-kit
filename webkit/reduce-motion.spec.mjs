/* Freeday. Under Reduce Motion, a transitioned property must still ARRIVE.
 *
 * This is the bug class that took #088, #089 and #090 and three releases. WebKit clamps transition
 * duration to 0.000001s when the setting is on, and at that duration the transition never runs, so
 * the property stays at its START value forever. The result is not a less smooth animation; it is
 * the wrong state on screen. Measured on an iPhone 7 with the setting on and `--nav-open` present
 * in every sample: the scrim sat at `opacity: 0` and `visibility: hidden` while `pointer-events`
 * was already `auto`, an invisible sheet eating the first tap. The checkbox tick was never painted
 * on a box whose input really was checked.
 *
 * The fix is `transition: none` in a `prefers-reduced-motion: reduce` block, kit wide, and
 * test/css.test.mjs guards the SHAPE of that CSS. What no CSS test can tell you is whether the
 * property then lands, so this file asserts the end state in a real engine instead.
 *
 * The same assertions are useful in Chromium for a different reason: Chromium clamps to 1e-06s too
 * but does not leave the property behind, so there it confirms the rule did not break the normal
 * path. On WebKit it is the thing actually standing guard.
 */
import { test, expect } from '@playwright/test';

/* File-wide, so no test here can forget it and pass on a transition that simply completed. */
test.use({ reducedMotion: 'reduce' });

const SHELL = '/browser/fixtures/vanilla-app-shell.html';
const SELECTION = '/browser/fixtures/vanilla-reduce-motion.html';

/** Fail loudly if the emulation did not arrive, before any end state is read. */
async function assertReduceMotionIsOn(page) {
  const on = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  expect(on, 'Reduce Motion is off, so every assertion below would pass for the wrong reason').toBe(true);
}

/** The three backdrop properties that decide whether the scrim is seen and whether it eats taps. */
function backdropState(page) {
  return page.evaluate(() => {
    const s = getComputedStyle(document.getElementById('backdrop'));
    return { opacity: s.opacity, visibility: s.visibility, pointerEvents: s.pointerEvents };
  });
}

/** The six numbers of a computed 2D transform, so the assertion does not depend on how an engine
 *  formats `matrix()`. `none` is the identity: the switch thumb declares no transform in its OFF
 *  state, and reading that as identity is what lets the same helper measure both controls. */
function matrixOf(value) {
  if (value === 'none') return [1, 0, 0, 1, 0, 0];
  const inside = /matrix\(([^)]+)\)/.exec(value);
  expect(inside, `expected a 2D matrix or none, got ${value}`).not.toBeNull();
  return inside[1].split(',').map((n) => Number(n.trim()));
}

test('the app shell backdrop reaches its open state and gets back out of the way', async ({ page }) => {
  await page.goto(SHELL);
  await assertReduceMotionIsOn(page);

  /* Closed: invisible AND transparent to taps. If this baseline is already wrong the test below
   * would be asserting against a scrim that was never in the state the user starts in. */
  expect(await backdropState(page)).toEqual({ opacity: '0', visibility: 'hidden', pointerEvents: 'none' });

  await page.locator('#toggle').tap();
  await expect.poll(() => backdropState(page), {
    message: 'the open scrim never arrived: opacity or visibility stayed at its start value',
    timeout: 2000,
  }).toEqual({ opacity: '1', visibility: 'visible', pointerEvents: 'auto' });

  /* Closing is the half that shipped broken: the class came off, pointer-events went back to none,
   * and the scrim STAYED PAINTED over the page until a reload. */
  /* Tapped to the RIGHT of the open drawer, by position rather than at the element centre: the
   * backdrop spans the viewport and the 16rem sidebar sits above it at z-index 60, so the centre
   * of the backdrop is covered by the panel. x=340 is clear of it on a 375px screen. */
  await page.locator('#backdrop').tap({ position: { x: 340, y: 500 } });
  await expect.poll(() => backdropState(page), {
    message: 'the scrim stayed behind after the drawer closed',
    timeout: 2000,
  }).toEqual({ opacity: '0', visibility: 'hidden', pointerEvents: 'none' });

  /* And the consequence, measured the way the CSS comment measured it: hit testing over the nav
   * toggle must reach the toggle. A scrim that is merely `visibility: hidden` still answers here,
   * which is why `pointer-events` above is load bearing rather than a second opinion. */
  const hit = await page.evaluate(() => {
    const r = document.getElementById('toggle').getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el === null ? null : (el.id || el.className || el.tagName);
  });
  expect(hit, 'something is still covering the nav toggle after the drawer closed').toBe('toggle');
});

test('a checkbox tick is painted when the input is checked', async ({ page }) => {
  await page.goto(SELECTION);
  await assertReduceMotionIsOn(page);

  /* Unchecked: scale(0), which is also the value the broken engine got stuck at, so reading it
   * here proves the assertion below can tell the two apart. */
  const [a0] = matrixOf(await page.evaluate(() => window.pseudoTransform('c1')));
  expect(a0).toBe(0);

  await page.locator('#c1').check();

  const after = await page.evaluate(() => window.checkedState('c1'));
  expect(after.checked, 'the input did not take the check, so the tick proves nothing').toBe(true);
  const [a1, , , d1] = matrixOf(after.before);
  expect(a1, 'the input is checked and its tick is still at scale(0)').toBeCloseTo(1, 3);
  expect(d1).toBeCloseTo(1, 3);
});

test('a standalone .fdy-checkbox tick is painted when the input is checked', async ({ page }) => {
  /* The box every table row and filter popover renders, a bare input rather than a labelled
   * `.fdy-check`. It carries its own copy of the scale(0) to scale(1) rule, so it is its own
   * chance to be stuck. */
  await page.goto(SELECTION);
  await assertReduceMotionIsOn(page);

  await page.locator('#c4').check();
  const after = await page.evaluate(() => window.checkedState('c4'));
  expect(after.checked).toBe(true);
  const [a1, , , d1] = matrixOf(after.before);
  expect(a1, 'the standalone checkbox is checked and its tick is still at scale(0)').toBeCloseTo(1, 3);
  expect(d1).toBeCloseTo(1, 3);
});

test('a switch thumb reaches the on end of its track', async ({ page }) => {
  /* Added beyond the three behaviours the brief named, because the switch is the same failure in a
   * different shape: the thumb slides by `translateX` rather than scaling, so a stuck transition
   * leaves a switch reading ON with its thumb sitting at OFF. Asserted by the translation being
   * positive rather than by an exact pixel count, since the distance is a token
   * (`--control-switch-w` minus `--control-switch-h`) and a token may be retuned. */
  await page.goto(SELECTION);
  await assertReduceMotionIsOn(page);

  const [, , , , offX] = matrixOf(await page.evaluate(() => window.pseudoTransform('s1')));
  expect(offX).toBe(0);

  await page.locator('#s1').check();
  const after = await page.evaluate(() => window.checkedState('s1'));
  expect(after.checked).toBe(true);
  const [, , , , onX] = matrixOf(after.before);
  expect(onX, 'the switch is on and its thumb never left the off end').toBeGreaterThan(5);
});
