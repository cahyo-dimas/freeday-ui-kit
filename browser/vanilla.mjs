/* Browser regression specs — vanilla enhancers (dist/freeday.js).
 * Run via `npm run test:browser`; NOT part of the default `node --test` gate (lives outside
 * test/, not named *.test.mjs). Auto-skips when no Chrome binary is found. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, withPage } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => 'file://' + join(HERE, 'fixtures', name);
const skip = findChrome() === null ? 'no Chrome binary (set CHROME_BIN to run browser tests)' : false;

test('vanilla datetime: disabled reflects onto BOTH child triggers', { skip }, async () => {
  await withPage(fixture('vanilla-datetime.html'), async (p) => {
    const applied = await p.waitFor(
      `(() => { const tp = document.querySelector('#dt-disabled .fdy-timepicker__trigger'); return tp && tp.disabled; })()`,
    );
    const state = await p.evalJS(
      `(() => { const dp = document.querySelector('#dt-disabled .fdy-datepicker__trigger'),
        tp = document.querySelector('#dt-disabled .fdy-timepicker__trigger');
        return { dp: dp ? dp.disabled : null, tp: tp ? tp.disabled : null }; })()`,
    );
    assert.ok(applied, `both triggers should end up disabled, got ${JSON.stringify(state)}`);
    assert.equal(state.dp, true, 'date trigger disabled');
    // The regression guard: a microtask reached only the date child; setTimeout(0) reaches this one.
    assert.equal(state.tp, true, 'time trigger disabled');
  });
});

test('vanilla datetime: invalid reflects onto BOTH child triggers', { skip }, async () => {
  await withPage(fixture('vanilla-datetime.html'), async (p) => {
    const applied = await p.waitFor(
      `(() => { const tp = document.querySelector('#dt-invalid .fdy-timepicker__trigger');
        return tp && tp.getAttribute('aria-invalid') === 'true'; })()`,
    );
    const state = await p.evalJS(
      `(() => { const dp = document.querySelector('#dt-invalid .fdy-datepicker__trigger'),
        tp = document.querySelector('#dt-invalid .fdy-timepicker__trigger');
        return { dp: dp ? dp.getAttribute('aria-invalid') : null, tp: tp ? tp.getAttribute('aria-invalid') : null }; })()`,
    );
    assert.ok(applied, `both triggers should end up aria-invalid, got ${JSON.stringify(state)}`);
    assert.equal(state.dp, 'true', 'date trigger aria-invalid');
    assert.equal(state.tp, 'true', 'time trigger aria-invalid');
  });
});

test('vanilla combo: real mouse-select updates the value', { skip }, async () => {
  await withPage(fixture('vanilla-combo.html'), async (p) => {
    await p.waitFor(`document.querySelector('#cb .fdy-combo__button')`);
    await p.clickCenter('#cb .fdy-combo__button');
    const opened = await p.waitFor(
      `document.querySelector('#cb .fdy-combo__button').getAttribute('aria-expanded') === 'true'`,
    );
    assert.ok(opened, 'listbox opens on trigger click');
    // Trusted press → the option blurs the button → focusout fires; only the mousedown
    // preventDefault keeps the pick from being swallowed before click lands.
    await p.clickCenter('#cb .fdy-combo__option[data-value="badge"]');
    const changed = await p.waitFor(`window.__val === 'badge'`);
    assert.ok(changed, `mouse-select should set value to "badge", got "${await p.evalJS('window.__val')}"`);
  });
});

test('vanilla combo: programmatic setValue updates selection silently (no fdy-change)', { skip }, async () => {
  await withPage(fixture('vanilla-combo.html'), async (p) => {
    await p.waitFor(`document.getElementById('cb') && document.getElementById('cb')._fdyCombo`);
    // Host-driven set (used by the Blazor @bind-Value wrapper) must NOT echo an fdy-change.
    await p.evalJS(`window.FreedayCombo.setValue(document.getElementById('cb'), 'alert')`);
    const state = await p.evalJS(`(() => ({
      label: document.querySelector('#cb .fdy-combo__value').textContent.trim(),
      dataValue: document.getElementById('cb').getAttribute('data-value'),
      selected: document.querySelector('#cb .fdy-combo__option[data-value="alert"]').getAttribute('aria-selected'),
      changed: window.__val
    }))()`);
    assert.equal(state.label, 'Alert', 'value label reflects the set option');
    assert.equal(state.dataValue, 'alert', 'root data-value updated');
    assert.equal(state.selected, 'true', 'option marked aria-selected');
    assert.equal(state.changed, 'button', 'setValue is silent — fdy-change NOT fired, window.__val unchanged');
  });
});

/* The month drill and the accessible-name invariant, both from note 004. */
test('the calendar title drills to a month grid, and picking a month commits nothing', { skip }, async () => {
  await withPage(fixture('vanilla-cal-drill.html'), async (p) => {
    await p.waitFor('window.FreedayDatepicker');
    await p.clickCenter('.fdy-datepicker__trigger');
    assert.equal(await p.evalJS('document.querySelector(".fdy-cal__title").tagName'), 'BUTTON',
      'the title must be a control — it was the only thing naming the month, and it was a <div>');

    await p.clickCenter('.fdy-cal__title');
    assert.equal(await p.evalJS('document.querySelectorAll(".fdy-cal__month").length'), 12, 'drills to a month grid');
    assert.equal(await p.evalJS('document.activeElement.className.includes("fdy-cal__month")'), true,
      'focus follows into the grid, or a keyboard user is stranded');

    for (let i = 0; i < 4; i++) await p.clickCenter('.fdy-cal__nav');    // ‹ steps a YEAR here
    assert.equal(await p.evalJS('document.querySelector(".fdy-cal__title").textContent'), '2022',
      'the arrows step years while the month grid is open');

    const before = await p.evalJS('document.querySelector(".fdy-datepicker__value").textContent.trim()');
    await p.clickCenter('.fdy-cal__month:nth-child(3)');
    assert.equal(await p.evalJS('document.querySelectorAll(".fdy-cal__day").length'), 42, 'back to the day grid');
    assert.equal(await p.evalJS('document.querySelector(".fdy-datepicker__value").textContent.trim()'), before,
      'picking a month is navigation, not selection — nothing may be committed until a DAY is chosen');

    await p.clickCenter('.fdy-cal__day:not(.is-outside)');
    assert.match(await p.evalJS('document.querySelector(".fdy-datepicker__value").textContent'), /2022/,
      'and then the day commits');
  });
});

/* The third level of the drill. Stepping years one arrow-click at a time is what the month grid
   was added to avoid, and it left the same problem one level up: reaching 1998 from 2026 was
   twenty-eight clicks on ‹. */
test('the month title drills to a year grid, and picking a year commits nothing', { skip }, async () => {
  await withPage(fixture('vanilla-cal-drill.html'), async (p) => {
    await p.waitFor('window.FreedayDatepicker');
    await p.clickCenter('.fdy-datepicker__trigger');
    await p.clickCenter('.fdy-cal__title');                              // days -> months
    await p.clickCenter('.fdy-cal__title');                              // months -> years

    assert.equal(await p.evalJS('document.querySelectorAll(".fdy-cal__year").length'), 12,
      'drills to a year grid');
    assert.equal(await p.evalJS('document.activeElement.className.includes("fdy-cal__year")'), true,
      'focus follows into the grid, or a keyboard user is stranded');

    /* The page is ALIGNED, not centred on the year in view: pages must tile, or ‹ and › land on
       overlapping windows and the same year sits somewhere different every step. */
    const title = await p.evalJS('document.querySelector(".fdy-cal__title").textContent');
    assert.match(title, /^\d{4} – \d{4}$/, 'the title states the page range');
    const [from, to] = title.split(' – ').map(Number);
    assert.equal(from % 12, 0, 'year pages tile on a fixed boundary');
    assert.equal(to - from, 11, 'a page holds twelve years');

    const before = await p.evalJS('document.querySelector(".fdy-datepicker__value").textContent.trim()');
    await p.clickCenter('.fdy-cal__year:nth-child(2)');
    assert.equal(await p.evalJS('document.querySelectorAll(".fdy-cal__month").length'), 12,
      'picking a year drops to that year\'s month grid');
    assert.equal(await p.evalJS('document.querySelector(".fdy-cal__title").textContent'), String(from + 1),
      'and the month grid is showing the year that was picked');
    assert.equal(await p.evalJS('document.querySelector(".fdy-datepicker__value").textContent.trim()'), before,
      'picking a year is navigation, not selection — nothing may be committed until a DAY is chosen');
  });
});

test('an option keeps its accessible name when it becomes selected', { skip }, async () => {
  await withPage(fixture('vanilla-cal-drill.html'), async (p) => {
    await p.waitFor('window.FreedayCombo');
    /* The tick used to be text INSIDE role="option", so the selected option's name was "✓Badge"
       while every other was "Badge": the state was announced twice, and getByRole('option',
       { name: 'Badge' }) stopped matching the one option that was selected. The invariant is the
       name, not the glyph, so this asserts names are identical either side of selection. */
    /* Asked of the ENGINE, not of textContent: the tick is CSS generated content now, which never
       shows up in textContent — a DOM-level assert would pass even with the glyph back in the name.
       The listbox has to be OPEN first: a hidden option is not in the accessibility tree at all. */
    await p.clickCenter('.fdy-combo__button');
    const unselected = await p.axName('.fdy-combo__option[data-value="button"]');
    const selected = await p.axName('.fdy-combo__option[data-value="badge"]');
    assert.equal(unselected, 'Button');
    assert.equal(selected, 'Badge',
      `the selected option's accessible name must not carry the tick, got ${JSON.stringify(selected)}`);

    await p.clickCenter('.fdy-combo__option[data-value="button"]');
    await p.clickCenter('.fdy-combo__button');
    assert.equal(await p.axName('.fdy-combo__option[data-value="button"]'), 'Button',
      'the name must not change under you as a side effect of becoming selected');
    assert.equal(await p.evalJS('document.querySelector(".fdy-combo__option[data-value=\'button\']").getAttribute("aria-selected")'), 'true',
      'only aria-selected carries the state');
  });
});
