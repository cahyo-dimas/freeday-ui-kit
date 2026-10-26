/* Freeday. A tap on the drawer backdrop closes the drawer (#057).
 *
 * iOS Safari synthesises a `click` from a tap only on elements it reads as interactive, and
 * `cursor: pointer` is one of the signals it uses. `.fdy-app__backdrop` is a plain <div> with a
 * click handler, no button, no role, no tabindex, so before `cursor: pointer` was added a tap on
 * it produced no click at all: the drawer stayed open, the scrim stayed dark, and reloading the
 * page was the only way out. Reported from a real iPhone X.
 *
 * Nothing in Chromium reproduces it. A mouse click works there, and so does `touchscreen.tap()`,
 * which is why neither this kit's 206 CDP tests nor the consuming app's Chromium e2e suite could
 * ever have caught it. This file is the reason the WebKit suite exists at all.
 *
 * Reduce Motion is deliberately NOT emulated here. reduce-motion.spec.mjs owns that axis; this one
 * has to keep working on the normal path, where the scrim fades in over 200ms before the tap lands.
 */
import { test, expect } from '@playwright/test';

const SHELL = '/browser/fixtures/vanilla-app-shell.html';

/** The shell state the fixture exposes: classes, aria, inert and focus, in one read. */
function shellState(page) {
  return page.evaluate(() => window.state());
}

test('a tap on the backdrop closes the drawer and hands focus back', async ({ page }) => {
  await page.goto(SHELL);
  expect(await shellState(page)).toMatchObject({ open: false, expanded: 'false' });

  await page.locator('#toggle').tap();
  await expect.poll(() => shellState(page), { timeout: 2000 }).toMatchObject({
    open: true,
    expanded: 'true',
    /* Open means the page behind is unreachable, which is also why the toggle cannot be tapped a
     * second time to close: it lives inside the inert content. The backdrop is the way out. */
    contentInert: true,
    sidebarInert: false,
  });

  /* By position, not at the element centre. The backdrop spans the viewport and the open 16rem
   * sidebar covers its left half at z-index 60, so the centre is behind the panel on a 375px
   * screen and Playwright would refuse the tap as intercepted. */
  await page.locator('#backdrop').tap({ position: { x: 340, y: 500 } });

  await expect.poll(() => shellState(page), {
    message: 'the tap on the backdrop produced no click, so the drawer never closed (#057)',
    timeout: 2000,
  }).toMatchObject({ open: false, expanded: 'false', contentInert: false, sidebarInert: true });

  /* Focus goes back to the control that opened the drawer. Safari does not focus a <button> on
   * tap, so `document.activeElement` at open time was the body and the shell falls back to the
   * toggle; either route has to end on the toggle or a keyboard user is stranded on <body>. */
  expect(await shellState(page)).toMatchObject({ focused: 'toggle' });

  /* The drawer still opens afterwards. A close that leaves `restoreTo` or the inert flags in a
   * half state only shows up on the second use, which is where a phone user actually finds it. */
  await page.locator('#toggle').tap();
  await expect.poll(() => shellState(page), { timeout: 2000 }).toMatchObject({ open: true, expanded: 'true' });
});

test('a tap on a nav item inside the drawer follows it and closes the drawer', async ({ page }) => {
  /* The shell's other tap-driven close path. An <a href> is interactive by every signal an engine
   * has, so this one is not at risk the way the <div> backdrop was; it is here because
   * close-on-follow is the behaviour every hand-rolled copy of this drawer got wrong, and because
   * a tap inside an element the enhancer just moved focus into is its own timing question. */
  await page.goto(SHELL);
  await page.locator('#toggle').tap();
  await expect.poll(() => shellState(page), { timeout: 2000 }).toMatchObject({ open: true });

  await page.locator('#nav-two').tap();
  await expect.poll(() => shellState(page), {
    message: 'following a nav item left the drawer open over the page it navigated to',
    timeout: 2000,
  }).toMatchObject({ open: false, expanded: 'false' });

  /* Followed, not merely closed. */
  expect(new URL(page.url()).hash).toBe('#two');
});
