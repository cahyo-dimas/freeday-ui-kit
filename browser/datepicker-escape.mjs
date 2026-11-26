/* Browser regression specs: Escape closes the date panel from anywhere in it, and the month arrows
 * keep focus. Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Escape was bound on the grids only, so with focus on the "next month" arrow the panel stayed open.
 * On the raw path that arrow also lost focus to <body>, because the panel is rebuilt on every month.
 * Run against the single-field range in each stack, which is the plain date panel plus the range.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;
const TRIGGER = '.fdy-datepicker--range .fdy-datepicker__trigger';
const NEXT = '.fdy-datepicker--range .fdy-cal__head .fdy-cal__nav:last-child';

before(async () => {
  if (skip === false) await buildEntries();
});

for (const [name, file] of [['vanilla', 'vanilla-daterange-single.html'], ['Vue', 'vue-daterange-single.html'], ['React', 'react-daterange-single.html']]) {
  test(`${name}: Escape on the month arrow closes the panel and returns focus to the field`, { skip }, async () => {
    await withPage('file://' + join(HERE, 'fixtures', file), async (p) => {
      await p.waitFor(`document.querySelector('${TRIGGER}')`);
      await p.clickCenter(TRIGGER);
      await p.waitFor(`document.querySelector('${TRIGGER}').getAttribute('aria-expanded') === 'true'`);
      await p.clickCenter(NEXT);
      assert.equal(await p.evalJS(`document.activeElement && document.activeElement.classList.contains('fdy-cal__nav')`), true,
        'the arrow keeps focus after moving a month, so the next key press has somewhere to go');
      await p.pressKey('Escape');
      assert.ok(await p.waitFor(`document.querySelector('${TRIGGER}').getAttribute('aria-expanded') === 'false'`),
        'Escape closes the panel');
      assert.equal(await p.evalJS(`document.activeElement === document.querySelector('${TRIGGER}')`), true,
        'and focus returns to the field');
    });
  });
}
