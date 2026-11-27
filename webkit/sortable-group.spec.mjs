/* Freeday. Sortable groups on WebKit: a pointer drag between lists, and auto-scroll.
 *
 * Pointer capture, elementFromPoint while a pointer is captured, and scrolling during a drag are
 * where engines have differed, and Safari on iPad is a real target for a kit app. The CDP suite
 * (browser/sortable-group.mjs) owns the depth; this proves the two paths that depend on the engine.
 * Runs only in CI's WebKit job (see webkit/engine.spec.mjs for why not on a mac14-arm64 laptop).
 */
import { test, expect } from '@playwright/test';

const BOARD = '/browser/fixtures/vanilla-sortable-group.html';

async function ready(page) {
  await page.goto(BOARD);
  await page.waitForFunction(() => document.readyState === 'complete' && window.FreedaySortable);
}
async function center(page, selector) {
  const box = await page.locator(selector).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('a drag carries an item into another list of the group', async ({ page }) => {
  await ready(page);
  await page.locator('#done').scrollIntoViewIfNeeded();
  const from = await center(page, '#hA');
  const to = await center(page, '#done');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.lanes())).toContain('done:a');
});

test('a drag held at the bottom edge of a scroll container scrolls it', async ({ page }) => {
  await ready(page);
  const from = await center(page, '#hT0');
  const box = await page.locator('#scroller').boundingBox();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4, { steps: 8 });
  await page.waitForTimeout(800);
  await page.mouse.up();
  expect(await page.evaluate(() => document.getElementById('scroller').scrollTop)).toBeGreaterThan(0);
  const order = (await page.evaluate(() => window.tallOrder())).split(' ');
  expect(order.indexOf('t0')).toBeGreaterThanOrEqual(6);
});

/* WebKit fires no `blur` when a focused element is removed from the DOM, so here a lifted item that
 * is re-rendered away is cancelled by liftWatch (a MutationObserver) alone. Chrome blurs first and
 * hides the difference, which is why this path can only be proven on WebKit. */
test('a lifted item that is re-rendered away cancels the lift and leaves nothing stuck', async ({ page }) => {
  await ready(page);
  await page.locator('#hB').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#todo > li[data-key="b"]')).toHaveClass(/is-lifted/);

  await page.evaluate(() => {
    const li = document.querySelector('#todo > li[data-key="b"]');
    /* A re-render yields a fresh element, so the copy must not inherit the lift class. */
    const fresh = li.cloneNode(true);
    fresh.classList.remove('is-lifted');
    li.replaceWith(fresh);
  });
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('.is-lifted').length), { timeout: 2000 }).toBe(0);
  await expect.poll(() => page.evaluate(() => window.live()), { timeout: 2000 }).toMatch(/^Move cancelled\./);

  /* Not stuck in a stale lift: another item can be lifted straight away. */
  await page.locator('#hC').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#todo > li[data-key="c"]')).toHaveClass(/is-lifted/);
  await page.keyboard.press('Escape');
});
