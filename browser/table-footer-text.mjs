/* Browser regression specs: the typed footer's strings come from the app, whether the app hands
 * them to the footer or to the table that draws one.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The raw path has read `data-fdy-text-<key>` through `textOf()` since 1.39.0 and the typed path
 * read nothing, so a Vue, React or Blazor app in any other language had to rewrite the band by
 * hand. One shipped eighty one lines of its own markup to change five words.
 *
 * Asserted in a browser because the claim is about RENDERED text and about aria-labels that only
 * exist once the component has run; a string match on the source would pass against a prop nothing
 * reads. Both halves, as with the enhancers: the given wording has to win, and a footer given
 * nothing has to still read English, which is what leaves every shipped screen where it is.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

before(async () => {
  if (skip === false) await buildEntries();
});

/* Page index 2 of five-row pages over 25 rows: rows 11 to 15, page 3 of 5, so the window is 1..5
 * and the second item in the list is page 1 as a button, carrying the numbered label. */
const GIVEN = {
  info: 'Menampilkan 11-15 dari 25 (25)',
  size: 'Baris',
  nav: 'Paginasi',
  prev: 'Halaman sebelumnya',
  next: 'Halaman berikutnya',
  page1: 'Ke halaman 1',
};

const ENGLISH = {
  info: 'Showing 11–15 of 25',
  size: 'Rows',
  nav: 'Pagination',
  prev: 'Previous page',
  next: 'Next page',
  page1: 'Go to page 1',
};

async function assertFooterStrings(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    const mounted = await p.waitFor(`document.querySelectorAll('.fdy-table-footer').length === 2`);
    assert.ok(mounted, 'both footers must mount, otherwise the rest reads a missing element');

    const read = async (scope) => JSON.parse(await p.evalJS(`JSON.stringify((() => {
      const root = document.querySelector('#${scope} .fdy-table-footer');
      const items = [...root.querySelectorAll('.fdy-pagination__list > li')];
      const label = (li) => li.firstElementChild.getAttribute('aria-label');
      return {
        info: root.querySelector('.fdy-table-footer__info').textContent,
        size: root.querySelector('.fdy-table-footer__size > span').textContent,
        nav: root.querySelector('.fdy-pagination').getAttribute('aria-label'),
        prev: label(items[0]),
        next: label(items[items.length - 1]),
        page1: label(items[1]),
      };
    })())`));

    /* Collected rather than asserted one at a time: six props forwarded by six separate lines fail
     * independently, and the first `assert.equal` would hide the other five. */
    const offenders = [];
    const compare = (actual, expected, what) => {
      for (const key of Object.keys(expected)) {
        if (actual[key] !== expected[key]) offenders.push(`${key}: ${what}, got "${actual[key]}"`);
      }
    };
    compare(await read('given'), GIVEN, "the app's own wording never reached the DOM");
    compare(await read('bare'), ENGLISH, 'a footer given no props lost its documented English');

    assert.deepEqual(offenders, [],
      'a string the app cannot reach is a footer the app rewrites by hand:\n' + offenders.join('\n'));
  });
}

test('Vue FdyTableFooter: the app gives it its strings, and English without them', { skip }, async () => {
  await assertFooterStrings('vue-table-footer-text.html');
});

test('React FdyTableFooter: the app gives it its strings, and English without them', { skip }, async () => {
  await assertFooterStrings('react-table-footer-text.html');
});

/* The same six strings, asked of the table rather than of the footer. 3.8.0 gave `FdyTableFooter`
 * the props and left the three tables rendering their own footer with none of them forwarded, so
 * the hatch existed everywhere except on the component almost every screen actually uses. The
 * fixtures mount a table, never a bare footer, so a prop declared on the table and forwarded
 * nowhere passes typechecking and fails here. Same two halves: the given wording has to win, and a
 * table given no strings has to still read English. */
test('Vue FdyTable: its own footer says what the app told the table, and English otherwise', { skip }, async () => {
  await assertFooterStrings('vue-table-forward-text.html');
});

test('React FdyTable: its own footer says what the app told the table, and English otherwise', { skip }, async () => {
  await assertFooterStrings('react-table-forward-text.html');
});
