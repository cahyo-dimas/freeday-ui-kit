/* Freeday. The modal body on an iPhone (CATATAN-FREEDAY §16).
 *
 * On a real iPhone 7 every FdyModal showed its header and footer and a body one line tall,
 * scrolled to the bottom: a "Tambah security" dialog with no field visible, so the flow could not
 * be used from a phone at all. The cause was `flex:1` on `.fdy-modal__body`, a 0% basis against a
 * dialog that has only a max-height, which older WebKit resolved to 0.
 *
 * Honest about what this file can prove: Playwright's WebKit is a current engine, and a current
 * engine reads that 0% correctly, so this layout passed against the defect too. What it holds is
 * the RESULT on WebKit at iPhone 7 size, which is what any later change to the modal has to keep.
 * The cause itself is held where it can be: the computed basis in browser/modal-phone.mjs, and the
 * rule against zero or percentage bases on scroll regions in test/css.test.mjs.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/browser/fixtures/vanilla-modal-phone.html';

test('a short modal body shows all of its content', async ({ page }) => {
  await page.goto(PAGE);
  const m = await page.evaluate(() => window.measureModal('short'));
  expect(m.basis).toBe('auto');
  expect(m.bodyClient + 1, `${m.bodyClient}px shown of ${m.bodyScroll}px`).toBeGreaterThanOrEqual(m.bodyScroll);
  expect(m.dialogBottom).toBeLessThanOrEqual(m.viewport);
});

test('a long modal keeps its footer on screen and scrolls the body', async ({ page }) => {
  await page.goto(PAGE);
  const m = await page.evaluate(() => window.measureModal('long'));
  expect(m.footerBottom, `footer bottom ${m.footerBottom} of ${m.viewport}`).toBeLessThanOrEqual(m.viewport);
  expect(m.bodyScroll).toBeGreaterThan(m.bodyClient);
  expect(m.bodyClient).toBeGreaterThan(200);
});
