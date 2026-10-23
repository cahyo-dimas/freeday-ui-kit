/* Browser regression specs: `FdyMonthpicker`, the component that answers a MONTH.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * 3.8.0 shipped `mode?: 'day' | 'month'` on `FdyDatepicker`, and the shape was wrong. One prop
 * carried two string formats, `YYYY-MM-DD` and `YYYY-MM`, and the prop that chose between them was
 * a DIFFERENT prop, so `modelValue: string | null` told a reader nothing about what to store there.
 * A discriminated union would say it, and that is not a shape `defineProps<{...}>` or an exported
 * `interface FdyDatepickerProps` can hold. A separate component can: one prop, one format.
 *
 * `mode="month"` already shipped, so it stays and keeps working. Half of this file is about that:
 * the deprecated prop sits on the same page as its replacement, given the same value and the same
 * bounds, and the two have to agree cell for cell. That is what "zero consumers break" means when
 * the month grid logic has just been moved out into adapters/core/month-grid.js underneath both.
 *
 * Asserted in a browser, as browser/month-mode.mjs is, because none of the claims can be read off
 * the source: whether a grid STOPS is a question about what renders, and whether a month name
 * follows the page is one only `Intl` in a real engine can answer.
 *
 * Every fixture here is `<html lang="id">` and passes no locale. Chrome runs en-US, so Indonesian
 * month names can only have come from the page.
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

/* waitFor RETURNS false on timeout rather than throwing, so an unmet condition sails on and fails
   some later assertion with a message about the wrong thing. Say which wait expired. */
const until = async (p, condition, what) => {
  assert.ok(await p.waitFor(condition), `timed out waiting for ${what}, condition never became true: ${condition}`);
};

const count = (p, selector) => p.evalJS(`document.querySelectorAll(${JSON.stringify(selector)}).length`);

const triggerText = (p, id) => p.evalJS(`document.querySelector("#${id} .fdy-datepicker__value").textContent.trim()`);

/* The browser's own idea of language, printed when a locale assertion fails. If this ever reads
   `id` the proof is void: the name could have come from the engine's default. */
const BROWSER_LANG = `navigator.language`;

const EXPANDED = `document.querySelectorAll('.fdy-datepicker__trigger[aria-expanded="true"]').length`;

/* Open a picker, and WAIT for aria-expanded rather than for the cells.
 *
 * Two traps, both of which cost the parity test below a false failure. These components render
 * their month grid whether the panel is open or not, so "twelve month cells appeared" is already
 * true before the click and the read races the framework's flush. And the panel renders in the top
 * layer, so an open one COVERS the triggers under it on this fixture: a click meant for the next
 * picker lands on the panel of the last one. So close first, then open, then wait on the attribute
 * that actually changes. */
const openPicker = async (p, id) => {
  if (await p.evalJS(EXPANDED) > 0) {
    await p.pressKey('Escape');
    await until(p, `${EXPANDED} === 0`, 'the open panel to close before reaching the next trigger');
  }
  await p.clickCenter(`#${id} .fdy-datepicker__trigger`);
  await until(p, `document.querySelector("#${id} .fdy-datepicker__trigger").getAttribute("aria-expanded") === "true"`,
    `the ${id} panel to open`);
};

/** Every month cell of one picker, with the four things a reader or a screen reader gets. */
const monthCells = (p, id) => p.evalJS(
  `JSON.stringify([...document.querySelectorAll("#${id} .fdy-cal__month")].map((b) => ({`
  + ` text: b.textContent, aria: b.getAttribute("aria-label"), disabled: b.disabled,`
  + ` selected: b.getAttribute("aria-selected"), tabindex: b.getAttribute("tabindex") })))`,
).then(JSON.parse);

async function assertMonthpicker(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    await until(p, 'document.querySelectorAll(".fdy-datepicker__trigger").length === 4', 'all four pickers to mount');
    assert.notEqual(await p.evalJS(BROWSER_LANG), 'id',
      'this engine already speaks Indonesian, so nothing below proves the page decided it');

    /* The trigger before anything opens. The value handed in is "2026-10", and a reader has to see
       the month named in the page's language, not an ISO string and not an English month. The
       component takes no `locale`, so this is `pageLocale()` being measured. */
    assert.equal(await triggerText(p, 'mp'), 'Oktober 2026',
      'the trigger must name the month through <html lang>, which is the whole reason this exists');

    await openPicker(p, 'mp');
    assert.equal(await count(p, '#mp .fdy-cal__month'), 12, 'twelve month cells');

    /* It STOPS here, and this component has no day grid to stop short of. These components render
       their grid whether the panel is open or not, so zero is a claim about the WHOLE component:
       the day picker counts 42 for this selector. */
    assert.equal(await count(p, '#mp .fdy-cal__day'), 0,
      'FdyMonthpicker must never render a day grid, not even behind the one on screen');
    assert.equal(await count(p, '#mp .fdy-cal__dow'), 0, 'and no weekday headers either');
    assert.equal(await p.evalJS('document.activeElement.className.includes("fdy-cal__month")'), true,
      'focus must land in the month grid, or a keyboard user opens a panel they cannot reach');

    const cells = await monthCells(p, 'mp');
    assert.equal(cells.length, 12);
    assert.equal(cells[9].text, 'Okt', `the cell label follows <html lang>, got ${cells[9].text}`);
    assert.equal(cells[9].aria, 'Oktober 2026', `and so does its accessible name, got ${cells[9].aria}`);
    /* The name is the invariant, the STATE is aria-selected: a name that changes when a cell
       becomes selected stops matching the query that found it. */
    assert.equal(cells[9].selected, 'true', 'the selected month carries its state in aria-selected');
    assert.equal(cells[10].aria, 'November 2026', 'an unselected neighbour is named the same way');
    assert.equal(cells[9].tabindex, '0', 'and the roving tabindex opens on the selected month');

    // A click ANSWERS with YYYY-MM.
    await p.clickCenter('#mp .fdy-cal__month:nth-child(11)');
    await until(p, `window.__month === '2026-11'`, 'the month to be committed');
    assert.equal(await count(p, '#mp .fdy-cal__day'), 0, 'committing a month does not drop into days');
    assert.equal(await p.evalJS('document.querySelector("#mp .fdy-datepicker__trigger").getAttribute("aria-expanded")'), 'false',
      'committing closes the panel, as picking a day does');
    assert.equal(await triggerText(p, 'mp'), 'November 2026', 'and the trigger follows the new month');

    // The keyboard answers too: reopen, step one cell, press Enter.
    await p.clickCenter('#mp .fdy-datepicker__trigger');
    await until(p, 'document.activeElement.className.includes("fdy-cal__month")', 'focus back in the grid');
    await p.pressKey('ArrowLeft');
    await p.pressKey('Enter');
    await until(p, `window.__month === '2026-10'`, 'the keyboard commit');
  });
}

async function assertYearDrill(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    await until(p, 'document.querySelectorAll(".fdy-datepicker__trigger").length === 4', 'all four pickers to mount');

    await openPicker(p, 'mp');

    /* The year level stays, because a year is NAVIGATION and never an answer: without it, reaching
       March 2022 from here is one arrow press per year. */
    await p.clickCenter('#mp .fdy-cal__title');
    await until(p, 'document.querySelectorAll("#mp .fdy-cal__year").length === 12', 'the year grid');
    assert.equal(await count(p, '#mp .fdy-cal__month'), 0, 'the year grid replaces the month grid');

    // Year pages are ALIGNED, so 2026 sits in a page that starts at 2016.
    const years = await p.evalJS('JSON.stringify([...document.querySelectorAll("#mp .fdy-cal__year")].map((b) => b.textContent))')
      .then(JSON.parse);
    assert.equal(years[0], '2016', `year pages tile from a multiple of twelve, got ${years[0]}`);
    assert.equal(years[11], '2027');

    await p.clickCenter('#mp .fdy-cal__year:nth-child(7)'); // 2022
    await until(p, 'document.querySelectorAll("#mp .fdy-cal__month").length === 12', 'back down to months');
    assert.equal(await p.evalJS('window.__month'), '2026-10',
      'picking a year commits nothing, the value is still the month that was handed in');
    assert.equal(await count(p, '#mp .fdy-cal__day'), 0, 'and no day grid appears on the way back down');

    const cells = await monthCells(p, 'mp');
    assert.equal(cells[0].aria, 'Januari 2022', `the month grid moved to the chosen year, got ${cells[0].aria}`);

    // And committing from there answers with the year that was navigated to.
    await p.clickCenter('#mp .fdy-cal__month:nth-child(1)');
    await until(p, `window.__month === '2022-01'`, 'the commit from the navigated year');
  });
}

async function assertBounds(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    await until(p, 'document.querySelectorAll(".fdy-datepicker__trigger").length === 4', 'all four pickers to mount');

    /* A bound that sits INSIDE a month leaves that month pickable, the rule the month grid has
       always applied. min 2026-03 and max 2026-10 disable February and November. */
    await openPicker(p, 'mp-bound');
    const bounded = await monthCells(p, 'mp-bound');
    assert.deepEqual(bounded.map((c) => c.disabled),
      [true, true, false, false, false, false, false, false, false, false, true, true],
      'March through October stay pickable; the months outside the bounds do not');

    // A disabled cell cannot answer, and the panel stays open rather than committing silently.
    await p.clickCenter('#mp-bound .fdy-cal__month:nth-child(1)');
    assert.equal(await p.evalJS('window.__bound'), '2026-10', 'a disabled month commits nothing');
  });
}

/* The guard on every app that already shipped. `mode="month"` is deprecated, which means its TYPE
 * is wrong and its BEHAVIOUR is promised: the grid logic now lives in adapters/core/month-grid.js
 * and feeds both components, so the old path has to come out the far side unchanged. Cell for cell,
 * since "it still works" is the kind of claim that passes while an aria-label quietly moves. */
async function assertDeprecatedParity(fixtureName) {
  await withPage(fixture(fixtureName), async (p) => {
    await until(p, 'document.querySelectorAll(".fdy-datepicker__trigger").length === 4', 'all four pickers to mount');

    assert.equal(await triggerText(p, 'dep'), await triggerText(p, 'mp'),
      'the deprecated prop and its replacement read the same, or one of them regressed');

    await openPicker(p, 'mp');
    const fresh = await monthCells(p, 'mp');
    await openPicker(p, 'dep');
    const old = await monthCells(p, 'dep');
    assert.deepEqual(old, fresh,
      'mode="month" must render the month grid it always did, down to the labels and the roving tabindex');

    assert.equal(await count(p, '#dep .fdy-cal__day'), 0,
      'mode="month" still never builds a day grid');
    assert.equal(await p.evalJS('document.activeElement.className.includes("fdy-cal__month")'), true,
      'and focus still lands in the month grid');

    await p.clickCenter('#dep .fdy-cal__month:nth-child(11)');
    await until(p, `window.__dep === '2026-11'`, 'the deprecated path to commit');
    assert.equal(await triggerText(p, 'dep'), 'November 2026', 'and to re-read its trigger');

    // Bounds too, which is where a moved predicate would show up first.
    await openPicker(p, 'mp-bound');
    const freshBound = await monthCells(p, 'mp-bound');
    await openPicker(p, 'dep-bound');
    assert.deepEqual(await monthCells(p, 'dep-bound'), freshBound,
      'the bounds rule is one function now, so both paths must disable exactly the same months');
  });
}

test('Vue FdyMonthpicker: answers YYYY-MM, stops at months, speaks the page', { skip }, async () => {
  await assertMonthpicker('vue-monthpicker.html');
});

test('React FdyMonthpicker: answers YYYY-MM, stops at months, speaks the page', { skip }, async () => {
  await assertMonthpicker('react-monthpicker.html');
});

test('Vue FdyMonthpicker: the year level navigates and commits nothing', { skip }, async () => {
  await assertYearDrill('vue-monthpicker.html');
});

test('React FdyMonthpicker: the year level navigates and commits nothing', { skip }, async () => {
  await assertYearDrill('react-monthpicker.html');
});

test('Vue FdyMonthpicker: a bound inside a month leaves that month pickable', { skip }, async () => {
  await assertBounds('vue-monthpicker.html');
});

test('React FdyMonthpicker: a bound inside a month leaves that month pickable', { skip }, async () => {
  await assertBounds('react-monthpicker.html');
});

test('Vue: deprecated mode="month" behaves exactly as before', { skip }, async () => {
  await assertDeprecatedParity('vue-monthpicker.html');
});

test('React: deprecated mode="month" behaves exactly as before', { skip }, async () => {
  await assertDeprecatedParity('react-monthpicker.html');
});
