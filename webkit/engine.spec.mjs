/* Freeday. The suite's alarm on itself.
 *
 * Every other spec here is worth something only if three things are true at once: the engine is
 * really WebKit, the iPhone 7 descriptor really took effect, and `reducedMotion` emulation really
 * reaches the page. Each of the three can fail quietly. A misconfigured project launches Chromium
 * and 30 assertions pass for the wrong reason. A dropped device descriptor leaves a 1280x720
 * desktop viewport where the drawer does not exist, so the layout specs assert nothing. An
 * emulation that does not arrive leaves Reduce Motion off, and a transition that completes
 * normally satisfies every end-state assertion in reduce-motion.spec.mjs.
 *
 * So the preconditions are tested, not assumed. If this file goes red the rest of the suite's
 * green means nothing, which is the point of having it.
 */
import { test, expect } from '@playwright/test';

test('the engine under test is WebKit', async ({ page, browserName }) => {
  /* `browserName` comes from the browser that actually launched, so it cannot be spoofed by a
   * user-agent override the way the UA string below can. This is the assertion that fails when
   * someone points the config at Chromium, and it is meant to. */
  expect(browserName, 'this suite exists to run on WebKit; anything else guards nothing').toBe('webkit');
  const ua = await page.evaluate(() => navigator.userAgent);
  expect(ua).toContain('AppleWebKit');
});

test('the iPhone 7 descriptor reached the page', async ({ page }) => {
  /* Measured on a FIXTURE, not on about:blank, and that distinction cost a cycle here. A mobile
   * engine lays out a page with no `<meta name="viewport">` at its default width, 980px on iOS
   * Safari, so about:blank reports 981 on an iPhone 7 descriptor and every breakpoint below is a
   * lie. The fixtures carry the tag now; this reads the number back off one of them, so a fixture
   * that loses the tag fails here rather than quietly moving the layout specs to desktop. */
  await page.goto('/browser/fixtures/vanilla-app-shell.html');
  const seen = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    touch: 'ontouchstart' in window,
    points: navigator.maxTouchPoints,
  }));
  /* 375x667 is below the kit's 720px breakpoint, which is what puts the sidebar off canvas and
   * the bottom nav on screen. A desktop viewport here would leave two specs testing nothing. */
  expect(seen.width).toBe(375);
  expect(seen.height).toBe(667);
  /* Touch, because `locator.tap()` throws without it and a thrown tap is not a tested tap. */
  expect(seen.touch).toBe(true);
  expect(seen.points).toBeGreaterThan(0);
});

test('reducedMotion emulation flips the media query both ways', async ({ page }) => {
  const reduces = () => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await reduces(), 'emulateMedia reduce did not reach the page').toBe(true);

  /* Both directions, so a stub that answers `true` to everything fails here. */
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await reduces(), 'emulateMedia no-preference did not reach the page').toBe(false);
});
