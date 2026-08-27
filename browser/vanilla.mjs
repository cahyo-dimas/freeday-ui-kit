/* Browser regression specs, vanilla enhancers (dist/freeday.js).
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

/* waitFor RETURNS false on timeout rather than throwing, so an unmet condition sails on and fails
   some later assertion with a message about the wrong thing. Say which wait expired. */
const until = async (p, condition, what) => {
  assert.ok(await p.waitFor(condition), `timed out waiting for ${what}, condition never became true: ${condition}`);
};

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
    assert.equal(state.changed, 'button', 'setValue is silent, fdy-change NOT fired, window.__val unchanged');
  });
});

/* The month drill and the accessible-name invariant, both from note 004. */
test('the calendar title drills to a month grid, and picking a month commits nothing', { skip }, async () => {
  await withPage(fixture('vanilla-cal-drill.html'), async (p) => {
    await p.waitFor('window.FreedayDatepicker');
    await p.clickCenter('.fdy-datepicker__trigger');
    assert.equal(await p.evalJS('document.querySelector(".fdy-cal__title").tagName'), 'BUTTON',
      'the title must be a control, it was the only thing naming the month, and it was a <div>');

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
      'picking a month is navigation, not selection, nothing may be committed until a DAY is chosen');

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
      'picking a year is navigation, not selection, nothing may be committed until a DAY is chosen');
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
       shows up in textContent, a DOM-level assert would pass even with the glyph back in the name.
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

/* Busy overlay. Three failures, none of which markup can show:
 *   1. `inert` never landing — the scrim looks blocking but Tab still walks the form behind it;
 *   2. `inert` never coming OFF, which bricks the page after one save and looks like a hang;
 *   3. the kit clearing an app's OWN inert on release, un-hiding a region the app hid on purpose.
 * Plus the delay: a fast operation must leave nothing painted at all. */
test('busy: blocks the page, and gives back exactly what it took', { skip }, async () => {
  await withPage(fixture('vanilla-busy.html'), async (p) => {
    await p.waitFor(`typeof window.Freeday?.busy === 'function'`);

    const inertOf = async (id) => p.evalJS(`document.getElementById('${id}').hasAttribute('inert')`);
    assert.equal(await inertOf('app'), false, 'nothing is inert before the overlay');
    assert.equal(await inertOf('already-inert'), true, "the app's own inert is there to begin with");

    await p.evalJS(`window.Freeday.busy({ caption: 'Posting invoice…', delay: 0 })`);
    const up = await p.waitFor(`!!document.querySelector('.fdy-busy.is-open')`);
    assert.ok(up, 'the overlay paints with delay 0');

    assert.equal(await inertOf('app'), true, 'the page behind must be inert, or Tab still reaches it');
    assert.equal(
      await p.evalJS(`document.querySelector('.fdy-busy').hasAttribute('inert')`), false,
      'the overlay itself must not be inert — it is a child of <body> like the rest',
    );
    assert.equal(
      await p.evalJS(`document.querySelector('.fdy-busy__caption').textContent`), 'Posting invoice…',
      'the caption is what was asked for',
    );
    assert.equal(
      await p.evalJS(`document.activeElement.classList.contains('fdy-busy')`), true,
      'focus parks on the panel, or it falls to <body> when its old home goes inert',
    );

    await p.evalJS(`window.Freeday.idle()`);
    const gone = await p.waitFor(`document.querySelector('.fdy-busy') === null`);
    assert.ok(gone, 'idle() removes the overlay');
    assert.equal(await inertOf('app'), false, 'inert must come OFF, or the page is bricked after one save');
    assert.equal(await inertOf('already-inert'), true,
      "releasing must not clear an inert the kit did not set — that would un-hide a region the app hid");
  });
});

test('busy: a fast operation never paints a scrim', { skip }, async () => {
  await withPage(fixture('vanilla-busy.html'), async (p) => {
    await p.waitFor(`typeof window.Freeday?.busy === 'function'`);

    // Default delay, released well inside it: the flash this prevents reads as a glitch, not
    // as progress, and is the single most common complaint about blocking overlays.
    await p.evalJS(`window.Freeday.busy({ caption: 'Saving…' }); window.Freeday.idle();`);
    await p.evalJS(`new Promise(r => setTimeout(r, 300))`);

    assert.equal(await p.evalJS(`document.querySelector('.fdy-busy') === null`), true,
      'a pending show must be cancelled by idle(), not merely hidden afterwards');
    assert.equal(await p.evalJS(`document.getElementById('app').hasAttribute('inert')`), false,
      'and nothing may be left inert by an overlay that never appeared');
  });
});

/* A wizard whose Next cannot be stopped validates nothing, and the guard has to survive the case an
 * event alone cannot express: the answer is a server round-trip away. Refusing synchronously is
 * easy to get right; the failures worth a real browser are the async ones — advancing while the
 * promise is still pending, and letting a second click through the gap. */
/* Settling a deferred guard is only safe once the enhancer has actually TAKEN the promise, and
 * `aria-busy` is the moment it did. A click ack from CDP means the events were dispatched, NOT that
 * the page's handlers have run — so calling `window.settle` straight after a click can call the
 * PREVIOUS cycle's resolver, which is already settled and therefore a no-op. The new promise then
 * hangs forever and the panel never moves. That passed on this machine and failed on CI's Chrome,
 * both times, which is exactly the shape of a test that is racing rather than asserting. */
const settleWith = async (p, answer) => {
  await until(p, `document.querySelector('#wiz .fdy-stepper').getAttribute('aria-busy') === 'true'`,
    'the enhancer to take the guard\'s promise before it is settled');
  await p.evalJS(`window.settle(${answer})`);
  await until(p, `!document.querySelector('#wiz .fdy-stepper').hasAttribute('aria-busy')`,
    'the stepper to be released after the guard answered');
};

/* Ready means BOTH scripts have run, not that the markup exists.
 *
 * These two specs used to wait on `#wiz .fdy-step.is-active`, which is in the fixture's STATIC
 * HTML: it is satisfied the moment the parser passes the <li>, and so proves nothing about the
 * enhancer having attached or about the fixture's own script — the one at the end of <body> that
 * registers the guard listener and sets `window.mode` — having run. `fdyStepperReady` is the
 * enhancer's own marker and an array `window.asked` is the fixture script's; neither exists in the
 * parsed document, so neither can be true early.
 *
 * Stated honestly: this is NOT a proven fix for `stepper: a refused guard leaves the panel exactly
 * where it was`, which failed on 3817482 and twice more cutting 3.1.0 with `expected 1, actual 2`.
 * That was not reproduced here — not on either engine, not at concurrency 3, and not with the
 * stylesheet inflated to 20MB to widen the window before the inline script runs. This removes one
 * unproven variable because waiting on parsed markup is wrong on its own terms. If the next run is
 * green, that is not evidence this was the cause. */
const STEPPER_READY = `document.getElementById('wiz')?.dataset.fdyStepperReady === '1'`
  + ` && Array.isArray(window.asked)`;

test('stepper: a refused guard leaves the panel exactly where it was', { skip }, async () => {
  await withPage(fixture('vanilla-stepper-guard.html'), async (p) => {
    await p.waitFor(STEPPER_READY);

    const onStep = async () => p.evalJS(`document.getElementById('p2').hidden ? 1 : 2`);
    assert.equal(await onStep(), 1, 'starts on step one');

    await p.evalJS(`window.mode = 'refuse'`);
    await p.clickCenter('[data-fdy-step-next]');
    assert.deepEqual(await p.evalJS('window.asked'), ['0->1'], 'the guard was asked');
    assert.equal(await onStep(), 1, 'preventDefault must leave the panel unchanged');
    assert.equal(
      await p.evalJS(`document.querySelector('#wiz .fdy-step:nth-child(2)').classList.contains('is-active')`),
      false, 'and the header must not move either',
    );

    // Async: the pending window is the whole point — nothing may advance until it settles.
    await p.evalJS(`window.mode = 'async'`);
    await p.clickCenter('[data-fdy-step-next]');
    const pending = await p.waitFor(`document.querySelector('#wiz .fdy-stepper').getAttribute('aria-busy') === 'true'`);
    assert.ok(pending, 'a deferred decision marks the header busy');
    assert.equal(await p.evalJS(`document.querySelector('[data-fdy-step-next]').disabled`), true,
      'both nav buttons are disabled while deciding, so a second click has nothing to aim at');
    assert.equal(await onStep(), 1, 'nothing advances on a promise that has not settled');

    await settleWith(p, 'false');
    assert.equal(await onStep(), 1, 'resolving false refuses');
    assert.equal(await p.evalJS(`document.querySelector('#wiz .fdy-stepper').hasAttribute('aria-busy')`), false,
      'and the control is released again, or the wizard is stuck for good');
    assert.equal(await p.evalJS(`document.querySelector('[data-fdy-step-next]').disabled`), false, 'Next is usable again');

    // Resolving to anything but false advances: a handler that forgets to return is not a refusal.
    await p.clickCenter('[data-fdy-step-next]');
    await settleWith(p, 'undefined');
    const moved = await p.waitFor(`document.getElementById('p2').hidden === false`);
    assert.ok(moved, 'an answer that is not `false` lets the step through');
  });
});

test('stepper: going back never asks the guard', { skip }, async () => {
  await withPage(fixture('vanilla-stepper-guard.html'), async (p) => {
    await p.waitFor(STEPPER_READY);

    await p.clickCenter('[data-fdy-step-next]');            // mode 'allow' — straight through
    assert.ok(await p.waitFor(`document.getElementById('p2').hidden === false`), 'on step two');

    await p.evalJS(`window.asked = []; window.mode = 'refuse';`);
    await p.clickCenter('[data-fdy-step-prev]');
    assert.deepEqual(await p.evalJS('window.asked'), [],
      'nothing is committed by going back, so a guard that would refuse must never be consulted');
    assert.equal(await p.evalJS(`document.getElementById('p2').hidden`), true, 'and it really went back');
  });
});
