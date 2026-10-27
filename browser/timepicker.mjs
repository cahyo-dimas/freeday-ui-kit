/* Browser regression specs: `FdyTimepicker`, the control that replaces `<input type="time">`.
 * Run via `npm run test:browser`; auto-skips without Chrome.
 *
 * Why the kit grew this at all: the native time picker is drawn by the OPERATING SYSTEM, so iOS
 * shows a scroll wheel, Android a clock dial and desktop a stepper, each with its own width and
 * value format, and no CSS reaches any of them. An audit of keamanan-cluster on a real iPhone 7
 * found four of them in one shift form, on a screen that was otherwise identical to the browser
 * at the same width (#094).
 *
 * Asserted in a browser because none of these claims can be read off the source. Whether nine
 * options were generated is a question about what rendered; whether a locked picker stays shut is
 * a question about what a click did; and whether the highlight CLAMPS rather than wraps is the
 * difference between two one-character expressions that both compile.
 *
 * Vue and React are held to ONE set of expectations here, from entries that pass the same props,
 * because two adapters that drift are worse than one that is missing.
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

const BOUNDED = '#bounded .fdy-timepicker__trigger';
const OPTS = '#bounded .fdy-timepicker__opt';

const texts = (p, selector) =>
  p.evalJS(`Array.from(document.querySelectorAll(${JSON.stringify(selector)}), (e) => e.textContent.trim())`);

/* The highlighted index, as a condition `waitFor` can poll and as a value to read. One expression
   so the two can never answer differently. */
const ACTIVE = `Array.from(document.querySelectorAll(${JSON.stringify(OPTS)})).findIndex((e) => e.classList.contains('is-active'))`;
const activeIndex = (p) => p.evalJS(ACTIVE);

for (const stack of ['vue', 'react']) {
  test(`${stack}: the option list is generated from min, max and step`, { skip }, async () => {
    await withPage(fixture(`${stack}-timepicker.html`), async (p) => {
      await until(p, `document.querySelectorAll(${JSON.stringify(OPTS)}).length > 0`, 'the picker to render');
      const all = await texts(p, OPTS);
      /* 06:00 to 08:00 inclusive, every 15 minutes. Nine, not eight: both ends belong to the
         range, and an off-by-one in the generator lands here rather than in a user's shift form. */
      assert.deepEqual(all, ['06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30', '07:45', '08:00']);
    });
  });

  test(`${stack}: picking a time reports it to the binding, not just to the trigger`, { skip }, async () => {
    await withPage(fixture(`${stack}-timepicker.html`), async (p) => {
      await until(p, `document.querySelector(${JSON.stringify(BOUNDED)}) !== null`, 'the trigger to render');
      await p.clickCenter(BOUNDED);
      await until(p, `document.querySelector(${JSON.stringify(BOUNDED)}).getAttribute('aria-expanded') === 'true'`, 'the panel to open');
      await p.clickCenter(`${OPTS}:nth-child(3)`);
      await until(p, 'window.__changes.length === 1', 'the change to reach the binding');
      assert.deepEqual(await p.evalJS('window.__changes'), ['06:30']);
      assert.equal(await p.evalJS(`document.querySelector('#bounded .fdy-timepicker__value').textContent.trim()`), '06:30');
      /* Picking closes and hands focus back, or a keyboard reader is left inside a shut panel. */
      assert.equal(await p.evalJS(`document.querySelector(${JSON.stringify(BOUNDED)}).getAttribute('aria-expanded')`), 'false');
    });
  });

  test(`${stack}: the highlight clamps at both ends instead of wrapping`, { skip }, async () => {
    await withPage(fixture(`${stack}-timepicker.html`), async (p) => {
      await until(p, `document.querySelector(${JSON.stringify(BOUNDED)}) !== null`, 'the trigger to render');
      await p.clickCenter(BOUNDED);
      await until(p, `document.querySelector(${JSON.stringify(BOUNDED)}).getAttribute('aria-expanded') === 'true'`, 'the panel to open');
      /* The clamp is asserted by a POSITIVE observation, not by "the index did not change".
       *
       * Both of those are traps here. The highlight is framework state, so Vue and React flush it
       * asynchronously -- measured right after a keypress, both still report the OLD index, and the
       * new one lands 1-2ms later. So `assert(index === 0)` after ArrowUp-at-the-top passes
       * whether the clamp works or the render simply has not happened yet: a guard that cannot
       * fail. And the reads that do expect a change were passing on the margin between a CDB
       * round-trip and a framework flush, which is what goes red under `--test-concurrency=3`.
       *
       * So: step PAST the end several times, then take one step back and wait for the index that
       * only clamping can produce. Cyclic wrapping lands somewhere else and the wait throws. */
      await until(p, `${ACTIVE} === 0`, 'the highlight to open on the first option');

      /* Bottom end: three presses past it, then one step down must be exactly 1. Wrapping would
         have gone 8, 7, 6 and answered 7. */
      await p.pressKey('ArrowUp');
      await p.pressKey('ArrowUp');
      await p.pressKey('ArrowUp');
      await p.pressKey('ArrowDown');
      await until(p, `${ACTIVE} === 1`, 'the bottom clamp to hold, so one step down is the second option');

      /* Top end, the mirror image: End, then three presses past it, then one step up must be 7. */
      await p.pressKey('End');
      await until(p, `${ACTIVE} === 8`, 'End to reach the last option');
      await p.pressKey('ArrowDown');
      await p.pressKey('ArrowDown');
      await p.pressKey('ArrowDown');
      await p.pressKey('ArrowUp');
      await until(p, `${ACTIVE} === 7`, 'the top clamp to hold, so one step up is the second-to-last option');
    });
  });

  test(`${stack}: a locked picker shows its time and refuses to open`, { skip }, async () => {
    await withPage(fixture(`${stack}-timepicker.html`), async (p) => {
      const trigger = '#locked .fdy-timepicker__trigger';
      await until(p, `document.querySelector(${JSON.stringify(trigger)}) !== null`, 'the locked picker to render');
      assert.equal(await p.evalJS(`document.querySelector('#locked .fdy-timepicker__value').textContent.trim()`), '07:30');
      /* readonly, not disabled: it keeps its tab stop, which is the whole difference. */
      assert.equal(await p.evalJS(`document.querySelector(${JSON.stringify(trigger)}).disabled`), false);
      await p.clickCenter(trigger);
      /* "It is still closed" is the state it started in, so asserting it straight after the click
         would pass even if the click had never been delivered. A LATER click on the unlocked
         picker, waited for, proves the queue has drained past the first one -- then the locked
         picker still being shut means something. */
      await p.clickCenter(BOUNDED);
      await until(p, `document.querySelector(${JSON.stringify(BOUNDED)}).getAttribute('aria-expanded') === 'true'`,
        'the unlocked picker to open, which proves the earlier click was delivered');
      assert.equal(await p.evalJS(`document.querySelector(${JSON.stringify(trigger)}).getAttribute('aria-expanded')`), 'false');
    });
  });
}

test('raw path: the seed names the trigger it builds, and setState reaches it', { skip }, async () => {
  await withPage(fixture('vanilla-timepicker.html'), async (p) => {
    await until(p, `document.querySelector('.fdy-timepicker__trigger') !== null`, 'the enhancer to build the trigger');
    /* data-id and data-describedby were unreadable from the seed until 3.11.0, so a host could
       render an error message and have no way to attach it. */
    assert.equal(await p.evalJS(`document.querySelector('.fdy-timepicker__trigger').id`), 'jam-mulai');
    assert.equal(
      await p.evalJS(`document.querySelector('.fdy-timepicker__trigger').getAttribute('aria-describedby')`),
      'jam-mulai-bantu',
    );
    assert.equal(await p.evalJS(`document.querySelector('.fdy-timepicker__value').textContent.trim()`), '07:00');

    /* The call a render-once host (Blazor) depends on: without it the three state parameters were
       there and nothing read them after the first render. */
    await p.evalJS(`window.FreedayTimepicker.setState(document.getElementById('seed'), { disabled: true, invalid: true }), true`);
    assert.equal(await p.evalJS(`document.querySelector('.fdy-timepicker__trigger').disabled`), true);
    assert.equal(await p.evalJS(`document.getElementById('seed').classList.contains('fdy-timepicker--error')`), true);
    await p.evalJS(`window.FreedayTimepicker.setState(document.getElementById('seed'), { disabled: false, invalid: false }), true`);
    assert.equal(await p.evalJS(`document.querySelector('.fdy-timepicker__trigger').disabled`), false);
  });
});
