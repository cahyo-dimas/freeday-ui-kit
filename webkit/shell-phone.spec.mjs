/* Freeday. Layout smoke for the app shell at a phone width, in WebKit.
 *
 * One test of the arrangement a phone application actually gets: bottom nav on screen, sidebar off
 * canvas, and room reserved under the content so the last row of a list is not sitting behind the
 * bar. The consuming app's report that started this was exactly this shape of failure in reverse,
 * a shell standing in DESKTOP mode on an iPhone 7 while a 393x851 Chromium viewport was green.
 *
 * `100dvh` is in here on purpose. The sidebar is sized in it, the unit was introduced for Safari's
 * disappearing toolbars, and WebKit is where its resolution differs most from a fixed `vh`. The
 * kit had no test that ever evaluated it in that engine.
 */
import { test, expect } from '@playwright/test';

const BOTTOM_NAV = '/browser/fixtures/vanilla-bottom-nav.html';

test('bottom nav renders, sidebar is off canvas, content leaves room', async ({ page }) => {
  await page.goto(BOTTOM_NAV);

  const seen = await page.evaluate(() => {
    const rect = (id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom };
    };
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      nav: rect('bottomnav'),
      navDisplay: getComputedStyle(document.getElementById('bottomnav')).display,
      sidebar: rect('sidebar'),
      mainPadBottom: parseFloat(getComputedStyle(document.getElementById('main')).paddingBottom),
    };
  });

  /* `.fdy-bottomnav` is `display: none` outside `(max-width: 720px)`, so this single property is
   * what separates "the phone arrangement is on" from "the desktop one rendered on a phone". */
  expect(seen.navDisplay).toBe('flex');
  expect(seen.nav.w).toBeCloseTo(seen.viewport.w, 0);
  /* Fixed to the bottom edge, and fully on screen. A bar whose own rows sit below the fold is the
   * failure the app owner found on this device's HEIGHT rather than its width. */
  expect(seen.nav.bottom).toBeCloseTo(seen.viewport.h, 0);
  expect(seen.nav.h).toBeGreaterThan(0);

  /* Off canvas by `translateX(-100%)`, so its whole width is to the left of the viewport. Not
   * `display: none`: the drawer has to stay in the layout to slide in. */
  expect(seen.sidebar.x).toBeLessThan(0);
  expect(seen.sidebar.x + seen.sidebar.w).toBeLessThanOrEqual(0);

  /* Room under the content for the bar. Without it the last row of every list on every screen is
   * behind the bar, and a row you cannot scroll to is a row nobody knows is there. */
  expect(seen.mainPadBottom).toBeGreaterThanOrEqual(seen.nav.h);
});

test('the drawer is sized in 100dvh and fills the viewport height', async ({ page }) => {
  await page.goto(BOTTOM_NAV);

  const seen = await page.evaluate(() => {
    const s = getComputedStyle(document.getElementById('sidebar'));
    return {
      height: document.getElementById('sidebar').getBoundingClientRect().height,
      position: s.position,
      viewportHeight: window.innerHeight,
    };
  });

  expect(seen.position).toBe('fixed');
  /* A tolerance of 1px, because `dvh` resolves against the dynamic viewport and a half pixel of
   * rounding is not a bug. A `dvh` that does not resolve at all leaves the panel at its content
   * height, which on this fixture is one nav link tall, so the gap this catches is large. */
  expect(Math.abs(seen.height - seen.viewportHeight)).toBeLessThanOrEqual(1);
});
