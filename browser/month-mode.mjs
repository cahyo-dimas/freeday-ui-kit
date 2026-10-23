/* Browser regression specs: the datepicker can be asked for a MONTH (note 008 §8).
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * The report was not "the kit has no month grid". It has had one since 2.1.0. The report was that
 * the grid is only ever a waypoint on the way to a day, so the only control that returns a month is
 * `<input type="month">`, which names the month in the BROWSER's language and ignores
 * `<html lang="id">` entirely. An app shipped two arrows and a label rather than use it.
 *
 * Asserted in a browser, on all three paths, because none of the three claims can be read off the
 * source. Whether a grid STOPS is a question about what renders; whether a month name follows the
 * page is a question only `Intl` in a real engine can answer; and a `mode` prop that is declared
 * but never consulted type-checks perfectly.
 *
 * Every fixture here is `<html lang="id">` and passes no locale. Chrome runs en-US, so Indonesian
 * month names can only have come from the page. That is the whole point of the item: the one
 * direction `<input type="month">` cannot be pushed.
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

/* The browser's own idea of language, printed when a locale assertion fails. If this ever reads
   `id` the proof is void: the name could have come from the engine's default rather than the page,
   which is exactly the confusion the item is about. */
const BROWSER_LANG = `navigator.language`;

test('vanilla month mode: the grid is the destination, and it speaks the page', { skip }, async () => {
  await withPage(fixture('vanilla-month-mode.html'), async (p) => {
    await until(p, 'window.FreedayDatepicker', 'the datepicker enhancer to load');
    assert.notEqual(await p.evalJS(BROWSER_LANG), 'id',
      'this engine already speaks Indonesian, so nothing below proves the page decided it');

    /* The trigger, before anything is opened. The value is "2026-10", and what a reader sees has to
       be the month named in the page's language, not an ISO string and not an English month. */
    assert.equal(await p.evalJS('window.valueOf_("#mp")'), 'Oktober 2026',
      'the chosen month must be formatted through Intl from <html lang>, which is the whole item');

    await p.clickCenter('#mp .fdy-datepicker__trigger');
    await until(p, 'document.querySelectorAll("#mp .fdy-cal__month").length === 12', 'the month grid');

    /* It STOPS here. Not "a day grid is reachable but we do not go there": there is no day grid. */
    assert.equal(await count(p, '#mp .fdy-cal__day'), 0,
      'month mode must open ON the month grid, not one level above the day grid it drills into');
    assert.equal(await p.evalJS('document.activeElement.className.includes("fdy-cal__month")'), true,
      'focus must land in the month grid, or a keyboard user opens a panel they cannot reach');

    const cells = await p.evalJS('JSON.stringify(window.monthCells("#mp"))').then(JSON.parse);
    assert.equal(cells.length, 12);
    assert.equal(cells[9].text, 'Okt', `the cell label follows <html lang>, got ${cells[9].text}`);
    assert.equal(cells[9].aria, 'Oktober 2026', `and so does its accessible name, got ${cells[9].aria}`);

    /* The name is the invariant, the STATE is aria-selected. Same lesson as the combo's tick: a
       name that changes when a cell becomes selected stops matching the query that found it. */
    assert.equal(cells[9].selected, 'true', 'the selected month carries the state in aria-selected');
    assert.equal(cells[10].aria, 'November 2026', 'an unselected neighbour is named the same way');
    assert.equal(cells[9].tabindex, '0', 'and the roving tabindex opens on the selected month');

    // Clicking a month ANSWERS. It does not drop into days.
    await p.clickCenter('#mp .fdy-cal__month:nth-child(11)');
    await until(p, 'window.__changes.length === 1', 'the change event');
    assert.deepEqual(await p.evalJS('JSON.stringify(window.__changes)').then(JSON.parse),
      [{ id: 'mp', value: '2026-11' }],
      'a month commits YYYY-MM on the same event name a host is already listening to');
    assert.equal(await count(p, '#mp .fdy-cal__day'), 0, 'and still never builds a day grid');
    assert.equal(await p.evalJS('document.querySelector("#mp .fdy-datepicker__trigger").getAttribute("aria-expanded")'), 'false',
      'committing closes the panel, as picking a day does');
    assert.equal(await p.evalJS('window.valueOf_("#mp")'), 'November 2026',
      'and the trigger reads the month that was picked, in the page\'s language');
  });
});

test('vanilla month mode: the keyboard answers, and bounds hold', { skip }, async () => {
  await withPage(fixture('vanilla-month-mode.html'), async (p) => {
    await until(p, 'window.FreedayDatepicker', 'the datepicker enhancer to load');

    await p.clickCenter('#mp .fdy-datepicker__trigger');
    await until(p, 'document.querySelectorAll("#mp .fdy-cal__month").length === 12', 'the month grid');

    /* Enter used to DRILL from here, which is right while months are a waypoint and wrong once they
       are the answer. One real key, because only a trusted one is acted on. */
    await p.pressKey('ArrowRight');
    await p.pressKey('Enter');
    await until(p, 'window.__changes.length === 1', 'the keyboard commit');
    assert.deepEqual(await p.evalJS('JSON.stringify(window.__changes)').then(JSON.parse),
      [{ id: 'mp', value: '2026-11' }],
      'ArrowRight then Enter must answer with the next month, not open its days');

    /* A bound that sits INSIDE a month leaves that month pickable, the rule the month grid has
       always applied one level down. min 2026-03 and max 2026-10 disable February and November. */
    await p.clickCenter('#mp-bound .fdy-datepicker__trigger');
    await until(p, 'document.querySelectorAll("#mp-bound .fdy-cal__month").length === 12', 'the bounded grid');
    const bounded = await p.evalJS('JSON.stringify(window.monthCells("#mp-bound"))').then(JSON.parse);
    assert.deepEqual(bounded.map((c) => c.disabled),
      [true, true, false, false, false, false, false, false, false, false, true, true],
      'March through October stay pickable; the months outside the bounds do not');
  });
});

/* The guard on every app already shipped. The month mode is new behaviour reached through one new
 * attribute, so the picker WITHOUT it has to be the picker that was there before, down to the
 * shape of the value. Same page as the month picker, so one enhancer build answers both. */
test('vanilla: a picker with no mode is the day picker it always was', { skip }, async () => {
  await withPage(fixture('vanilla-month-mode.html'), async (p) => {
    await until(p, 'window.FreedayDatepicker', 'the datepicker enhancer to load');

    await p.clickCenter('#dp .fdy-datepicker__trigger');
    await until(p, 'document.querySelectorAll("#dp .fdy-cal__day").length === 42', 'the day grid');
    assert.equal(await count(p, '#dp .fdy-cal__month'), 0, 'and it opens on days, not on months');

    // The drill still works: title to months, a month still NAVIGATES back down to its days.
    await p.clickCenter('#dp .fdy-cal__title');
    await until(p, 'document.querySelectorAll("#dp .fdy-cal__month").length === 12', 'the month grid');
    await p.clickCenter('#dp .fdy-cal__month:nth-child(3)');
    await until(p, 'document.querySelectorAll("#dp .fdy-cal__day").length === 42', 'the day grid again');
    assert.equal(await p.evalJS('window.__changes.length'), 0,
      'a month is still navigation here, nothing may be committed until a DAY is chosen');

    await p.clickCenter('#dp .fdy-cal__day:not(.is-outside)');
    await until(p, 'window.__changes.length === 1', 'the day commit');
    const changes = await p.evalJS('JSON.stringify(window.__changes)').then(JSON.parse);
    assert.match(changes[0].value, /^\d{4}-\d{2}-\d{2}$/,
      `the day path still reports a full ISO date, got ${changes[0].value}`);
  });
});

/* Vue and React re-implement the calendar rather than wrap the enhancer, so each has to be driven
 * on its own. `window.__month` / `window.__day` are the bound values, which is what a host sees. */
async function assertTypedMonthMode(fixtureName, valueKey) {
  await withPage(fixture(fixtureName), async (p) => {
    await until(p, 'document.querySelectorAll(".fdy-datepicker__trigger").length === 2', 'both pickers to mount');
    assert.notEqual(await p.evalJS(BROWSER_LANG), 'id',
      'this engine already speaks Indonesian, so nothing below proves the page decided it');

    /* The typed adapters took `locale` and handed `undefined` straight to Intl when it was absent,
       so the fallback was the BROWSER's language while COMPONENTS.md promised the page's. Nothing
       here passes `locale`, so this is the fallback being measured. */
    assert.equal(await p.evalJS('document.querySelector("#mp .fdy-datepicker__value").textContent.trim()'), 'Oktober 2026',
      'the trigger must name the month through <html lang>, not through the browser language');

    await p.clickCenter('#mp .fdy-datepicker__trigger');
    await until(p, 'document.querySelector("#mp .fdy-datepicker__trigger").getAttribute("aria-expanded") === "true"',
      'the panel to open');
    assert.equal(await count(p, '#mp .fdy-cal__month'), 12, 'twelve month cells');
    /* These components render their grid whether the panel is open or not, so zero day cells is a
       claim about the WHOLE component: in day mode this selector counts 42. */
    assert.equal(await count(p, '#mp .fdy-cal__day'), 0,
      'month mode must never render a day grid, not even behind the one on screen');
    assert.equal(await p.evalJS('document.activeElement.className.includes("fdy-cal__month")'), true,
      'focus must land in the month grid, or a keyboard user opens a panel they cannot reach');
    assert.equal(
      await p.evalJS(`document.querySelector('#mp .fdy-cal__month[aria-selected="true"]').getAttribute('aria-label')`),
      'Oktober 2026', 'the selected cell is named in the page\'s language and states its state in aria');

    // A click answers with YYYY-MM.
    await p.clickCenter('#mp .fdy-cal__month:nth-child(11)');
    await until(p, `window.${valueKey} === '2026-11'`, 'the month to be committed');
    assert.equal(await count(p, '#mp .fdy-cal__day'), 0, 'committing a month does not drop into days');
    assert.equal(await p.evalJS('document.querySelector("#mp .fdy-datepicker__value").textContent.trim()'), 'November 2026',
      'and the trigger follows the new month');

    // The keyboard answers too: reopen, step one cell, press Enter.
    await p.clickCenter('#mp .fdy-datepicker__trigger');
    await until(p, 'document.activeElement.className.includes("fdy-cal__month")', 'focus back in the grid');
    await p.pressKey('ArrowLeft');
    await p.pressKey('Enter');
    await until(p, `window.${valueKey} === '2026-10'`, 'the keyboard commit');
  });
}

test('Vue FdyDatepicker: mode="month" stops at months and answers YYYY-MM', { skip }, async () => {
  await assertTypedMonthMode('vue-month-mode.html', '__month');
});

test('React FdyDatepicker: mode="month" stops at months and answers YYYY-MM', { skip }, async () => {
  await assertTypedMonthMode('react-month-mode.html', '__month');
});

/* The same guard the raw path gets: without the prop, the component on the same page is the day
 * picker it has always been. Two instances in one mount, so a mode that leaked into the component
 * instead of the instance would show up here. */
async function assertTypedDayUnchanged(fixtureName, valueKey) {
  await withPage(fixture(fixtureName), async (p) => {
    await until(p, 'document.querySelectorAll(".fdy-datepicker__trigger").length === 2', 'both pickers to mount');

    await p.clickCenter('#dp .fdy-datepicker__trigger');
    await until(p, 'document.querySelector("#dp .fdy-datepicker__trigger").getAttribute("aria-expanded") === "true"',
      'the panel to open');
    assert.equal(await count(p, '#dp .fdy-cal__day'), 42, 'forty two day cells, the grid it always had');
    assert.equal(await count(p, '#dp .fdy-cal__month'), 0, 'it opens on days, not on months');
    assert.equal(await p.evalJS('document.activeElement.className.includes("fdy-cal__day")'), true,
      'and focus lands on a day, exactly as before');

    await p.clickCenter('#dp .fdy-cal__title');
    await until(p, 'document.querySelectorAll("#dp .fdy-cal__month").length === 12', 'the month grid');
    await p.clickCenter('#dp .fdy-cal__month:nth-child(3)');
    await until(p, 'document.querySelectorAll("#dp .fdy-cal__day").length === 42', 'the day grid again');
    assert.equal(await p.evalJS(`window.${valueKey}`), '2026-10-21',
      'a month is still navigation here, nothing may be committed until a DAY is chosen');

    await p.clickCenter('#dp .fdy-cal__day:not(.is-outside)');
    await until(p, `/^\\d{4}-\\d{2}-\\d{2}$/.test(window.${valueKey}) && window.${valueKey} !== '2026-10-21'`,
      'the day commit');
  });
}

test('Vue FdyDatepicker: no mode is the day picker it always was', { skip }, async () => {
  await assertTypedDayUnchanged('vue-month-mode.html', '__day');
});

test('React FdyDatepicker: no mode is the day picker it always was', { skip }, async () => {
  await assertTypedDayUnchanged('react-month-mode.html', '__day');
});
